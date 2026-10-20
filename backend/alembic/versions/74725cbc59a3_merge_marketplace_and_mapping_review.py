"""merge_marketplace_and_mapping_review

Revision ID: 74725cbc59a3
Revises: c3d1e5f7a9b2, f1a2b3c4d5e6
Create Date: 2026-10-20 22:03:44.575274

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74725cbc59a3'
down_revision: Union[str, None] = ('c3d1e5f7a9b2', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
