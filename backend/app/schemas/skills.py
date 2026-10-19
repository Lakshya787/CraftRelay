"""
app/schemas/skills.py — Request/response schemas for skill endpoints.
"""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field

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

    model_config = {"from_attributes": True}


class WorkerSkillDeclareRequest(BaseModel):
    """Body for POST /workers/me/skills."""

    skill_id: uuid.UUID
    proficiency_level: ProficiencyLevel = ProficiencyLevel.beginner
    years_used: Optional[int] = Field(None, ge=0, le=60)
    notes: Optional[str] = Field(None, max_length=500)
