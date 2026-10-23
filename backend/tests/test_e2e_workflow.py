"""
tests/test_e2e_workflow.py — Full End-to-End Integration Test for CraftRelay.

Verifies the entire lifecycle across real database records:
1. Worker Registration → Login
2. Profile update (bio, trade title, years of experience, city)
3. Skill declaration from trade catalogue
4. Evidence upload (both URL and file) with MIME validation
5. Qualification case opening & evidence-to-criterion mapping
6. Gap detection & practical task recommendation
7. Worker case submission
8. Assessor evidence review & mapping confirmation
9. Assessor criterion-level decisions & practical task scoring
10. Formal competency verification issuance (with certificate number)
11. Customer registration & login
12. Customer marketplace search & discovery of verified worker
13. Customer service request creation
14. Worker request acceptance & start of work
15. Worker marks work complete (dual confirmation flow)
16. Customer confirms completion
17. Customer leaves 5-star review & rating
18. Profile rating & review count verification
"""

from __future__ import annotations

import io
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import (
    ApprovedAssessmentTask,
    AssessmentCase,
    AssessmentResult,
    CaseStatus,
    CompetencyVerification,
    VerificationStatus,
)
from app.models.competency import CompetencyCriterion, EvidenceItem, EvidenceReviewStatus
from app.models.qualification import Qualification, QualificationVersion
from app.models.service import CustomerReview, RequestStatus, ServiceRequest
from app.models.skill import Skill
from app.models.worker_profile import WorkerProfile

PASSWORD = "Password123!"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
WORKERS_URL = "/api/v1/workers"
SKILLS_URL = "/api/v1/skills"
EVIDENCE_URL = "/api/v1/evidence"
ASSESSMENTS_URL = "/api/v1/assessments"
MARKETPLACE_URL = "/api/v1/marketplace"
SERVICE_REQUESTS_URL = "/api/v1/service-requests"


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _register_and_login(client: AsyncClient, email: str, role: str) -> tuple[str, str]:
    reg = await client.post(
        REGISTER_URL,
        json={
            "email": email,
            "full_name": email.split("@")[0].replace(".", " ").title(),
            "password": PASSWORD,
            "role": role,
        },
    )
    assert reg.status_code == 201, f"Registration failed for {email}: {reg.text}"
    user_id = reg.json()["data"]["id"]

    login = await client.post(
        LOGIN_URL,
        json={"email": email, "password": PASSWORD},
    )
    assert login.status_code == 200, f"Login failed for {email}: {login.text}"
    token = login.json()["data"]["access_token"]
    return token, user_id


