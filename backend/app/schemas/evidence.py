"""
app/schemas/evidence.py — Request/response schemas for evidence endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class EvidenceItemResponse(BaseModel):
    """Full evidence item response."""

    id: uuid.UUID
    worker_profile_id: uuid.UUID
    title: str
    description: str | None = None
    evidence_type: str
    review_status: str
    original_filename: str | None = None
    file_size_bytes: int | None = None
    mime_type: str | None = None
    storage_backend: str
    file_url: str | None = None
    is_verified: bool
    review_note: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvidenceReviewRequest(BaseModel):
    """Body for PATCH /evidence/{id}/review (assessor/admin only)."""

    review_status: Literal["accepted", "rejected"]
    note: str | None = Field(None, max_length=2000)


class EvidenceURLCreateRequest(BaseModel):
    """Body for POST /evidence/url — URL-based evidence."""

    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = Field(None, max_length=2000)
    url: HttpUrl
    criterion_id: uuid.UUID | None = None
