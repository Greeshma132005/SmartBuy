"""Add google_product_id to products

Revision ID: 002
Revises: 001
Create Date: 2026-03-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("google_product_id", sa.String(100), nullable=True))
    op.create_index("idx_products_google_product_id", "products", ["google_product_id"])


def downgrade() -> None:
    op.drop_index("idx_products_google_product_id", table_name="products")
    op.drop_column("products", "google_product_id")
