"""add college and semester to users table

Revision ID: a1b2c3d4e5f6
Revises: 9e120d58a17b
Create Date: 2026-10-29 20:13:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9e120d58a17b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add college and semester columns to users table."""
    op.add_column('users', sa.Column('college', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('semester', sa.String(length=200), nullable=True))


def downgrade() -> None:
    """Remove college and semester columns from users table."""
    op.drop_column('users', 'semester')
    op.drop_column('users', 'college')

