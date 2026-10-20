"""app/api/v1/__init__.py — v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1 import (
    assessments,
    auth,
    evidence,
    health,
    qualifications,
    skills,
    workers,
)

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(workers.router)
router.include_router(qualifications.router)
router.include_router(evidence.router)
router.include_router(skills.router)
router.include_router(assessments.router)
