"""
app/api/v1/evidence.py — Evidence submission and retrieval endpoints.

POST   /evidence/upload          → upload a file evidence item
POST   /evidence/url             → submit a URL-based evidence item
GET    /evidence/me              → list own evidence items
GET    /evidence/{id}            → get a single evidence item
DELETE /evidence/{id}            → delete an evidence item (own only)
GET    /evidence/{id}/download   → download the file (authenticated, own or assessor)

Security model
──────────────
• All endpoints require authentication (Bearer JWT).
• Ownership is enforced: workers can only see/delete their own evidence.
• Files are stored outside public dirs via the storage abstraction.
• MIME types are detected server-side from magic bytes.
• Filenames are server-generated (UUID4); client filenames stored for display only.
"""

from __future__ import annotations

import contextlib
import uuid

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import Response
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, require_worker_or_admin
from app.models.competency import EvidenceItem, EvidenceReviewStatus, EvidenceType
from app.models.user import UserRole
from app.models.worker_profile import WorkerProfile
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.evidence import (
    EvidenceItemResponse,
    EvidenceReviewRequest,
    EvidenceURLCreateRequest,
)
from app.services.audit import record_audit
from app.services.storage import StorageError, get_storage_backend, validate_and_store

router = APIRouter(prefix="/evidence", tags=["evidence"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_worker_profile(user_id: uuid.UUID, db: DbSession) -> WorkerProfile:
    """Return the worker profile for user_id or raise 404."""
    result = await db.execute(
        select(WorkerProfile).where(WorkerProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found.",
        )
    return profile


async def _get_own_evidence(
    evidence_id: uuid.UUID,
    worker_profile_id: uuid.UUID,
    db: DbSession,
) -> EvidenceItem:
    """Return evidence item, enforcing ownership."""
    result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.id == evidence_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found.")
    if item.worker_profile_id != worker_profile_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return item


# ── Upload file evidence ──────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=SuccessResponse[EvidenceItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file as evidence",
    dependencies=[require_worker_or_admin],
)
async def upload_evidence(
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(..., description="Evidence file (image, PDF, video, etc.)"),
    title: str = Form(..., min_length=3, max_length=200),
    description: str = Form(None),
    evidence_type: EvidenceType = Form(EvidenceType.photo),
    criterion_id: str = Form(None, description="UUID of the CompetencyCriterion this evidence supports"),
) -> SuccessResponse[EvidenceItemResponse]:
    """
    Upload a file as an evidence item.

    • File content is read server-side; client Content-Type and filename are ignored for security.
    • MIME is detected from magic bytes.
    • Files are stored outside public dirs (./evidence_files/ by default).
    • Maximum size: 15 MB.
    """
    profile = await _get_worker_profile(current_user.id, db)

    # Read file data
    file_data = await file.read()

    try:
        storage_meta = validate_and_store(
            file_data=file_data,
            original_filename=file.filename or "upload",
            storage=get_storage_backend(),
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    item = EvidenceItem(
        worker_profile_id=profile.id,
        title=title,
        description=description,
        evidence_type=evidence_type,
        review_status=EvidenceReviewStatus.pending,
        **storage_meta,
    )
    db.add(item)

    # Optionally map to a criterion
    if criterion_id:
        from app.models.competency import CriterionEvidenceMap
        try:
            crit_uuid = uuid.UUID(criterion_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=422, detail="Invalid criterion_id UUID."
            ) from exc
        mapping = CriterionEvidenceMap(criterion_id=crit_uuid, evidence_item=item)
        db.add(mapping)

    await db.commit()
    await db.refresh(item)
    return SuccessResponse(
        data=EvidenceItemResponse.model_validate(item),
        message="Evidence uploaded successfully.",
    )


# ── Submit URL evidence ───────────────────────────────────────────────────────

@router.post(
    "/url",
    response_model=SuccessResponse[EvidenceItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Submit a URL as evidence",
    dependencies=[require_worker_or_admin],
)
async def submit_url_evidence(
    body: EvidenceURLCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[EvidenceItemResponse]:
    """Submit a URL link as an evidence item (no file upload)."""
    profile = await _get_worker_profile(current_user.id, db)

    item = EvidenceItem(
        worker_profile_id=profile.id,
        title=body.title,
        description=body.description,
        evidence_type=EvidenceType.other,
        review_status=EvidenceReviewStatus.pending,
        file_url=str(body.url),
        storage_backend="url",
    )
    db.add(item)

    if body.criterion_id:
        from app.models.competency import CriterionEvidenceMap
        mapping = CriterionEvidenceMap(criterion_id=body.criterion_id, evidence_item=item)
        db.add(mapping)

    await db.commit()
    await db.refresh(item)
    return SuccessResponse(
        data=EvidenceItemResponse.model_validate(item),
        message="URL evidence submitted.",
    )


# ── List own evidence ─────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=PaginatedResponse[EvidenceItemResponse],
    summary="List my evidence items",
)
async def list_my_evidence(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    review_status: EvidenceReviewStatus | None = Query(None),
) -> PaginatedResponse[EvidenceItemResponse]:
    """Return a paginated list of the authenticated worker's evidence items."""
    if current_user.role == UserRole.worker:
        profile = await _get_worker_profile(current_user.id, db)
        profile_id = profile.id
    else:
        raise HTTPException(status_code=403, detail="Only workers can view their own evidence.")

    from sqlalchemy import func

    query = select(EvidenceItem).where(EvidenceItem.worker_profile_id == profile_id)
    if review_status:
        query = query.where(EvidenceItem.review_status == review_status)
    query = query.order_by(EvidenceItem.created_at.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    return PaginatedResponse(
        data=[EvidenceItemResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )


# ── Get single evidence ───────────────────────────────────────────────────────

@router.get(
    "/{evidence_id}",
    response_model=SuccessResponse[EvidenceItemResponse],
    summary="Get a single evidence item",
)
async def get_evidence(
    evidence_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[EvidenceItemResponse]:
    """Return a single evidence item. Workers may only access their own; assessors/admins can access any."""
    result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.id == evidence_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found.")

    # Ownership check for workers
    if current_user.role == UserRole.worker:
        profile = await _get_worker_profile(current_user.id, db)
        if item.worker_profile_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied.")

    return SuccessResponse(data=EvidenceItemResponse.model_validate(item))


# ── Assessor evidence review ──────────────────────────────────────────────────

@router.patch(
    "/{evidence_id}/review",
    response_model=SuccessResponse[EvidenceItemResponse],
    summary="Accept or reject an evidence item (assessor/admin only)",
)
async def review_evidence(
    evidence_id: uuid.UUID,
    body: EvidenceReviewRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SuccessResponse[EvidenceItemResponse]:
    """
    Record an assessor's review of one evidence item.

    • Only assessors and admins may review evidence.
    • A rejection must include a note explaining why.
    • The review and its audit record are committed in the same transaction.
    """
    if current_user.role not in {UserRole.assessor, UserRole.admin}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assessors can review evidence.",
        )

    result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.id == evidence_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found."
        )

    note = body.note.strip() if body.note else None
    if body.review_status == "rejected" and not note:
        raise HTTPException(
            status_code=422,
            detail="A rejection note is required so the worker knows what to fix.",
        )

    previous_status = item.review_status.value
    item.review_status = EvidenceReviewStatus(body.review_status)
    item.review_note = note
    item.is_verified = item.review_status == EvidenceReviewStatus.accepted

    record_audit(
        db,
        actor_id=current_user.id,
        action="evidence.reviewed",
        resource_type="evidence_item",
        resource_id=item.id,
        description=f"Evidence {body.review_status} by {current_user.full_name}.",
        payload={
            "previous_status": previous_status,
            "review_status": body.review_status,
            "worker_profile_id": str(item.worker_profile_id),
        },
    )

    await db.commit()
    await db.refresh(item)
    return SuccessResponse(
        data=EvidenceItemResponse.model_validate(item),
        message=f"Evidence marked as {body.review_status}.",
    )


# ── Delete evidence ───────────────────────────────────────────────────────────

@router.delete(
    "/{evidence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete an evidence item",
    dependencies=[require_worker_or_admin],
)
async def delete_evidence(
    evidence_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete an evidence item (workers: own only)."""
    result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.id == evidence_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found.")

    if current_user.role == UserRole.worker:
        profile = await _get_worker_profile(current_user.id, db)
        if item.worker_profile_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied.")

    # Remove stored file if any
    if item.stored_filename and item.storage_backend == "local":
        storage = get_storage_backend()
        # Best-effort file cleanup — the DB row is the authoritative record.
        with contextlib.suppress(Exception):
            storage.delete(item.stored_filename)

    await db.delete(item)
    await db.commit()


# ── Download file ─────────────────────────────────────────────────────────────

@router.get(
    "/{evidence_id}/download",
    summary="Download the raw evidence file",
)
async def download_evidence(
    evidence_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    """Serve the stored file for authenticated download (workers: own only)."""
    result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.id == evidence_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found.")

    if current_user.role == UserRole.worker:
        profile = await _get_worker_profile(current_user.id, db)
        if item.worker_profile_id != profile.id:
            raise HTTPException(status_code=403, detail="Access denied.")

    if not item.stored_filename:
        raise HTTPException(status_code=404, detail="No file associated with this evidence item.")

    storage = get_storage_backend()
    if not storage.exists(item.stored_filename):
        raise HTTPException(status_code=404, detail="File not found in storage.")

    data = storage.load(item.stored_filename)
    return Response(
        content=data,
        media_type=item.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{item.original_filename or item.stored_filename}"'
            ),
        },
    )
