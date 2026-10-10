"""
CraftRelay Backend — Shared API response schemas.

Every API endpoint returns one of these envelope types so that
mobile clients have a consistent contract to parse.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """Envelope for successful responses."""

    success: bool = True
    data: T
    message: str | None = None


class ErrorDetail(BaseModel):
    """Single error detail object."""

    field: str | None = None   # None for non-field errors
    message: str


class ErrorResponse(BaseModel):
    """Envelope for error responses."""

    success: bool = False
    errors: list[ErrorDetail]
    message: str = "One or more errors occurred."


class PaginatedResponse(BaseModel, Generic[T]):
    """Envelope for paginated list responses."""

    success: bool = True
    data: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool


class HealthStatus(BaseModel):
    """Health-check response schema."""

    status: str = "ok"
    version: str
    environment: str
