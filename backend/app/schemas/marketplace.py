"""
app/schemas/marketplace.py — Request/response schemas for marketplace and service request endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.service import RequestStatus
from app.schemas.skills import SkillResponse


# ── Request Bodies ────────────────────────────────────────────────────────────

class ServiceRequestCreate(BaseModel):
    """Body for POST /service-requests."""

    worker_profile_id: uuid.UUID
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    service_location: Optional[str] = Field(None, max_length=500)
    preferred_date: Optional[date] = None


class WorkerCompletionBody(BaseModel):
    """Body for POST /service-requests/{id}/complete-worker."""

    worker_notes: Optional[str] = None
    photo_url: Optional[str] = None


class CustomerConfirmationBody(BaseModel):
    """Body for POST /service-requests/{id}/complete-customer."""

    customer_notes: Optional[str] = None


class ReviewCreate(BaseModel):
    """Body for POST /service-requests/{id}/reviews."""

    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)


# ── Response Schemas ──────────────────────────────────────────────────────────

class UserBriefResponse(BaseModel):
    """Minimal user summary embedded in service requests."""

    id: uuid.UUID
    full_name: str
    email: str

    model_config = {"from_attributes": True}


class WorkerBriefResponse(BaseModel):
    """Minimal worker profile summary embedded in service requests."""

    id: uuid.UUID
    user_id: uuid.UUID
    trade_title: Optional[str] = None
    city: Optional[str] = None
    full_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CompletionResponse(BaseModel):
    """Dual-confirmation completion record."""

    id: uuid.UUID
    service_request_id: uuid.UUID
    worker_notes: Optional[str] = None
    photo_url: Optional[str] = None
    worker_confirmed_at: Optional[datetime] = None
    customer_confirmed_at: Optional[datetime] = None
    customer_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReviewResponse(BaseModel):
    """Customer review of a completed service request."""

    id: uuid.UUID
    service_request_id: uuid.UUID
    customer_id: uuid.UUID
    worker_profile_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    is_public: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ServiceRequestResponse(BaseModel):
    """Full service request representation."""

    id: uuid.UUID
    customer_id: uuid.UUID
    worker_profile_id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: RequestStatus
    agreed_price: Optional[float] = None
    service_location: Optional[str] = None
    preferred_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    customer: Optional[UserBriefResponse] = None
    worker_profile: Optional[WorkerBriefResponse] = None
    completion: Optional[CompletionResponse] = None
    review: Optional[ReviewResponse] = None

    model_config = {"from_attributes": True}


# ── Worker Skills & Competencies ──────────────────────────────────────────────

class DeclaredSkillItem(BaseModel):
    """A self-reported worker skill."""

    id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: Optional[str] = None
    proficiency_level: str
    years_used: Optional[int] = None
    notes: Optional[str] = None
    skill: Optional[SkillResponse] = None

    model_config = {"from_attributes": True}


class VerifiedCompetencyItem(BaseModel):
    """An assessor-verified competency verification."""

    id: uuid.UUID
    qualification_id: uuid.UUID
    qualification_title: Optional[str] = None
    certificate_number: Optional[str] = None
    status: str
    qualification_version_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class WorkerSkillsResponse(BaseModel):
    """Delineation of declared self-reported skills vs verified competencies."""

    declared_skills: list[DeclaredSkillItem]
    verified_competencies: list[VerifiedCompetencyItem]

    model_config = {"from_attributes": True}
