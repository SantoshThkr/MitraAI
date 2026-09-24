"""add message sources

Revision ID: 7dfe40b13152
Revises: e7ad40627834
Create Date: 2026-09-24 19:23:25.571276

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '7dfe40b13152'
down_revision: str | None = 'e7ad40627834'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('messages', sa.Column('sources', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('messages', 'sources')
