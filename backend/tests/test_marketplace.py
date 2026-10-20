"""
tests/test_marketplace.py — Comprehensive tests for the CraftRelay marketplace backend.

Tests the complete marketplace service request lifecycle, dual-confirmation completions,
rating recalculations, declared vs verified skills separation, and worker directory filters.
"""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import CompetencyVerification, VerificationStatus
from app.models.qualification import Qualification, QualificationVersion
from app.models.service import RequestStatus
from app.models.skill import Skill
from app.models.worker_skill import ProficiencyLevel, WorkerSkill

# API Endpoints
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
WORKERS_URL = "/api/v1/workers"
SERVICE_REQUESTS_URL = "/api/v1/service-requests"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _register_and_login(client: AsyncClient, payload: dict) -> tuple[str, str]:
    """Returns (token, user_id) tuple."""
    resp = await client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 201, f"Registration failed: {resp.text}"
    user_id = resp.json()["data"]["id"]

    login = await client.post(
        LOGIN_URL,
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 200, f"Login failed: {login.text}"
    token = login.json()["data"]["access_token"]
    return token, user_id


async def _get_worker_profile_id(client: AsyncClient, token: str) -> str:
    """Fetch the worker profile ID using the worker's token."""
    resp = await client.get(
        f"{WORKERS_URL}/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Get worker profile failed: {resp.text}"
    return resp.json()["data"]["id"]


async def _create_skill(db: AsyncSession, name: str, category: str = "Trade") -> Skill:
    """Insert a Skill catalog record."""
    skill = Skill(name=name, category=category, description=f"{name} trade skills")
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


async def _create_qualification(
    db: AsyncSession, code: str, title: str, trade: str = "Trade"
) -> tuple[Qualification, QualificationVersion]:
    """Insert a Qualification and initial QualificationVersion."""
    qual = Qualification(
        code=code,
        title=title,
        trade=trade,
        issuing_body="National Skill Development Agency",
        level=3,
        is_illustrative=True,
        current_version=1,
    )
    db.add(qual)
    await db.flush()

    qv = QualificationVersion(
        qualification_id=qual.id,
        version_number=1,
        change_summary="Initial version",
        snapshot={"code": code, "title": title},
    )
    db.add(qv)
    await db.commit()
    await db.refresh(qual)
    await db.refresh(qv)
    return qual, qv


# ── Test Cases ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_service_request_requires_customer_role(client: AsyncClient) -> None:
    """1. Worker role cannot create a service request; must return 403."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "worker_creator@example.com",
            "full_name": "Worker Creator",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={
            "worker_profile_id": worker_profile_id,
            "title": "Fix Wiring",
            "description": "Short circuit in hall",
        },
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_service_request_success(client: AsyncClient) -> None:
    """2. Customer creates request successfully, gets initial REQUESTED status."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "target_worker@example.com",
            "full_name": "Target Worker",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "test_cust@example.com",
            "full_name": "Test Customer",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    req_payload = {
        "worker_profile_id": worker_profile_id,
        "title": "Fix Leaking Faucet",
        "description": "Kitchen tap is dripping continuously",
        "service_location": "B-402 Shanti Heights, Mumbai",
        "preferred_date": "2026-11-15",
    }
    resp = await client.post(
        SERVICE_REQUESTS_URL,
        json=req_payload,
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert data["status"] == RequestStatus.requested.value
    assert data["title"] == req_payload["title"]
    assert data["service_location"] == req_payload["service_location"]
    assert data["preferred_date"] == req_payload["preferred_date"]
    assert data["worker_profile_id"] == worker_profile_id


@pytest.mark.asyncio
async def test_worker_can_accept_request(client: AsyncClient) -> None:
    """3. Worker can accept request (REQUESTED → ACCEPTED)."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_accept@example.com",
            "full_name": "Worker Accept",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_accept@example.com",
            "full_name": "Customer Accept",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Paint Bedroom"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    accept_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/accept",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["data"]["status"] == RequestStatus.accepted.value


@pytest.mark.asyncio
async def test_worker_can_decline_request(client: AsyncClient) -> None:
    """4. Worker can decline request (REQUESTED → DECLINED)."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_decline@example.com",
            "full_name": "Worker Decline",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_decline@example.com",
            "full_name": "Customer Decline",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Tile Cleaning"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    decline_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/decline",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert decline_resp.status_code == 200
    assert decline_resp.json()["data"]["status"] == RequestStatus.declined.value


@pytest.mark.asyncio
async def test_invalid_transition_rejected(client: AsyncClient) -> None:
    """5. Invalid state transitions are rejected server-side."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_invalid@example.com",
            "full_name": "Worker Invalid",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_invalid@example.com",
            "full_name": "Customer Invalid",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Fix Door Lock"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    # Worker cannot start before accepting (REQUESTED -> IN_PROGRESS is invalid)
    start_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/start",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert start_resp.status_code in (400, 409)

    # Customer cannot complete directly from REQUESTED
    comp_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/complete-customer",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert comp_resp.status_code in (400, 409)


@pytest.mark.asyncio
async def test_worker_starts_job(client: AsyncClient) -> None:
    """6. Worker starts accepted job (ACCEPTED → IN_PROGRESS)."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_start@example.com",
            "full_name": "Worker Start",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_start@example.com",
            "full_name": "Customer Start",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Install Fan"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    # Accept first
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/accept",
        headers={"Authorization": f"Bearer {worker_token}"},
    )

    # Start
    start_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/start",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert start_resp.status_code == 200
    assert start_resp.json()["data"]["status"] == RequestStatus.in_progress.value


@pytest.mark.asyncio
async def test_worker_marks_complete(client: AsyncClient) -> None:
    """7. Worker marks job complete (IN_PROGRESS → COMPLETION_PENDING)."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_comp@example.com",
            "full_name": "Worker Comp",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_comp@example.com",
            "full_name": "Customer Comp",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Geyser Repair"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/accept",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/start",
        headers={"Authorization": f"Bearer {worker_token}"},
    )

    worker_comp_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/complete-worker",
        json={"worker_notes": "Thermostat replaced", "photo_url": "https://example.com/geyser.jpg"},
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert worker_comp_resp.status_code == 200
    data = worker_comp_resp.json()["data"]
    assert data["status"] == RequestStatus.completion_pending.value
    assert data["completion"] is not None
    assert data["completion"]["worker_notes"] == "Thermostat replaced"
    assert data["completion"]["worker_confirmed_at"] is not None


@pytest.mark.asyncio
async def test_customer_confirms_completion(client: AsyncClient) -> None:
    """8. Customer confirms completion (COMPLETION_PENDING → COMPLETED)."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_custconf@example.com",
            "full_name": "Worker Conf",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_custconf@example.com",
            "full_name": "Customer Conf",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "AC Servicing"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/accept",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/start",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/complete-worker",
        json={"worker_notes": "Gas filled and coil cleaned"},
        headers={"Authorization": f"Bearer {worker_token}"},
    )

    cust_comp_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/complete-customer",
        json={"customer_notes": "Cooling works perfectly now!"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cust_comp_resp.status_code == 200
    data = cust_comp_resp.json()["data"]
    assert data["status"] == RequestStatus.completed.value
    assert data["completion"] is not None
    assert data["completion"]["customer_notes"] == "Cooling works perfectly now!"
    assert data["completion"]["customer_confirmed_at"] is not None


@pytest.mark.asyncio
async def test_review_requires_completed_status(client: AsyncClient) -> None:
    """9. Reviews on non-completed requests must return 409 or 403."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_premature@example.com",
            "full_name": "Worker Premature",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_premature@example.com",
            "full_name": "Customer Premature",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Fix Switchboard"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    # Attempt to review while status is still 'requested'
    rev_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/reviews",
        json={"rating": 5, "comment": "Premature review"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert rev_resp.status_code in (403, 409)


@pytest.mark.asyncio
async def test_customer_can_post_review(client: AsyncClient) -> None:
    """10. Customer can review completed job, and worker's rating/reviews update."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_reviewed@example.com",
            "full_name": "Worker Reviewed",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_reviewed@example.com",
            "full_name": "Customer Reviewer",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    # Complete the full lifecycle
    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Carpenter Work"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/accept",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/start",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/complete-worker",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/complete-customer",
        headers={"Authorization": f"Bearer {cust_token}"},
    )

    # Post review
    rev_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/reviews",
        json={"rating": 5, "comment": "Excellent carpentry work!"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert rev_resp.status_code == 201
    assert rev_resp.json()["data"]["rating"] == 5

    # Worker profile rating must be recalculated
    w_resp = await client.get(f"{WORKERS_URL}/{worker_profile_id}")
    assert w_resp.status_code == 200
    assert w_resp.json()["data"]["average_rating"] == 5.0
    assert w_resp.json()["data"]["total_reviews"] == 1


@pytest.mark.asyncio
async def test_duplicate_review_rejected(client: AsyncClient) -> None:
    """11. Second review for same request must return 409 Conflict."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "w_dup@example.com",
            "full_name": "Worker Dup",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "c_dup@example.com",
            "full_name": "Customer Dup",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Fix Tap"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/accept", headers={"Authorization": f"Bearer {worker_token}"})
    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/start", headers={"Authorization": f"Bearer {worker_token}"})
    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/complete-worker", headers={"Authorization": f"Bearer {worker_token}"})
    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/complete-customer", headers={"Authorization": f"Bearer {cust_token}"})

    # First review succeeds
    rev1 = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/reviews",
        json={"rating": 4, "comment": "Good"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert rev1.status_code == 201

    # Second review rejected
    rev2 = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/reviews",
        json={"rating": 5, "comment": "Trying again"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert rev2.status_code == 409


@pytest.mark.asyncio
async def test_wrong_worker_cannot_accept(client: AsyncClient) -> None:
    """12. Only the assigned worker can accept; another worker gets 403."""
    worker_a_token, _ = await _register_and_login(
        client,
        {
            "email": "worker_a_target@example.com",
            "full_name": "Worker Alpha",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_a_id = await _get_worker_profile_id(client, worker_a_token)

    worker_b_token, _ = await _register_and_login(
        client,
        {
            "email": "worker_b_wrong@example.com",
            "full_name": "Worker Beta",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "cust_wrong_w@example.com",
            "full_name": "Customer Target",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_a_id, "title": "Paint Wall"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    # Worker B tries to accept Worker A's job
    wrong_accept = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/accept",
        headers={"Authorization": f"Bearer {worker_b_token}"},
    )
    assert wrong_accept.status_code == 403


@pytest.mark.asyncio
async def test_cancel_from_requested(client: AsyncClient) -> None:
    """13. Customer can cancel a request in REQUESTED state."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "worker_cancel1@example.com",
            "full_name": "Worker Cancel 1",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "cust_cancel1@example.com",
            "full_name": "Customer Cancel 1",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Install Light"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    cancel_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/cancel",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["data"]["status"] == RequestStatus.cancelled.value


@pytest.mark.asyncio
async def test_cancel_from_completed_rejected(client: AsyncClient) -> None:
    """14. Completed requests cannot be cancelled; returns 400 or 409."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "worker_cancel2@example.com",
            "full_name": "Worker Cancel 2",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id = await _get_worker_profile_id(client, worker_token)

    cust_token, _ = await _register_and_login(
        client,
        {
            "email": "cust_cancel2@example.com",
            "full_name": "Customer Cancel 2",
            "password": "SecurePassword1!",
            "role": "customer",
        },
    )

    create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={"worker_profile_id": worker_profile_id, "title": "Clean Filter"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = create_resp.json()["data"]["id"]

    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/accept", headers={"Authorization": f"Bearer {worker_token}"})
    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/start", headers={"Authorization": f"Bearer {worker_token}"})
    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/complete-worker", headers={"Authorization": f"Bearer {worker_token}"})
    await client.post(f"{SERVICE_REQUESTS_URL}/{req_id}/complete-customer", headers={"Authorization": f"Bearer {cust_token}"})

    cancel_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{req_id}/cancel",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cancel_resp.status_code in (400, 409)


@pytest.mark.asyncio
async def test_worker_skills_endpoint_separates_declared_from_verified(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """15. GET /workers/{id}/skills clearly separates declared skills from verified competencies."""
    worker_token, _ = await _register_and_login(
        client,
        {
            "email": "skills_worker@example.com",
            "full_name": "Skills Worker",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    worker_profile_id_str = await _get_worker_profile_id(client, worker_token)
    w_uuid = uuid.UUID(worker_profile_id_str)

    # 1. Create and declare a self-reported skill
    pipe_skill = await _create_skill(db_session, "Pipe Laying")
    ws = WorkerSkill(
        worker_profile_id=w_uuid,
        skill_id=pipe_skill.id,
        proficiency_level=ProficiencyLevel.intermediate,
        years_used=3,
        notes="Self-reported plumbing experience",
    )
    db_session.add(ws)

    # 2. Create qualifications and competencies
    qual_v, qv_v = await _create_qualification(db_session, "PLUMB-L3", "Master Plumber")
    qual_p, qv_p = await _create_qualification(db_session, "WELD-L2", "Arc Welder")

    # Add verified competency
    verif = CompetencyVerification(
        worker_profile_id=w_uuid,
        qualification_id=qual_v.id,
        qualification_version_id=qv_v.id,
        status=VerificationStatus.verified,
        certificate_number="CERT-PLUMB-001",
    )
    db_session.add(verif)

    # Add pending (unverified) competency
    pending_verif = CompetencyVerification(
        worker_profile_id=w_uuid,
        qualification_id=qual_p.id,
        qualification_version_id=qv_p.id,
        status=VerificationStatus.pending,
        certificate_number="CERT-WELD-PENDING",
    )
    db_session.add(pending_verif)
    await db_session.commit()

    # Call GET /workers/{id}/skills
    resp = await client.get(f"{WORKERS_URL}/{worker_profile_id_str}/skills")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    data = body["data"]

    # Declared skills must have Pipe Laying
    assert len(data["declared_skills"]) == 1
    assert data["declared_skills"][0]["skill_name"] == "Pipe Laying"
    assert data["declared_skills"][0]["proficiency_level"] == "intermediate"

    # Verified competencies must ONLY contain verified status
    assert len(data["verified_competencies"]) == 1
    assert data["verified_competencies"][0]["certificate_number"] == "CERT-PLUMB-001"
    assert data["verified_competencies"][0]["status"] == "verified"
    assert data["verified_competencies"][0]["qualification_title"] == "Master Plumber"


@pytest.mark.asyncio
async def test_workers_filter_by_skill(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """16. GET /workers?skill=Plumbing filters workers who declared that skill."""
    w1_token, _ = await _register_and_login(
        client,
        {
            "email": "w_plumber@example.com",
            "full_name": "Worker Plumber",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    w1_id = uuid.UUID(await _get_worker_profile_id(client, w1_token))

    w2_token, _ = await _register_and_login(
        client,
        {
            "email": "w_carpenter@example.com",
            "full_name": "Worker Carpenter",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    w2_id = uuid.UUID(await _get_worker_profile_id(client, w2_token))

    # Add skills
    plumb_skill = await _create_skill(db_session, "Plumbing")
    carp_skill = await _create_skill(db_session, "Carpentry")

    db_session.add(WorkerSkill(worker_profile_id=w1_id, skill_id=plumb_skill.id))
    db_session.add(WorkerSkill(worker_profile_id=w2_id, skill_id=carp_skill.id))
    await db_session.commit()

    resp = await client.get(f"{WORKERS_URL}?skill=Plumbing")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    returned_ids = [w["id"] for w in body["data"]]
    assert str(w1_id) in returned_ids
    assert str(w2_id) not in returned_ids


@pytest.mark.asyncio
async def test_workers_filter_by_city(client: AsyncClient) -> None:
    """17. GET /workers?city=Mumbai returns only workers in Mumbai."""
    w1_token, _ = await _register_and_login(
        client,
        {
            "email": "w_mumbai@example.com",
            "full_name": "Worker Mumbai",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    w1_id = await _get_worker_profile_id(client, w1_token)
    await client.patch(
        f"{WORKERS_URL}/me",
        json={"city": "Mumbai"},
        headers={"Authorization": f"Bearer {w1_token}"},
    )

    w2_token, _ = await _register_and_login(
        client,
        {
            "email": "w_delhi@example.com",
            "full_name": "Worker Delhi",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    w2_id = await _get_worker_profile_id(client, w2_token)
    await client.patch(
        f"{WORKERS_URL}/me",
        json={"city": "Delhi"},
        headers={"Authorization": f"Bearer {w2_token}"},
    )

    resp = await client.get(f"{WORKERS_URL}?city=Mumbai")
    assert resp.status_code == 200
    body = resp.json()
    returned_ids = [w["id"] for w in body["data"]]
    assert w1_id in returned_ids
    assert w2_id not in returned_ids


@pytest.mark.asyncio
async def test_workers_filter_by_verified_only(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """18. GET /workers?verified_only=true returns workers with verified competencies."""
    w1_token, _ = await _register_and_login(
        client,
        {
            "email": "w_verified@example.com",
            "full_name": "Worker Verified",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    w1_id = uuid.UUID(await _get_worker_profile_id(client, w1_token))

    w2_token, _ = await _register_and_login(
        client,
        {
            "email": "w_unverified@example.com",
            "full_name": "Worker Unverified",
            "password": "SecurePassword1!",
            "role": "worker",
        },
    )
    w2_id = uuid.UUID(await _get_worker_profile_id(client, w2_token))

    # Worker 1 gets a verified competency
    qual, qv = await _create_qualification(db_session, "ELEC-L2", "Certified Electrician")
    db_session.add(
        CompetencyVerification(
            worker_profile_id=w1_id,
            qualification_id=qual.id,
            qualification_version_id=qv.id,
            status=VerificationStatus.verified,
            certificate_number="CERT-ELEC-999",
        )
    )

    # Worker 2 gets only a pending competency
    db_session.add(
        CompetencyVerification(
            worker_profile_id=w2_id,
            qualification_id=qual.id,
            qualification_version_id=qv.id,
            status=VerificationStatus.pending,
            certificate_number="CERT-ELEC-PENDING",
        )
    )
    await db_session.commit()

    resp = await client.get(f"{WORKERS_URL}?verified_only=true")
    assert resp.status_code == 200
    body = resp.json()
    returned_ids = [w["id"] for w in body["data"]]
    assert str(w1_id) in returned_ids
    assert str(w2_id) not in returned_ids
