"""
app/models/qualification.py — Qualification catalogue with version history.

Design decision: immutability via QualificationVersion
═══════════════════════════════════════════════════════
A Qualification row represents the live, editable reference record.
Each time an admin publishes a meaningful change, a QualificationVersion
snapshot is created. AssessmentCase and CompetencyVerification store the
version_id at decision time so historical decisions always reflect the
criteria that were active when the assessment occurred.

This means:
  • Changing a qualification's criteria does NOT silently rewrite past records.
  • Auditors can reconstruct "what criteria applied when" for any record.
  • New assessments always use the current (latest) version.
"""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Qualification(Base, TimestampMixin):
    """
    Live qualification reference record.

    ``is_illustrative`` — set True for all seed/demo qualifications to make
    explicit that criteria are NOT official government standards.
    """

    __tablename__ = "qualifications"
    __table_args__ = (
        UniqueConstraint("code", name="uq_qualifications_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    trade: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    issuing_body: Mapped[str] = mapped_column(String(200), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_hours: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Explicit flag: these criteria are illustrative examples, NOT official standards.
    is_illustrative: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Current published version number (incremented on each snapshot)
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    versions: Mapped[list[QualificationVersion]] = relationship(
        "QualificationVersion",
        back_populates="qualification",
        cascade="all, delete-orphan",
        order_by="QualificationVersion.version_number",
    )
    criteria: Mapped[list[CompetencyCriterion]] = relationship(  # noqa: F821
        "CompetencyCriterion",
        back_populates="qualification",
        cascade="all, delete-orphan",
    )
    approved_tasks: Mapped[list[ApprovedAssessmentTask]] = relationship(  # noqa: F821
        "ApprovedAssessmentTask",
        back_populates="qualification",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Qualification code={self.code!r} title={self.title!r}>"


class QualificationVersion(Base, TimestampMixin):
    """
    Immutable snapshot of a qualification taken at publish time.

    ``snapshot`` stores a JSONB copy of the criteria and task codes at
    the moment the version was cut, so it never depends on current rows.
    """

    __tablename__ = "qualification_versions"
    __table_args__ = (
        UniqueConstraint(
            "qualification_id", "version_number",
            name="uq_qual_versions_qual_version",
        ),
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
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(String(500))
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)   # full criteria JSON

    qualification: Mapped[Qualification] = relationship(
        "Qualification", back_populates="versions"
    )
    assessment_cases: Mapped[list[AssessmentCase]] = relationship(  # noqa: F821
        "AssessmentCase",
        back_populates="qualification_version",
    )
    competency_verifications: Mapped[list[CompetencyVerification]] = relationship(  # noqa: F821
        "CompetencyVerification",
        back_populates="qualification_version",
    )

    def __repr__(self) -> str:
        return (
            f"<QualificationVersion qual={self.qualification_id} "
            f"v={self.version_number}>"
        )


from app.models.competency import CompetencyCriterion  # noqa: E402
from app.models.assessment import (  # noqa: E402
    ApprovedAssessmentTask,
    AssessmentCase,
    CompetencyVerification,
)
