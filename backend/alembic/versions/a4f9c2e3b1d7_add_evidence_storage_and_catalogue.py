"""add_evidence_storage_and_qualification_catalogue_fields

Revision ID: a4f9c2e3b1d7
Revises: b1110b6c4588
Create Date: 2026-10-19 17:00:00.000000

What this migration does
────────────────────────
1. Adds file-storage metadata columns to evidence_items:
   stored_filename, original_filename, file_size_bytes, mime_type,
   storage_backend, review_note, and the new review_status ENUM.

2. Adds qualification-catalogue metadata columns to qualifications:
   source_url, publication_date, rubric_reference.

3. Adds rubric_reference to competency_criteria.

4. Creates the evidence_review_status_enum PostgreSQL ENUM type.

Rolling-back this migration drops the new columns and ENUM.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "a4f9c2e3b1d7"
down_revision = "b1110b6c4588"
branch_labels = None
depends_on = None

evidence_review_status_enum = sa.Enum(
    "pending",
    "under_review",
    "accepted",
    "rejected",
    name="evidence_review_status_enum",
)


def upgrade() -> None:
    # ── 1. evidence_items new columns ──────────────────────────────────────────
    evidence_review_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "evidence_items",
        sa.Column(
            "review_status",
            evidence_review_status_enum,
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "evidence_items",
        sa.Column("stored_filename", sa.String(500), nullable=True),
    )
    op.add_column(
        "evidence_items",
        sa.Column("original_filename", sa.String(500), nullable=True),
    )
    op.add_column(
        "evidence_items",
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "evidence_items",
        sa.Column("mime_type", sa.String(127), nullable=True),
    )
    op.add_column(
        "evidence_items",
        sa.Column(
            "storage_backend",
            sa.String(20),
            nullable=False,
            server_default="local",
        ),
    )
    op.add_column(
        "evidence_items",
        sa.Column("review_note", sa.Text(), nullable=True),
    )

    # ── 2. qualifications new columns ─────────────────────────────────────────
    op.add_column(
        "qualifications",
        sa.Column("source_url", sa.String(2048), nullable=True),
    )
    op.add_column(
        "qualifications",
        sa.Column("publication_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "qualifications",
        sa.Column("rubric_reference", sa.String(100), nullable=True),
    )

    # ── 3. competency_criteria new column ─────────────────────────────────────
    op.add_column(
        "competency_criteria",
        sa.Column("rubric_reference", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    # ── 3. competency_criteria ─────────────────────────────────────────────────
    op.drop_column("competency_criteria", "rubric_reference")

    # ── 2. qualifications ──────────────────────────────────────────────────────
    op.drop_column("qualifications", "rubric_reference")
    op.drop_column("qualifications", "publication_date")
    op.drop_column("qualifications", "source_url")

    # ── 1. evidence_items ──────────────────────────────────────────────────────
    op.drop_column("evidence_items", "review_note")
    op.drop_column("evidence_items", "storage_backend")
    op.drop_column("evidence_items", "mime_type")
    op.drop_column("evidence_items", "file_size_bytes")
    op.drop_column("evidence_items", "original_filename")
    op.drop_column("evidence_items", "stored_filename")
    op.drop_column("evidence_items", "review_status")

    evidence_review_status_enum.drop(op.get_bind(), checkfirst=True)
