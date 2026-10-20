"""
app/api/v1/workers.py — Worker profile endpoints.

GET   /workers        → paginated public list of worker profiles
GET   /workers/{id}   → single worker profile (public)
PATCH /workers/me     → update own profile (worker only, ownership enforced)
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession, require_worker_or_admin
from app.models.assessment import CompetencyVerification, VerificationStatus
from app.models.qualification import Qualification, QualificationVersion
from app.models.user import UserRole
from app.models.worker_profile import WorkerProfile
from app.schemas.common import PaginatedResponse, SuccessResponse
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
) -> PaginatedResponse[WorkerSummaryResponse]:
    """Public endpoint — returns paginated, slim worker cards."""
    query = select(WorkerProfile)

    if trade:
        query = query.where(WorkerProfile.trade_title.ilike(f"%{trade}%"))
    if available is not None:
        query = query.where(WorkerProfile.is_available == available)

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
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        # Auto-create empty profile (worker registered before auto-create was in place)
        profile = WorkerProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return SuccessResponse(data=WorkerProfileResponse.model_validate(profile))



@router.patch(
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
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
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
        select(WorkerProfile).where(WorkerProfile.id == worker_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )
    return SuccessResponse(data=WorkerProfileResponse.model_validate(profile))
