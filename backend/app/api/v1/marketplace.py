"""
app/api/v1/marketplace.py — Marketplace and service request lifecycle endpoints.

POST   /service-requests                      — customer creates request
GET    /service-requests                      — list (customers see their own, workers see pending for them)
GET    /service-requests/{id}                 — detail
POST   /service-requests/{id}/accept          — worker accepts (REQUESTED → ACCEPTED)
POST   /service-requests/{id}/decline         — worker declines (REQUESTED → DECLINED)
POST   /service-requests/{id}/start           — worker starts (ACCEPTED → IN_PROGRESS)
POST   /service-requests/{id}/complete-worker — worker marks complete (IN_PROGRESS → COMPLETION_PENDING)
POST   /service-requests/{id}/complete-customer — customer confirms (COMPLETION_PENDING → COMPLETED)
POST   /service-requests/{id}/cancel          — either cancels (only from REQUESTED, ACCEPTED states)

POST   /service-requests/{id}/reviews         — customer posts review
GET    /service-requests/{id}/reviews         — get review for a request
GET    /workers/{worker_id}/reviews           — public reviews for a worker
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession, require_customer
from app.models.service import CustomerReview, RequestStatus, ServiceCompletion, ServiceRequest
from app.models.user import UserRole
from app.models.worker_profile import WorkerProfile
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.marketplace import (
    CustomerConfirmationBody,
    ReviewCreate,
    ReviewResponse,
    ServiceRequestCreate,
    ServiceRequestResponse,
    WorkerCompletionBody,
)

router = APIRouter(tags=["marketplace"])


# ── Server-side state machine definition ───────────────────────────────────────
ALLOWED_TRANSITIONS: dict[RequestStatus, list[RequestStatus]] = {
    RequestStatus.requested: [
        RequestStatus.accepted,
        RequestStatus.declined,
        RequestStatus.cancelled,
    ],
    RequestStatus.accepted: [
        RequestStatus.in_progress,
        RequestStatus.cancelled,
    ],
    RequestStatus.in_progress: [
        RequestStatus.completion_pending,
        RequestStatus.cancelled,
    ],
    RequestStatus.completion_pending: [
        RequestStatus.completed,
    ],
    # Terminal states:
    RequestStatus.completed: [],
    RequestStatus.declined: [],
    RequestStatus.cancelled: [],
}


async def _get_service_request_with_relations(
    db: DbSession,
    request_id: uuid.UUID,
) -> ServiceRequest | None:
    """Fetch a service request with all relationships eagerly loaded."""
    result = await db.execute(
        select(ServiceRequest)
        .where(ServiceRequest.id == request_id)
        .options(
            selectinload(ServiceRequest.customer),
            selectinload(ServiceRequest.worker_profile).selectinload(WorkerProfile.user),
            selectinload(ServiceRequest.completion),
            selectinload(ServiceRequest.review),
        )
    )
    return result.scalar_one_or_none()


# ── Service Requests Endpoints ────────────────────────────────────────────────

@router.post(
    "/service-requests",
    response_model=SuccessResponse[ServiceRequestResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service request",
    dependencies=[require_customer],
)
async def create_service_request(
    body: ServiceRequestCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ServiceRequestResponse]:
    """Customer submits a new service request to a worker."""
    # Verify worker exists
    worker_result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.id == body.worker_profile_id)
    )
    worker = worker_result.scalar_one_or_none()
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )

    sr = ServiceRequest(
        customer_id=current_user.id,
        worker_profile_id=body.worker_profile_id,
        title=body.title,
        description=body.description,
        service_location=body.service_location,
        preferred_date=body.preferred_date,
        status=RequestStatus.requested,
    )
    db.add(sr)
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Service request created successfully.",
    )


@router.get(
    "/service-requests",
    response_model=PaginatedResponse[ServiceRequestResponse],
    summary="List service requests",
)
async def list_service_requests(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[RequestStatus] = Query(None, description="Filter by status"),
) -> PaginatedResponse[ServiceRequestResponse]:
    """
    List service requests visible to the authenticated user.
    Customers see their own requests; workers see requests assigned to them.
    Admins see all requests.
    """
    query = (
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.customer),
            selectinload(ServiceRequest.worker_profile).selectinload(WorkerProfile.user),
            selectinload(ServiceRequest.completion),
            selectinload(ServiceRequest.review),
        )
        .order_by(ServiceRequest.created_at.desc())
    )

    if current_user.role == UserRole.customer:
        query = query.where(ServiceRequest.customer_id == current_user.id)
    elif current_user.role == UserRole.worker:
        worker_res = await db.execute(
            select(WorkerProfile.id).where(WorkerProfile.user_id == current_user.id)
        )
        worker_profile_id = worker_res.scalar_one_or_none()
        if not worker_profile_id:
            return PaginatedResponse(
                data=[],
                total=0,
                page=page,
                page_size=page_size,
                has_next=False,
                has_previous=False,
            )
        query = query.where(ServiceRequest.worker_profile_id == worker_profile_id)
    elif current_user.role == UserRole.admin:
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    if status:
        query = query.where(ServiceRequest.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    return PaginatedResponse(
        data=[ServiceRequestResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )


@router.get(
    "/service-requests/{id}",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Get service request detail",
)
async def get_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ServiceRequestResponse]:
    """Retrieve full detail for a single service request."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    is_customer = current_user.id == sr.customer_id
    is_worker = (
        sr.worker_profile is not None
        and sr.worker_profile.user_id == current_user.id
    )
    is_admin = current_user.role == UserRole.admin

    if not (is_customer or is_worker or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this service request.",
        )

    return SuccessResponse(data=ServiceRequestResponse.model_validate(sr))


