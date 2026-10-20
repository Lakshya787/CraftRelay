"""assessor workflow

Revision ID: d8e1b7c3a2f4
Revises: c7d2a9f4b6e1
Create Date: 2026-10-20 12:00:00.000000

What this migration does
────────────────────────
1. Creates `criterion_assessment_decisions`:
   • one row per (assessment_case, criterion) — unique constraint prevents
     duplicate decisions from repeated requests
   • assessor identity, timestamp, pinned qualification version, rubric result,
     decision and rationale
   • decision enum: approved | rejected | additional_evidence_required

2. Adds `uq_assessment_result_case_task` to `assessment_results` so a practical
   task can only have one result per case (recording again updates that row).

Downgrade removes the constraint and the decision table.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "d8e1b7c3a2f4"
down_revision = "c7d2a9f4b6e1"
branch_labels = None
depends_on = None

criterion_decision_enum = sa.Enum(
    "approved",
    "rejected",
    "additional_evidence_required",
    name="criterion_decision_enum",
)


def upgrade() -> None:
    criterion_decision_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "criterion_assessment_decisions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("assessment_case_id", sa.UUID(), nullable=False),
        sa.Column("criterion_id", sa.UUID(), nullable=False),
        sa.Column("assessor_id", sa.UUID(), nullable=False),
        sa.Column("qualification_version_id", sa.UUID(), nullable=False),
        sa.Column("decision", criterion_decision_enum, nullable=False),
        sa.Column("rubric_result", sa.String(length=20), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assessment_case_id"], ["assessment_cases.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["criterion_id"], ["competency_criteria.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["assessor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(
            ["qualification_version_id"], ["qualification_versions.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "assessment_case_id",
            "criterion_id",
            name="uq_criterion_decision_case_criterion",
        ),
    )
    op.create_index(
        op.f("ix_criterion_assessment_decisions_assessment_case_id"),
        "criterion_assessment_decisions",
        ["assessment_case_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_criterion_assessment_decisions_criterion_id"),
        "criterion_assessment_decisions",
        ["criterion_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_criterion_assessment_decisions_assessor_id"),
        "criterion_assessment_decisions",
        ["assessor_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_criterion_assessment_decisions_decision"),
        "criterion_assessment_decisions",
        ["decision"],
        unique=False,
    )

    with op.batch_alter_table("assessment_results") as batch_op:
        batch_op.create_unique_constraint(
            "uq_assessment_result_case_task",
            ["assessment_case_id", "task_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("assessment_results") as batch_op:
        batch_op.drop_constraint(
            "uq_assessment_result_case_task", type_="unique"
        )

    op.drop_index(
        op.f("ix_criterion_assessment_decisions_decision"),
        table_name="criterion_assessment_decisions",
    )
    op.drop_index(
        op.f("ix_criterion_assessment_decisions_assessor_id"),
        table_name="criterion_assessment_decisions",
    )
    op.drop_index(
        op.f("ix_criterion_assessment_decisions_criterion_id"),
        table_name="criterion_assessment_decisions",
    )
    op.drop_index(
        op.f("ix_criterion_assessment_decisions_assessment_case_id"),
        table_name="criterion_assessment_decisions",
    )
    op.drop_table("criterion_assessment_decisions")

    criterion_decision_enum.drop(op.get_bind(), checkfirst=True)
