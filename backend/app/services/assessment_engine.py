"""
app/services/assessment_engine.py — Deterministic evidence-gap-to-task engine.

Design principles
═════════════════
• Deterministic — the same database rows and rules always produce the same
  criterion states.  No randomness, no model calls, no hidden state.
• Version-bound — a case is pinned to a QualificationVersion.  Criteria are
  taken from that version's snapshot, never from whatever happens to be live.
• Human decisions only — the engine can report READY_FOR_ASSESSOR_DECISION,
  but it can never mark a competency verified.  VERIFIED is only emitted from
  an authorised assessment decision (Part 6).
• Traceable — every recommendation references an existing criterion code and
  an approved practical task with a rubric reference.

Criterion state precedence
──────────────────────────
1. No linked evidence                               → GAP
2. Linked evidence, none accepted, some pending     → PENDING_REVIEW
3. Linked evidence, none accepted, all rejected     → ADDITIONAL_EVIDENCE_REQUIRED
4. Accepted evidence, linked practical task unpassed→ PRACTICAL_VERIFICATION_REQUIRED
5. Accepted evidence (and practical task passed if  → READY_FOR_ASSESSOR_DECISION
   one is linked)
"""

from __future__ import annotations

import enum
import re
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assessment import (
    ApprovedAssessmentTask,
    AssessmentCase,
    AssessmentResult,
    CaseStatus,
)
from app.models.competency import (
    CompetencyCriterion,
    CriterionEvidenceMap,
    EvidenceItem,
    EvidenceReviewStatus,
)
from app.models.qualification import Qualification, QualificationVersion

# ── Criterion states ──────────────────────────────────────────────────────────

class CriterionStatus(str, enum.Enum):
    """Exact labels required by the CraftRelay assessment workflow."""

    GAP = "GAP"
    PENDING_REVIEW = "PENDING_REVIEW"
    ADDITIONAL_EVIDENCE_REQUIRED = "ADDITIONAL_EVIDENCE_REQUIRED"
    PRACTICAL_VERIFICATION_REQUIRED = "PRACTICAL_VERIFICATION_REQUIRED"
    READY_FOR_ASSESSOR_DECISION = "READY_FOR_ASSESSOR_DECISION"
    # Formal state only — never produced by evidence evaluation.
    VERIFIED = "VERIFIED"


PENDING_STATUSES = {EvidenceReviewStatus.pending, EvidenceReviewStatus.under_review}
REJECTED_STATUSES = {EvidenceReviewStatus.rejected}
RESOLVED_STATUSES = {CriterionStatus.READY_FOR_ASSESSOR_DECISION, CriterionStatus.VERIFIED}
MATCH_THRESHOLD = 0.10
MAX_SUGGESTIONS_PER_EVIDENCE = 3


class AssessmentEngineError(Exception):
    """Raised when a case, criterion or evidence reference is invalid."""


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass(slots=True)
class CriterionEvaluation:
    criterion: CompetencyCriterion
    status: CriterionStatus
    evidence: list[EvidenceItem] = field(default_factory=list)
    accepted_evidence: list[EvidenceItem] = field(default_factory=list)
    pending_evidence: list[EvidenceItem] = field(default_factory=list)
    rejected_evidence: list[EvidenceItem] = field(default_factory=list)
    linked_tasks: list[ApprovedAssessmentTask] = field(default_factory=list)
    passed_task_codes: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    explanation: str = ""
    # All evidence links for this criterion, including rejected ones, so the
    # workspace can show the assessor's mapping decision for each item.
    evidence_links: list[CriterionEvidenceMap] = field(default_factory=list)


@dataclass(slots=True)
class TaskRecommendation:
    task: ApprovedAssessmentTask
    addresses_criterion_codes: list[str]
    reason: str


