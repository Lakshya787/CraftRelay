"""
app/schemas/worker.py — Request/response schemas for worker profile endpoints.
"""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class WorkerProfileResponse(BaseModel):
    """Full worker profile, returned in list and detail views."""

    id: uuid.UUID
    user_id: uuid.UUID
    trade_title: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    years_experience: Optional[int] = None
    is_available: bool
    average_rating: Optional[float] = None
    total_reviews: int

    model_config = {"from_attributes": True}


class WorkerSummaryResponse(BaseModel):
    """Compact worker card for list endpoints."""

    id: uuid.UUID
    user_id: uuid.UUID
    trade_title: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_available: bool
    average_rating: Optional[float] = None
    total_reviews: int

    model_config = {"from_attributes": True}


class WorkerProfileUpdateRequest(BaseModel):
    """Body for PATCH /workers/me — all fields optional."""

    trade_title: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=2000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    years_experience: Optional[int] = Field(None, ge=0, le=70)
    is_available: Optional[bool] = None
