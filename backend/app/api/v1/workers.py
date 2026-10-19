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
from app.models.user import UserRole
from app.models.worker_profile import WorkerProfile
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.worker import WorkerProfileResponse, WorkerProfileUpdateRequest, WorkerSummaryResponse

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