@dataclass(slots=True)
class CaseEvaluation:
    case: AssessmentCase
    qualification: Qualification
    version: QualificationVersion
    criteria: list[CriterionEvaluation]
    recommendations: list[TaskRecommendation]
    missing_snapshot_codes: list[str] = field(default_factory=list)

    @property
    def unresolved(self) -> list[CriterionEvaluation]:
        return [c for c in self.criteria if c.status not in RESOLVED_STATUSES]

    @property
    def unresolved_codes(self) -> list[str]:
        return [c.criterion.code for c in self.unresolved]

    @property
    def mandatory_blockers(self) -> list[CriterionEvaluation]:
        return [c for c in self.unresolved if c.criterion.is_mandatory]

    @property
    def status_counts(self) -> dict[str, int]:
        counts = {status.value: 0 for status in CriterionStatus}
        for c in self.criteria:
            counts[c.status.value] += 1
        return counts

    @property
    def readiness(self) -> str:
        """Coarse readiness label for list views."""
        if not self.criteria:
            return "NO_CRITERIA"
        if not self.unresolved:
            return "READY_FOR_ASSESSOR_DECISION"
        if self.mandatory_blockers:
            return "MANDATORY_GAPS_REMAIN"
        return "GAPS_REMAIN"

    @property
    def can_submit(self) -> bool:
        return self.case.status in {CaseStatus.draft, CaseStatus.submitted}


# ── Loading helpers ───────────────────────────────────────────────────────────

async def load_case(db: AsyncSession, case_id: uuid.UUID) -> AssessmentCase | None:
    result = await db.execute(
        select(AssessmentCase).where(AssessmentCase.id == case_id)
    )
    return result.scalar_one_or_none()


def snapshot_criterion_codes(version: QualificationVersion) -> list[str] | None:
    """
    Extract criterion codes from a version snapshot.

    Supported shapes:
      {"criteria": ["ELE-L2-C01", ...]}
      {"criteria": [{"code": "ELE-L2-C01", ...}, ...]}
    Returns None when the snapshot has no criterion list (older demo rows).
    """
    snapshot = version.snapshot or {}
    raw = snapshot.get("criteria") if isinstance(snapshot, dict) else None
    if not isinstance(raw, list) or not raw:
        return None

    codes: list[str] = []
    for entry in raw:
        if isinstance(entry, str):
            codes.append(entry)
        elif isinstance(entry, dict) and isinstance(entry.get("code"), str):
            codes.append(entry["code"])
    return codes or None


async def _load_criteria(
    db: AsyncSession, case: AssessmentCase, version: QualificationVersion
) -> tuple[list[CompetencyCriterion], list[str]]:
    result = await db.execute(
        select(CompetencyCriterion)
        .where(CompetencyCriterion.qualification_id == case.qualification_id)
        .order_by(CompetencyCriterion.order_index, CompetencyCriterion.code)
    )
    all_criteria = list(result.scalars().all())

    codes = snapshot_criterion_codes(version)
    if codes is None:
        return all_criteria, []

    by_code = {c.code: c for c in all_criteria}
    criteria = [by_code[code] for code in codes if code in by_code]
    missing = [code for code in codes if code not in by_code]
    return criteria, missing


async def _load_mappings(
    db: AsyncSession,
    case: AssessmentCase,
    criterion_ids: list[uuid.UUID],
) -> dict[uuid.UUID, list[CriterionEvidenceMap]]:
    if not criterion_ids:
        return {}

    result = await db.execute(
        select(CriterionEvidenceMap)
        .where(CriterionEvidenceMap.criterion_id.in_(criterion_ids))
        .options(selectinload(CriterionEvidenceMap.evidence_item))
    )

    grouped: dict[uuid.UUID, list[CriterionEvidenceMap]] = {}
    for mapping in result.scalars().all():
        evidence = mapping.evidence_item
        if evidence is None:
            continue
        # Ownership guard: never let another worker's evidence leak into a case.
        if evidence.worker_profile_id != case.worker_profile_id:
            continue
        grouped.setdefault(mapping.criterion_id, []).append(mapping)
    return grouped


async def _load_approved_tasks(
    db: AsyncSession, qualification_id: uuid.UUID
) -> list[ApprovedAssessmentTask]:
    result = await db.execute(
        select(ApprovedAssessmentTask)
        .where(
            ApprovedAssessmentTask.qualification_id == qualification_id,
            ApprovedAssessmentTask.is_active.is_(True),
        )
        .order_by(ApprovedAssessmentTask.code)
    )
    return list(result.scalars().all())