@router.post(
    "/service-requests/{id}/accept",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Worker accepts service request",
)
async def accept_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ServiceRequestResponse]:
    """Worker accepts a requested job (REQUESTED → ACCEPTED)."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    if not (sr.worker_profile and sr.worker_profile.user_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned worker can accept this request.",
        )

    if RequestStatus.accepted not in ALLOWED_TRANSITIONS.get(sr.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {sr.status.value} to {RequestStatus.accepted.value}.",
        )

    sr.status = RequestStatus.accepted
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Service request accepted.",
    )


@router.post(
    "/service-requests/{id}/decline",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Worker declines service request",
)
async def decline_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ServiceRequestResponse]:
    """Worker declines a requested job (REQUESTED → DECLINED)."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    if not (sr.worker_profile and sr.worker_profile.user_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned worker can decline this request.",
        )

    if RequestStatus.declined not in ALLOWED_TRANSITIONS.get(sr.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {sr.status.value} to {RequestStatus.declined.value}.",
        )

    sr.status = RequestStatus.declined
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Service request declined.",
    )


@router.post(
    "/service-requests/{id}/start",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Worker starts service request",
)
async def start_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ServiceRequestResponse]:
    """Worker starts an accepted job (ACCEPTED → IN_PROGRESS)."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    if not (sr.worker_profile and sr.worker_profile.user_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned worker can start this request.",
        )

    if RequestStatus.in_progress not in ALLOWED_TRANSITIONS.get(sr.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {sr.status.value} to {RequestStatus.in_progress.value}.",
        )

    sr.status = RequestStatus.in_progress
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Service request started.",
    )


@router.post(
    "/service-requests/{id}/complete-worker",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Worker marks service request complete",
)
async def complete_worker_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    body: Optional[WorkerCompletionBody] = None,
) -> SuccessResponse[ServiceRequestResponse]:
    """Worker marks work done with dual confirmation record (IN_PROGRESS → COMPLETION_PENDING)."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    if not (sr.worker_profile and sr.worker_profile.user_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned worker can submit completion.",
        )

    if RequestStatus.completion_pending not in ALLOWED_TRANSITIONS.get(sr.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {sr.status.value} to {RequestStatus.completion_pending.value}.",
        )

    # Create or update ServiceCompletion
    comp_result = await db.execute(
        select(ServiceCompletion).where(ServiceCompletion.service_request_id == sr.id)
    )
    completion = comp_result.scalar_one_or_none()
    now_utc = datetime.now(timezone.utc)

    if not completion:
        completion = ServiceCompletion(
            service_request_id=sr.id,
            worker_notes=body.worker_notes if body else None,
            photo_url=body.photo_url if body else None,
            worker_confirmed_at=now_utc,
        )
        db.add(completion)
    else:
        if body and body.worker_notes is not None:
            completion.worker_notes = body.worker_notes
        if body and body.photo_url is not None:
            completion.photo_url = body.photo_url
        completion.worker_confirmed_at = now_utc

    sr.status = RequestStatus.completion_pending
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Work marked complete. Awaiting customer confirmation.",
    )


