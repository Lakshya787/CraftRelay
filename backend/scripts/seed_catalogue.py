"""
scripts/seed_catalogue.py — Seed the qualification catalogue with curated data.

IMPORTANT DISCLAIMER
────────────────────
All qualifications marked is_illustrative=True are illustrative examples
created for the CraftRelay demo. They are intended to represent the *structure*
of NCVT qualifications and have NOT been individually verified against the
official NCVT/MSDE gazette notifications or NSQF framework documents.

Qualifications marked is_illustrative=False have been checked against the
source listed in source_url. At this time, NO records are marked as verified
because cross-checking with the official gazette is pending for the hackathon
demo phase.

Run with:
  cd backend
  python -m scripts.seed_catalogue
"""

from __future__ import annotations

import sys
import uuid
from datetime import date
from pathlib import Path

# Allow running as `python -m scripts.seed_catalogue` from the backend dir
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.db.session import SyncSessionLocal
from app.models import (
    CompetencyCriterion,
    Qualification,
    QualificationVersion,
    Skill,
)

# ── Skills catalogue ──────────────────────────────────────────────────────────

SKILLS = [
    {"name": "Cable Laying", "category": "Electrical", "description": "Installation of electrical cables in conduit or trunking"},
    {"name": "Panel Wiring", "category": "Electrical", "description": "Wiring of distribution boards, MCBs, and control panels"},
    {"name": "Earthing & Bonding", "category": "Electrical", "description": "Protective earthing, bonding, and testing"},
    {"name": "Fault Diagnosis", "category": "Electrical", "description": "Locating and diagnosing electrical faults"},
    {"name": "Pipe Joining", "category": "Plumbing", "description": "Compression, push-fit, and solvent-weld pipe joints"},
    {"name": "Fixture Installation", "category": "Plumbing", "description": "Taps, cisterns, basins, and WC installation"},
    {"name": "Leak Testing", "category": "Plumbing", "description": "Pressure and flow testing of pipework"},
    {"name": "Drainage", "category": "Plumbing", "description": "Above-ground and below-ground drainage installation"},
    {"name": "Framing", "category": "Carpentry", "description": "Structural timber framing for roofs, floors, and walls"},
    {"name": "Cabinet Making", "category": "Carpentry", "description": "Construction of fitted and freestanding furniture"},
    {"name": "Wood Finishing", "category": "Carpentry", "description": "Sanding, staining, and lacquering wood surfaces"},
    {"name": "Structural Joinery", "category": "Carpentry", "description": "Mortise-and-tenon, dovetail, and other structural joints"},
    {"name": "Brickwork", "category": "Masonry", "description": "Laying bricks in stretcher, English, and Flemish bond"},
    {"name": "Blockwork", "category": "Masonry", "description": "Laying hollow and solid concrete blocks"},
    {"name": "Plastering", "category": "Masonry", "description": "Internal and external render coats and finish plaster"},
    {"name": "Tiling", "category": "Masonry", "description": "Wall and floor ceramic and porcelain tile fixing"},
    {"name": "Refrigerant Handling", "category": "HVAC", "description": "Safe handling and recovery of refrigerant gases"},
    {"name": "Duct Installation", "category": "HVAC", "description": "Fabrication and installation of sheet-metal ductwork"},
    {"name": "Controls & Commissioning", "category": "HVAC", "description": "Setting up and commissioning HVAC control systems"},
    {"name": "HVAC Maintenance", "category": "HVAC", "description": "Preventive and corrective maintenance of HVAC plant"},
]

# ── Qualification catalogue ───────────────────────────────────────────────────
# Each qualification has:
#   code, title, trade, issuing_body, level, duration_hours, description,
#   source_url (URL to authoritative source), publication_date, rubric_reference,
#   is_illustrative (True = demo data, not verified against official source)
#   criteria (list of criterion dicts)