def _task_codes(task: ApprovedAssessmentTask) -> list[str]:
    raw = task.criterion_codes or []
    return [code for code in raw if isinstance(code, str)]


def _eligible_tasks(tasks: list[ApprovedAssessmentTask]) -> list[ApprovedAssessmentTask]:
    """Only approved tasks with a rubric and at least one criterion code."""
    return [
        task
        for task in tasks
        if task.is_approved and task.rubric_reference and _task_codes(task)
    ]


async def _load_passed_task_ids(
    db: AsyncSession, case_id: uuid.UUID
) -> set[uuid.UUID]:
    result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.assessment_case_id == case_id)
    )
    return {
        result_row.task_id
        for result_row in result.scalars().all()
        if result_row.passed is True
    }


# ── Criterion evaluation ──────────────────────────────────────────────────────

def _evaluate_criterion(
    criterion: CompetencyCriterion,
    mappings: list[CriterionEvidenceMap],
    tasks: list[ApprovedAssessmentTask],
    passed_task_ids: set[uuid.UUID],
) -> CriterionEvaluation:
    # A mapping the assessor rejected no longer supports the criterion.
    evidence = [
        mapping.evidence_item
        for mapping in mappings
        if mapping.mapping_status != "rejected" and mapping.evidence_item is not None
    ]
    accepted = [e for e in evidence if e.review_status == EvidenceReviewStatus.accepted]
    pending = [e for e in evidence if e.review_status in PENDING_STATUSES]
    rejected = [e for e in evidence if e.review_status in REJECTED_STATUSES]

    linked_tasks = [
        task for task in tasks if criterion.code in _task_codes(task)
    ]
    passed_codes = [
        task.code for task in linked_tasks if task.id in passed_task_ids
    ]

    conflicts: list[str] = []
    if accepted and rejected:
        conflicts.append(
            "Accepted and rejected evidence are both linked to this criterion; "
            "the assessor must confirm which evidence applies."
        )

    if not evidence:
        status = CriterionStatus.GAP
        explanation = "No evidence is linked to this criterion."
    elif not accepted:
        if pending:
            status = CriterionStatus.PENDING_REVIEW
            explanation = (
                f"{len(pending)} evidence item(s) await assessor review."
            )
        elif rejected:
            status = CriterionStatus.ADDITIONAL_EVIDENCE_REQUIRED
            explanation = (
                "All linked evidence was rejected. Additional evidence is required."
            )
        else:  # defensive — unreachable with the enum above
            status = CriterionStatus.GAP
            explanation = "No reviewed evidence is available."
    elif linked_tasks and not passed_codes:
        status = CriterionStatus.PRACTICAL_VERIFICATION_REQUIRED
        explanation = (
            "Evidence is accepted, but the linked practical task "
            f"({linked_tasks[0].code}) has no passing result on this case."
        )
    else:
        status = CriterionStatus.READY_FOR_ASSESSOR_DECISION
        explanation = (
            "Accepted evidence is available. This is ready for an assessor "
            "decision — it is not a verified competency."
        )

    if pending and accepted:
        conflicts.append(
            f"{len(pending)} additional evidence item(s) are still pending review."
        )

    return CriterionEvaluation(
        criterion=criterion,
        status=status,
        evidence=evidence,
        accepted_evidence=accepted,
        pending_evidence=pending,
        rejected_evidence=rejected,
        linked_tasks=linked_tasks,
        passed_task_codes=passed_codes,
        conflicts=conflicts,
        explanation=explanation,
        evidence_links=mappings,
    )


# ── Recommendations ───────────────────────────────────────────────────────────

