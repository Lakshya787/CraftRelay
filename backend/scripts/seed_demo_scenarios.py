#!/usr/bin/env python
"""Seed repeatable, fictional SIH walkthrough scenarios after seed.py."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SyncSessionLocal
from app.models.assessment import AssessmentCase, CaseStatus
from app.models.competency import (
    CompetencyCriterion,
    CriterionEvidenceMap,
    EvidenceItem,
    EvidenceReviewStatus,
    EvidenceType,
)
from app.models.qualification import Qualification, QualificationVersion
from app.models.service import (
    CustomerReview,
    RequestStatus,
    ServiceCompletion,
    ServiceRequest,
)
from app.models.user import User
from app.models.worker_profile import WorkerProfile


def seed() -> None:
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise RuntimeError("Demo scenario seed is disabled when APP_ENV=production.")

    with SyncSessionLocal() as session:
        worker = session.query(User).filter_by(email="worker@craftrelay.dev").one()
        worker2 = session.query(User).filter_by(email="worker2@craftrelay.dev").one()
        customer = session.query(User).filter_by(email="customer@craftrelay.dev").one()
        profile = session.query(WorkerProfile).filter_by(user_id=worker.id).one()
        profile2 = session.query(WorkerProfile).filter_by(user_id=worker2.id).one()
        electrical = session.query(Qualification).filter_by(code="ELE-L2").one()
        plumbing = session.query(Qualification).filter_by(code="PLM-L2").one()
        c1 = session.query(CompetencyCriterion).filter_by(qualification_id=electrical.id, code="ELE-L2-C01").one()
        c2 = session.query(CompetencyCriterion).filter_by(qualification_id=electrical.id, code="ELE-L2-C02").one()
        ele_version = session.query(QualificationVersion).filter_by(qualification_id=electrical.id).order_by(QualificationVersion.version_number).first()
        plm_version = session.query(QualificationVersion).filter_by(qualification_id=plumbing.id).order_by(QualificationVersion.version_number).first()

        # A pending case with mapped evidence for criteria 1 and 2 and a visible gap for 3+.
        case = session.query(AssessmentCase).filter_by(worker_profile_id=profile.id, qualification_id=electrical.id).first()
        if not case:
            case = AssessmentCase(
                worker_profile_id=profile.id,
                qualification_id=electrical.id,
                qualification_version_id=ele_version.id,
                status=CaseStatus.submitted,
                worker_statement="Fictional demo case: domestic circuit work and test readings.",
            )
            session.add(case)
            session.flush()

        evidence = session.query(EvidenceItem).filter_by(worker_profile_id=profile.id, title="Demo: circuit isolation and wiring").first()
        if not evidence:
            evidence = EvidenceItem(
                worker_profile_id=profile.id,
                client_submission_id="sih-demo-evidence-positive-v1",
                title="Demo: circuit isolation and wiring",
                description="Illustrative evidence record for demonstration; no real certificate.",
                evidence_type=EvidenceType.photo,
                review_status=EvidenceReviewStatus.pending,
                original_filename="illustrative-wiring-photo.jpg",
                mime_type="image/jpeg",
                storage_backend="local",
            )
            session.add(evidence)
            session.flush()
        for criterion in (c1, c2):
            mapping = session.query(CriterionEvidenceMap).filter_by(criterion_id=criterion.id, evidence_item_id=evidence.id).first()
            if not mapping:
                session.add(CriterionEvidenceMap(
                    criterion_id=criterion.id,
                    evidence_item_id=evidence.id,
                    mapping_source="manual",
                    mapping_status="pending",
                ))

        # Negative assessment case: rejected evidence gives the assessor a clear contrast.
        negative = session.query(AssessmentCase).filter_by(worker_profile_id=profile2.id, qualification_id=plumbing.id).first()
        if not negative:
            negative = AssessmentCase(
                worker_profile_id=profile2.id,
                qualification_id=plumbing.id,
                qualification_version_id=plm_version.id,
                status=CaseStatus.submitted,
                worker_statement="Fictional negative case: evidence is incomplete and not sufficient.",
            )
            session.add(negative)
            session.flush()
        bad_evidence = session.query(EvidenceItem).filter_by(worker_profile_id=profile2.id, title="Demo: incomplete pipe-join evidence").first()
        if not bad_evidence:
            bad_evidence = EvidenceItem(
                worker_profile_id=profile2.id,
                client_submission_id="sih-demo-evidence-negative-v1",
                title="Demo: incomplete pipe-join evidence",
                description="Illustrative negative scenario: missing pressure-test result.",
                evidence_type=EvidenceType.document,
                review_status=EvidenceReviewStatus.rejected,
                review_note="Missing required pressure-test result (demo scenario).",
                original_filename="illustrative-incomplete-test.pdf",
                mime_type="application/pdf",
                storage_backend="local",
            )
            session.add(bad_evidence)

        # Marketplace states: one actionable request and one completed request with review.
        request = session.query(ServiceRequest).filter_by(customer_id=customer.id, worker_profile_id=profile.id, title="Demo: electrical safety inspection").first()
        if not request:
            request = ServiceRequest(
                customer_id=customer.id,
                worker_profile_id=profile.id,
                title="Demo: electrical safety inspection",
                description="Fictional judging scenario for a small apartment inspection.",
                status=RequestStatus.requested,
                service_location="Demo location, Mumbai",
            )
            session.add(request)
        done = session.query(ServiceRequest).filter_by(customer_id=customer.id, worker_profile_id=profile.id, title="Demo: completed lighting repair").first()
        if not done:
            done = ServiceRequest(
                customer_id=customer.id,
                worker_profile_id=profile.id,
                title="Demo: completed lighting repair",
                description="Fictional completed job for review-screen fallback.",
                status=RequestStatus.completed,
                service_location="Demo location, Mumbai",
            )
            session.add(done)
            session.flush()
        if not session.query(ServiceCompletion).filter_by(service_request_id=done.id).first():
            completed_at = datetime.now(timezone.utc)
            session.add(ServiceCompletion(
                service_request_id=done.id,
                worker_notes="Demo completion confirmed.",
                worker_confirmed_at=completed_at,
                customer_confirmed_at=completed_at,
                customer_notes="Illustrative demo confirmation.",
            ))
        if not session.query(CustomerReview).filter_by(service_request_id=done.id).first():
            session.add(CustomerReview(
                service_request_id=done.id,
                customer_id=customer.id,
                worker_profile_id=profile.id,
                rating=5,
                comment="Fictional demo review: clear communication and tidy work.",
                is_public=True,
            ))

        session.commit()
    print("Demo scenarios ready: mapped pending evidence with gaps, rejected evidence, requested job, and completed job with review.")


if __name__ == "__main__":
    seed()
