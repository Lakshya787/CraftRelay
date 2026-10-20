"""
app/models/__init__.py

Import-order matters here: SQLAlchemy resolves relationships by string name,
so all models must be imported before Alembic inspects the metadata.
"""

from app.models.assessment import (
    ApprovedAssessmentTask,
    AssessmentCase,
    AssessmentResult,
    CompetencyVerification,
    CriterionAssessmentDecision,
    CriterionDecisionStatus,
)
from app.models.audit import AuditLog
from app.models.competency import (
    CompetencyCriterion,
    CriterionEvidenceMap,
    EvidenceItem,
)
from app.models.qualification import Qualification, QualificationVersion
from app.models.service import CustomerReview, RequestStatus, ServiceCompletion, ServiceRequest
from app.models.skill import Skill
from app.models.user import User, UserRole
from app.models.worker_profile import WorkerProfile
from app.models.worker_skill import WorkerSkill

__all__ = [
    "User",
    "UserRole",
    "WorkerProfile",
    "Skill",
    "WorkerSkill",
    "Qualification",
    "QualificationVersion",
    "CompetencyCriterion",
    "EvidenceItem",
    "CriterionEvidenceMap",
    "AssessmentCase",
    "ApprovedAssessmentTask",
    "AssessmentResult",
    "CompetencyVerification",
    "CriterionAssessmentDecision",
    "CriterionDecisionStatus",
    "RequestStatus",
    "ServiceRequest",
    "ServiceCompletion",
    "CustomerReview",
    "AuditLog",
]
