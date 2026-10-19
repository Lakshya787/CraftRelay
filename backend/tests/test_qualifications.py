"""
tests/test_qualifications.py — Tests for qualification endpoints.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competency import CompetencyCriterion
from app.models.qualification import Qualification, QualificationVersion

QUALS_URL = "/api/v1/qualifications"


async def _create_qualification(db: AsyncSession) -> Qualification:
    """Insert a minimal qualification for testing."""
    qual = Qualification(
        code="TEST-L1",
        title="Test Qualification",
        trade="Testing",
        issuing_body="Test Body",
        level=1,
        is_illustrative=True,
        current_version=1,
    )
    db.add(qual)
    await db.flush()

    version = QualificationVersion(
        qualification_id=qual.id,
        version_number=1,
        change_summary="Initial",
        snapshot={"code": "TEST-L1", "criteria": []},
    )
    db.add(version)

    criterion = CompetencyCriterion(
        qualification_id=qual.id,
        code="TEST-L1-C01",
        description="Perform a test action correctly.",
        is_mandatory=True,
        order_index=1,
    )
    db.add(criterion)
    await db.commit()
    await db.refresh(qual)
    return qual


@pytest.mark.asyncio
async def test_list_qualifications_empty(client: AsyncClient) -> None:
    resp = await client.get(QUALS_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_list_qualifications_returns_created(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await _create_qualification(db_session)
    resp = await client.get(QUALS_URL)
    body = resp.json()
    assert body["total"] >= 1
    assert any(q["code"] == "TEST-L1" for q in body["data"])


@pytest.mark.asyncio
async def test_get_qualification_by_id(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    qual = await _create_qualification(db_session)
    resp = await client.get(f"{QUALS_URL}/{qual.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["code"] == "TEST-L1"
    assert body["data"]["is_illustrative"] is True


@pytest.mark.asyncio
async def test_get_qualification_not_found(client: AsyncClient) -> None:
    resp = await client.get(f"{QUALS_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_criteria_for_qualification(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    qual = await _create_qualification(db_session)
    resp = await client.get(f"{QUALS_URL}/{qual.id}/criteria")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["data"], list)
    assert len(body["data"]) == 1
    assert body["data"][0]["code"] == "TEST-L1-C01"


@pytest.mark.asyncio
async def test_illustrative_criteria_include_disclaimer(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Illustrative qualifications must carry a disclaimer in the message field."""
    qual = await _create_qualification(db_session)
    resp = await client.get(f"{QUALS_URL}/{qual.id}/criteria")
    body = resp.json()
    assert body["message"] is not None
    assert "ILLUSTRATIVE" in body["message"].upper()


@pytest.mark.asyncio
async def test_criteria_not_found_for_unknown_qual(client: AsyncClient) -> None:
    resp = await client.get(f"{QUALS_URL}/{uuid.uuid4()}/criteria")
    assert resp.status_code == 404
