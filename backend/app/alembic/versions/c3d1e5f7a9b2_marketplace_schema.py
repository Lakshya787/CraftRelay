"""marketplace_schema

Revision ID: c3d1e5f7a9b2
Revises: a4f9c2e3b1d7
Create Date: 2026-10-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d1e5f7a9b2"
down_revision: Union[str, None] = "a4f9c2e3b1d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

old_enum = postgresql.ENUM(
    "open", "accepted", "in_progress", "completed", "cancelled", "disputed",
    name="request_status_enum",
)
new_enum = postgresql.ENUM(
    "requested", "accepted", "declined", "in_progress",
    "completion_pending", "completed", "cancelled",
    name="request_status_enum",
)


def upgrade() -> None:
    bind = op.get_bind()

    # Drop old default on service_requests.status
    op.execute("ALTER TABLE service_requests ALTER COLUMN status DROP DEFAULT")

    # Cast to text temporarily to allow enum recreation
    op.alter_column(
        "service_requests",
        "status",
        type_=sa.String(),
        postgresql_using="status::text",
    )

    # Remap old states
    op.execute("UPDATE service_requests SET status = 'requested' WHERE status = 'open'")
    op.execute("UPDATE service_requests SET status = 'cancelled' WHERE status = 'disputed'")

    # Drop old enum if exists
    old_enum.drop(bind, checkfirst=True)

    # Create new enum
    new_enum.create(bind, checkfirst=True)

    # Alter status to use new enum with default 'requested'
    op.alter_column(
        "service_requests",
        "status",
        type_=new_enum,
        postgresql_using="status::request_status_enum",
        server_default="requested",
        nullable=False,
    )

    # Add columns to service_requests
    op.add_column("service_requests", sa.Column("service_location", sa.String(length=500), nullable=True))
    op.add_column("service_requests", sa.Column("preferred_date", sa.Date(), nullable=True))

    # Add columns to service_completions
    op.add_column("service_completions", sa.Column("worker_confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("service_completions", sa.Column("customer_confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("service_completions", sa.Column("customer_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_column("service_completions", "customer_notes")
    op.drop_column("service_completions", "customer_confirmed_at")
    op.drop_column("service_completions", "worker_confirmed_at")
    op.drop_column("service_requests", "preferred_date")
    op.drop_column("service_requests", "service_location")

    op.execute("ALTER TABLE service_requests ALTER COLUMN status DROP DEFAULT")
    op.alter_column(
        "service_requests",
        "status",
        type_=sa.String(),
        postgresql_using="status::text",
    )

    new_enum.drop(bind, checkfirst=True)
    old_enum.create(bind, checkfirst=True)

    op.alter_column(
        "service_requests",
        "status",
        type_=old_enum,
        postgresql_using="status::request_status_enum",
        server_default="open",
        nullable=False,
    )
