#!/usr/bin/env python
"""
scripts/seed.py — Load demo data into a development database.

IMPORTANT — Illustrative data disclaimer
─────────────────────────────────────────
All qualifications and competency criteria in this seed file are FICTIONAL
EXAMPLES created for development and demonstration purposes only.
They do NOT represent official government, NCVT, or any other awarding-body
standards.  Every qualification is saved with ``is_illustrative=True`` to
allow clients to display an appropriate disclaimer.

Demo accounts (password is the same for all: "Demo1234!")
──────────────────────────────────────────────────────────
  worker@craftrelay.dev    — Worker   (Riya Sharma, Electrician)
  assessor@craftrelay.dev  — Assessor (Vikram Nair)
  customer@craftrelay.dev  — Customer (Ananya Patel)
  admin@craftrelay.dev     — Admin    (Sanjay Mehta)

Usage
─────
  cd backend
  python scripts/seed.py

Run AFTER alembic upgrade head.
"""

from __future__ import annotations

import json
import os
import sys
import uuid

# Ensure the backend root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.security import hash_password
from app.db.session import SyncSessionLocal
from app.models.assessment import ApprovedAssessmentTask
from app.models.competency import CompetencyCriterion
from app.models.qualification import Qualification, QualificationVersion
from app.models.skill import Skill
from app.models.user import User, UserRole
from app.models.worker_profile import WorkerProfile
from app.models.worker_skill import ProficiencyLevel, WorkerSkill

DEMO_PASSWORD_HASH = hash_password("Demo1234!")

# ── Fixtures ──────────────────────────────────────────────────────────────────

DEMO_USERS = [
    {
        "email": "worker@craftrelay.dev",
        "full_name": "Riya Sharma",
        "role": UserRole.worker,
        "is_verified": True,
    },
    {
        "email": "assessor@craftrelay.dev",
        "full_name": "Vikram Nair",
        "role": UserRole.assessor,
        "is_verified": True,
    },
    {
        "email": "customer@craftrelay.dev",
        "full_name": "Ananya Patel",
        "role": UserRole.customer,
        "is_verified": True,
    },
    {
        "email": "admin@craftrelay.dev",
        "full_name": "Sanjay Mehta",
        "role": UserRole.admin,
        "is_verified": True,
    },
]

# One additional worker for richer list demos
EXTRA_WORKERS = [
    {
        "email": "worker2@craftrelay.dev",
        "full_name": "Arjun Das",
        "role": UserRole.worker,
        "is_verified": True,
    },
    {
        "email": "worker3@craftrelay.dev",
        "full_name": "Priya Rao",
        "role": UserRole.worker,
        "is_verified": True,
    },
]

# ── Qualification + criteria fixtures (illustrative only) ─────────────────────

