"""
app/models/worker_profile.py — Extended profile for users with the Worker role.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class WorkerProfile(Base, TimestampMixin):
    """
    One-to-one extension of User for the Worker role.

    Ownership rule: Only the worker themselves (or an admin) may modify this
    record. The ownership check is enforced in the API layer, not here.
    """

    __tablename__ = "worker_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # ── Professional details ───────────────────────────────────────────────────
    trade_title: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    years_experience: Mapped[int | None] = mapped_column(Integer)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    average_rating: Mapped[float | None] = mapped_column()   # recomputed by trigger/service
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped[User] = relationship("User", back_populates="worker_profile")  # noqa: F821
    worker_skills: Mapped[list[WorkerSkill]] = relationship(  # noqa: F821
        "WorkerSkill",
        back_populates="worker_profile",
        cascade="all, delete-orphan",
    )
    evidence_items: Mapped[list[EvidenceItem]] = relationship(  # noqa: F821
        "EvidenceItem",
        back_populates="worker_profile",
        cascade="all, delete-orphan",
    )
    assessment_cases: Mapped[list[AssessmentCase]] = relationship(  # noqa: F821
        "AssessmentCase",
        back_populates="worker_profile",
    )
    competency_verifications: Mapped[list[CompetencyVerification]] = relationship(  # noqa: F821
        "CompetencyVerification",
        back_populates="worker_profile",
    )
    service_requests: Mapped[list[ServiceRequest]] = relationship(  # noqa: F821
        "ServiceRequest",
        back_populates="worker_profile",
        foreign_keys="ServiceRequest.worker_profile_id",
    )
    customer_reviews: Mapped[list[CustomerReview]] = relationship(  # noqa: F821
        "CustomerReview",
        back_populates="worker_profile",
        foreign_keys="CustomerReview.worker_profile_id",
    )

    @property
    def full_name(self) -> str | None:
        if "user" in self.__dict__ and self.user is not None:
            return self.user.full_name
        return None

    def __repr__(self) -> str:
        return f"<WorkerProfile id={self.id} user_id={self.user_id}>"


from app.models.user import User  # noqa: E402
from app.models.worker_skill import WorkerSkill  # noqa: E402
from app.models.competency import EvidenceItem  # noqa: E402
from app.models.assessment import AssessmentCase, CompetencyVerification  # noqa: E402
from app.models.service import ServiceRequest, CustomerReview  # noqa: E402
