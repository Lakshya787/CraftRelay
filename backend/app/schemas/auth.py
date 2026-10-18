"""
app/schemas/auth.py — Request/response schemas for authentication endpoints.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    """Body for POST /auth/register."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole  # Accepted from the client ONLY at registration time.
    # ↑ Note: This is intentionally limited to the four valid enum values.
    #   The backend never elevates a self-assigned role — admins must be
    #   created via seed scripts or the admin panel.

    @field_validator("role")
    @classmethod
    def role_not_admin(cls, v: UserRole) -> UserRole:
        """Prevent self-registration as admin."""
        if v == UserRole.admin:
            raise ValueError("Cannot self-register as admin.")
        return v


class LoginRequest(BaseModel):
    """Body for POST /auth/login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response envelope for a successful login."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public-facing user record (GET /me and embedded in other responses)."""

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool

    model_config = {"from_attributes": True}
