"""
app/models/__init__.py

Import-order matters here: SQLAlchemy resolves relationships by string name,
so all models must be imported before Alembic inspects the metadata.
"""

from app.models.user import User, UserRole
from app.models.worker_profile import WorkerProfile
from app.models.skill import Skill
from app.models.worker_skill import WorkerSkill
from app.models.qualification import Qualification, QualificationVersion
from app.models.competency import CompetencyCriterion, EvidenceItem, CriterionEvidenceMap
from app.models.assessment import (
    AssessmentCase,
    ApprovedAssessmentTask,
    AssessmentResult,
    CompetencyVerification,
)
from app.models.service import ServiceRequest, ServiceCompletion, CustomerReview
from app.models.audit import AuditLog

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
    "ServiceRequest",
    "ServiceCompletion",
    "CustomerReview",
    "AuditLog",
]
