"""
app/models/user.py — User account and role definitions.

Roles are stored on the backend and never accepted from the client.
Passwords are stored as bcrypt hashes only — never plaintext.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    """Platform roles. Roles are always assigned server-side."""

    worker = "worker"
    assessor = "assessor"
    customer = "customer"
    admin = "admin"


class User(Base, TimestampMixin):
    """User account record.

    Design notes
    ────────────
    • ``password_hash`` stores bcrypt output only.  The column is named
      deliberately to make accidental plaintext storage obvious.
    • ``role`` uses a PostgreSQL native ENUM type for constraint enforcement
      at the DB level.
    • The table-level UniqueConstraint on email is also enforced by an index.
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", create_constraint=True),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    worker_profile: Mapped[WorkerProfile | None] = relationship(  # noqa: F821
        "WorkerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(  # noqa: F821
        "AuditLog",
        back_populates="actor",
        cascade="all, delete-orphan",
    )
    service_requests: Mapped[list[ServiceRequest]] = relationship(  # noqa: F821
        "ServiceRequest",
        back_populates="customer",
        foreign_keys="ServiceRequest.customer_id",
    )
    customer_reviews: Mapped[list[CustomerReview]] = relationship(  # noqa: F821
        "CustomerReview",
        back_populates="customer",
        foreign_keys="CustomerReview.customer_id",
    )
    assessment_cases_as_assessor: Mapped[list[AssessmentCase]] = relationship(  # noqa: F821
        "AssessmentCase",
        back_populates="assessor",
        foreign_keys="AssessmentCase.assessor_id",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"


# Deferred imports to resolve forward references for type checkers only.
from app.models.worker_profile import WorkerProfile  # noqa: E402
from app.models.audit import AuditLog  # noqa: E402
from app.models.service import ServiceRequest, CustomerReview  # noqa: E402
from app.models.assessment import AssessmentCase  # noqa: E402
