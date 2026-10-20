"""assessment engine fields

Revision ID: c7d2a9f4b6e1
Revises: a4f9c2e3b1d7
Create Date: 2026-10-20 10:00:00.000000

What this migration does
────────────────────────
1. approved_assessment_tasks
   • criterion_codes   — JSON list of criterion codes the task verifies
   • rubric_reference  — approved rubric / performance-element code
   • is_approved       — only approved tasks may be recommended

2. criterion_evidence_maps
   • mapping_source    — manual | suggested | assessor
   • match_score       — deterministic lexical ranking signal (0..1), never a
                         probability of competence
   • match_explanation — human-readable reason for the suggested link

Existing task rows default to is_approved = false because they did not carry a
rubric reference; re-run scripts/seed.py to load the curated, approved tasks.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.db.types import JSONBType

revision = "c7d2a9f4b6e1"
down_revision = "a4f9c2e3b1d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── approved_assessment_tasks ─────────────────────────────────────────────
    op.add_column(
        "approved_assessment_tasks",
        sa.Column("criterion_codes", JSONBType(), nullable=True),
    )
    op.add_column(
        "approved_assessment_tasks",
        sa.Column("rubric_reference", sa.String(100), nullable=True),
    )
    op.add_column(
        "approved_assessment_tasks",
        sa.Column(
            "is_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # ── criterion_evidence_maps ───────────────────────────────────────────────
    op.add_column(
        "criterion_evidence_maps",
        sa.Column(
            "mapping_source",
            sa.String(20),
            nullable=False,
            server_default="manual",
        ),
    )
    op.add_column(
        "criterion_evidence_maps",
        sa.Column("match_score", sa.Numeric(4, 3), nullable=True),
    )
    op.add_column(
        "criterion_evidence_maps",
        sa.Column("match_explanation", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("criterion_evidence_maps", "match_explanation")
    op.drop_column("criterion_evidence_maps", "match_score")
    op.drop_column("criterion_evidence_maps", "mapping_source")

    op.drop_column("approved_assessment_tasks", "is_approved")
    op.drop_column("approved_assessment_tasks", "rubric_reference")
    op.drop_column("approved_assessment_tasks", "criterion_codes")
