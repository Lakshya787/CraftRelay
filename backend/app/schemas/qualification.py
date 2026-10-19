"""
app/schemas/qualification.py — Request/response schemas for qualification endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class CriterionResponse(BaseModel):
    """Single competency criterion."""

    id: uuid.UUID
    code: str
    description: str
    guidance: Optional[str] = None
    is_mandatory: bool
    order_index: int
    rubric_reference: Optional[str] = None

    model_config = {"from_attributes": True}


class QualificationResponse(BaseModel):
    """
    Full qualification response.

    ``is_illustrative`` is always included so clients can display a disclaimer
    when the flag is True.  All seed data sets this True.
    """

    id: uuid.UUID
    code: str
    title: str
    trade: str
    issuing_body: str
    level: int
    duration_hours: Optional[int] = None
    description: Optional[str] = None
    is_active: bool
    is_illustrative: bool
    current_version: int
    source_url: Optional[str] = None
    publication_date: Optional[date] = None
    rubric_reference: Optional[str] = None

    model_config = {"from_attributes": True}


class QualificationSummaryResponse(BaseModel):
    """Compact qualification card for list views."""

    id: uuid.UUID
    code: str
    title: str
    trade: str
    level: int
    is_illustrative: bool
    issuing_body: str
    source_url: Optional[str] = None

    model_config = {"from_attributes": True}
