"""app/api/v1/__init__.py — v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1 import health

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
