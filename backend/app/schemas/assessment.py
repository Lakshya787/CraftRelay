"""
app/schemas/assessment.py — Request/response contracts for the assessment engine.

Criterion status values are uppercase strings and are part of the public API:
    GAP
    PENDING_REVIEW
    ADDITIONAL_EVIDENCE_REQUIRED
    PRACTICAL_VERIFICATION_REQUIRED
    READY_FOR_ASSESSOR_DECISION
    VERIFIED (formal state only — issued by an authorised decision)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ── Requests ──────────────────────────────────────────────────────────────────

class CreateAssessmentCaseRequest(BaseModel):
    qualification_id: uuid.UUID
    worker_statement: str | None = Field(
        default=None,
        max_length=4000,
        description="Optional worker statement describing relevant experience.",
    )


class CriterionDecisionRequest(BaseModel):
    """Formal per-criterion decision recorded by an assessor."""

    decision: Literal["approved", "rejected", "additional_evidence_required"]
    rationale: str = Field(min_length=10, max_length=4000)
    rubric_result: Literal["pass", "fail", "not_applicable"] | None = None


class TaskResultRequest(BaseModel):
    """Practical-task result. Pass/fail is computed server-side."""

    score: float = Field(ge=0)
    commentary: str | None = Field(default=None, max_length=4000)


class FinalDecisionRequest(BaseModel):
    """Final qualification decision for a case."""

    outcome: Literal["approved", "rejected"]
    rationale: str = Field(min_length=10, max_length=4000)


class MappingReviewRequest(BaseModel):
    """Assessor decision on one evidence→criterion link."""

    decision: Literal["confirmed", "rejected"]
    note: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: dict) -> dict:
        if isinstance(data, dict):
            # Allow 'status' as an alias for 'decision'
            if "status" in data and "decision" not in data:
                data["decision"] = data["status"]
            # Allow 'assessor_note' as alias for 'note'
            if "assessor_note" in data and "note" not in data:
                data["note"] = data["assessor_note"]
        return data


class CreateMappingRequest(BaseModel):
    criterion_id: uuid.UUID
    evidence_item_id: uuid.UUID
    mapping_source: str = Field(
        default="manual",
        pattern="^(manual|suggested)$",
        description="'suggested' means the worker accepted a deterministic suggestion.",
    )
    note: str | None = Field(default=None, max_length=2000)


# ── Responses ─────────────────────────────────────────────────────────────────

class EvidenceRef(BaseModel):
    """Evidence shown in an assessment workspace."""

    id: uuid.UUID
    title: str
    description: str | None = None
    evidence_type: str
    review_status: str
    is_verified: bool
    file_url: str | None = None
    original_filename: str | None = None
    mime_type: str | None = None
    mapping_id: uuid.UUID | None = None
    mapping_status: str = "pending"
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskSummary(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: str | None = None
    estimated_duration_minutes: int | None = None
    rubric_reference: str | None = None
    criterion_codes: list[str] = []
    max_score: int
    pass_score: int

    model_config = {"from_attributes": True}


class CriterionDecisionResponse(BaseModel):
    id: uuid.UUID
    criterion_id: uuid.UUID
    criterion_code: str
    decision: str
    rubric_result: str | None = None
    rationale: str
    assessor_id: uuid.UUID
    assessor_name: str | None = None
    qualification_version_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None


class TaskResultResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    task_code: str
    score: float | None = None
    passed: bool | None = None
    assessor_commentary: str | None = None
    created_at: datetime


class VerificationSummary(BaseModel):
    id: uuid.UUID
    qualification_id: uuid.UUID
    qualification_version_id: uuid.UUID
    status: str
    awarded_by_id: uuid.UUID | None = None
    certificate_number: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FinalDecisionResponse(BaseModel):
    case_id: uuid.UUID
    status: str
    verification: VerificationSummary | None = None
    message: str


class CriterionStateResponse(BaseModel):
    criterion_id: uuid.UUID
    code: str
    description: str
    guidance: str | None = None
    is_mandatory: bool
    order_index: int
    rubric_reference: str | None = None

    status: str
    explanation: str
    evidence: list[EvidenceRef] = []
    pending_evidence_count: int = 0
    rejected_evidence_count: int = 0
    linked_tasks: list[TaskSummary] = []
    passed_task_codes: list[str] = []
    conflicts: list[str] = []
    # Deterministic states never imply verification; every state still needs
    # a human assessor before a competency can be awarded.
    assessor_review_required: bool = True
    # Formal assessor decision, if one has been recorded for this criterion.
    decision: CriterionDecisionResponse | None = None


class TaskRecommendationResponse(BaseModel):
    task: TaskSummary
    addresses_criterion_codes: list[str]
    reason: str


class CaseSummaryResponse(BaseModel):
    id: uuid.UUID
    worker_profile_id: uuid.UUID
    worker_name: str | None = None
    qualification_id: uuid.UUID
    qualification_code: str
    qualification_title: str
    qualification_version_id: uuid.UUID
    qualification_version_number: int
    status: str
    readiness: str
    unresolved_criterion_count: int
    mandatory_blocker_count: int
    created_at: datetime
    updated_at: datetime | None = None


class CaseWorkspaceResponse(CaseSummaryResponse):
    worker_statement: str | None = None
    assessor_notes: str | None = None
    is_illustrative: bool = True
    criteria: list[CriterionStateResponse] = []
    status_counts: dict[str, int] = {}
    unresolved_criterion_codes: list[str] = []
    mandatory_blocker_codes: list[str] = []
    recommendations: list[TaskRecommendationResponse] = []
    missing_snapshot_codes: list[str] = []
    decisions: list[CriterionDecisionResponse] = []
    task_results: list[TaskResultResponse] = []
    approval_blockers: list[str] = []
    can_approve: bool = False
    verification: VerificationSummary | None = None
    disclaimer: str = (
        "Evidence states are deterministic suggestions for assessor review. "
        "No competency is verified until an authorised assessor records a decision."
    )


class MappingSuggestionResponse(BaseModel):
    criterion_id: uuid.UUID
    criterion_code: str
    criterion_description: str
    qualification_version_id: uuid.UUID
    qualification_version_number: int
    evidence_item_id: uuid.UUID
    evidence_title: str
    supporting_text: str
    match_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Lexical ranking signal only — not a probability of competence.",
    )
    match_explanation: str
    mapping_status: str
    requires_assessor_review: bool = True
    already_mapped: bool = False


class MappingResponse(BaseModel):
    id: uuid.UUID
    criterion_id: uuid.UUID
    evidence_item_id: uuid.UUID
    mapping_source: str
    mapping_status: str = "pending"
    reviewed_by_id: uuid.UUID | None = None
    match_score: float | None = None
    match_explanation: str | None = None
    assessor_note: str | None = None

    model_config = {"from_attributes": True}


class RecommendationListResponse(BaseModel):
    case_id: uuid.UUID
    unresolved_criterion_codes: list[str]
    recommendations: list[TaskRecommendationResponse]
