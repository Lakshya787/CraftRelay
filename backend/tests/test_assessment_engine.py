"""
tests/test_assessment_engine.py — Deterministic evidence-gap-to-task engine.

Covers:
• Missing, pending, rejected, accepted and conflicting evidence
• Practical-task gating and assessor-decision readiness (never auto-verified)
• Mandatory vs optional criterion blocking
• Version-bound mapping validation (invalid / foreign criterion IDs)
• Approved-task recommendation traceability
• Case ownership, role restrictions and duplicate-case prevention
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import ApprovedAssessmentTask, AssessmentResult
from app.models.competency import (
    CompetencyCriterion,
    CriterionEvidenceMap,
    EvidenceItem,
    EvidenceReviewStatus,
    EvidenceType,
)
from app.models.qualification import Qualification, QualificationVersion

BASE = "/api/v1"
REGISTER_URL = f"{BASE}/auth/register"
LOGIN_URL = f"{BASE}/auth/login"
CASES_URL = f"{BASE}/assessments/cases"
QUEUE_URL = f"{BASE}/assessments/queue"

import os
PASSWORD = os.getenv("TEST_PASSWORD", "SecurePass1!")


# ── Fixtures / helpers ────────────────────────────────────────────────────────

@dataclass
class Catalogue:
    qualification: Qualification
    version: QualificationVersion
    criteria: list[CompetencyCriterion]
    task_c01: ApprovedAssessmentTask
    task_c02: ApprovedAssessmentTask


async def _register(client: AsyncClient, email: str, role: str = "worker") -> str:
    await client.post(
        REGISTER_URL,
        json={
            "email": email,
            "full_name": email.split("@")[0].title(),
            "password": PASSWORD,
            "role": role,
        },
    )
    resp = await client.post(LOGIN_URL, json={"email": email, "password": PASSWORD})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _profile_id(client: AsyncClient, token: str) -> str:
    resp = await client.get(f"{BASE}/workers/me", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


async def _create_catalogue(
    db: AsyncSession, code_prefix: str = "ENG-L1"
) -> Catalogue:
    qualification = Qualification(
        code=code_prefix,
        title="Engineering Practice (Illustrative)",
        trade="Engineering",
        issuing_body="Test Body",
        level=1,
        is_illustrative=True,
        current_version=1,
    )
    db.add(qualification)
    await db.flush()

    c01 = CompetencyCriterion(
        qualification_id=qualification.id,
        code=f"{code_prefix}-C01",
        description="Safely isolate a domestic circuit before working on it.",
        is_mandatory=True,
        order_index=1,
        rubric_reference="R-01",
    )
    c02 = CompetencyCriterion(
        qualification_id=qualification.id,
        code=f"{code_prefix}-C02",
        description="Install and terminate PVC insulated cable to a junction box.",
        is_mandatory=True,
        order_index=2,
        rubric_reference="R-02",
    )
    c03 = CompetencyCriterion(
        qualification_id=qualification.id,
        code=f"{code_prefix}-C03",
        description="Complete a minor works certificate legibly.",
        is_mandatory=False,
        order_index=3,
        rubric_reference="R-03",
    )
    db.add_all([c01, c02, c03])
    await db.flush()

    version = QualificationVersion(
        qualification_id=qualification.id,
        version_number=1,
        change_summary="Test version",
        snapshot={
            "code": qualification.code,
            "criteria": [c01.code, c02.code, c03.code],
        },
    )
    db.add(version)

    task_c01 = ApprovedAssessmentTask(
        qualification_id=qualification.id,
        code=f"{code_prefix}-PT-01",
        title="Isolate and prove dead",
        description="Perform safe isolation and prove the circuit is dead.",
        rubric_reference="R-01",
        criterion_codes=[c01.code],
        is_approved=True,
        is_active=True,
        max_score=100,
        pass_score=70,
    )
    task_c02 = ApprovedAssessmentTask(
        qualification_id=qualification.id,
        code=f"{code_prefix}-PT-02",
        title="Terminate cable into a junction box",
        description="Terminate PVC cable correctly.",
        rubric_reference="R-02",
        criterion_codes=[c02.code],
        is_approved=True,
        is_active=True,
        max_score=100,
        pass_score=70,
    )
    # These must never surface in recommendations.
    unapproved = ApprovedAssessmentTask(
        qualification_id=qualification.id,
        code=f"{code_prefix}-PT-XX",
        title="Unapproved draft task",
        rubric_reference="R-XX",
        criterion_codes=[c01.code],
        is_approved=False,
        is_active=True,
    )
    inactive = ApprovedAssessmentTask(
        qualification_id=qualification.id,
        code=f"{code_prefix}-PT-YY",
        title="Retired task",
        rubric_reference="R-YY",
        criterion_codes=[c01.code],
        is_approved=True,
        is_active=False,
    )
    unrubricked = ApprovedAssessmentTask(
        qualification_id=qualification.id,
        code=f"{code_prefix}-PT-ZZ",
        title="Task without a rubric",
        rubric_reference=None,
        criterion_codes=[c01.code],
        is_approved=True,
        is_active=True,
    )
    db.add_all([task_c01, task_c02, unapproved, inactive, unrubricked])
    await db.commit()

    return Catalogue(
        qualification=qualification,
        version=version,
        criteria=[c01, c02, c03],
        task_c01=task_c01,
        task_c02=task_c02,
    )


async def _add_evidence(
    db: AsyncSession,
    worker_profile_id: str,
    *,
    title: str,
    description: str,
    review_status: EvidenceReviewStatus,
    criterion_ids: list[uuid.UUID] | None = None,
) -> EvidenceItem:
    item = EvidenceItem(
        worker_profile_id=uuid.UUID(str(worker_profile_id)),
        title=title,
        description=description,
        evidence_type=EvidenceType.photo,
        review_status=review_status,
    )
    db.add(item)
    await db.flush()
    for criterion_id in criterion_ids or []:
        db.add(
            CriterionEvidenceMap(
                criterion_id=criterion_id,
                evidence_item_id=item.id,
            )
        )
    await db.commit()
    return item


async def _add_result(
    db: AsyncSession, case_id: str, task_id: uuid.UUID, passed: bool = True
) -> None:
    db.add(
        AssessmentResult(
            assessment_case_id=uuid.UUID(case_id),
            task_id=task_id,
            score=80,
            passed=passed,
        )
    )
    await db.commit()


async def _open_case(client: AsyncClient, token: str, qualification_id) -> str:
    resp = await client.post(
        CASES_URL,
        json={"qualification_id": str(qualification_id)},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["id"]


async def _workspace(client: AsyncClient, token: str, case_id: str) -> dict:
    resp = await client.get(f"{CASES_URL}/{case_id}", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def _status_by_code(workspace: dict) -> dict[str, str]:
    return {c["code"]: c["status"] for c in workspace["criteria"]}


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_missing_evidence_is_gap_and_tasks_are_traceable(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "gap-worker@example.com")
    case_id = await _open_case(client, token, catalogue.qualification.id)

    workspace = await _workspace(client, token, case_id)
    statuses = _status_by_code(workspace)

    assert set(statuses.values()) == {"GAP"}
    assert workspace["unresolved_criterion_count"] == 3
    assert workspace["mandatory_blocker_count"] == 2
    assert workspace["readiness"] == "MANDATORY_GAPS_REMAIN"

    recommended_codes = {r["task"]["code"] for r in workspace["recommendations"]}
    assert catalogue.task_c01.code in recommended_codes
    assert catalogue.task_c02.code in recommended_codes
    # Unapproved, retired and rubric-less tasks are never recommended.
    assert f"{catalogue.qualification.code}-PT-XX" not in recommended_codes
    assert f"{catalogue.qualification.code}-PT-YY" not in recommended_codes
    assert f"{catalogue.qualification.code}-PT-ZZ" not in recommended_codes

    for recommendation in workspace["recommendations"]:
        assert recommendation["task"]["rubric_reference"]
        assert recommendation["task"]["criterion_codes"]
        assert recommendation["addresses_criterion_codes"]


@pytest.mark.asyncio
async def test_pending_evidence_is_pending_review(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "pending-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Isolation photo",
        description="Photo of the isolated circuit with lock-off tag.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[catalogue.criteria[0].id],
    )

    workspace = await _workspace(client, token, case_id)
    assert _status_by_code(workspace)[catalogue.criteria[0].code] == "PENDING_REVIEW"
    criterion_state = next(
        c for c in workspace["criteria"] if c["code"] == catalogue.criteria[0].code
    )
    assert criterion_state["pending_evidence_count"] == 1
    assert criterion_state["assessor_review_required"] is True


@pytest.mark.asyncio
async def test_rejected_evidence_requires_additional_evidence(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "rejected-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Blurry certificate",
        description="Illegible scan.",
        review_status=EvidenceReviewStatus.rejected,
        criterion_ids=[catalogue.criteria[0].id],
    )

    workspace = await _workspace(client, token, case_id)
    state = _status_by_code(workspace)[catalogue.criteria[0].code]
    assert state == "ADDITIONAL_EVIDENCE_REQUIRED"


@pytest.mark.asyncio
async def test_accepted_evidence_requires_practical_verification(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "practical-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Isolation procedure",
        description="Safely isolate a domestic circuit before working on it.",
        review_status=EvidenceReviewStatus.accepted,
        criterion_ids=[catalogue.criteria[0].id],
    )

    workspace = await _workspace(client, token, case_id)
    assert (
        _status_by_code(workspace)[catalogue.criteria[0].code]
        == "PRACTICAL_VERIFICATION_REQUIRED"
    )
    state = next(
        c for c in workspace["criteria"] if c["code"] == catalogue.criteria[0].code
    )
    assert state["linked_tasks"][0]["code"] == catalogue.task_c01.code


@pytest.mark.asyncio
async def test_accepted_evidence_and_passed_task_is_ready_not_verified(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "ready-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Isolation procedure",
        description="Safely isolate a domestic circuit before working on it.",
        review_status=EvidenceReviewStatus.accepted,
        criterion_ids=[catalogue.criteria[0].id],
    )
    await _add_result(db_session, case_id, catalogue.task_c01.id, passed=True)

    workspace = await _workspace(client, token, case_id)
    assert (
        _status_by_code(workspace)[catalogue.criteria[0].code]
        == "READY_FOR_ASSESSOR_DECISION"
    )

    # No state is ever VERIFIED by the deterministic engine.
    assert "VERIFIED" not in _status_by_code(workspace).values()
    state = next(
        c for c in workspace["criteria"] if c["code"] == catalogue.criteria[0].code
    )
    assert state["assessor_review_required"] is True
    assert state["passed_task_codes"] == [catalogue.task_c01.code]

    # A resolved criterion must not be targeted by a recommendation.
    for recommendation in workspace["recommendations"]:
        assert catalogue.criteria[0].code not in recommendation["addresses_criterion_codes"]


@pytest.mark.asyncio
async def test_optional_gap_is_not_a_mandatory_blocker(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "optional-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    for criterion, task in (
        (catalogue.criteria[0], catalogue.task_c01),
        (catalogue.criteria[1], catalogue.task_c02),
    ):
        await _add_evidence(
            db_session,
            profile_id,
            title=f"Evidence for {criterion.code}",
            description=criterion.description,
            review_status=EvidenceReviewStatus.accepted,
            criterion_ids=[criterion.id],
        )
        await _add_result(db_session, case_id, task.id, passed=True)

    workspace = await _workspace(client, token, case_id)
    assert _status_by_code(workspace)[catalogue.criteria[2].code] == "GAP"
    assert workspace["mandatory_blocker_count"] == 0
    assert workspace["readiness"] == "GAPS_REMAIN"
    assert workspace["unresolved_criterion_codes"] == [catalogue.criteria[2].code]


@pytest.mark.asyncio
async def test_conflicting_evidence_is_explicit(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "conflict-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Accepted isolation record",
        description="Lock-off and prove-dead record.",
        review_status=EvidenceReviewStatus.accepted,
        criterion_ids=[catalogue.criteria[0].id],
    )
    await _add_evidence(
        db_session,
        profile_id,
        title="Rejected isolation photo",
        description="Unclear image of the isolation point.",
        review_status=EvidenceReviewStatus.rejected,
        criterion_ids=[catalogue.criteria[0].id],
    )

    workspace = await _workspace(client, token, case_id)
    state = next(
        c for c in workspace["criteria"] if c["code"] == catalogue.criteria[0].code
    )
    assert state["status"] == "PRACTICAL_VERIFICATION_REQUIRED"
    assert state["conflicts"], "conflicting evidence must be surfaced explicitly"
    assert state["rejected_evidence_count"] == 1


@pytest.mark.asyncio
async def test_mapping_suggestions_are_version_bound_and_traceable(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "suggest-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Isolate domestic circuit",
        description="Safely isolate a domestic circuit before working on it.",
        review_status=EvidenceReviewStatus.pending,
    )

    resp = await client.get(
        f"{CASES_URL}/{case_id}/mapping-suggestions", headers=_auth(token)
    )
    assert resp.status_code == 200, resp.text
    suggestions = resp.json()["data"]
    assert suggestions, "expected a lexical match for the evidence text"

    criterion_ids = {str(c.id) for c in catalogue.criteria}
    for suggestion in suggestions:
        assert suggestion["criterion_id"] in criterion_ids
        assert suggestion["qualification_version_id"] == str(catalogue.version.id)
        assert 0.0 <= suggestion["match_score"] <= 1.0
        assert suggestion["requires_assessor_review"] is True
        assert "ranking signal" in suggestion["match_explanation"].lower()
        assert suggestion["supporting_text"]
    assert suggestions[0]["criterion_code"] == catalogue.criteria[0].code


@pytest.mark.asyncio
async def test_invalid_criterion_id_is_rejected(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "invalid-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Some evidence",
        description="Some description.",
        review_status=EvidenceReviewStatus.pending,
    )

    resp = await client.post(
        f"{CASES_URL}/{case_id}/mappings",
        json={
            "criterion_id": str(uuid.uuid4()),
            "evidence_item_id": str(evidence.id),
        },
        headers=_auth(token),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_criterion_from_another_qualification_is_rejected(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    other = await _create_catalogue(db_session, code_prefix="OTH-L1")
    token = await _register(client, "foreign-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Isolation record",
        description="Safely isolate a circuit.",
        review_status=EvidenceReviewStatus.pending,
    )

    resp = await client.post(
        f"{CASES_URL}/{case_id}/mappings",
        json={
            "criterion_id": str(other.criteria[0].id),
            "evidence_item_id": str(evidence.id),
        },
        headers=_auth(token),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_valid_mapping_is_idempotent_and_persists(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "mapping-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Isolation record",
        description="Safely isolate a domestic circuit before working on it.",
        review_status=EvidenceReviewStatus.pending,
    )

    payload = {
        "criterion_id": str(catalogue.criteria[0].id),
        "evidence_item_id": str(evidence.id),
        "mapping_source": "suggested",
    }
    first = await client.post(
        f"{CASES_URL}/{case_id}/mappings", json=payload, headers=_auth(token)
    )
    assert first.status_code == 201, first.text
    assert first.json()["data"]["mapping_source"] == "suggested"
    assert first.json()["data"]["match_score"] > 0

    second = await client.post(
        f"{CASES_URL}/{case_id}/mappings", json=payload, headers=_auth(token)
    )
    assert second.status_code == 201
    assert second.json()["data"]["id"] == first.json()["data"]["id"]

    workspace = await _workspace(client, token, case_id)
    state = next(
        c for c in workspace["criteria"] if c["code"] == catalogue.criteria[0].code
    )
    assert [e["id"] for e in state["evidence"]] == [str(evidence.id)]
    assert state["status"] == "PENDING_REVIEW"


@pytest.mark.asyncio
async def test_unmatched_suggested_link_is_recorded_as_manual(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "lowmatch-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Painted a boundary wall",
        description="Two coats of exterior emulsion on a boundary wall.",
        review_status=EvidenceReviewStatus.pending,
    )

    resp = await client.post(
        f"{CASES_URL}/{case_id}/mappings",
        json={
            "criterion_id": str(catalogue.criteria[0].id),
            "evidence_item_id": str(evidence.id),
            "mapping_source": "suggested",
        },
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["mapping_source"] == "manual"
    assert "below the suggestion threshold" in data["match_explanation"]


@pytest.mark.asyncio
async def test_worker_cannot_use_another_workers_evidence(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token_a = await _register(client, "owner-a@example.com")
    token_b = await _register(client, "intruder-b@example.com")
    profile_b = await _profile_id(client, token_b)
    case_id = await _open_case(client, token_a, catalogue.qualification.id)

    foreign_evidence = await _add_evidence(
        db_session,
        profile_b,
        title="Someone else's evidence",
        description="Private evidence.",
        review_status=EvidenceReviewStatus.pending,
    )

    resp = await client.post(
        f"{CASES_URL}/{case_id}/mappings",
        json={
            "criterion_id": str(catalogue.criteria[0].id),
            "evidence_item_id": str(foreign_evidence.id),
        },
        headers=_auth(token_a),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_case_ownership_and_role_restrictions(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token_a = await _register(client, "case-owner@example.com")
    token_b = await _register(client, "case-other@example.com")
    customer_token = await _register(client, "case-customer@example.com", role="customer")
    assessor_token = await _register(client, "case-assessor@example.com", role="assessor")
    case_id = await _open_case(client, token_a, catalogue.qualification.id)

    # Other worker cannot read the case
    resp = await client.get(f"{CASES_URL}/{case_id}", headers=_auth(token_b))
    assert resp.status_code == 403

    # Customer cannot read cases or the queue
    assert (
        await client.get(f"{CASES_URL}/{case_id}", headers=_auth(customer_token))
    ).status_code == 403
    assert (
        await client.get(QUEUE_URL, headers=_auth(customer_token))
    ).status_code == 403

    # Worker cannot read the assessor queue
    assert (await client.get(QUEUE_URL, headers=_auth(token_a))).status_code == 403

    # Assessor can read the case and the queue
    assert (
        await client.get(f"{CASES_URL}/{case_id}", headers=_auth(assessor_token))
    ).status_code == 200
    assert (await client.get(QUEUE_URL, headers=_auth(assessor_token))).status_code == 200


@pytest.mark.asyncio
async def test_case_submission_moves_to_queue_and_is_idempotent(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "submit-worker@example.com")
    assessor_token = await _register(client, "submit-assessor@example.com", role="assessor")
    case_id = await _open_case(client, token, catalogue.qualification.id)

    submitted = await client.post(
        f"{CASES_URL}/{case_id}/submit", headers=_auth(token)
    )
    assert submitted.status_code == 200
    assert submitted.json()["data"]["status"] == "submitted"

    again = await client.post(f"{CASES_URL}/{case_id}/submit", headers=_auth(token))
    assert again.status_code == 200
    assert "already submitted" in again.json()["message"].lower()

    queue = await client.get(QUEUE_URL, headers=_auth(assessor_token))
    queue_ids = {c["id"] for c in queue.json()["data"]}
    assert case_id in queue_ids


@pytest.mark.asyncio
async def test_reopening_the_same_qualification_reuses_the_case(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "reopen-worker@example.com")

    first = await client.post(
        CASES_URL,
        json={"qualification_id": str(catalogue.qualification.id)},
        headers=_auth(token),
    )
    second = await client.post(
        CASES_URL,
        json={"qualification_id": str(catalogue.qualification.id)},
        headers=_auth(token),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["data"]["id"] == second.json()["data"]["id"]


@pytest.mark.asyncio
async def test_client_cannot_self_assign_formal_status(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Mass-assignment guard: case creation only accepts qualification/statement."""
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "massassign-worker@example.com")
    assessor_token = await _register(
        client, "massassign-assessor@example.com", role="assessor"
    )
    assessor_me = await client.get(f"{BASE}/auth/me", headers=_auth(assessor_token))
    assessor_id = assessor_me.json()["data"]["id"]

    resp = await client.post(
        CASES_URL,
        json={
            "qualification_id": str(catalogue.qualification.id),
            "status": "approved",
            "assessor_id": assessor_id,
        },
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    # Extra fields are ignored — a worker cannot set formal status or assessor.
    assert data["status"] == "draft"
    assert "VERIFIED" not in [c["status"] for c in data["criteria"]]

    # Submission is the only self-service transition, and it stops at submitted.
    submitted = await client.post(
        f"{CASES_URL}/{data['id']}/submit", headers=_auth(token)
    )
    assert submitted.status_code == 200
    assert submitted.json()["data"]["status"] == "submitted"

    # Another worker cannot submit someone else's case.
    other_token = await _register(client, "massassign-other@example.com")
    forbidden = await client.post(
        f"{CASES_URL}/{data['id']}/submit", headers=_auth(other_token)
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_evaluation_is_deterministic(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session)
    token = await _register(client, "deterministic-worker@example.com")
    profile_id = await _profile_id(client, token)
    case_id = await _open_case(client, token, catalogue.qualification.id)

    await _add_evidence(
        db_session,
        profile_id,
        title="Accepted evidence",
        description="Safely isolate a domestic circuit.",
        review_status=EvidenceReviewStatus.accepted,
        criterion_ids=[catalogue.criteria[0].id],
    )
    await _add_evidence(
        db_session,
        profile_id,
        title="Pending evidence",
        description="Terminate cable in a junction box.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[catalogue.criteria[1].id],
    )

    first = await _workspace(client, token, case_id)
    second = await _workspace(client, token, case_id)
    assert first["criteria"] == second["criteria"]
    assert first["recommendations"] == second["recommendations"]
    assert first["status_counts"] == second["status_counts"]
