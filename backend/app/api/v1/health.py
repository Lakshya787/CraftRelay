"""
CraftRelay Backend — Health check router.
"""

from __future__ import annotations

import importlib.metadata

from fastapi import APIRouter

from app.schemas.common import HealthStatus, SuccessResponse
from app.core.config import get_settings

router = APIRouter(tags=["health"])

# Try to read the package version; fall back gracefully.
try:
    _VERSION = importlib.metadata.version("craftrelay-backend")
except importlib.metadata.PackageNotFoundError:
    _VERSION = "0.1.0-dev"


@router.get(
    "/health",
    response_model=SuccessResponse[HealthStatus],
    summary="Health check",
    description="Returns the current health status, version, and environment of the API.",
)
async def health_check() -> SuccessResponse[HealthStatus]:
    """Lightweight liveness probe — no database call."""
    settings = get_settings()
    return SuccessResponse(
        data=HealthStatus(
            status="ok",
            version=_VERSION,
            environment=settings.app_env,
        ),
        message="Service is healthy.",
    )