@router.post(
    "/service-requests/{id}/complete-customer",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Customer confirms completion",
)
async def complete_customer_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    body: Optional[CustomerConfirmationBody] = None,
) -> SuccessResponse[ServiceRequestResponse]:
    """Customer confirms work completion (COMPLETION_PENDING → COMPLETED)."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    if sr.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the customer who created this request can confirm completion.",
        )

    if RequestStatus.completed not in ALLOWED_TRANSITIONS.get(sr.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {sr.status.value} to {RequestStatus.completed.value}.",
        )

    comp_result = await db.execute(
        select(ServiceCompletion).where(ServiceCompletion.service_request_id == sr.id)
    )
    completion = comp_result.scalar_one_or_none()
    now_utc = datetime.now(timezone.utc)

    if not completion:
        completion = ServiceCompletion(
            service_request_id=sr.id,
            customer_notes=body.customer_notes if body else None,
            customer_confirmed_at=now_utc,
        )
        db.add(completion)
    else:
        if body and body.customer_notes is not None:
            completion.customer_notes = body.customer_notes
        completion.customer_confirmed_at = now_utc

    sr.status = RequestStatus.completed
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Completion confirmed by customer.",
    )


@router.post(
    "/service-requests/{id}/cancel",
    response_model=SuccessResponse[ServiceRequestResponse],
    summary="Cancel service request",
)
async def cancel_service_request(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ServiceRequestResponse]:
    """Customer or assigned worker cancels request (allowed only from REQUESTED or ACCEPTED states)."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    is_customer = current_user.id == sr.customer_id
    is_worker = (
        sr.worker_profile is not None
        and sr.worker_profile.user_id == current_user.id
    )
    is_admin = current_user.role == UserRole.admin

    if not (is_customer or is_worker or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this service request.",
        )

    # Allowed only from requested or accepted states
    if sr.status not in (RequestStatus.requested, RequestStatus.accepted):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel service request in '{sr.status.value}' state. Cancellation only permitted from 'requested' or 'accepted'.",
        )

    sr.status = RequestStatus.cancelled
    await db.commit()
    await db.refresh(sr)

    loaded = await _get_service_request_with_relations(db, sr.id)
    return SuccessResponse(
        data=ServiceRequestResponse.model_validate(loaded),
        message="Service request cancelled.",
    )


# ── Review Endpoints ──────────────────────────────────────────────────────────

@router.post(
    "/service-requests/{id}/reviews",
    response_model=SuccessResponse[ReviewResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Customer posts review for completed request",
)
async def create_review(
    id: uuid.UUID,
    body: ReviewCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ReviewResponse]:
    """Customer leaves a review for a completed service request."""
    sr = await _get_service_request_with_relations(db, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    if sr.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the customer who booked the service can leave a review.",
        )

    if sr.status != RequestStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reviews can only be submitted for completed service requests.",
        )

    # Check for duplicate review
    existing_result = await db.execute(
        select(CustomerReview).where(CustomerReview.service_request_id == sr.id)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A review has already been submitted for this service request.",
        )

    review = CustomerReview(
        service_request_id=sr.id,
        customer_id=current_user.id,
        worker_profile_id=sr.worker_profile_id,
        rating=body.rating,
        comment=body.comment,
        is_public=True,
    )
    db.add(review)
    await db.flush()

    # Recompute worker rating and review count
    result = await db.execute(
        select(func.avg(CustomerReview.rating), func.count())
        .where(CustomerReview.worker_profile_id == sr.worker_profile_id)
    )
    avg, count = result.one()
    worker_profile = await db.get(WorkerProfile, sr.worker_profile_id)
    if worker_profile:
        worker_profile.average_rating = float(avg) if avg else None
        worker_profile.total_reviews = count

    await db.commit()
    await db.refresh(review)

    return SuccessResponse(
        data=ReviewResponse.model_validate(review),
        message="Review submitted successfully.",
    )


@router.get(
    "/service-requests/{id}/reviews",
    response_model=SuccessResponse[ReviewResponse],
    summary="Get review for a service request",
)
async def get_service_request_review(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[ReviewResponse]:
    """Retrieve the review posted for a specific service request."""
    # Ensure request exists
    sr = await db.get(ServiceRequest, id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    result = await db.execute(
        select(CustomerReview).where(CustomerReview.service_request_id == id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No review found for this service request.",
        )

    return SuccessResponse(data=ReviewResponse.model_validate(review))


@router.get(
    "/workers/{worker_id}/reviews",
    response_model=PaginatedResponse[ReviewResponse],
    summary="List public reviews for a worker",
)
async def list_worker_reviews(
    worker_id: uuid.UUID,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[ReviewResponse]:
    """Public endpoint — lists verified customer reviews for a worker."""
    profile = await db.get(WorkerProfile, worker_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )

    query = (
        select(CustomerReview)
        .where(
            CustomerReview.worker_profile_id == worker_id,
            CustomerReview.is_public == True,  # noqa: E712
        )
        .order_by(CustomerReview.created_at.desc())
    )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    reviews = result.scalars().all()

    return PaginatedResponse(
        data=[ReviewResponse.model_validate(r) for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )
