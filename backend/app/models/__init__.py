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
<<<<<<< HEAD
from app.models.service import RequestStatus, ServiceRequest, ServiceCompletion, CustomerReview
=======
>>>>>>> 52822fbe5aeeb63a728cd2d65e4db7cc95597355
from app.models.audit import AuditLog
from app.models.competency import (
    CompetencyCriterion,
    CriterionEvidenceMap,
    EvidenceItem,
)
from app.models.qualification import Qualification, QualificationVersion
from app.models.service import CustomerReview, ServiceCompletion, ServiceRequest
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
<<<<<<< HEAD
    "RequestStatus",
=======
    "CriterionAssessmentDecision",
    "CriterionDecisionStatus",
>>>>>>> 52822fbe5aeeb63a728cd2d65e4db7cc95597355
    "ServiceRequest",
    "ServiceCompletion",
    "CustomerReview",
    "AuditLog",
]
