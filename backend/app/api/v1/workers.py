"""
app/api/v1/workers.py — Worker profile endpoints.

GET   /workers                → paginated public list of worker profiles
GET   /workers/{id}           → single worker profile (public)
GET   /workers/{id}/skills    → worker's declared skills and verified competencies
PATCH /workers/me             → update own profile (worker only, ownership enforced)
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession, require_worker_or_admin
from app.models.assessment import CompetencyVerification, VerificationStatus
from app.models.qualification import Qualification, QualificationVersion
from app.models.skill import Skill
from app.models.user import UserRole
from app.models.worker_profile import WorkerProfile
from app.models.worker_skill import WorkerSkill
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.marketplace import (
    DeclaredSkillItem,
    VerifiedCompetencyItem,
    WorkerSkillsResponse,
)
from app.schemas.skills import SkillResponse
from app.schemas.worker import (
    WorkerProfileResponse,
    WorkerProfileUpdateRequest,
    WorkerSummaryResponse,
    WorkerVerificationResponse,
)

router = APIRouter(prefix="/workers", tags=["workers"])


@router.get(
    "",
    response_model=PaginatedResponse[WorkerSummaryResponse],
    summary="List all worker profiles",
)
async def list_workers(
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    trade: str | None = Query(None, description="Filter by trade title"),
    available: bool | None = Query(None, description="Filter by availability"),
    skill: str | None = Query(None, description="Filter by skill name"),
    city: str | None = Query(None, description="Filter by city"),
    state: str | None = Query(None, description="Filter by state"),
    verified_only: bool | None = Query(None, description="Filter workers with verified competencies"),
) -> PaginatedResponse[WorkerSummaryResponse]:
    """Public endpoint — returns paginated, slim worker cards."""
    query = select(WorkerProfile).options(selectinload(WorkerProfile.user))

    if trade:
        query = query.where(WorkerProfile.trade_title.ilike(f"%{trade}%"))
    if available is not None:
        query = query.where(WorkerProfile.is_available == available)
    if city:
        query = query.where(WorkerProfile.city.ilike(f"%{city}%"))
    if state:
        query = query.where(WorkerProfile.state.ilike(f"%{state}%"))
    if skill:
        skill_subq = (
            select(WorkerSkill.worker_profile_id)
            .join(WorkerSkill.skill)
            .where(Skill.name.ilike(f"%{skill}%"))
        )
        query = query.where(WorkerProfile.id.in_(skill_subq))
    if verified_only:
        verif_subq = (
            select(CompetencyVerification.worker_profile_id)
            .where(CompetencyVerification.status == VerificationStatus.verified)
        )
        query = query.where(WorkerProfile.id.in_(verif_subq))

    # Total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Paginated data
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    profiles = result.scalars().all()

    return PaginatedResponse(
        data=[WorkerSummaryResponse.model_validate(p) for p in profiles],
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )


@router.get(
    "/me",
    response_model=SuccessResponse[WorkerProfileResponse],
    summary="Get own worker profile",
)
async def get_my_profile(
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[WorkerProfileResponse]:
    """Return the authenticated worker's own profile, creating it if it does not yet exist."""
    if current_user.role != UserRole.worker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers have a worker profile.",
        )
    result = await db.execute(
        select(WorkerProfile)
        .where(WorkerProfile.user_id == current_user.id)
        .options(selectinload(WorkerProfile.user))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        # Auto-create empty profile (worker registered before auto-create was in place)
        profile = WorkerProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        # re-fetch with user loaded
        result = await db.execute(
            select(WorkerProfile)
            .where(WorkerProfile.id == profile.id)
            .options(selectinload(WorkerProfile.user))
        )
        profile = result.scalar_one()
    return SuccessResponse(data=WorkerProfileResponse.model_validate(profile))


@router.patch(
    "/me",
    response_model=SuccessResponse[WorkerProfileResponse],
    summary="Update own worker profile",
    dependencies=[require_worker_or_admin],
)
@router.put(
    "/me",
    response_model=SuccessResponse[WorkerProfileResponse],
    summary="Update own worker profile",
    dependencies=[require_worker_or_admin],
)
async def update_my_profile(
    body: WorkerProfileUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[WorkerProfileResponse]:
    """
    Partial update of the authenticated worker's profile.

    Ownership check: only the owning worker (role=worker) or an admin may
    reach this endpoint.  Workers can only update their own profile — they
    cannot pass a different worker's ID.
    """
    result = await db.execute(
        select(WorkerProfile)
        .where(WorkerProfile.user_id == current_user.id)
        .options(selectinload(WorkerProfile.user))
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return SuccessResponse(
        data=WorkerProfileResponse.model_validate(profile),
        message="Profile updated.",
    )


async def _verifications_for(
    db: DbSession,
    worker_profile_id: uuid.UUID,
    *,
    verified_only: bool,
) -> list[WorkerVerificationResponse]:
    query = (
        select(
            CompetencyVerification,
            Qualification,
            QualificationVersion.version_number,
        )
        .join(
            Qualification,
            Qualification.id == CompetencyVerification.qualification_id,
        )
        .join(
            QualificationVersion,
            QualificationVersion.id
            == CompetencyVerification.qualification_version_id,
        )
        .where(CompetencyVerification.worker_profile_id == worker_profile_id)
        .order_by(CompetencyVerification.created_at.desc())
    )
    if verified_only:
        query = query.where(
            CompetencyVerification.status == VerificationStatus.verified
        )

    rows = (await db.execute(query)).all()
    return [
        WorkerVerificationResponse(
            id=verification.id,
            qualification_id=qualification.id,
            qualification_code=qualification.code,
            qualification_title=qualification.title,
            trade=qualification.trade,
            level=qualification.level,
            issuing_body=qualification.issuing_body,
            is_illustrative=qualification.is_illustrative,
            status=verification.status.value,
            certificate_number=verification.certificate_number,
            qualification_version_number=version_number,
            awarded_by_id=verification.awarded_by_id,
            created_at=verification.created_at,
        )
        for verification, qualification, version_number in rows
    ]


@router.get(
    "/me/verifications",
    response_model=SuccessResponse[list[WorkerVerificationResponse]],
    summary="List my formal competency verifications",
)
async def list_my_verifications(
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[list[WorkerVerificationResponse]]:
    """Verified competencies for the authenticated worker (all statuses)."""
    if current_user.role != UserRole.worker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers have competency verifications.",
        )
    profile_result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )
    return SuccessResponse(
        data=await _verifications_for(db, profile.id, verified_only=False)
    )


@router.get(
    "/{worker_id}/verifications",
    response_model=SuccessResponse[list[WorkerVerificationResponse]],
    summary="List a worker's verified competencies (public)",
)
async def list_worker_verifications(
    worker_id: uuid.UUID,
    db: DbSession,
) -> SuccessResponse[list[WorkerVerificationResponse]]:
    """Public view — only formally verified competencies are returned."""
    profile_result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.id == worker_id)
    )
    if profile_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )
    return SuccessResponse(
        data=await _verifications_for(db, worker_id, verified_only=True)
    )