QUALIFICATIONS = [
    {
        "code": "ELE-NTC-L2",
        "title": "Electrician — NTC Level 2 (Illustrative)",
        "trade": "Electrical",
        "issuing_body": "National Council for Vocational Training (NCVT)",
        "level": 2,
        "duration_hours": 1040,  # approx 2-year ITI programme
        "description": (
            "Competency in residential and light-commercial wiring, conduit work, "
            "earthing, and basic fault finding. Mirrors the NCVT Electrician trade "
            "syllabus structure — individual criteria are illustrative examples."
        ),
        "source_url": "https://ncvtmis.gov.in/pages/TradeInfo/TradeInfoDetails.aspx?tradeid=8",
        "publication_date": None,           # official gazette date not confirmed
        "rubric_reference": "NSQF-ELE-L2",
        "is_illustrative": True,            # ← not verified against gazette
        "criteria": [
            {
                "code": "ELE-L2-C01",
                "description": "Read and interpret electrical drawings and schematic diagrams.",
                "guidance": "Include wiring diagrams, single-line diagrams, and installation plans.",
                "is_mandatory": True,
                "order_index": 0,
                "rubric_reference": "PE-ELE-01",
            },
            {
                "code": "ELE-L2-C02",
                "description": "Install and terminate cables using appropriate containment systems (conduit, trunking, cable tray).",
                "guidance": "Demonstrate correct support spacing and fire-stopping at penetrations.",
                "is_mandatory": True,
                "order_index": 1,
                "rubric_reference": "PE-ELE-02",
            },
            {
                "code": "ELE-L2-C03",
                "description": "Wire and test a single-phase consumer unit with RCD and MCB protection.",
                "guidance": "Connections must be torqued to manufacturer specifications.",
                "is_mandatory": True,
                "order_index": 2,
                "rubric_reference": "PE-ELE-03",
            },
            {
                "code": "ELE-L2-C04",
                "description": "Apply earthing and protective bonding to IS 3043 requirements.",
                "guidance": "Demonstrate continuity test and insulation resistance measurement.",
                "is_mandatory": True,
                "order_index": 3,
                "rubric_reference": "PE-ELE-04",
            },
            {
                "code": "ELE-L2-C05",
                "description": "Diagnose and rectify common wiring faults using test instruments.",
                "guidance": "Must include open-circuit, short-circuit, and earth fault scenarios.",
                "is_mandatory": False,
                "order_index": 4,
                "rubric_reference": "PE-ELE-05",
            },
        ],
    },
    {
        "code": "PLM-NTC-L2",
        "title": "Plumber — NTC Level 2 (Illustrative)",
        "trade": "Plumbing",
        "issuing_body": "National Council for Vocational Training (NCVT)",
        "level": 2,
        "duration_hours": 1040,
        "description": (
            "Installation and maintenance of domestic water supply and drainage systems. "
            "Criteria are illustrative examples based on the NCVT Plumber trade structure."
        ),
        "source_url": "https://ncvtmis.gov.in/pages/TradeInfo/TradeInfoDetails.aspx?tradeid=22",
        "publication_date": None,
        "rubric_reference": "NSQF-PLM-L2",
        "is_illustrative": True,
        "criteria": [
            {
                "code": "PLM-L2-C01",
                "description": "Identify and select appropriate pipe materials and fittings for domestic water supply.",
                "guidance": "Cover GI, CPVC, uPVC, and HDPE pipe selection criteria.",
                "is_mandatory": True,
                "order_index": 0,
                "rubric_reference": "PE-PLM-01",
            },
            {
                "code": "PLM-L2-C02",
                "description": "Make leak-free joints using compression, push-fit, and solvent-weld methods.",
                "guidance": "Joints must pass a 10-bar pressure test for 30 minutes.",
                "is_mandatory": True,
                "order_index": 1,
                "rubric_reference": "PE-PLM-02",
            },
            {
                "code": "PLM-L2-C03",
                "description": "Install sanitary fixtures (WC, basin, bath) with correct falls and traps.",
                "guidance": "Demonstrate correct trap seal depths to IS 2065.",
                "is_mandatory": True,
                "order_index": 2,
                "rubric_reference": "PE-PLM-03",
            },
            {
                "code": "PLM-L2-C04",
                "description": "Install above-ground drainage to required gradient and access provision.",
                "guidance": "Minimum 1:40 fall for 50 mm waste; 1:80 for 100 mm soil.",
                "is_mandatory": True,
                "order_index": 3,
                "rubric_reference": "PE-PLM-04",
            },
            {
                "code": "PLM-L2-C05",
                "description": "Commission cold-water storage and hot-water systems.",
                "guidance": "Include cylinder expansion, pressure-relief valve, and temperature checks.",
                "is_mandatory": False,
                "order_index": 4,
                "rubric_reference": "PE-PLM-05",
            },
        ],
    },
    {
        "code": "CAR-NTC-L3",
        "title": "Carpenter — NTC Level 3 (Illustrative)",
        "trade": "Carpentry",
        "issuing_body": "National Council for Vocational Training (NCVT)",
        "level": 3,
        "duration_hours": 1040,
        "description": (
            "Advanced framing, cabinetry, and finishing techniques. "
            "Criteria are illustrative examples based on the NCVT Carpenter trade structure."
        ),
        "source_url": "https://ncvtmis.gov.in/pages/TradeInfo/TradeInfoDetails.aspx?tradeid=5",
        "publication_date": None,
        "rubric_reference": "NSQF-CAR-L3",
        "is_illustrative": True,
        "criteria": [
            {
                "code": "CAR-L3-C01",
                "description": "Interpret timber-frame drawings and produce cutting lists.",
                "is_mandatory": True,
                "order_index": 0,
                "rubric_reference": "PE-CAR-01",
            },
            {
                "code": "CAR-L3-C02",
                "description": "Cut and assemble a mortise-and-tenon joint to specified tolerance (±1 mm).",
                "is_mandatory": True,
                "order_index": 1,
                "rubric_reference": "PE-CAR-02",
            },
            {
                "code": "CAR-L3-C03",
                "description": "Construct a fitted cabinet carcass with correct squareness and level.",
                "is_mandatory": True,
                "order_index": 2,
                "rubric_reference": "PE-CAR-03",
            },
            {
                "code": "CAR-L3-C04",
                "description": "Apply a multi-coat finish (primer, undercoat, topcoat) with correct preparation.",
                "is_mandatory": False,
                "order_index": 3,
                "rubric_reference": "PE-CAR-04",
            },
        ],
    },
    {
        "code": "MAS-NTC-L2",
        "title": "Mason — NTC Level 2 (Illustrative)",
        "trade": "Masonry",
        "issuing_body": "National Council for Vocational Training (NCVT)",
        "level": 2,
        "duration_hours": 1040,
        "description": (
            "Brickwork, blockwork, and interior/exterior plastering. "
            "Criteria are illustrative examples."
        ),
        "source_url": "https://ncvtmis.gov.in/pages/TradeInfo/TradeInfoDetails.aspx?tradeid=15",
        "publication_date": None,
        "rubric_reference": "NSQF-MAS-L2",
        "is_illustrative": True,
        "criteria": [
            {
                "code": "MAS-L2-C01",
                "description": "Set out a right angle and level datum from given reference points.",
                "is_mandatory": True,
                "order_index": 0,
                "rubric_reference": "PE-MAS-01",
            },
            {
                "code": "MAS-L2-C02",
                "description": "Lay a one-brick-thick wall in English bond, plumb and level, to IS 2116 mortar mix.",
                "is_mandatory": True,
                "order_index": 1,
                "rubric_reference": "PE-MAS-02",
            },
            {
                "code": "MAS-L2-C03",
                "description": "Apply a two-coat render (scratch coat + finish coat) to a masonry substrate.",
                "is_mandatory": True,
                "order_index": 2,
                "rubric_reference": "PE-MAS-03",
            },
            {
                "code": "MAS-L2-C04",
                "description": "Fix ceramic wall tiles with even joint spacing and correct adhesive coverage.",
                "is_mandatory": False,
                "order_index": 3,
                "rubric_reference": "PE-MAS-04",
            },
        ],
    },
    {
        "code": "HVAC-NTC-L3",
        "title": "HVAC Technician — NTC Level 3 (Illustrative)",
        "trade": "HVAC",
        "issuing_body": "National Council for Vocational Training (NCVT)",
        "level": 3,
        "duration_hours": 1040,
        "description": (
            "Installation, commissioning, and maintenance of heating, ventilation, and "
            "air-conditioning systems. Criteria are illustrative examples."
        ),
        "source_url": "https://ncvtmis.gov.in/pages/TradeInfo/TradeInfoDetails.aspx?tradeid=12",
        "publication_date": None,
        "rubric_reference": "NSQF-HVAC-L3",
        "is_illustrative": True,
        "criteria": [
            {
                "code": "HVAC-L3-C01",
                "description": "Recover, evacuate, and recharge a split-type air conditioner with correct refrigerant charge.",
                "guidance": "Demonstrate compliance with Environment Protection Act refrigerant handling obligations.",
                "is_mandatory": True,
                "order_index": 0,
                "rubric_reference": "PE-HVAC-01",
            },
            {
                "code": "HVAC-L3-C02",
                "description": "Fabricate and install rectangular sheet-metal ductwork with correct sealing and supports.",
                "is_mandatory": True,
                "order_index": 1,
                "rubric_reference": "PE-HVAC-02",
            },
            {
                "code": "HVAC-L3-C03",
                "description": "Commission an HVAC control system including thermostat calibration and BMS connection.",
                "is_mandatory": True,
                "order_index": 2,
                "rubric_reference": "PE-HVAC-03",
            },
            {
                "code": "HVAC-L3-C04",
                "description": "Perform and record a planned preventive maintenance visit on an air handling unit.",
                "is_mandatory": False,
                "order_index": 3,
                "rubric_reference": "PE-HVAC-04",
            },
        ],
    },
]


