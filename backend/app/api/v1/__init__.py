"""app/api/v1/__init__.py — v1 router aggregator."""

from fastapi import APIRouter

<<<<<<< HEAD
from app.api.v1 import auth, evidence, health, marketplace, qualifications, skills, workers
=======
from app.api.v1 import (
    assessments,
    auth,
    evidence,
    health,
    qualifications,
    skills,
    workers,
)
>>>>>>> 52822fbe5aeeb63a728cd2d65e4db7cc95597355

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(workers.router)
router.include_router(qualifications.router)
router.include_router(evidence.router)
router.include_router(skills.router)
<<<<<<< HEAD
router.include_router(marketplace.router)
=======
router.include_router(assessments.router)
>>>>>>> 52822fbe5aeeb63a728cd2d65e4db7cc95597355
