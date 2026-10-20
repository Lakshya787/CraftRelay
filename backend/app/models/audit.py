"""
app/models/audit.py — Immutable audit log for all significant platform events.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.types import JSONBType, UUIDType


class AuditLog(Base, TimestampMixin):
    """
    Append-only record of significant platform actions.

    Design notes:
    • No UPDATE or DELETE operations should ever target this table in
      normal operation.  Application code should only INSERT rows.
    • ``actor_id`` is nullable so system-generated events (e.g., cron jobs)
      can be recorded without a user FK.
    • ``resource_type`` / ``resource_id`` identify the affected entity.
    • ``payload`` is a free-form JSONB snapshot of relevant state at event time.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUIDType(),
        primary_key=True,
        default=uuid.uuid4,
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType(),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str | None] = mapped_column(String(100), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(36), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict | None] = mapped_column(JSONBType)
    ip_address: Mapped[str | None] = mapped_column(String(45))

    # ── Relationships ─────────────────────────────────────────────────────────
    actor: Mapped[User | None] = relationship(  # noqa: F821
        "User", back_populates="audit_logs"
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog action={self.action!r} "
            f"actor={self.actor_id} resource={self.resource_type}/{self.resource_id}>"
        )


from app.models.user import User  # noqa: E402
