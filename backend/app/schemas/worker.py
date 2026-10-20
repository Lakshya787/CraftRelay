"""
app/schemas/worker.py — Request/response schemas for worker profile endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WorkerProfileResponse(BaseModel):
    """Full worker profile, returned in list and detail views."""

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: Optional[str] = None
    trade_title: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    years_experience: Optional[int] = None
    is_available: bool
    average_rating: float | None = None
    total_reviews: int

    model_config = {"from_attributes": True}


class WorkerSummaryResponse(BaseModel):
    """Compact worker card for list endpoints."""

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: Optional[str] = None
    trade_title: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_available: bool
    average_rating: float | None = None
    total_reviews: int

    model_config = {"from_attributes": True}


class WorkerVerificationResponse(BaseModel):
    """A formal competency verification issued for a worker."""

    id: uuid.UUID
    qualification_id: uuid.UUID
    qualification_code: str
    qualification_title: str
    trade: str
    level: int
    issuing_body: str
    is_illustrative: bool
    status: str
    certificate_number: str | None = None
    qualification_version_number: int
    awarded_by_id: uuid.UUID | None = None
    created_at: datetime


class WorkerProfileUpdateRequest(BaseModel):
    """Body for PATCH /workers/me — all fields optional."""

    trade_title: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=2000)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    years_experience: int | None = Field(None, ge=0, le=70)
    is_available: bool | None = None
