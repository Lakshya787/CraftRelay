"""
app/schemas/skills.py — Request/response schemas for skill endpoints.
"""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field, computed_field, model_validator

from app.models.worker_skill import ProficiencyLevel


class SkillResponse(BaseModel):
    """Single skill from the catalogue."""

    id: uuid.UUID
    name: str
    category: Optional[str] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class WorkerSkillResponse(BaseModel):
    """A worker's declared skill with proficiency level."""

    id: uuid.UUID
    skill_id: uuid.UUID
    proficiency_level: ProficiencyLevel
    years_used: Optional[int] = None
    notes: Optional[str] = None

    # Nested skill info
    skill: SkillResponse

    @computed_field
    @property
    def proficiency(self) -> str:
        return self.proficiency_level.value if hasattr(self.proficiency_level, "value") else str(self.proficiency_level)

    @computed_field
    @property
    def years_experience(self) -> Optional[int]:
        return self.years_used

    model_config = {"from_attributes": True}


class WorkerSkillDeclareRequest(BaseModel):
    """Body for POST /workers/me/skills."""

    skill_id: uuid.UUID
    proficiency_level: ProficiencyLevel = ProficiencyLevel.beginner
    years_used: Optional[int] = Field(None, ge=0, le=60)
    notes: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: any) -> any:
        if isinstance(data, dict):
            if "proficiency" in data and "proficiency_level" not in data:
                data["proficiency_level"] = data["proficiency"]
            if "years_experience" in data and "years_used" not in data:
                data["years_used"] = data["years_experience"]
        return data