QUALIFICATIONS = [
    {
        "code": "ELE-L2",
        "title": "Electrical Wiring — Level 2",
        "trade": "Electrical",
        "issuing_body": "NCVT (illustrative)",
        "level": 2,
        "duration_hours": 120,
        "description": (
            "Illustrative competency framework for residential and light-commercial "
            "wiring, conduit work, and fault finding.  NOT an official NCVT standard."
        ),
        "criteria": [
            {
                "code": "ELE-L2-C01",
                "description": "Safely isolate a domestic circuit before working on it.",
                "guidance": "Demonstrate use of test instruments and lock-off procedures.",
                "is_mandatory": True,
                "order_index": 1,
            },
            {
                "code": "ELE-L2-C02",
                "description": "Install and terminate PVC insulated cable to a junction box.",
                "guidance": "Correct colour coding, secure fixings, no insulation damage.",
                "is_mandatory": True,
                "order_index": 2,
            },
            {
                "code": "ELE-L2-C03",
                "description": "Wire a single-pole switch and ceiling rose.",
                "guidance": "Correct switching configuration, earth continuity verified.",
                "is_mandatory": True,
                "order_index": 3,
            },
            {
                "code": "ELE-L2-C04",
                "description": "Perform an insulation resistance test and interpret results.",
                "guidance": "Record readings, compare to BS 7671 limits (illustrative).",
                "is_mandatory": True,
                "order_index": 4,
            },
            {
                "code": "ELE-L2-C05",
                "description": "Complete a minor works certificate.",
                "guidance": "All sections legible and accurate.",
                "is_mandatory": False,
                "order_index": 5,
            },
        ],
        "tasks": [
            {
                "code": "ELE-L2-PT-01",
                "title": "Wire a single-phase consumer unit",
                "description": (
                    "Candidate must correctly wire an 8-way consumer unit with RCD "
                    "protection, label all circuits, and pass an insulation resistance test."
                ),
                "estimated_duration_minutes": 90,
                "required_tools": ["Screwdrivers", "Wire strippers", "Multimeter", "Insulation tester"],
                "assessment_criteria": [
                    "All live, neutral, and earth conductors correctly terminated",
                    "RCD trips within rated time",
                    "No dead shorts on any circuit",
                    "Labelling legible and accurate",
                    "Insulation resistance >= 1 MΩ",
                ],
                "max_score": 100,
                "pass_score": 70,
            }
        ],
    },
    {
        "code": "PLM-L2",
        "title": "Plumbing & Pipe Fitting — Level 2",
        "trade": "Plumbing",
        "issuing_body": "NCVT (illustrative)",
        "level": 2,
        "duration_hours": 100,
        "description": (
            "Illustrative competency framework for domestic water supply and drainage. "
            "NOT an official NCVT standard."
        ),
        "criteria": [
            {
                "code": "PLM-L2-C01",
                "description": "Select and join copper pipe using compression fittings.",
                "guidance": "No leaks at 0.5 bar test pressure.",
                "is_mandatory": True,
                "order_index": 1,
            },
            {
                "code": "PLM-L2-C02",
                "description": "Install a basin waste and bottle trap.",
                "guidance": "Basin level within 2 mm, drain clears within 30 s.",
                "is_mandatory": True,
                "order_index": 2,
            },
            {
                "code": "PLM-L2-C03",
                "description": "Commission a domestic cold water storage cistern.",
                "guidance": "Float valve set to correct level, overflow clear.",
                "is_mandatory": True,
                "order_index": 3,
            },
        ],
        "tasks": [
            {
                "code": "PLM-L2-PT-01",
                "title": "Install a basin and waste trap",
                "description": "Candidate installs a wall-hung washbasin, connects hot and cold supplies, fits a bottle trap, and tests for leaks at 0.5 bar.",
                "estimated_duration_minutes": 60,
                "required_tools": ["Basin wrench", "PTFE tape", "Adjustable spanner", "Level"],
                "assessment_criteria": [
                    "Basin level within 2mm across width",
                    "Supply connections leak-free at 0.5 bar",
                    "Waste drains within 30 seconds",
                    "Trap accessible for cleaning",
                ],
                "max_score": 100,
                "pass_score": 70,
            }
        ],
    },
    {
        "code": "CAR-L3",
        "title": "Carpentry & Joinery — Level 3",
        "trade": "Carpentry",
        "issuing_body": "NCVT (illustrative)",
        "level": 3,
        "duration_hours": 160,
        "description": (
            "Illustrative competency framework for advanced framing, cabinetry, and finishing. "
            "NOT an official NCVT standard."
        ),
        "criteria": [
            {
                "code": "CAR-L3-C01",
                "description": "Cut and mark timber to a cutting list with tolerances ≤ 1 mm.",
                "is_mandatory": True,
                "order_index": 1,
            },
            {
                "code": "CAR-L3-C02",
                "description": "Produce a through mortise-and-tenon joint with gap < 0.5 mm.",
                "is_mandatory": True,
                "order_index": 2,
            },
            {
                "code": "CAR-L3-C03",
                "description": "Hang a door correctly on three hinges — gap ≤ 3 mm all round.",
                "is_mandatory": True,
                "order_index": 3,
            },
        ],
        "tasks": [
            {
                "code": "CAR-L3-PT-01",
                "title": "Construct a mortise-and-tenon joint",
                "description": "Candidate produces a through mortise-and-tenon joint from given timber, achieving a snug fit with less than 0.5 mm gap.",
                "estimated_duration_minutes": 120,
                "required_tools": ["Mortise chisel set", "Marking gauge", "Mallet", "Try square"],
                "assessment_criteria": [
                    "Joint fits without gaps >0.5mm",
                    "Shoulders square to within 0.5 degrees",
                    "Surfaces planed smooth",
                    "No tear-out on face side",
                ],
                "max_score": 100,
                "pass_score": 75,
            }
        ],
    },
]

SKILLS = [
    {"name": "Cable Laying", "category": "Electrical"},
    {"name": "Panel Wiring", "category": "Electrical"},
    {"name": "Earthing & Bonding", "category": "Electrical"},
    {"name": "Fault Diagnosis", "category": "Electrical"},
    {"name": "Pipe Joining", "category": "Plumbing"},
    {"name": "Fixture Installation", "category": "Plumbing"},
    {"name": "Leak Testing", "category": "Plumbing"},
    {"name": "Drainage", "category": "Plumbing"},
    {"name": "Framing", "category": "Carpentry"},
    {"name": "Cabinet Making", "category": "Carpentry"},
    {"name": "Wood Finishing", "category": "Carpentry"},
]


def _get_or_create_user(session, data: dict) -> User:
    user = session.query(User).filter_by(email=data["email"]).first()
    if not user:
        user = User(
            email=data["email"],
            full_name=data["full_name"],
            password_hash=DEMO_PASSWORD_HASH,
            role=data["role"],
            is_verified=data.get("is_verified", False),
            is_active=True,
        )
        session.add(user)
        session.flush()
    return user