def _recommend(
    tasks: list[ApprovedAssessmentTask],
    evaluations: list[CriterionEvaluation],
) -> list[TaskRecommendation]:
    unresolved_codes = {
        c.criterion.code for c in evaluations if c.status not in RESOLVED_STATUSES
    }
    if not unresolved_codes:
        return []

    recommendations: list[TaskRecommendation] = []
    for task in _eligible_tasks(tasks):
        codes = _task_codes(task)
        targets = [code for code in codes if code in unresolved_codes]
        if not targets:
            # Never recommend a task whose criteria are all already resolved.
            continue
        recommendations.append(
            TaskRecommendation(
                task=task,
                addresses_criterion_codes=targets,
                reason=(
                    "Approved task targets unresolved criterion code(s): "
                    + ", ".join(targets)
                ),
            )
        )

    recommendations.sort(
        key=lambda r: (-len(r.addresses_criterion_codes), r.task.code)
    )
    return recommendations


# ── Public API ────────────────────────────────────────────────────────────────

async def evaluate_case(db: AsyncSession, case: AssessmentCase) -> CaseEvaluation:
    """Evaluate every criterion in the case's pinned qualification version."""
    qual_result = await db.execute(
        select(Qualification).where(Qualification.id == case.qualification_id)
    )
    qualification = qual_result.scalar_one_or_none()
    if qualification is None:
        raise AssessmentEngineError("Qualification for this case no longer exists.")

    version_result = await db.execute(
        select(QualificationVersion).where(
            QualificationVersion.id == case.qualification_version_id
        )
    )
    version = version_result.scalar_one_or_none()
    if version is None:
        raise AssessmentEngineError("Qualification version for this case is missing.")

    criteria, missing_codes = await _load_criteria(db, case, version)
    mappings = await _load_mappings(db, case, [c.id for c in criteria])
    tasks = await _load_approved_tasks(db, case.qualification_id)
    passed_task_ids = await _load_passed_task_ids(db, case.id)

    evaluations = [
        _evaluate_criterion(
            criterion,
            mappings.get(criterion.id, []),
            tasks,
            passed_task_ids,
        )
        for criterion in criteria
    ]

    return CaseEvaluation(
        case=case,
        qualification=qualification,
        version=version,
        criteria=evaluations,
        recommendations=_recommend(tasks, evaluations),
        missing_snapshot_codes=missing_codes,
    )


# ── Deterministic mapping suggestions ────────────────────────────────────────

_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "by", "can", "for",
    "from", "has", "have", "in", "into", "is", "it", "its", "of", "on", "or",
    "that", "the", "their", "this", "to", "using", "was", "were", "will",
    "with", "within", "must", "should", "correct", "correctly", "complete",
    "completed", "performed", "perform", "demonstrate", "demonstrates",
    "includes", "including", "required", "requirement", "relevant",
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_SUFFIXES = ("ations", "ation", "ings", "ing", "ments", "ment", "ers", "er", "es", "s", "ed")


def normalize_tokens(text: str) -> list[str]:
    """Lowercase, split, drop stopwords and apply a small deterministic stem."""
    tokens = []
    for raw in _TOKEN_RE.findall((text or "").lower()):
        if len(raw) < 3 or raw in _STOPWORDS:
            continue
        tokens.append(_stem(raw))
    return tokens


def _stem(token: str) -> str:
    for suffix in _SUFFIXES:
        if token.endswith(suffix) and len(token) - len(suffix) >= 4:
            return token[: -len(suffix)]
    return token


def lexical_similarity(evidence_text: str, criterion_text: str) -> tuple[float, list[str]]:
    """
    Return (score, shared_terms) using Jaccard and containment over normalised
    tokens.  The score is a ranking signal in [0, 1] — never a probability of
    competence.
    """
    evidence_tokens = set(normalize_tokens(evidence_text))
    criterion_tokens = set(normalize_tokens(criterion_text))
    if not evidence_tokens or not criterion_tokens:
        return 0.0, []

    shared = evidence_tokens & criterion_tokens
    if not shared:
        return 0.0, []

    union = evidence_tokens | criterion_tokens
    jaccard = len(shared) / len(union)
    containment = len(shared) / len(criterion_tokens)
    score = round(0.5 * jaccard + 0.5 * containment, 3)
    return score, sorted(shared)


@dataclass(slots=True)
class MappingSuggestion:
    criterion: CompetencyCriterion
    evidence: EvidenceItem
    score: float
    explanation: str
    supporting_text: str
    already_mapped: bool


