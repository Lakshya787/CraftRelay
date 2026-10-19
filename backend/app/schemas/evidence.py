"""
app/schemas/evidence.py — Request/response schemas for evidence endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class EvidenceItemResponse(BaseModel):
    """Full evidence item response."""

    id: uuid.UUID
    worker_profile_id: uuid.UUID
    title: str
    description: Optional[str] = None
    evidence_type: str
    review_status: str
    original_filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    storage_backend: str
    file_url: Optional[str] = None
    is_verified: bool
    review_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvidenceURLCreateRequest(BaseModel):
    """Body for POST /evidence/url — URL-based evidence."""

    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    url: HttpUrl
    criterion_id: Optional[uuid.UUID] = None
