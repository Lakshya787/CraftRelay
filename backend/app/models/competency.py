"""
app/models/competency.py — Competency criteria, evidence items, and their mapping.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from app.db.types import JSONBType, UUIDType
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class EvidenceType(str, enum.Enum):
    document = "document"
    photo = "photo"
    video = "video"
    certificate = "certificate"
    reference_letter = "reference_letter"
    other = "other"


class EvidenceReviewStatus(str, enum.Enum):
    """Review lifecycle for a piece of evidence."""
    pending = "pending"       # submitted, awaiting assessor review
    under_review = "under_review"
    accepted = "accepted"
    rejected = "rejected"


class CompetencyCriterion(Base, TimestampMixin):
    """
    A single assessable criterion within a Qualification.

    ``order_index`` allows criteria to be presented in a defined sequence.
    ``is_mandatory`` distinguishes must-pass criteria from optional ones.
    """

    __tablename__ = "competency_criteria"

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    qualification_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("qualifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    guidance: Mapped[str | None] = mapped_column(Text)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Reference to the rubric/performance element in the source document
    rubric_reference: Mapped[str | None] = mapped_column(String(100))

    # ── Relationships ─────────────────────────────────────────────────────────
    qualification: Mapped[Qualification] = relationship(  # noqa: F821
        "Qualification", back_populates="criteria"
    )
    evidence_mappings: Mapped[list[CriterionEvidenceMap]] = relationship(
        "CriterionEvidenceMap",
        back_populates="criterion",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<CompetencyCriterion code={self.code!r}>"


class EvidenceItem(Base, TimestampMixin):
    """
    A piece of evidence submitted by a worker to support one or more criteria.

    Ownership: only the owning worker (or admin) may modify or delete this.
    The ownership check is enforced in the service/router layer.
    """

    __tablename__ = "evidence_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    worker_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("worker_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    evidence_type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType, name="evidence_type_enum"),
        nullable=False,
    )
    review_status: Mapped[EvidenceReviewStatus] = mapped_column(
        Enum(EvidenceReviewStatus, name="evidence_review_status_enum"),
        nullable=False,
        default=EvidenceReviewStatus.pending,
    )
    # ── File storage metadata ──────────────────────────────────────────────────
    # stored_filename: server-generated UUID name (never the client filename)
    stored_filename: Mapped[str | None] = mapped_column(String(500))
    # original_filename: client-supplied name, stored for display only, never trusted for path ops
    original_filename: Mapped[str | None] = mapped_column(String(500))
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    # mime_type: re-detected by magic bytes server-side, stored here for reference
    mime_type: Mapped[str | None] = mapped_column(String(127))
    # storage_backend: 'local' for dev; will be 'gcs' / 's3' in production
    storage_backend: Mapped[str] = mapped_column(String(20), default="local", nullable=False)
    # file_url: public-facing URL or signed URL; null for local non-public storage
    file_url: Mapped[str | None] = mapped_column(String(2048))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Review note from assessor
    review_note: Mapped[str | None] = mapped_column(Text)

    # ── Relationships ─────────────────────────────────────────────────────────
    worker_profile: Mapped[WorkerProfile] = relationship(  # noqa: F821
        "WorkerProfile", back_populates="evidence_items"
    )
    criterion_mappings: Mapped[list[CriterionEvidenceMap]] = relationship(
        "CriterionEvidenceMap",
        back_populates="evidence_item",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EvidenceItem id={self.id} title={self.title!r}>"


class CriterionEvidenceMap(Base, TimestampMixin):
    """
    Many-to-many: one evidence item may support multiple criteria;
    one criterion may have multiple supporting evidence items.
    """

    __tablename__ = "criterion_evidence_maps"
    __table_args__ = (
        UniqueConstraint(
            "criterion_id", "evidence_item_id",
            name="uq_criterion_evidence_map",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    criterion_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("competency_criteria.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_item_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assessor_note: Mapped[str | None] = mapped_column(Text)
    # How the link was created: 'manual' (worker selected), 'suggested'
    # (worker accepted a deterministic suggestion) or 'assessor'.
    mapping_source: Mapped[str] = mapped_column(
        String(20), default="manual", nullable=False
    )
    # Assessor review of this evidence→criterion link.
    # pending = not reviewed; confirmed = link accepted; rejected = link removed
    # from the engine's evidence set (the evidence row itself is unchanged).
    mapping_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType(),
        ForeignKey("users.id"),
    )
    # Deterministic lexical match score (0..1). Never a probability of
    # competence — a ranking signal for human review only.
    match_score: Mapped[float | None] = mapped_column(Numeric(4, 3))
    match_explanation: Mapped[str | None] = mapped_column(Text)

    criterion: Mapped[CompetencyCriterion] = relationship(
        "CompetencyCriterion", back_populates="evidence_mappings"
    )
    evidence_item: Mapped[EvidenceItem] = relationship(
        "EvidenceItem", back_populates="criterion_mappings"
    )


from app.models.qualification import Qualification  # noqa: E402
from app.models.worker_profile import WorkerProfile  # noqa: E402