def _get_or_create_qualification(session, data: dict) -> Qualification:
    qual = session.query(Qualification).filter_by(code=data["code"]).first()
    if not qual:
        qual = Qualification(
            code=data["code"],
            title=data["title"],
            trade=data["trade"],
            issuing_body=data["issuing_body"],
            level=data["level"],
            duration_hours=data.get("duration_hours"),
            description=data.get("description"),
            is_illustrative=True,  # Always true for seed data
            current_version=1,
        )
        session.add(qual)
        session.flush()

        # Create the initial version snapshot
        snapshot = {
            "code": qual.code,
            "title": qual.title,
            "criteria": [c["code"] for c in data.get("criteria", [])],
        }
        version = QualificationVersion(
            qualification_id=qual.id,
            version_number=1,
            change_summary="Initial seed version.",
            snapshot=snapshot,
        )
        session.add(version)
        session.flush()

    return qual


def seed() -> None:
    with SyncSessionLocal() as session:
        print("🌱  Seeding demo users …")
        users = {}
        for user_data in DEMO_USERS + EXTRA_WORKERS:
            u = _get_or_create_user(session, user_data)
            users[user_data["email"]] = u

        # Worker profiles
        print("🌱  Seeding worker profiles …")
        worker_profiles_data = [
            {
                "email": "worker@craftrelay.dev",
                "trade_title": "Electrician",
                "bio": "5 years experience in domestic and light-commercial electrical installations.",
                "city": "Mumbai",
                "state": "Maharashtra",
                "years_experience": 5,
                "is_available": True,
            },
            {
                "email": "worker2@craftrelay.dev",
                "trade_title": "Plumber",
                "bio": "Specialist in domestic pipe fitting and drainage systems.",
                "city": "Pune",
                "state": "Maharashtra",
                "years_experience": 3,
                "is_available": True,
            },
            {
                "email": "worker3@craftrelay.dev",
                "trade_title": "Carpenter",
                "bio": "Advanced joinery and cabinet-making professional.",
                "city": "Bangalore",
                "state": "Karnataka",
                "years_experience": 7,
                "is_available": False,
            },
        ]
        for wpd in worker_profiles_data:
            user = users[wpd["email"]]
            existing = session.query(WorkerProfile).filter_by(user_id=user.id).first()
            if not existing:
                profile = WorkerProfile(
                    user_id=user.id,
                    trade_title=wpd["trade_title"],
                    bio=wpd["bio"],
                    city=wpd["city"],
                    state=wpd["state"],
                    years_experience=wpd["years_experience"],
                    is_available=wpd["is_available"],
                )
                session.add(profile)
        session.flush()

        print("🌱  Seeding skills …")
        skill_map: dict[str, Skill] = {}
        for sd in SKILLS:
            existing = session.query(Skill).filter_by(name=sd["name"]).first()
            if not existing:
                existing = Skill(name=sd["name"], category=sd["category"])
                session.add(existing)
                session.flush()
            skill_map[sd["name"]] = existing

        # Link skills to worker 1 (Electrician)
        w1_profile = session.query(WorkerProfile).join(User).filter(
            User.email == "worker@craftrelay.dev"
        ).first()
        if w1_profile:
            for skill_name in ["Cable Laying", "Panel Wiring", "Earthing & Bonding"]:
                skill = skill_map[skill_name]
                exists = session.query(WorkerSkill).filter_by(
                    worker_profile_id=w1_profile.id, skill_id=skill.id
                ).first()
                if not exists:
                    session.add(WorkerSkill(
                        worker_profile_id=w1_profile.id,
                        skill_id=skill.id,
                        proficiency_level=ProficiencyLevel.advanced,
                        years_used=5,
                    ))

        print("🌱  Seeding qualifications and criteria …")
        for qd in QUALIFICATIONS:
            qual = _get_or_create_qualification(session, qd)

            for crit_data in qd.get("criteria", []):
                existing = session.query(CompetencyCriterion).filter_by(
                    qualification_id=qual.id, code=crit_data["code"]
                ).first()
                if not existing:
                    session.add(CompetencyCriterion(
                        qualification_id=qual.id,
                        code=crit_data["code"],
                        description=crit_data["description"],
                        guidance=crit_data.get("guidance"),
                        is_mandatory=crit_data.get("is_mandatory", True),
                        order_index=crit_data.get("order_index", 0),
                    ))

            for task_data in qd.get("tasks", []):
                existing = session.query(ApprovedAssessmentTask).filter_by(
                    code=task_data["code"]
                ).first()
                if not existing:
                    session.add(ApprovedAssessmentTask(
                        qualification_id=qual.id,
                        code=task_data["code"],
                        title=task_data["title"],
                        description=task_data.get("description"),
                        estimated_duration_minutes=task_data.get("estimated_duration_minutes"),
                        required_tools=task_data.get("required_tools"),
                        assessment_criteria=task_data.get("assessment_criteria"),
                        max_score=task_data.get("max_score", 100),
                        pass_score=task_data.get("pass_score", 70),
                    ))

        session.commit()
        print("✅  Seed complete.")
        print()
        print("Demo accounts (password: Demo1234!)")
        print("  worker@craftrelay.dev    — Worker   (Riya Sharma)")
        print("  assessor@craftrelay.dev  — Assessor (Vikram Nair)")
        print("  customer@craftrelay.dev  — Customer (Ananya Patel)")
        print("  admin@craftrelay.dev     — Admin    (Sanjay Mehta)")


if __name__ == "__main__":
    seed()
