"""
tests/test_assessor_workflow.py — Part 6 assessor workflow.

Covers evidence review, criterion-level decisions, practical-task results,
mandatory-criterion enforcement, formal verification, idempotency, ownership,
role restrictions and audit logging.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import (
    AssessmentResult,
    CompetencyVerification,
    CriterionAssessmentDecision,
)
from app.models.audit import AuditLog
from app.models.competency import EvidenceItem, EvidenceReviewStatus
from tests.test_assessment_engine import (
    BASE,
    CASES_URL,
    _add_evidence,
    _auth,
    _create_catalogue,
    _open_case,
    _profile_id,
    _register,
    _status_by_code,
    _workspace,
)

EVIDENCE_URL = f"{BASE}/evidence"


async def _submit(client: AsyncClient, token: str, case_id: str) -> None:
    resp = await client.post(f"{CASES_URL}/{case_id}/submit", headers=_auth(token))
    assert resp.status_code == 200, resp.text


async def _accept_evidence(
    client: AsyncClient, token: str, evidence_id: uuid.UUID
) -> None:
    resp = await client.patch(
        f"{EVIDENCE_URL}/{evidence_id}/review",
        json={"review_status": "accepted", "note": "Verified against the rubric."},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text


async def _reject_evidence(
    client: AsyncClient, token: str, evidence_id: uuid.UUID
) -> None:
    resp = await client.patch(
        f"{EVIDENCE_URL}/{evidence_id}/review",
        json={"review_status": "rejected", "note": "Illegible and undated."},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text


def _decision_payload(
    decision: str = "approved", rationale: str = "Evidence matches the rubric."
) -> dict:
    return {
        "decision": decision,
        "rationale": rationale,
        "rubric_result": "pass" if decision == "approved" else "fail",
    }


async def _decide(
    client: AsyncClient,
    token: str,
    case_id: str,
    criterion_id: uuid.UUID,
    decision: str = "approved",
) -> object:
    return await client.post(
        f"{CASES_URL}/{case_id}/criteria/{criterion_id}/decision",
        json=_decision_payload(decision),
        headers=_auth(token),
    )


async def _task_result(
    client: AsyncClient, token: str, case_id: str, task_id: uuid.UUID, score: float
) -> object:
    return await client.post(
        f"{CASES_URL}/{case_id}/tasks/{task_id}/result",
        json={"score": score, "commentary": "Observed during the practical test."},
        headers=_auth(token),
    )


async def _final(
    client: AsyncClient, token: str, case_id: str, outcome: str
) -> object:
    return await client.post(
        f"{CASES_URL}/{case_id}/final-decision",
        json={
            "outcome": outcome,
            "rationale": "All mandatory criteria have been assessed against the rubric.",
        },
        headers=_auth(token),
    )


async def _prepare_ready_criterion(
    client: AsyncClient,
    db: AsyncSession,
    *,
    token: str,
    assessor_token: str,
    case_id: str,
    criterion,
    task,
) -> EvidenceItem:
    """Accepted evidence + a passing practical result for one criterion."""
    profile_id = await _profile_id(client, token)
    evidence = await _add_evidence(
        db,
        profile_id,
        title=f"Evidence for {criterion.code}",
        description=criterion.description,
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[criterion.id],
    )
    await _accept_evidence(client, assessor_token, evidence.id)
    result = await _task_result(client, assessor_token, case_id, task.id, 85)
    assert result.status_code == 200, result.text
    return evidence


# ── Evidence review ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_only_assessors_can_review_evidence(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="REV-L1")
    worker_token = await _register(client, "review-worker@example.com")
    assessor_token = await _register(
        client, "review-assessor@example.com", role="assessor"
    )
    customer_token = await _register(
        client, "review-customer@example.com", role="customer"
    )
    profile_id = await _profile_id(client, worker_token)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Isolation record",
        description="Safely isolate a domestic circuit.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[catalogue.criteria[0].id],
    )

    worker_attempt = await client.patch(
        f"{EVIDENCE_URL}/{evidence.id}/review",
        json={"review_status": "accepted"},
        headers=_auth(worker_token),
    )
    assert worker_attempt.status_code == 403

    customer_attempt = await client.patch(
        f"{EVIDENCE_URL}/{evidence.id}/review",
        json={"review_status": "accepted"},
        headers=_auth(customer_token),
    )
    assert customer_attempt.status_code == 403

    accepted = await client.patch(
        f"{EVIDENCE_URL}/{evidence.id}/review",
        json={"review_status": "accepted", "note": "Clear and complete."},
        headers=_auth(assessor_token),
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["data"]["review_status"] == "accepted"
    assert accepted.json()["data"]["is_verified"] is True

    audit = await db_session.execute(
        select(AuditLog).where(AuditLog.action == "evidence.reviewed")
    )
    assert audit.scalars().all()

    # Rejection requires a note.
    missing_note = await client.patch(
        f"{EVIDENCE_URL}/{evidence.id}/review",
        json={"review_status": "rejected"},
        headers=_auth(assessor_token),
    )
    assert missing_note.status_code == 422


@pytest.mark.asyncio
async def test_rejected_evidence_changes_engine_state(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="REJ-L1")
    worker_token = await _register(client, "review-reject-worker@example.com")
    assessor_token = await _register(
        client, "review-reject-assessor@example.com", role="assessor"
    )
    profile_id = await _profile_id(client, worker_token)
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Blurry certificate",
        description="Illegible scan.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[catalogue.criteria[0].id],
    )

    await _reject_evidence(client, assessor_token, evidence.id)
    workspace = await _workspace(client, worker_token, case_id)
    assert (
        _status_by_code(workspace)[catalogue.criteria[0].code]
        == "ADDITIONAL_EVIDENCE_REQUIRED"
    )


@pytest.mark.asyncio
async def test_mapping_review_controls_engine_evidence(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """An assessor can confirm or reject an evidence→criterion link."""
    catalogue = await _create_catalogue(db_session, code_prefix="MAP-L1")
    criterion = catalogue.criteria[0]
    worker_token = await _register(client, "mapping-worker@example.com")
    assessor_token = await _register(
        client, "mapping-assessor@example.com", role="assessor"
    )
    profile_id = await _profile_id(client, worker_token)
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)
    await _add_evidence(
        db_session,
        profile_id,
        title="Irrelevant certificate",
        description="Awareness training record.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[criterion.id],
    )

    workspace = await _workspace(client, worker_token, case_id)
    criterion_state = next(
        c for c in workspace["criteria"] if c["code"] == criterion.code
    )
    evidence_ref = criterion_state["evidence"][0]
    mapping_id = evidence_ref["mapping_id"]
    assert evidence_ref["mapping_status"] == "pending"
    assert _status_by_code(workspace)[criterion.code] == "PENDING_REVIEW"

    review_url = f"{CASES_URL}/{case_id}/mappings/{mapping_id}/review"

    worker_attempt = await client.patch(
        review_url, json={"decision": "rejected"}, headers=_auth(worker_token)
    )
    assert worker_attempt.status_code == 403

    unknown = await client.patch(
        f"{CASES_URL}/{case_id}/mappings/{uuid.uuid4()}/review",
        json={"decision": "rejected"},
        headers=_auth(assessor_token),
    )
    assert unknown.status_code == 404

    rejected = await client.patch(
        review_url,
        json={"decision": "rejected", "note": "Does not address this criterion."},
        headers=_auth(assessor_token),
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["data"]["mapping_status"] == "rejected"
    assert rejected.json()["data"]["reviewed_by_id"] is not None
    assert rejected.json()["data"]["assessor_note"] == (
        "Does not address this criterion."
    )

    after_reject = await _workspace(client, worker_token, case_id)
    assert _status_by_code(after_reject)[criterion.code] == "GAP"
    reused = next(
        c for c in after_reject["criteria"] if c["code"] == criterion.code
    )["evidence"][0]
    assert reused["mapping_status"] == "rejected"
    # The evidence item itself was not altered by the link decision.
    assert reused["review_status"] == "pending"

    confirmed = await client.patch(
        review_url, json={"decision": "confirmed"}, headers=_auth(assessor_token)
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["data"]["mapping_status"] == "confirmed"

    after_confirm = await _workspace(client, worker_token, case_id)
    assert _status_by_code(after_confirm)[criterion.code] == "PENDING_REVIEW"

    audit = await db_session.execute(
        select(AuditLog).where(AuditLog.action == "assessment.mapping_reviewed")
    )
    assert len(audit.scalars().all()) == 2


# ── Criterion decisions ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_approval_requires_ready_criterion(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="CRT-L1")
    worker_token = await _register(client, "crit-worker@example.com")
    assessor_token = await _register(
        client, "crit-assessor@example.com", role="assessor"
    )
    profile_id = await _profile_id(client, worker_token)
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Isolation record",
        description="Safely isolate a domestic circuit.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[catalogue.criteria[0].id],
    )

    # Pending evidence: cannot approve.
    pending_attempt = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert pending_attempt.status_code == 422

    await _accept_evidence(client, assessor_token, evidence.id)

    # Accepted evidence but no passing practical task: still blocked.
    practical_attempt = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert practical_attempt.status_code == 422
    assert "practical" in practical_attempt.json()["detail"].lower()

    # A failing practical result does not unlock approval.
    failed_task = await _task_result(
        client, assessor_token, case_id, catalogue.task_c01.id, 50
    )
    assert failed_task.status_code == 200
    assert failed_task.json()["data"]["passed"] is False
    still_blocked = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert still_blocked.status_code == 422

    # A passing result unlocks it.
    passed_task = await _task_result(
        client, assessor_token, case_id, catalogue.task_c01.id, 85
    )
    assert passed_task.status_code == 200
    assert passed_task.json()["data"]["passed"] is True

    approved = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert approved.status_code == 200, approved.text
    data = approved.json()["data"]
    assert data["decision"] == "approved"
    assert data["qualification_version_id"] == str(catalogue.version.id)
    assert data["assessor_name"] == "Crit-Assessor"

    # Idempotent retry does not create a duplicate row.
    retry = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert retry.status_code == 200
    assert retry.json()["data"]["id"] == data["id"]

    # Conflicting decision is refused.
    conflict = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id, decision="rejected"
    )
    assert conflict.status_code == 409

    count = await db_session.execute(
        select(CriterionAssessmentDecision).where(
            CriterionAssessmentDecision.assessment_case_id == uuid.UUID(case_id)
        )
    )
    assert len(count.scalars().all()) == 1


@pytest.mark.asyncio
async def test_additional_evidence_decision_can_be_revised(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="REV2-L1")
    worker_token = await _register(client, "revise-worker@example.com")
    assessor_token = await _register(
        client, "revise-assessor@example.com", role="assessor"
    )
    profile_id = await _profile_id(client, worker_token)
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)
    evidence = await _add_evidence(
        db_session,
        profile_id,
        title="Isolation record",
        description="Safely isolate a domestic circuit.",
        review_status=EvidenceReviewStatus.pending,
        criterion_ids=[catalogue.criteria[0].id],
    )

    more = await _decide(
        client,
        assessor_token,
        case_id,
        catalogue.criteria[0].id,
        decision="additional_evidence_required",
    )
    assert more.status_code == 200, more.text
    assert more.json()["data"]["decision"] == "additional_evidence_required"

    await _accept_evidence(client, assessor_token, evidence.id)
    await _task_result(client, assessor_token, case_id, catalogue.task_c01.id, 90)

    revised = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert revised.status_code == 200, revised.text
    assert revised.json()["data"]["decision"] == "approved"
    assert revised.json()["data"]["id"] == more.json()["data"]["id"]

    rows = await db_session.execute(
        select(CriterionAssessmentDecision).where(
            CriterionAssessmentDecision.assessment_case_id == uuid.UUID(case_id)
        )
    )
    assert len(rows.scalars().all()) == 1


@pytest.mark.asyncio
async def test_task_result_computes_pass_and_upserts(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="TSK-L1")
    worker_token = await _register(client, "task-worker@example.com")
    assessor_token = await _register(
        client, "task-assessor@example.com", role="assessor"
    )
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)

    too_high = await _task_result(
        client, assessor_token, case_id, catalogue.task_c01.id, 101
    )
    assert too_high.status_code == 422

    first = await _task_result(
        client, assessor_token, case_id, catalogue.task_c01.id, 60
    )
    assert first.status_code == 200
    assert first.json()["data"]["passed"] is False

    second = await _task_result(
        client, assessor_token, case_id, catalogue.task_c01.id, 95
    )
    assert second.status_code == 200
    assert second.json()["data"]["passed"] is True
    assert second.json()["data"]["id"] == first.json()["data"]["id"]

    rows = await db_session.execute(
        select(AssessmentResult).where(
            AssessmentResult.assessment_case_id == uuid.UUID(case_id)
        )
    )
    assert len(rows.scalars().all()) == 1


# ── Final decisions and verification ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_final_approval_enforces_mandatory_criteria(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="FIN-L1")
    worker_token = await _register(client, "final-worker@example.com")
    assessor_token = await _register(
        client, "final-assessor@example.com", role="assessor"
    )
    customer_token = await _register(
        client, "final-customer@example.com", role="customer"
    )
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)
    await _submit(client, worker_token, case_id)

    # Only C01 is prepared; C02 is mandatory and unresolved.
    await _prepare_ready_criterion(
        client,
        db_session,
        token=worker_token,
        assessor_token=assessor_token,
        case_id=case_id,
        criterion=catalogue.criteria[0],
        task=catalogue.task_c01,
    )
    c01_decision = await _decide(
        client, assessor_token, case_id, catalogue.criteria[0].id
    )
    assert c01_decision.status_code == 200, c01_decision.text

    blocked = await _final(client, assessor_token, case_id, "approved")
    assert blocked.status_code == 422
    assert catalogue.criteria[1].code in blocked.json()["detail"]

    # Workers and customers cannot issue a final decision.
    assert (
        await _final(client, worker_token, case_id, "approved")
    ).status_code == 403
    assert (
        await _final(client, customer_token, case_id, "approved")
    ).status_code == 403

    # Prepare and approve the second mandatory criterion.
    await _prepare_ready_criterion(
        client,
        db_session,
        token=worker_token,
        assessor_token=assessor_token,
        case_id=case_id,
        criterion=catalogue.criteria[1],
        task=catalogue.task_c02,
    )
    c02_decision = await _decide(
        client, assessor_token, case_id, catalogue.criteria[1].id
    )
    assert c02_decision.status_code == 200, c02_decision.text

    # Optional C03 is deliberately left undecided.
    approved = await _final(client, assessor_token, case_id, "approved")
    assert approved.status_code == 200, approved.text
    data = approved.json()["data"]
    assert data["status"] == "approved"
    assert data["verification"] is not None
    assert data["verification"]["status"] == "verified"
    assert data["verification"]["qualification_version_id"] == str(
        catalogue.version.id
    )
    assert data["verification"]["certificate_number"]

    verification = await db_session.execute(select(CompetencyVerification))
    verification_rows = verification.scalars().all()
    assert len(verification_rows) == 1
    assert verification_rows[0].worker_profile_id == uuid.UUID(
        await _profile_id(client, worker_token)
    )

    final_workspace = await _workspace(client, worker_token, case_id)
    assert final_workspace["status"] == "approved"
    assert final_workspace["verification"]["status"] == "verified"
    assert len(final_workspace["decisions"]) == 2
    assert final_workspace["can_approve"] is False

    # The worker profile exposes only the formal verification, not declarations.
    mine = await client.get(
        f"{BASE}/workers/me/verifications", headers=_auth(worker_token)
    )
    assert mine.status_code == 200
    assert len(mine.json()["data"]) == 1
    assert mine.json()["data"][0]["status"] == "verified"
    assert mine.json()["data"][0]["certificate_number"]
    assert mine.json()["data"][0]["qualification_code"] == catalogue.qualification.code

    public = await client.get(
        f"{BASE}/workers/{await _profile_id(client, worker_token)}/verifications"
    )
    assert public.status_code == 200
    assert len(public.json()["data"]) == 1

    duplicate = await _final(client, assessor_token, case_id, "approved")
    assert duplicate.status_code == 409

    audit = await db_session.execute(
        select(AuditLog).where(AuditLog.action == "assessment.approved")
    )
    assert audit.scalars().all()


@pytest.mark.asyncio
async def test_final_rejection_records_decision_without_verification(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    catalogue = await _create_catalogue(db_session, code_prefix="REJ3-L1")
    worker_token = await _register(client, "finalrej-worker@example.com")
    assessor_token = await _register(
        client, "finalrej-assessor@example.com", role="assessor"
    )
    case_id = await _open_case(client, worker_token, catalogue.qualification.id)
    await _submit(client, worker_token, case_id)

    rejected = await _final(client, assessor_token, case_id, "rejected")
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["data"]["status"] == "rejected"
    assert rejected.json()["data"]["verification"] is None

    verification = await db_session.execute(select(CompetencyVerification))
    assert verification.scalars().all() == []

    duplicate = await _final(client, assessor_token, case_id, "rejected")
    assert duplicate.status_code == 409