@router.get(
    "/{worker_id}",
    response_model=SuccessResponse[WorkerProfileResponse],
    summary="Get a worker profile by ID",
)
async def get_worker(
    worker_id: uuid.UUID,
    db: DbSession,
) -> SuccessResponse[WorkerProfileResponse]:
    """Public endpoint — returns a single worker's full profile."""
    result = await db.execute(
        select(WorkerProfile)
        .where(WorkerProfile.id == worker_id)
        .options(
            selectinload(WorkerProfile.worker_skills).selectinload(WorkerSkill.skill),
            selectinload(WorkerProfile.competency_verifications),
            selectinload(WorkerProfile.user),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )
    return SuccessResponse(data=WorkerProfileResponse.model_validate(profile))


@router.get(
    "/{worker_id}/skills",
    response_model=SuccessResponse[WorkerSkillsResponse],
    summary="Get worker's declared skills and verified competencies",
)
async def get_worker_skills(
    worker_id: uuid.UUID,
    db: DbSession,
) -> SuccessResponse[WorkerSkillsResponse]:
    """
    Public endpoint — returns declared skills and verified competencies.
    Clearly separates self-reported declared skills from assessor-approved competencies.
    """
    profile_result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.id == worker_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )

    # 1. Declared skills (WorkerSkill)
    skills_result = await db.execute(
        select(WorkerSkill)
        .where(WorkerSkill.worker_profile_id == worker_id)
        .options(selectinload(WorkerSkill.skill))
    )
    worker_skills = skills_result.scalars().all()

    # 2. Verified competencies (status=verified)
    verifs_result = await db.execute(
        select(CompetencyVerification)
        .where(
            CompetencyVerification.worker_profile_id == worker_id,
            CompetencyVerification.status == VerificationStatus.verified,
        )
        .options(
            selectinload(CompetencyVerification.qualification),
            selectinload(CompetencyVerification.qualification_version).selectinload(QualificationVersion.qualification),
        )
    )
    verifications = verifs_result.scalars().all()

    declared_skills = [
        DeclaredSkillItem(
            id=ws.id,
            skill_id=ws.skill_id,
            skill_name=ws.skill.name if ws.skill else None,
            proficiency_level=ws.proficiency_level.value if hasattr(ws.proficiency_level, "value") else str(ws.proficiency_level),
            years_used=ws.years_used,
            notes=ws.notes,
            skill=SkillResponse.model_validate(ws.skill) if ws.skill else None,
        )
        for ws in worker_skills
    ]

    verified_competencies = []
    for cv in verifications:
        qual_title = None
        if cv.qualification:
            qual_title = cv.qualification.title
        elif cv.qualification_version and cv.qualification_version.qualification:
            qual_title = cv.qualification_version.qualification.title

        verified_competencies.append(
            VerifiedCompetencyItem(
                id=cv.id,
                qualification_id=cv.qualification_id,
                qualification_title=qual_title,
                certificate_number=cv.certificate_number,
                status=cv.status.value if hasattr(cv.status, "value") else str(cv.status),
                qualification_version_id=cv.qualification_version_id,
            )
        )

    return SuccessResponse(
        data=WorkerSkillsResponse(
            declared_skills=declared_skills,
            verified_competencies=verified_competencies,
        )
    )
