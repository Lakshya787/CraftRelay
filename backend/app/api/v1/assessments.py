"""
app/api/v1/assessments.py — Assessment workspace endpoints.

POST   /assessments/cases
GET    /assessments/cases
GET    /assessments/queue
GET    /assessments/cases/{case_id}
POST   /assessments/cases/{case_id}/submit
GET    /assessments/cases/{case_id}/mapping-suggestions
POST   /assessments/cases/{case_id}/mappings
DELETE /assessments/cases/{case_id}/mappings/{mapping_id}
GET    /assessments/cases/{case_id}/recommendations

Authorisation
─────────────
• Workers may only see and modify their own cases.
• Assessors and admins may inspect any case and add/remove mappings while
  reviewing.  They cannot mark a competency verified here — that transition
  belongs to the formal decision workflow (Part 6).
• Customers cannot access assessment records at all.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.assessment import (
    ApprovedAssessmentTask,
    AssessmentCase,
    AssessmentResult,
    CaseStatus,
    CompetencyVerification,
    CriterionAssessmentDecision,
    CriterionDecisionStatus,
    VerificationStatus,
)
from app.models.competency import (
    CompetencyCriterion,
    CriterionEvidenceMap,
    EvidenceItem,
)
from app.models.qualification import Qualification, QualificationVersion
from app.models.user import User, UserRole
from app.models.worker_profile import WorkerProfile
from app.schemas.assessment import (
    CaseSummaryResponse,
    CaseWorkspaceResponse,
    CreateAssessmentCaseRequest,
    CreateMappingRequest,
    CriterionDecisionRequest,
    CriterionDecisionResponse,
    CriterionStateResponse,
    EvidenceRef,
    FinalDecisionRequest,
    FinalDecisionResponse,
    MappingResponse,
    MappingReviewRequest,
    MappingSuggestionResponse,
    RecommendationListResponse,
    TaskRecommendationResponse,
    TaskResultRequest,
    TaskResultResponse,
    TaskSummary,
    VerificationSummary,
)
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.services.assessment_engine import (
    MATCH_THRESHOLD,
    AssessmentEngineError,
    CaseEvaluation,
    CriterionEvaluation,
    CriterionStatus,
    evaluate_case,
    get_criterion_for_case,
    lexical_similarity,
    suggest_criterion_mappings,
)
from app.services.audit import record_audit

router = APIRouter(prefix="/assessments", tags=["assessments"])

ASSESSOR_ROLES = {UserRole.assessor, UserRole.admin}
FROZEN_CASE_STATUSES = {CaseStatus.approved, CaseStatus.rejected, CaseStatus.withdrawn}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ensure_role(user: User, *roles: UserRole) -> None:
    if user.role not in roles:
        allowed = ", ".join(role.value for role in roles)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This endpoint requires one of: {allowed}.",
        )


async def _worker_profile_for(user: User, db: DbSession) -> WorkerProfile:
    result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )
    return profile


async def _get_case_or_404(db: DbSession, case_id: uuid.UUID) -> AssessmentCase:
    result = await db.execute(
        select(AssessmentCase).where(AssessmentCase.id == case_id)
    )
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment case not found.",
        )
    return case


async def _authorize_case(user: User, case: AssessmentCase, db: DbSession) -> None:
    """Assessors/admins may inspect any case; workers only their own."""
    if user.role in ASSESSOR_ROLES:
        return
    if user.role == UserRole.worker:
        profile = await _worker_profile_for(user, db)
        if case.worker_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this assessment case.",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to assessment records.",
    )


async def _worker_name(db: DbSession, worker_profile_id: uuid.UUID) -> str | None:
    result = await db.execute(
        select(User.full_name)
        .join(WorkerProfile, WorkerProfile.user_id == User.id)
        .where(WorkerProfile.id == worker_profile_id)
    )
    return result.scalar_one_or_none()


def _task_summary(task) -> TaskSummary:
    return TaskSummary(
        id=task.id,
        code=task.code,
        title=task.title,
        description=task.description,
        estimated_duration_minutes=task.estimated_duration_minutes,
        rubric_reference=task.rubric_reference,
        criterion_codes=[
            code for code in (task.criterion_codes or []) if isinstance(code, str)
        ],
        max_score=task.max_score,
        pass_score=task.pass_score,
    )


def _criterion_state(
    evaluation: CriterionEvaluation,
    decision: CriterionDecisionResponse | None = None,
) -> CriterionStateResponse:
    criterion = evaluation.criterion
    return CriterionStateResponse(
        criterion_id=criterion.id,
        code=criterion.code,
        description=criterion.description,
        guidance=criterion.guidance,
        is_mandatory=criterion.is_mandatory,
        order_index=criterion.order_index,
        rubric_reference=criterion.rubric_reference,
        status=evaluation.status.value,
        explanation=evaluation.explanation,
        evidence=[
            EvidenceRef(
                id=mapping.evidence_item.id,
                title=mapping.evidence_item.title,
                description=mapping.evidence_item.description,
                evidence_type=mapping.evidence_item.evidence_type.value,
                review_status=mapping.evidence_item.review_status.value,
                is_verified=mapping.evidence_item.is_verified,
                file_url=mapping.evidence_item.file_url,
                original_filename=mapping.evidence_item.original_filename,
                mime_type=mapping.evidence_item.mime_type,
                mapping_id=mapping.id,
                mapping_status=mapping.mapping_status,
                created_at=mapping.evidence_item.created_at,
            )
            for mapping in evaluation.evidence_links
            if mapping.evidence_item is not None
        ],
        pending_evidence_count=len(evaluation.pending_evidence),
        rejected_evidence_count=len(evaluation.rejected_evidence),
        linked_tasks=[_task_summary(task) for task in evaluation.linked_tasks],
        passed_task_codes=evaluation.passed_task_codes,
        conflicts=evaluation.conflicts,
        decision=decision,
    )


def _recommendation_response(evaluation: CaseEvaluation) -> list[TaskRecommendationResponse]:
    return [
        TaskRecommendationResponse(
            task=_task_summary(recommendation.task),
            addresses_criterion_codes=recommendation.addresses_criterion_codes,
            reason=recommendation.reason,
        )
        for recommendation in evaluation.recommendations
    ]


def _decision_response(
    decision: CriterionAssessmentDecision,
    criterion_code: str,
    assessor_name: str | None,
) -> CriterionDecisionResponse:
    return CriterionDecisionResponse(
        id=decision.id,
        criterion_id=decision.criterion_id,
        criterion_code=criterion_code,
        decision=decision.decision.value,
        rubric_result=decision.rubric_result,
        rationale=decision.rationale,
        assessor_id=decision.assessor_id,
        assessor_name=assessor_name,
        qualification_version_id=decision.qualification_version_id,
        created_at=decision.created_at,
        updated_at=decision.updated_at,
    )


async def _load_decisions(
    db: DbSession, case_id: uuid.UUID
) -> dict[uuid.UUID, CriterionDecisionResponse]:
    result = await db.execute(
        select(
            CriterionAssessmentDecision,
            CompetencyCriterion.code,
            User.full_name,
        )
        .join(
            CompetencyCriterion,
            CompetencyCriterion.id == CriterionAssessmentDecision.criterion_id,
        )
        .join(User, User.id == CriterionAssessmentDecision.assessor_id)
        .where(CriterionAssessmentDecision.assessment_case_id == case_id)
    )
    return {
        decision.criterion_id: _decision_response(decision, code, name)
        for decision, code, name in result.all()
    }


async def _load_task_results(
    db: DbSession, case_id: uuid.UUID
) -> list[TaskResultResponse]:
    result = await db.execute(
        select(AssessmentResult, ApprovedAssessmentTask.code)
        .join(
            ApprovedAssessmentTask,
            ApprovedAssessmentTask.id == AssessmentResult.task_id,
        )
        .where(AssessmentResult.assessment_case_id == case_id)
        .order_by(ApprovedAssessmentTask.code)
    )
    return [
        TaskResultResponse(
            id=row.id,
            task_id=row.task_id,
            task_code=task_code,
            score=float(row.score) if row.score is not None else None,
            passed=row.passed,
            assessor_commentary=row.assessor_commentary,
            created_at=row.created_at,
        )
        for row, task_code in result.all()
    ]


async def _load_verification(
    db: DbSession, case: AssessmentCase
) -> VerificationSummary | None:
    result = await db.execute(
        select(CompetencyVerification).where(
            CompetencyVerification.worker_profile_id == case.worker_profile_id,
            CompetencyVerification.qualification_id == case.qualification_id,
        )
    )
    verification = result.scalar_one_or_none()
    if verification is None:
        return None
    return VerificationSummary(
        id=verification.id,
        qualification_id=verification.qualification_id,
        qualification_version_id=verification.qualification_version_id,
        status=verification.status.value,
        awarded_by_id=verification.awarded_by_id,
        certificate_number=verification.certificate_number,
        created_at=verification.created_at,
    )


def _approval_blockers(
    evaluation: CaseEvaluation,
    decisions: dict[uuid.UUID, CriterionDecisionResponse],
    verification: VerificationSummary | None,
) -> list[str]:
    """Rules that must pass before a qualification can be verified."""
    blockers: list[str] = []
    if evaluation.case.status not in {CaseStatus.submitted, CaseStatus.under_review}:
        blockers.append(
            f"Case must be submitted or under review (currently {evaluation.case.status.value})."
        )
    if verification is not None and verification.status == "verified":
        blockers.append("This qualification is already verified for the worker.")

    mandatory = [
        c for c in evaluation.criteria if c.criterion.is_mandatory
    ]
    if not mandatory:
        blockers.append("The qualification has no mandatory criteria to verify.")

    for item in mandatory:
        code = item.criterion.code
        decision = decisions.get(item.criterion.id)
        if decision is None:
            blockers.append(f"{code}: no assessor decision recorded.")
        elif decision.decision != CriterionDecisionStatus.approved.value:
            blockers.append(
                f"{code}: decision is '{decision.decision}', not approved."
            )
        elif item.status != CriterionStatus.READY_FOR_ASSESSOR_DECISION:
            blockers.append(
                f"{code}: evidence state is {item.status.value}, not ready."
            )
    return blockers


async def _summary(
    db: DbSession, evaluation: CaseEvaluation
) -> CaseSummaryResponse:
    case = evaluation.case
    return CaseSummaryResponse(
        id=case.id,
        worker_profile_id=case.worker_profile_id,
        worker_name=await _worker_name(db, case.worker_profile_id),
        qualification_id=case.qualification_id,
        qualification_code=evaluation.qualification.code,
        qualification_title=evaluation.qualification.title,
        qualification_version_id=case.qualification_version_id,
        qualification_version_number=evaluation.version.version_number,
        status=case.status.value,
        readiness=evaluation.readiness,
        unresolved_criterion_count=len(evaluation.unresolved),
        mandatory_blocker_count=len(evaluation.mandatory_blockers),
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


async def _workspace(
    db: DbSession, evaluation: CaseEvaluation
) -> CaseWorkspaceResponse:
    case = evaluation.case
    summary = await _summary(db, evaluation)
    decisions = await _load_decisions(db, case.id)
    verification = await _load_verification(db, case)
    blockers = _approval_blockers(evaluation, decisions, verification)
    return CaseWorkspaceResponse(
        **summary.model_dump(),
        worker_statement=case.worker_statement,
        assessor_notes=case.assessor_notes,
        is_illustrative=evaluation.qualification.is_illustrative,
        criteria=[
            _criterion_state(c, decisions.get(c.criterion.id))
            for c in evaluation.criteria
        ],
        status_counts=evaluation.status_counts,
        unresolved_criterion_codes=evaluation.unresolved_codes,
        mandatory_blocker_codes=[
            c.criterion.code for c in evaluation.mandatory_blockers
        ],
        recommendations=_recommendation_response(evaluation),
        missing_snapshot_codes=evaluation.missing_snapshot_codes,
        decisions=list(decisions.values()),
        task_results=await _load_task_results(db, case.id),
        approval_blockers=blockers,
        can_approve=not blockers,
        verification=verification,
    )


async def _evaluate_or_500(db: DbSession, case: AssessmentCase) -> CaseEvaluation:
    try:
        return await evaluate_case(db, case)
    except AssessmentEngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


# ── Case creation ─────────────────────────────────────────────────────────────

@router.post(
    "/cases",
    response_model=SuccessResponse[CaseWorkspaceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Open (or reuse) an assessment case for a qualification",
)
async def create_case(
    body: CreateAssessmentCaseRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[CaseWorkspaceResponse]:
    """
    Create a case pinned to the latest published QualificationVersion.

    Re-opening the same qualification while a case is still open returns the
    existing case instead of creating a duplicate.
    """
    _ensure_role(current_user, UserRole.worker)
    profile = await _worker_profile_for(current_user, db)

    qual_result = await db.execute(
        select(Qualification).where(
            Qualification.id == body.qualification_id,
            Qualification.is_active.is_(True),
        )
    )
    qualification = qual_result.scalar_one_or_none()
    if qualification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Qualification not found or inactive.",
        )

    version_result = await db.execute(
        select(QualificationVersion)
        .where(QualificationVersion.qualification_id == qualification.id)
        .order_by(QualificationVersion.version_number.desc())
        .limit(1)
    )
    version = version_result.scalar_one_or_none()
    if version is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This qualification has no published version to assess against.",
        )

    open_statuses = {
        CaseStatus.draft,
        CaseStatus.submitted,
        CaseStatus.under_review,
    }
    existing_result = await db.execute(
        select(AssessmentCase)
        .where(
            AssessmentCase.worker_profile_id == profile.id,
            AssessmentCase.qualification_id == qualification.id,
            AssessmentCase.status.in_(open_statuses),
        )
        .order_by(AssessmentCase.created_at.desc())
        .limit(1)
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        evaluation = await _evaluate_or_500(db, existing)
        return SuccessResponse(
            data=await _workspace(db, evaluation),
            message="An open assessment case for this qualification already exists.",
        )

    case = AssessmentCase(
        worker_profile_id=profile.id,
        qualification_id=qualification.id,
        qualification_version_id=version.id,
        status=CaseStatus.draft,
        worker_statement=body.worker_statement,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)

    evaluation = await _evaluate_or_500(db, case)
    return SuccessResponse(
        data=await _workspace(db, evaluation),
        message="Assessment case opened.",
    )


# ── Case listing ──────────────────────────────────────────────────────────────

def _parse_status_filter(status_filter: str | None) -> CaseStatus | None:
    if not status_filter:
        return None
    try:
        return CaseStatus(status_filter)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,  # literal avoids the deprecated Starlette alias
            detail=f"Unknown case status: {status_filter}",
        ) from exc


async def _list_cases(
    db: DbSession,
    *,
    case_statuses: set[CaseStatus] | None,
    worker_profile_id: uuid.UUID | None,
    page: int,
    page_size: int,
) -> PaginatedResponse[CaseSummaryResponse]:
    query = select(AssessmentCase)
    if case_statuses:
        query = query.where(AssessmentCase.status.in_(case_statuses))
    if worker_profile_id is not None:
        query = query.where(AssessmentCase.worker_profile_id == worker_profile_id)

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(AssessmentCase.updated_at.desc(), AssessmentCase.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    cases = list(result.scalars().all())

    summaries = []
    for case in cases:
        evaluation = await _evaluate_or_500(db, case)
        summaries.append(await _summary(db, evaluation))

    return PaginatedResponse(
        data=summaries,
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )


@router.get(
    "/cases",
    response_model=PaginatedResponse[CaseSummaryResponse],
    summary="List assessment cases visible to the current user",
)
async def list_cases(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
) -> PaginatedResponse[CaseSummaryResponse]:
    status_enum = _parse_status_filter(status_filter)

    if current_user.role == UserRole.worker:
        profile = await _worker_profile_for(current_user, db)
        return await _list_cases(
            db,
            case_statuses={status_enum} if status_enum else None,
            worker_profile_id=profile.id,
            page=page,
            page_size=page_size,
        )

    _ensure_role(current_user, UserRole.assessor, UserRole.admin)
    return await _list_cases(
        db,
        case_statuses={status_enum} if status_enum else None,
        worker_profile_id=None,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/queue",
    response_model=PaginatedResponse[CaseSummaryResponse],
    summary="Assessor queue — submitted cases awaiting review",
)
async def assessor_queue(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[CaseSummaryResponse]:
    _ensure_role(current_user, UserRole.assessor, UserRole.admin)
    return await _list_cases(
        db,
        case_statuses={CaseStatus.submitted, CaseStatus.under_review},
        worker_profile_id=None,
        page=page,
        page_size=page_size,
    )


# ── Case workspace ────────────────────────────────────────────────────────────

@router.get(
    "/cases/{case_id}",
    response_model=SuccessResponse[CaseWorkspaceResponse],
    summary="Get an assessment workspace with criterion-level states",
)
async def get_case(
    case_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[CaseWorkspaceResponse]:
    case = await _get_case_or_404(db, case_id)
    await _authorize_case(current_user, case, db)
    evaluation = await _evaluate_or_500(db, case)
    return SuccessResponse(data=await _workspace(db, evaluation))


@router.post(
    "/cases/{case_id}/submit",
    response_model=SuccessResponse[CaseWorkspaceResponse],
    summary="Submit a draft case for assessor review",
)
async def submit_case(
    case_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[CaseWorkspaceResponse]:
    _ensure_role(current_user, UserRole.worker)
    case = await _get_case_or_404(db, case_id)
    await _authorize_case(current_user, case, db)

    if case.status == CaseStatus.submitted:
        evaluation = await _evaluate_or_500(db, case)
        return SuccessResponse(
            data=await _workspace(db, evaluation),
            message="This case is already submitted.",
        )
    if case.status != CaseStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A case in '{case.status.value}' status cannot be submitted.",
        )

    case.status = CaseStatus.submitted
    await db.commit()
    await db.refresh(case)

    evaluation = await _evaluate_or_500(db, case)
    return SuccessResponse(
        data=await _workspace(db, evaluation),
        message="Case submitted for assessor review.",
    )


# ── Mapping suggestions ───────────────────────────────────────────────────────

@router.get(
    "/cases/{case_id}/mapping-suggestions",
    response_model=SuccessResponse[list[MappingSuggestionResponse]],
    summary="Deterministic criterion-mapping suggestions for this case's evidence",
)
async def mapping_suggestions(
    case_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[list[MappingSuggestionResponse]]:
    case = await _get_case_or_404(db, case_id)
    await _authorize_case(current_user, case, db)

    try:
        suggestions = await suggest_criterion_mappings(db, case)
    except AssessmentEngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc

    result = await db.execute(
        select(QualificationVersion).where(
            QualificationVersion.id == case.qualification_version_id
        )
    )
    version = result.scalar_one_or_none()

    return SuccessResponse(
        data=[
            MappingSuggestionResponse(
                criterion_id=s.criterion.id,
                criterion_code=s.criterion.code,
                criterion_description=s.criterion.description,
                qualification_version_id=case.qualification_version_id,
                qualification_version_number=version.version_number if version else 0,
                evidence_item_id=s.evidence.id,
                evidence_title=s.evidence.title,
                supporting_text=s.supporting_text,
                match_score=s.score,
                match_explanation=s.explanation,
                mapping_status=(
                    "ALREADY_MAPPED" if s.already_mapped else "SUGGESTED"
                ),
                requires_assessor_review=True,
                already_mapped=s.already_mapped,
            )
            for s in suggestions
        ],
        message=(
            "Suggestions are deterministic lexical matches. They are not "
            "probabilities of competence and require assessor review."
        ),
    )


# ── Mappings ──────────────────────────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/mappings",
    response_model=SuccessResponse[MappingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Link an evidence item to a criterion in this case",
)
async def create_mapping(
    case_id: uuid.UUID,
    body: CreateMappingRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[MappingResponse]:
    _ensure_role(current_user, UserRole.worker, UserRole.assessor, UserRole.admin)
    case = await _get_case_or_404(db, case_id)
    await _authorize_case(current_user, case, db)

    if case.status in FROZEN_CASE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This case is closed and can no longer be edited.",
        )
    if current_user.role == UserRole.worker and case.status not in {
        CaseStatus.draft,
        CaseStatus.submitted,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mappings cannot be added once assessor review has started.",
        )

    try:
        criterion = await get_criterion_for_case(db, case, body.criterion_id)
    except AssessmentEngineError as exc:
        raise HTTPException(
            status_code=422, detail=str(exc)
        ) from exc

    evidence_result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.id == body.evidence_item_id)
    )
    evidence = evidence_result.scalar_one_or_none()
    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found."
        )
    if evidence.worker_profile_id != case.worker_profile_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This evidence does not belong to the assessment's worker.",
        )

    existing_result = await db.execute(
        select(CriterionEvidenceMap).where(
            CriterionEvidenceMap.criterion_id == criterion.id,
            CriterionEvidenceMap.evidence_item_id == evidence.id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        return SuccessResponse(
            data=MappingResponse.model_validate(existing),
            message="Evidence is already linked to this criterion.",
        )

    source = "assessor" if current_user.role in ASSESSOR_ROLES else body.mapping_source
    score = None
    explanation = None
    if source == "suggested":
        text = " ".join(filter(None, [evidence.title, evidence.description]))
        criterion_text = " ".join(
            filter(None, [criterion.code, criterion.description, criterion.guidance])
        )
        score, shared = lexical_similarity(text, criterion_text)
        if score >= MATCH_THRESHOLD:
            explanation = (
                "Accepted deterministic suggestion. Matched terms: "
                + ", ".join(shared)
                + ". Ranking signal only."
            )
        else:
            # A human may still link evidence the lexical matcher did not
            # surface, but the record must not claim it was a suggestion.
            source = "manual"
            explanation = (
                "Linked manually; deterministic lexical similarity was below "
                f"the suggestion threshold ({score:.3f})."
            )

    mapping = CriterionEvidenceMap(
        criterion_id=criterion.id,
        evidence_item_id=evidence.id,
        assessor_note=body.note,
        mapping_source=source,
        match_score=score,
        match_explanation=explanation,
    )
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)

    return SuccessResponse(
        data=MappingResponse.model_validate(mapping),
        message="Evidence linked to criterion.",
    )


@router.patch(
    "/cases/{case_id}/mappings/{mapping_id}/review",
    response_model=SuccessResponse[MappingResponse],
    summary="Confirm or reject an evidence→criterion link (assessor/admin only)",
)
async def review_mapping(
    case_id: uuid.UUID,
    mapping_id: uuid.UUID,
    body: MappingReviewRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[MappingResponse]:
    """
    Confirm or reject one evidence link.

    Rejected links are excluded from the deterministic assessment, but the
    evidence item itself is untouched. Confirmed links remain visible to the
    assessor as an explicit review decision.
    """
    _ensure_role(current_user, *ASSESSOR_ROLES)
    case = await _get_case_or_404(db, case_id)
    if case.status in FROZEN_CASE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This case has a final decision and cannot be changed.",
        )

    result = await db.execute(
        select(CriterionEvidenceMap)
        .where(CriterionEvidenceMap.id == mapping_id)
        .options(
            selectinload(CriterionEvidenceMap.criterion),
            selectinload(CriterionEvidenceMap.evidence_item),
        )
    )
    mapping = result.scalar_one_or_none()
    if (
        mapping is None
        or mapping.criterion is None
        or mapping.criterion.qualification_id != case.qualification_id
        or mapping.evidence_item is None
        or mapping.evidence_item.worker_profile_id != case.worker_profile_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mapping does not belong to this assessment case.",
        )

    mapping.mapping_status = body.decision
    mapping.reviewed_by_id = current_user.id
    mapping.assessor_note = body.note

    record_audit(
        db,
        actor_id=current_user.id,
        action="assessment.mapping_reviewed",
        resource_type="assessment_case",
        resource_id=case.id,
        description=(
            f"Evidence link {body.decision} by {current_user.full_name}."
        ),
        payload={
            "mapping_id": str(mapping.id),
            "criterion_id": str(mapping.criterion_id),
            "evidence_item_id": str(mapping.evidence_item_id),
            "mapping_status": body.decision,
        },
    )

    await db.commit()
    await db.refresh(mapping)
    return SuccessResponse(
        data=MappingResponse.model_validate(mapping),
        message=f"Evidence link {body.decision}.",
    )


@router.delete(
    "/cases/{case_id}/mappings/{mapping_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Remove an evidence→criterion link",
)
async def delete_mapping(
    case_id: uuid.UUID,
    mapping_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    _ensure_role(current_user, UserRole.worker, UserRole.assessor, UserRole.admin)
    case = await _get_case_or_404(db, case_id)
    await _authorize_case(current_user, case, db)

    if current_user.role == UserRole.worker and case.status not in {
        CaseStatus.draft,
        CaseStatus.submitted,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mappings cannot be changed once assessor review has started.",
        )

    result = await db.execute(
        select(CriterionEvidenceMap)
        .where(CriterionEvidenceMap.id == mapping_id)
        .options(
            selectinload(CriterionEvidenceMap.criterion),
            selectinload(CriterionEvidenceMap.evidence_item),
        )
    )
    mapping = result.scalar_one_or_none()
    if mapping is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found."
        )
    if (
        mapping.criterion is None
        or mapping.criterion.qualification_id != case.qualification_id
        or mapping.evidence_item is None
        or mapping.evidence_item.worker_profile_id != case.worker_profile_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mapping does not belong to this assessment case.",
        )

    await db.delete(mapping)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Recommendations ──────────────────────────────────────────────────────────

@router.get(
    "/cases/{case_id}/recommendations",
    response_model=SuccessResponse[RecommendationListResponse],
    summary="Approved practical tasks for unresolved criteria",
)
async def recommendations(
    case_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[RecommendationListResponse]:
    case = await _get_case_or_404(db, case_id)
    await _authorize_case(current_user, case, db)
    evaluation = await _evaluate_or_500(db, case)

    return SuccessResponse(
        data=RecommendationListResponse(
            case_id=case.id,
            unresolved_criterion_codes=evaluation.unresolved_codes,
            recommendations=_recommendation_response(evaluation),
        ),
        message=(
            "Only approved tasks whose criteria are still unresolved are recommended."
        ),
    )


# ── Formal assessor decisions ────────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/criteria/{criterion_id}/decision",
    response_model=SuccessResponse[CriterionDecisionResponse],
    summary="Record a formal decision for one criterion (assessor/admin only)",
)
async def record_criterion_decision(
    case_id: uuid.UUID,
    criterion_id: uuid.UUID,
    body: CriterionDecisionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[CriterionDecisionResponse]:
    """
    Record the assessor's decision for a single criterion.

    • Approval requires the criterion to be READY_FOR_ASSESSOR_DECISION
      (accepted evidence and any linked practical task passed).
    • The unique (case, criterion) row makes identical retries idempotent and
      rejects conflicting decisions once approved/rejected.
    • A decision requesting additional evidence may later be revised.
    """
    _ensure_role(current_user, *ASSESSOR_ROLES)
    case = await _get_case_or_404(db, case_id)
    if case.status in FROZEN_CASE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This case has a final decision and cannot be changed.",
        )

    try:
        criterion = await get_criterion_for_case(db, case, criterion_id)
    except AssessmentEngineError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    evaluation = await _evaluate_or_500(db, case)
    criterion_eval = next(
        (c for c in evaluation.criteria if c.criterion.id == criterion.id), None
    )
    if criterion_eval is None:
        raise HTTPException(
            status_code=422, detail="Criterion is not part of this case."
        )

    existing_result = await db.execute(
        select(CriterionAssessmentDecision).where(
            CriterionAssessmentDecision.assessment_case_id == case.id,
            CriterionAssessmentDecision.criterion_id == criterion.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        identical = (
            existing.decision.value == body.decision
            and existing.rationale == body.rationale
            and existing.rubric_result == body.rubric_result
        )
        if identical:
            return SuccessResponse(
                data=_decision_response(
                    existing, criterion.code, current_user.full_name
                ),
                message="This decision is already recorded.",
            )
        if existing.decision != CriterionDecisionStatus.additional_evidence_required:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A final decision already exists for this criterion. "
                    "Only a request for additional evidence can be revised."
                ),
            )

    if body.decision == CriterionDecisionStatus.approved.value:
        if body.rubric_result == "fail":
            raise HTTPException(
                status_code=422,
                detail="Cannot approve a criterion with a failed rubric result.",
            )
        if criterion_eval.status != CriterionStatus.READY_FOR_ASSESSOR_DECISION:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Cannot approve {criterion.code}: {criterion_eval.status.value}. "
                    f"{criterion_eval.explanation}"
                ),
            )

    if existing is None:
        decision_row = CriterionAssessmentDecision(
            assessment_case_id=case.id,
            criterion_id=criterion.id,
            assessor_id=current_user.id,
            qualification_version_id=case.qualification_version_id,
            decision=CriterionDecisionStatus(body.decision),
            rubric_result=body.rubric_result,
            rationale=body.rationale,
        )
        db.add(decision_row)
    else:
        decision_row = existing
        decision_row.assessor_id = current_user.id
        decision_row.qualification_version_id = case.qualification_version_id
        decision_row.decision = CriterionDecisionStatus(body.decision)
        decision_row.rubric_result = body.rubric_result
        decision_row.rationale = body.rationale

    if case.status == CaseStatus.submitted:
        case.status = CaseStatus.under_review
    case.assessor_id = current_user.id

    record_audit(
        db,
        actor_id=current_user.id,
        action="assessment.criterion_decided",
        resource_type="assessment_case",
        resource_id=case.id,
        description=f"{criterion.code} marked {body.decision} by {current_user.full_name}.",
        payload={
            "criterion_id": str(criterion.id),
            "criterion_code": criterion.code,
            "decision": body.decision,
            "rubric_result": body.rubric_result,
            "qualification_version_id": str(case.qualification_version_id),
        },
    )

    await db.commit()
    await db.refresh(decision_row)

    return SuccessResponse(
        data=_decision_response(
            decision_row, criterion.code, current_user.full_name
        ),
        message=f"Decision recorded for {criterion.code}.",
    )


@router.post(
    "/cases/{case_id}/tasks/{task_id}/result",
    response_model=SuccessResponse[TaskResultResponse],
    summary="Record or update a practical-task result (assessor/admin only)",
)
async def record_task_result(
    case_id: uuid.UUID,
    task_id: uuid.UUID,
    body: TaskResultRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[TaskResultResponse]:
    """
    Record the outcome of an approved practical task for this case.

    Pass/fail is computed from the task's configured pass score — the client
    cannot decide the threshold. Re-recording updates the same row, so a case
    cannot accumulate duplicate task results.
    """
    _ensure_role(current_user, *ASSESSOR_ROLES)
    case = await _get_case_or_404(db, case_id)
    if case.status in FROZEN_CASE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This case has a final decision and cannot be changed.",
        )

    task_result = await db.execute(
        select(ApprovedAssessmentTask).where(
            ApprovedAssessmentTask.id == task_id,
            ApprovedAssessmentTask.qualification_id == case.qualification_id,
        )
    )
    task = task_result.scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approved task not found for this qualification.",
        )
    if not task.is_active or not task.is_approved:
        raise HTTPException(
            status_code=422,
            detail="Only active, approved tasks can be recorded.",
        )
    if body.score > task.max_score:
        raise HTTPException(
            status_code=422,
            detail=f"Score cannot exceed the task maximum ({task.max_score}).",
        )

    passed = body.score >= task.pass_score

    result_query = await db.execute(
        select(AssessmentResult).where(
            AssessmentResult.assessment_case_id == case.id,
            AssessmentResult.task_id == task.id,
        )
    )
    result_row = result_query.scalar_one_or_none()
    if result_row is None:
        result_row = AssessmentResult(
            assessment_case_id=case.id,
            task_id=task.id,
            score=body.score,
            passed=passed,
            assessor_commentary=body.commentary,
        )
        db.add(result_row)
    else:
        result_row.score = body.score
        result_row.passed = passed
        result_row.assessor_commentary = body.commentary

    if case.status == CaseStatus.submitted:
        case.status = CaseStatus.under_review
    case.assessor_id = current_user.id

    record_audit(
        db,
        actor_id=current_user.id,
        action="assessment.task_result_recorded",
        resource_type="assessment_case",
        resource_id=case.id,
        description=(
            f"Practical task {task.code} recorded as "
            f"{'passed' if passed else 'failed'} by {current_user.full_name}."
        ),
        payload={
            "task_id": str(task.id),
            "task_code": task.code,
            "score": body.score,
            "pass_score": task.pass_score,
            "passed": passed,
        },
    )

    await db.commit()
    await db.refresh(result_row)

    return SuccessResponse(
        data=TaskResultResponse(
            id=result_row.id,
            task_id=task.id,
            task_code=task.code,
            score=float(result_row.score) if result_row.score is not None else None,
            passed=result_row.passed,
            assessor_commentary=result_row.assessor_commentary,
            created_at=result_row.created_at,
        ),
        message=f"Result recorded for {task.code}.",
    )


@router.post(
    "/cases/{case_id}/final-decision",
    response_model=SuccessResponse[FinalDecisionResponse],
    summary="Issue the final qualification decision (assessor/admin only)",
)
async def final_decision(
    case_id: uuid.UUID,
    body: FinalDecisionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[FinalDecisionResponse]:
    """
    Approve or reject the qualification for this case.

    Approval requires every mandatory criterion to have an approved assessor
    decision backed by accepted evidence (and a passed practical task where one
    is linked). Optional criteria cannot substitute for a missing mandatory one.
    Verification is created only inside this authorised transition.
    """
    _ensure_role(current_user, *ASSESSOR_ROLES)

    result = await db.execute(
        select(AssessmentCase)
        .where(AssessmentCase.id == case_id)
        .with_for_update()
    )
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment case not found.",
        )
    if case.status in FROZEN_CASE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This case already has a final decision.",
        )
    if case.status not in {CaseStatus.submitted, CaseStatus.under_review}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only submitted or under-review cases can receive a final decision "
                f"(currently {case.status.value})."
            ),
        )

    evaluation = await _evaluate_or_500(db, case)
    decisions = await _load_decisions(db, case.id)
    verification = await _load_verification(db, case)

    if body.outcome == "approved":
        blockers = _approval_blockers(evaluation, decisions, verification)
        if blockers:
            raise HTTPException(
                status_code=422,
                detail="Cannot approve this case: " + " ".join(blockers),
            )

    if body.outcome == "approved":
        if verification is None:
            verification_row = CompetencyVerification(
                worker_profile_id=case.worker_profile_id,
                qualification_id=case.qualification_id,
                qualification_version_id=case.qualification_version_id,
                status=VerificationStatus.verified,
                awarded_by_id=current_user.id,
                certificate_number=(
                    f"CR-{datetime.now(timezone.utc).year}-"
                    f"{uuid.uuid4().hex[:8].upper()}"
                ),
            )
            db.add(verification_row)
        else:
            verification_row = await db.get(CompetencyVerification, verification.id)
            if verification_row is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Verification record disappeared during the decision.",
                )
            verification_row.status = VerificationStatus.verified
            verification_row.awarded_by_id = current_user.id
            verification_row.qualification_version_id = case.qualification_version_id
            verification_row.certificate_number = (
                f"CR-{datetime.now(timezone.utc).year}-"
                f"{uuid.uuid4().hex[:8].upper()}"
            )
        case.status = CaseStatus.approved
    else:
        case.status = CaseStatus.rejected

    case.assessor_id = current_user.id
    case.assessor_notes = body.rationale

    record_audit(
        db,
        actor_id=current_user.id,
        action=(
            "assessment.approved"
            if body.outcome == "approved"
            else "assessment.rejected"
        ),
        resource_type="assessment_case",
        resource_id=case.id,
        description=(
            f"Case {body.outcome} by {current_user.full_name}: {body.rationale}"
        ),
        payload={
            "outcome": body.outcome,
            "worker_profile_id": str(case.worker_profile_id),
            "qualification_id": str(case.qualification_id),
            "qualification_version_id": str(case.qualification_version_id),
            "mandatory_criteria": [
                c.criterion.code for c in evaluation.criteria if c.criterion.is_mandatory
            ],
        },
    )

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A verification record already exists for this worker and qualification.",
        ) from exc

    await db.refresh(case)
    verification_summary = await _load_verification(db, case)

    return SuccessResponse(
        data=FinalDecisionResponse(
            case_id=case.id,
            status=case.status.value,
            verification=verification_summary,
            message=(
                "Qualification verified."
                if body.outcome == "approved"
                else "Assessment rejected."
            ),
        ),
        message=(
            "Qualification verified and recorded."
            if body.outcome == "approved"
            else "Final decision recorded."
        ),
    )