def _supporting_text(evidence: EvidenceItem) -> str:
    text = (evidence.description or evidence.title or "").strip()
    return text[:240] + ("…" if len(text) > 240 else "")


async def suggest_criterion_mappings(
    db: AsyncSession,
    case: AssessmentCase,
    evidence_ids: list[uuid.UUID] | None = None,
) -> list[MappingSuggestion]:
    """
    Suggest candidate criterion links for the case's evidence.

    Every suggestion references a real criterion in the case's qualification
    version and a real evidence item owned by the case's worker.  Suggestions
    always require human review before they influence an assessment state.
    """
    version_result = await db.execute(
        select(QualificationVersion).where(
            QualificationVersion.id == case.qualification_version_id
        )
    )
    version = version_result.scalar_one_or_none()
    if version is None:
        raise AssessmentEngineError("Qualification version for this case is missing.")

    criteria, _ = await _load_criteria(db, case, version)

    evidence_query = select(EvidenceItem).where(
        EvidenceItem.worker_profile_id == case.worker_profile_id
    )
    if evidence_ids:
        evidence_query = evidence_query.where(EvidenceItem.id.in_(evidence_ids))
    evidence_result = await db.execute(
        evidence_query.order_by(EvidenceItem.created_at.desc())
    )
    evidence_items = list(evidence_result.scalars().all())

    if evidence_ids:
        found = {item.id for item in evidence_items}
        missing = [str(eid) for eid in evidence_ids if eid not in found]
        if missing:
            raise AssessmentEngineError(
                "Evidence not found for this worker: " + ", ".join(missing)
            )

    mappings = await _load_mappings(db, case, [c.id for c in criteria])
    mapped_pairs = {
        (criterion_id, mapping.evidence_item_id)
        for criterion_id, items in mappings.items()
        for mapping in items
    }

    suggestions: list[MappingSuggestion] = []
    for evidence in evidence_items:
        text = " ".join(filter(None, [evidence.title, evidence.description]))
        candidates: list[MappingSuggestion] = []
        for criterion in criteria:
            criterion_text = " ".join(
                filter(None, [criterion.code, criterion.description, criterion.guidance])
            )
            score, shared = lexical_similarity(text, criterion_text)
            if score < MATCH_THRESHOLD:
                continue
            candidates.append(
                MappingSuggestion(
                    criterion=criterion,
                    evidence=evidence,
                    score=score,
                    explanation=(
                        "Matched normalised terms: " + ", ".join(shared)
                        + ". Ranking signal only — assessor review required."
                    ),
                    supporting_text=_supporting_text(evidence),
                    already_mapped=(criterion.id, evidence.id) in mapped_pairs,
                )
            )
        candidates.sort(key=lambda s: (-s.score, s.criterion.order_index, s.criterion.code))
        suggestions.extend(candidates[:MAX_SUGGESTIONS_PER_EVIDENCE])

    suggestions.sort(key=lambda s: (-s.score, s.criterion.order_index))
    return suggestions


async def get_criterion_for_case(
    db: AsyncSession, case: AssessmentCase, criterion_id: uuid.UUID
) -> CompetencyCriterion:
    """
    Resolve a criterion, rejecting IDs that do not exist or do not belong to the
    case's qualification version.
    """
    result = await db.execute(
        select(CompetencyCriterion).where(CompetencyCriterion.id == criterion_id)
    )
    criterion = result.scalar_one_or_none()
    if criterion is None or criterion.qualification_id != case.qualification_id:
        raise AssessmentEngineError(
            "Criterion does not belong to this assessment's qualification."
        )

    version_result = await db.execute(
        select(QualificationVersion).where(
            QualificationVersion.id == case.qualification_version_id
        )
    )
    version = version_result.scalar_one_or_none()
    if version is None:
        raise AssessmentEngineError("Qualification version for this case is missing.")

    codes = snapshot_criterion_codes(version)
    if codes is not None and criterion.code not in codes:
        raise AssessmentEngineError(
            "Criterion is not part of the qualification version pinned to this case."
        )
    return criterion
