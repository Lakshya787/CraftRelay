"""Add server-side idempotency for retried evidence drafts."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5b7c4a2d913"
down_revision: Union[str, None] = "74725cbc59a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "evidence_items",
        sa.Column("client_submission_id", sa.String(length=100), nullable=True),
    )
    op.create_unique_constraint(
        "uq_evidence_items_client_submission_id",
        "evidence_items",
        ["client_submission_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_evidence_items_client_submission_id", "evidence_items", type_="unique"
    )
    op.drop_column("evidence_items", "client_submission_id")
