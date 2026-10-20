"""
app/api/v1/skills.py — Skill catalogue and worker-skill declaration endpoints.

GET    /skills                       → list all skills (public)
GET    /workers/me/skills            → list own declared skills
POST   /workers/me/skills            → declare a new skill
DELETE /workers/me/skills/{skill_id} → remove a declared skill
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession, require_worker_or_admin
from app.models.skill import Skill
from app.models.user import UserRole
from app.models.worker_profile import WorkerProfile
from app.models.worker_skill import ProficiencyLevel, WorkerSkill
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.skills import (
    SkillResponse,
    WorkerSkillDeclareRequest,
    WorkerSkillResponse,
)

router = APIRouter(tags=["skills"])


# ── Skill catalogue ───────────────────────────────────────────────────────────

@router.get(
    "/skills",
    response_model=PaginatedResponse[SkillResponse],
    summary="List skill catalogue",
)
async def list_skills(
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    category: str | None = Query(None),
    search: str | None = Query(None, description="Search by name"),
) -> PaginatedResponse[SkillResponse]:
    """Return the platform skill catalogue (public)."""
    query = select(Skill)
    if category:
        query = query.where(Skill.category.ilike(f"%{category}%"))
    if search:
        query = query.where(Skill.name.ilike(f"%{search}%"))
    query = query.order_by(Skill.name)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    skills = result.scalars().all()

    return PaginatedResponse(
        data=[SkillResponse.model_validate(s) for s in skills],
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )


# ── Worker skill declarations ─────────────────────────────────────────────────

@router.get(
    "/workers/me/skills",
    response_model=SuccessResponse[list[WorkerSkillResponse]],
    summary="List my declared skills",
)
async def list_my_skills(
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[list[WorkerSkillResponse]]:
    """Return all skills declared by the authenticated worker."""
    if current_user.role != UserRole.worker:
        raise HTTPException(status_code=403, detail="Only workers can view worker skills.")

    result = await db.execute(
        select(WorkerSkill)
        .where(WorkerSkill.worker_profile_id.in_(
            select(WorkerProfile.id).where(WorkerProfile.user_id == current_user.id)
        ))
        .join(WorkerSkill.skill)
        .order_by(Skill.name)
    )
    skills = result.scalars().all()
    return SuccessResponse(data=[WorkerSkillResponse.model_validate(ws) for ws in skills])


@router.post(
    "/workers/me/skills",
    response_model=SuccessResponse[WorkerSkillResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Declare a skill",
    dependencies=[require_worker_or_admin],
)
async def declare_skill(
    body: WorkerSkillDeclareRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[WorkerSkillResponse]:
    """Declare a skill on the authenticated worker's profile."""
    profile_result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found.")

    # Verify skill exists
    skill_result = await db.execute(select(Skill).where(Skill.id == body.skill_id))
    skill = skill_result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    # Check for duplicate
    existing = await db.execute(
        select(WorkerSkill).where(
            WorkerSkill.worker_profile_id == profile.id,
            WorkerSkill.skill_id == body.skill_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already declared this skill.")

    ws = WorkerSkill(
        worker_profile_id=profile.id,
        skill_id=body.skill_id,
        proficiency_level=body.proficiency_level,
        years_used=body.years_used,
        notes=body.notes,
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return SuccessResponse(
        data=WorkerSkillResponse.model_validate(ws),
        message="Skill declared.",
    )


@router.delete(
    "/workers/me/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Remove a declared skill",
    dependencies=[require_worker_or_admin],
)
async def remove_skill(
    skill_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Remove a skill declaration from the authenticated worker's profile."""
    profile_result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found.")

    result = await db.execute(
        select(WorkerSkill).where(
            WorkerSkill.worker_profile_id == profile.id,
            WorkerSkill.skill_id == skill_id,
        )
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Skill declaration not found.")

    await db.delete(ws)
    await db.commit()
