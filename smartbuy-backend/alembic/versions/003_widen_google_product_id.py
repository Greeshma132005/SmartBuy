"""Widen google_product_id column to 500 chars

Revision ID: 003
Revises: 002
Create Date: 2026-03-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("products", "google_product_id", type_=sa.String(500))


def downgrade() -> None:
    op.alter_column("products", "google_product_id", type_=sa.String(100))
