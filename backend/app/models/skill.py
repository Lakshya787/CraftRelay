"""
app/models/skill.py — Master skill catalogue.
"""

from __future__ import annotations

import uuid

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Skill(Base, TimestampMixin):
    """
    Platform-wide skill reference (e.g. "Cable Laying", "Pipe Joining").
    Skills are managed by admins; workers declare them via WorkerSkill.
    """

    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("name", name="uq_skills_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)

    # ── Relationships ─────────────────────────────────────────────────────────
    worker_skills: Mapped[list[WorkerSkill]] = relationship(  # noqa: F821
        "WorkerSkill",
        back_populates="skill",
    )

    def __repr__(self) -> str:
        return f"<Skill id={self.id} name={self.name!r}>"


from app.models.worker_skill import WorkerSkill  # noqa: E402