def seed() -> None:
    """Insert skills and qualifications if they do not already exist."""
    with SyncSessionLocal() as session:
        # ── Skills ────────────────────────────────────────────────────────────
        for s in SKILLS:
            existing = session.execute(
                text("SELECT id FROM skills WHERE name = :name"),
                {"name": s["name"]},
            ).fetchone()
            if not existing:
                skill = Skill(**s)
                session.add(skill)
        session.commit()

        # ── Qualifications ────────────────────────────────────────────────────
        for q in QUALIFICATIONS:
            criteria_data = q.pop("criteria")
            existing = session.execute(
                text("SELECT id FROM qualifications WHERE code = :code"),
                {"code": q["code"]},
            ).fetchone()
            if existing:
                print(f"  Skipping existing qualification: {q['code']}")
                q["criteria"] = criteria_data   # restore for next iteration
                continue

            qual = Qualification(**q)
            session.add(qual)
            session.flush()  # get qual.id

            # Snapshot version 1
            snapshot = {
                "title": qual.title,
                "criteria": [c["code"] for c in criteria_data],
            }
            ver = QualificationVersion(
                qualification_id=qual.id,
                version_number=1,
                change_summary="Initial catalogue entry (illustrative demo data).",
                snapshot=snapshot,
            )
            session.add(ver)

            # Criteria
            for c in criteria_data:
                criterion = CompetencyCriterion(
                    qualification_id=qual.id,
                    **c,
                )
                session.add(criterion)

            print(f"  Seeded: {qual.code} — {qual.title}")
            q["criteria"] = criteria_data   # restore for idempotency

        session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    seed()
