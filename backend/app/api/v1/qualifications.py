"""
app/api/v1/qualifications.py — Qualification catalogue endpoints.

GET /qualifications             → list all active qualifications
GET /qualifications/{id}/criteria → list criteria for a qualification
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.core.deps import DbSession
from app.models.competency import CompetencyCriterion
from app.models.qualification import Qualification
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.qualification import (
    CriterionResponse,
    QualificationResponse,
    QualificationSummaryResponse,
)

router = APIRouter(prefix="/qualifications", tags=["qualifications"])


@router.get(
    "",
    response_model=PaginatedResponse[QualificationSummaryResponse],
    summary="List qualifications",
)
async def list_qualifications(
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    trade: str | None = Query(None),
    active_only: bool = Query(True),
) -> PaginatedResponse[QualificationSummaryResponse]:
    """
    Returns the qualification catalogue.

    ``is_illustrative`` is included in each item so clients can show a
    disclaimer: "These criteria are illustrative examples only and do not
    represent official government or awarding-body standards."
    """
    from sqlalchemy import func

    query = select(Qualification)
    if active_only:
        query = query.where(Qualification.is_active.is_(True))
    if trade:
        query = query.where(Qualification.trade.ilike(f"%{trade}%"))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    quals = result.scalars().all()

    return PaginatedResponse(
        data=[QualificationSummaryResponse.model_validate(q) for q in quals],
        total=total,
        page=page,
        page_size=page_size,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )


@router.get(
    "/{qualification_id}",
    response_model=SuccessResponse[QualificationResponse],
    summary="Get a qualification by ID",
)
async def get_qualification(
    qualification_id: uuid.UUID,
    db: DbSession,
) -> SuccessResponse[QualificationResponse]:
    result = await db.execute(
        select(Qualification).where(Qualification.id == qualification_id)
    )
    qual = result.scalar_one_or_none()
    if not qual:
        raise HTTPException(status_code=404, detail="Qualification not found.")
    return SuccessResponse(data=QualificationResponse.model_validate(qual))


@router.get(
    "/{qualification_id}/criteria",
    response_model=SuccessResponse[list[CriterionResponse]],
    summary="List competency criteria for a qualification",
)
async def list_criteria(
    qualification_id: uuid.UUID,
    db: DbSession,
) -> SuccessResponse[list[CriterionResponse]]:
    """
    Returns criteria ordered by order_index.

    If the qualification carries ``is_illustrative=True``, clients MUST
    display: "The following criteria are illustrative examples only."
    """
    qual_result = await db.execute(
        select(Qualification).where(Qualification.id == qualification_id)
    )
    qual = qual_result.scalar_one_or_none()
    if not qual:
        raise HTTPException(status_code=404, detail="Qualification not found.")

    result = await db.execute(
        select(CompetencyCriterion)
        .where(CompetencyCriterion.qualification_id == qualification_id)
        .order_by(CompetencyCriterion.order_index)
    )
    criteria = result.scalars().all()

    message = (
        "ILLUSTRATIVE CRITERIA ONLY — not official government or awarding-body standards."
        if qual.is_illustrative
        else None
    )
    return SuccessResponse(
        data=[CriterionResponse.model_validate(c) for c in criteria],
        message=message,
    )