@pytest.mark.asyncio
async def test_full_craftrelay_end_to_end_workflow(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Simulates the entire multi-role vocational certification and service marketplace pipeline.
    """
    # ── 0. Seed qualification standards and approved tasks ───────────────────
    qual = Qualification(
        code="E2E-ELE-L2",
        title="Domestic Electrical Installation",
        trade="Electrical",
        issuing_body="National Vocational Council",
        level=2,
        is_illustrative=True,
        current_version=1,
    )
    db_session.add(qual)
    await db_session.flush()

    c01 = CompetencyCriterion(
        qualification_id=qual.id,
        code="E2E-ELE-C01",
        description="Isolate domestic electrical circuits safely using Lock-Out/Tag-Out.",
        is_mandatory=True,
        order_index=1,
        rubric_reference="RUB-ELE-01",
    )
    c02 = CompetencyCriterion(
        qualification_id=qual.id,
        code="E2E-ELE-C02",
        description="Install and terminate a 3-pin switched socket outlet correctly.",
        is_mandatory=True,
        order_index=2,
        rubric_reference="RUB-ELE-02",
    )
    db_session.add_all([c01, c02])
    await db_session.flush()

    task_pt = ApprovedAssessmentTask(
        qualification_id=qual.id,
        code="E2E-ELE-PT-01",
        title="Socket Outlet Termination and Insulation Test",
        description="Wire a twin socket, verify correct polarity and insulation resistance.",
        estimated_duration_minutes=45,
        required_tools=["Insulated screwdrivers", "Multimeter"],
        assessment_criteria=["Polarity correct", "Insulation resistance > 2 MOhm"],
        criterion_codes=["E2E-ELE-C01", "E2E-ELE-C02"],
        rubric_reference="RUB-ELE-PT01",
        is_approved=True,
        max_score=100.0,
        pass_score=70.0,
        is_active=True,
    )
    db_session.add(task_pt)

    trade_skill = Skill(
        name="Domestic Wiring",
        category="Electrical",
        description="Residential electrical installations and repairs",
    )
    db_session.add(trade_skill)

    version = QualificationVersion(
        qualification_id=qual.id,
        version_number=1,
        change_summary="Initial baseline version for E2E testing",
        snapshot={
            "qualification": {"code": qual.code, "title": qual.title, "level": qual.level},
            "criteria": [
                {"code": c01.code, "description": c01.description, "is_mandatory": True},
                {"code": c02.code, "description": c02.description, "is_mandatory": True},
            ],
            "approved_tasks": [{"code": task_pt.code, "title": task_pt.title, "pass_score": 70.0}],
        },
    )
    db_session.add(version)
    await db_session.commit()
    await db_session.refresh(qual)
    await db_session.refresh(version)

    # ── 1. Worker Registration & Login ───────────────────────────────────────
    worker_email = "rajesh.worker@craftrelay.dev"
    worker_token, worker_user_id = await _register_and_login(
        client, worker_email, role="worker"
    )
    assert worker_token is not None

    # ── 2. Profile Creation & Update ─────────────────────────────────────────
    profile_resp = await client.get(f"{WORKERS_URL}/me", headers=_auth(worker_token))
    assert profile_resp.status_code == 200
    worker_profile_id = profile_resp.json()["data"]["id"]

    update_resp = await client.put(
        f"{WORKERS_URL}/me",
        json={
            "trade_title": "Master Electrician",
            "bio": "10 years experience in residential wiring and distribution boards.",
            "city": "Bengaluru",
            "state": "Karnataka",
            "years_experience": 10,
            "is_available": True,
        },
        headers=_auth(worker_token),
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["trade_title"] == "Master Electrician"

    # ── 3. Skill Declaration from Catalogue ──────────────────────────────────
    skill_resp = await client.post(
        f"{SKILLS_URL}/workers/me/skills",
        json={
            "skill_id": str(trade_skill.id),
            "proficiency": "expert",
            "years_experience": 8,
        },
        headers=_auth(worker_token),
    )
    assert skill_resp.status_code == 201
    assert skill_resp.json()["data"]["proficiency"] == "expert"

    # ── 4. Evidence Upload (URL and Valid Image File) ─────────────────────────
    # A) URL evidence
    url_ev_resp = await client.post(
        f"{EVIDENCE_URL}/url",
        json={
            "title": "Substation Apprenticeship Certificate",
            "description": "Certified apprentice training record in electrical safety.",
            "url": "https://credentials.example.org/verify/rajesh-substation",
            "evidence_type": "certificate",
            "criterion_id": str(c01.id),
        },
        headers=_auth(worker_token),
    )
    assert url_ev_resp.status_code == 201
    ev_c01_id = url_ev_resp.json()["data"]["id"]

    # B) File evidence (valid JPEG with magic bytes)
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00" + b"\x00" * 200
    file_ev_resp = await client.post(
        f"{EVIDENCE_URL}/upload",
        files={"file": ("socket_wiring.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
        data={
            "title": "Twin Socket Outlet Termination",
            "description": "Installed and terminated twin socket in domestic switchboard.",
            "evidence_type": "photo",
            "criterion_id": str(c02.id),
        },
        headers=_auth(worker_token),
    )
    assert file_ev_resp.status_code == 201
    ev_c02_id = file_ev_resp.json()["data"]["id"]

    # ── 5. Assessment Case Creation & Qualification Mapping ───────────────────
    case_resp = await client.post(
        f"{ASSESSMENTS_URL}/cases",
        json={
            "qualification_id": str(qual.id),
            "qualification_version_id": str(version.id),
            "worker_statement": "Seeking formal level 2 certification based on field experience.",
        },
        headers=_auth(worker_token),
    )
    assert case_resp.status_code == 201
    case_id = case_resp.json()["data"]["id"]

    # Map evidence items to their respective criteria
    map_resp1 = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/mappings",
        json={"criterion_id": str(c01.id), "evidence_item_id": ev_c01_id},
        headers=_auth(worker_token),
    )
    assert map_resp1.status_code == 201
    mapping_c01_id = map_resp1.json()["data"]["id"]

    map_resp2 = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/mappings",
        json={"criterion_id": str(c02.id), "evidence_item_id": ev_c02_id},
        headers=_auth(worker_token),
    )
    assert map_resp2.status_code == 201
    mapping_c02_id = map_resp2.json()["data"]["id"]

    # ── 6. Gap Detection & Recommendations Inspection ────────────────────────
    workspace_resp = await client.get(
        f"{ASSESSMENTS_URL}/cases/{case_id}/workspace",
        headers=_auth(worker_token),
    )
    assert workspace_resp.status_code == 200
    ws_data = workspace_resp.json()["data"]
    assert len(ws_data["criteria"]) == 2

    rec_resp = await client.get(
        f"{ASSESSMENTS_URL}/cases/{case_id}/recommendations",
        headers=_auth(worker_token),
    )
    assert rec_resp.status_code == 200
    assert len(rec_resp.json()["data"]["recommendations"]) >= 1

    # ── 7. Worker Case Submission ─────────────────────────────────────────────
    submit_resp = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/submit",
        headers=_auth(worker_token),
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json()["data"]["status"] == "submitted"

    # ── 8. Assessor Authentication & Evidence Review ──────────────────────────
    assessor_email = "priya.assessor@craftrelay.dev"
    assessor_token, assessor_user_id = await _register_and_login(
        client, assessor_email, role="assessor"
    )

    # Assessor accepts both evidence items
    for ev_id in [ev_c01_id, ev_c02_id]:
        rev_ev = await client.patch(
            f"{EVIDENCE_URL}/{ev_id}/review",
            json={"review_status": "accepted", "note": "Verified clear and authentic."},
            headers=_auth(assessor_token),
        )
        assert rev_ev.status_code == 200

    # Assessor confirms mappings
    for map_id in [mapping_c01_id, mapping_c02_id]:
        rev_map = await client.post(
            f"{ASSESSMENTS_URL}/cases/{case_id}/mappings/{map_id}/review",
            json={"status": "confirmed", "assessor_note": "Direct alignment with criterion."},
            headers=_auth(assessor_token),
        )
        assert rev_map.status_code == 200

    # ── 9. Assessor Criterion Decisions & Practical Task Scoring ──────────────
    # A mandatory criterion can only be approved after its required practical
    # task has passed; the API enforces that rule server-side.
    score_resp = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/tasks/{task_pt.id}/result",
        json={
            "score": 88.0,
            "commentary": "Excellent execution. Polarity and insulation resistance tested successfully.",
        },
        headers=_auth(assessor_token),
    )
    assert score_resp.status_code == 200, score_resp.text
    assert score_resp.json()["data"]["passed"] is True

    dec_c01 = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/criteria/{c01.id}/decision",
        json={
            "decision": "approved",
            "rationale": "Safety isolation evidence matches rubric RUB-ELE-01.",
            "rubric_result": "pass",
        },
        headers=_auth(assessor_token),
    )
    assert dec_c01.status_code == 200

    dec_c02 = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/criteria/{c02.id}/decision",
        json={
            "decision": "approved",
            "rationale": "Socket wiring meets rubric RUB-ELE-02.",
            "rubric_result": "pass",
        },
        headers=_auth(assessor_token),
    )
    assert dec_c02.status_code == 200

    # ── 10. Formal Competency Verification Approval ───────────────────────────
    final_resp = await client.post(
        f"{ASSESSMENTS_URL}/cases/{case_id}/final-decision",
        json={"outcome": "approved", "rationale": "Candidate satisfies all mandatory criteria."},
        headers=_auth(assessor_token),
    )
    assert final_resp.status_code == 200
    final_data = final_resp.json()["data"]
    assert final_data["status"] == "approved"
    assert final_data["verification"] is not None
    assert final_data["verification"]["certificate_number"].startswith("CR-")

    # ── 11. Customer Registration & Login ─────────────────────────────────────
    customer_email = "ananya.customer@craftrelay.dev"
    customer_token, customer_user_id = await _register_and_login(
        client, customer_email, role="customer"
    )

    # ── 12. Customer Marketplace Discovery (Verified Worker) ──────────────────
    discover_resp = await client.get(
        f"{WORKERS_URL}?skill=Domestic%20Wiring&verified_only=true",
        headers=_auth(customer_token),
    )
    assert discover_resp.status_code == 200
    workers_found = discover_resp.json()["data"]
    assert len(workers_found) >= 1
    found_worker = next(w for w in workers_found if w["id"] == worker_profile_id)
    assert found_worker["trade_title"] == "Master Electrician"
    verifications_resp = await client.get(
        f"{WORKERS_URL}/{worker_profile_id}/verifications",
        headers=_auth(customer_token),
    )
    assert verifications_resp.status_code == 200
    assert len(verifications_resp.json()["data"]) >= 1

    # ── 13. Service Request Creation ──────────────────────────────────────────
    sr_create_resp = await client.post(
        SERVICE_REQUESTS_URL,
        json={
            "worker_profile_id": worker_profile_id,
            "title": "Install Twin Sockets in Living Room",
            "description": "Need 2 new electrical outlets installed and tested.",
            "service_location": "Koramangala, Bengaluru",
            "preferred_date": "2026-11-15",
        },
        headers=_auth(customer_token),
    )
    assert sr_create_resp.status_code == 201
    sr_id = sr_create_resp.json()["data"]["id"]
    assert sr_create_resp.json()["data"]["status"] == "requested"

    # ── 14. Worker Accepts & Starts Service Request ───────────────────────────
    accept_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{sr_id}/accept",
        headers=_auth(worker_token),
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["data"]["status"] == "accepted"

    start_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{sr_id}/start",
        headers=_auth(worker_token),
    )
    assert start_resp.status_code == 200
    assert start_resp.json()["data"]["status"] == "in_progress"

    # ── 15. Worker Marks Work Complete (Dual Confirmation Flow) ───────────────
    comp_worker_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{sr_id}/complete-worker",
        json={"worker_notes": "Outlets installed, insulated, and polarity verified."},
        headers=_auth(worker_token),
    )
    assert comp_worker_resp.status_code == 200
    assert comp_worker_resp.json()["data"]["status"] == "completion_pending"

    # ── 16. Customer Confirms Completion ──────────────────────────────────────
    comp_cust_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{sr_id}/complete-customer",
        json={"customer_notes": "Great job. Sockets tested and working safely."},
        headers=_auth(customer_token),
    )
    assert comp_cust_resp.status_code == 200
    assert comp_cust_resp.json()["data"]["status"] == "completed"

    # ── 17. Customer Leaves 5-Star Review & Rating ─────────────────────────────
    review_resp = await client.post(
        f"{SERVICE_REQUESTS_URL}/{sr_id}/reviews",
        json={"rating": 5.0, "comment": "Outstanding electrician. Highly skilled and professional!"},
        headers=_auth(customer_token),
    )
    assert review_resp.status_code == 201
    assert review_resp.json()["data"]["rating"] == 5.0

    # ── 18. Verify Worker Profile Rating & Total Reviews Updated ──────────────
    updated_profile_resp = await client.get(
        f"{WORKERS_URL}/me",
        headers=_auth(worker_token),
    )
    assert updated_profile_resp.status_code == 200
    worker_data = updated_profile_resp.json()["data"]
    assert worker_data["total_reviews"] == 1
    assert worker_data["average_rating"] == 5.0

    # ── 19. Verify Saved Database Records ─────────────────────────────────────
    db_verification = (
        await db_session.execute(
            select(CompetencyVerification).where(
                CompetencyVerification.worker_profile_id == uuid.UUID(worker_profile_id)
            )
        )
    ).scalar_one_or_none()
    assert db_verification is not None
    assert db_verification.status == VerificationStatus.verified

    db_review = (
        await db_session.execute(
            select(CustomerReview).where(
                CustomerReview.service_request_id == uuid.UUID(sr_id)
            )
        )
    ).scalar_one_or_none()
    assert db_review is not None
    assert db_review.rating == 5.0
