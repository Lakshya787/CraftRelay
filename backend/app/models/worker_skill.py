"""
app/models/worker_skill.py — Junction table linking workers to skills.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ProficiencyLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class WorkerSkill(Base, TimestampMixin):
    """
    Links a WorkerProfile to a Skill with a self-reported proficiency level.
    Composite unique constraint prevents duplicate (worker, skill) pairs.
    """

    __tablename__ = "worker_skills"
    __table_args__ = (
        UniqueConstraint(
            "worker_profile_id", "skill_id", name="uq_worker_skills_profile_skill"
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
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    proficiency_level: Mapped[ProficiencyLevel] = mapped_column(
        Enum(ProficiencyLevel, name="proficiency_level_enum"),
        nullable=False,
        default=ProficiencyLevel.beginner,
    )
    years_used: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(String(500))

    # ── Relationships ─────────────────────────────────────────────────────────
    worker_profile: Mapped[WorkerProfile] = relationship(  # noqa: F821
        "WorkerProfile", back_populates="worker_skills"
    )
    skill: Mapped[Skill] = relationship(  # noqa: F821
        "Skill", back_populates="worker_skills"
    )

    @property
    def skill_name(self) -> str | None:
        if "skill" in self.__dict__ and self.skill is not None:
            return self.skill.name
        return None

    def __repr__(self) -> str:
        return (
            f"<WorkerSkill worker={self.worker_profile_id} "
            f"skill={self.skill_id} level={self.proficiency_level}>"
        )


from app.models.worker_profile import WorkerProfile  # noqa: E402
from app.models.skill import Skill  # noqa: E402
