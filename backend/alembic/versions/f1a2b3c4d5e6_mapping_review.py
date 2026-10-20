"""mapping review

Revision ID: f1a2b3c4d5e6
Revises: d8e1b7c3a2f4
Create Date: 2026-10-20 13:00:00.000000

Adds assessor review state to criterion_evidence_maps:
  • mapping_status — pending | confirmed | rejected (engine ignores rejected)
  • reviewed_by_id — the assessor who reviewed the link

Existing links default to pending, which preserves the Part 5 behaviour.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "d8e1b7c3a2f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("criterion_evidence_maps") as batch_op:
        batch_op.add_column(
            sa.Column(
                "mapping_status",
                sa.String(length=20),
                nullable=False,
                server_default="pending",
            )
        )
        batch_op.add_column(
            sa.Column("reviewed_by_id", sa.UUID(), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_criterion_evidence_maps_reviewed_by",
            "users",
            ["reviewed_by_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("criterion_evidence_maps") as batch_op:
        batch_op.drop_constraint(
            "fk_criterion_evidence_maps_reviewed_by", type_="foreignkey"
        )
        batch_op.drop_column("reviewed_by_id")
        batch_op.drop_column("mapping_status")
