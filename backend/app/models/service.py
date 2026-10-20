"""
app/models/service.py — Service requests, completions, and customer reviews.
"""

from __future__ import annotations

import enum
import uuid

from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from app.db.types import UUIDType
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class RequestStatus(str, enum.Enum):
    requested = "requested"      # customer submitted
    accepted = "accepted"        # worker accepted
    declined = "declined"        # worker declined
    in_progress = "in_progress" # worker started work
    completion_pending = "completion_pending"  # worker marked done
    completed = "completed"      # customer confirmed
    cancelled = "cancelled"      # either party cancelled


class ServiceRequest(Base, TimestampMixin):
    """A customer's request for a worker's services."""

    __tablename__ = "service_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    worker_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("worker_profiles.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="request_status_enum"),
        nullable=False,
        default=RequestStatus.requested,
        index=True,
    )
    agreed_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    service_location: Mapped[str | None] = mapped_column(String(500))
    preferred_date: Mapped[date | None] = mapped_column(Date)

    # ── Relationships ─────────────────────────────────────────────────────────
    customer: Mapped[User] = relationship(  # noqa: F821
        "User",
        back_populates="service_requests",
        foreign_keys=[customer_id],
    )
    worker_profile: Mapped[WorkerProfile] = relationship(  # noqa: F821
        "WorkerProfile",
        back_populates="service_requests",
        foreign_keys=[worker_profile_id],
    )
    completion: Mapped[ServiceCompletion | None] = relationship(
        "ServiceCompletion",
        back_populates="service_request",
        uselist=False,
        cascade="all, delete-orphan",
    )
    review: Mapped[CustomerReview | None] = relationship(
        "CustomerReview",
        back_populates="service_request",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ServiceRequest id={self.id} status={self.status}>"


class ServiceCompletion(Base, TimestampMixin):
    """Records the worker-submitted evidence that a service request was completed."""

    __tablename__ = "service_completions"
    __table_args__ = (
        UniqueConstraint("service_request_id", name="uq_completion_request"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    service_request_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("service_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    worker_notes: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(2048))
    worker_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    customer_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    customer_notes: Mapped[str | None] = mapped_column(Text)

    service_request: Mapped[ServiceRequest] = relationship(
        "ServiceRequest", back_populates="completion"
    )

    def __repr__(self) -> str:
        return f"<ServiceCompletion request={self.service_request_id}>"


class CustomerReview(Base, TimestampMixin):
    """A customer's review of a completed service."""

    __tablename__ = "customer_reviews"
    __table_args__ = (
        UniqueConstraint("service_request_id", name="uq_review_request"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    service_request_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("service_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    worker_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        ForeignKey("worker_profiles.id"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(
        # imported as Boolean via mapped_column default type inference
        default=True,
        nullable=False,
    )

    service_request: Mapped[ServiceRequest] = relationship(
        "ServiceRequest", back_populates="review"
    )
    customer: Mapped[User] = relationship(  # noqa: F821
        "User",
        back_populates="customer_reviews",
        foreign_keys=[customer_id],
    )
    worker_profile: Mapped[WorkerProfile] = relationship(  # noqa: F821
        "WorkerProfile",
        back_populates="customer_reviews",
        foreign_keys=[worker_profile_id],
    )

    def __repr__(self) -> str:
        return f"<CustomerReview rating={self.rating} request={self.service_request_id}>"


from app.models.user import User  # noqa: E402
from app.models.worker_profile import WorkerProfile  # noqa: E402
