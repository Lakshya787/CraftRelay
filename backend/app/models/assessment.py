"""
app/models/assessment.py — Assessment cases, tasks, results, and competency verifications.

Versioning guarantee
════════════════════
AssessmentCase.qualification_version_id records which QualificationVersion
was active when the case was opened.  CompetencyVerification similarly
records the version at award time.  Changing a Qualification's criteria
later cannot silently rewrite those historical references.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.types import JSONBType


class CaseStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    withdrawn = "withdrawn"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    expired = "expired"
    revoked = "revoked"


class AssessmentCase(Base, TimestampMixin):
    """
    A single competency assessment request from a worker.

    ``qualification_version_id`` is set at case-creation time and is
    immutable thereafter, preserving the criteria that applied when the
    worker submitted their evidence.
    """

    __tablename__ = "assessment_cases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    worker_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("worker_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    qualification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qualifications.id"),
        nullable=False,
        index=True,
    )
    # Snapshot of the version at case-creation time — never updated.
    qualification_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qualification_versions.id"),
        nullable=False,
    )
    assessor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
    )
    status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus, name="case_status_enum"),
        nullable=False,
        default=CaseStatus.draft,
        index=True,
    )
    worker_statement: Mapped[str | None] = mapped_column(Text)
    assessor_notes: Mapped[str | None] = mapped_column(Text)

    # ── Relationships ─────────────────────────────────────────────────────────
    worker_profile: Mapped[WorkerProfile] = relationship(  # noqa: F821
        "WorkerProfile", back_populates="assessment_cases"
    )
    qualification_version: Mapped[QualificationVersion] = relationship(  # noqa: F821
        "QualificationVersion", back_populates="assessment_cases"
    )
    assessor: Mapped[User | None] = relationship(  # noqa: F821
        "User",
        back_populates="assessment_cases_as_assessor",
        foreign_keys=[assessor_id],
    )
    results: Mapped[list[AssessmentResult]] = relationship(
        "AssessmentResult",
        back_populates="assessment_case",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<AssessmentCase id={self.id} status={self.status}>"


class ApprovedAssessmentTask(Base, TimestampMixin):
    """
    A practical task that assessors may administer for a given qualification.
    These are defined by admins and are linked (not embedded) to qualifications
    so they can be updated independently.
    """

    __tablename__ = "approved_assessment_tasks"
    __table_args__ = (
        UniqueConstraint("code", name="uq_approved_tasks_code"),
        CheckConstraint("pass_score <= max_score", name="ck_pass_le_max"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    qualification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qualifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    required_tools: Mapped[list | None] = mapped_column(JSONBType)
    assessment_criteria: Mapped[list | None] = mapped_column(JSONBType)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    pass_score: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    qualification: Mapped[Qualification] = relationship(  # noqa: F821
        "Qualification", back_populates="approved_tasks"
    )
    results: Mapped[list[AssessmentResult]] = relationship(
        "AssessmentResult",
        back_populates="task",
    )

    def __repr__(self) -> str:
        return f"<ApprovedAssessmentTask code={self.code!r}>"


class AssessmentResult(Base, TimestampMixin):
    """
    The scored outcome of one ApprovedAssessmentTask within an AssessmentCase.
    """

    __tablename__ = "assessment_results"
    __table_args__ = (
        CheckConstraint("score >= 0", name="ck_result_score_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    assessment_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("approved_assessment_tasks.id"),
        nullable=False,
    )
    score: Mapped[float | None] = mapped_column(Numeric(6, 2))
    passed: Mapped[bool | None] = mapped_column(Boolean)
    assessor_commentary: Mapped[str | None] = mapped_column(Text)

    assessment_case: Mapped[AssessmentCase] = relationship(
        "AssessmentCase", back_populates="results"
    )
    task: Mapped[ApprovedAssessmentTask] = relationship(
        "ApprovedAssessmentTask", back_populates="results"
    )

    def __repr__(self) -> str:
        return f"<AssessmentResult case={self.assessment_case_id} passed={self.passed}>"


class CompetencyVerification(Base, TimestampMixin):
    """
    The formal award of a qualification to a worker after a successful assessment.

    ``qualification_version_id`` records which version was current at award
    time — a requirement for historical auditability.
    """

    __tablename__ = "competency_verifications"
    __table_args__ = (
        UniqueConstraint(
            "worker_profile_id", "qualification_id",
            name="uq_verif_worker_qualification",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    worker_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("worker_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    qualification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qualifications.id"),
        nullable=False,
        index=True,
    )
    # Version at award time — immutable.
    qualification_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qualification_versions.id"),
        nullable=False,
    )
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status_enum"),
        nullable=False,
        default=VerificationStatus.pending,
        index=True,
    )
    awarded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
    )
    certificate_number: Mapped[str | None] = mapped_column(String(100), unique=True)

    worker_profile: Mapped[WorkerProfile] = relationship(  # noqa: F821
        "WorkerProfile", back_populates="competency_verifications"
    )
    qualification: Mapped[Qualification] = relationship(  # noqa: F821
        "Qualification", foreign_keys=[qualification_id]
    )
    qualification_version: Mapped[QualificationVersion] = relationship(  # noqa: F821
        "QualificationVersion", back_populates="competency_verifications"
    )

    @property
    def qualification_title(self) -> str | None:
        if "qualification" in self.__dict__ and self.qualification is not None:
            return self.qualification.title
        if "qualification_version" in self.__dict__ and self.qualification_version is not None:
            if "qualification" in self.qualification_version.__dict__ and self.qualification_version.qualification is not None:
                return self.qualification_version.qualification.title
        return None

    def __repr__(self) -> str:
        return (
            f"<CompetencyVerification worker={self.worker_profile_id} "
            f"qual={self.qualification_id} status={self.status}>"
        )


from app.models.worker_profile import WorkerProfile  # noqa: E402
from app.models.qualification import QualificationVersion, Qualification  # noqa: E402
from app.models.user import User  # noqa: E402
