"""Initial schema - create all tables

Revision ID: 001
Revises:
Create Date: 2026-03-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable uuid-ossp extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # ── Products ──────────────────────────────────────────────────────────────
    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── Price Records ─────────────────────────────────────────────────────────
    op.create_table(
        "price_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("original_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(10), server_default="INR", nullable=False),
        sa.Column("product_url", sa.Text(), nullable=True),
        sa.Column("in_stock", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("scraped_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "idx_price_records_product_platform",
        "price_records",
        ["product_id", "platform", sa.text("scraped_at DESC")],
    )

    # ── Price Predictions ───���─────────────────────────────────────────────────
    op.create_table(
        "price_predictions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("predicted_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("predicted_date", sa.Date(), nullable=True),
        sa.Column("confidence_score", sa.Numeric(3, 2), nullable=True),
        sa.Column("model_used", sa.String(50), server_default="linear_regression", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── Coupons ───��─────────────────────────────────────���─────────────────────
    op.create_table(
        "coupons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("code", sa.String(100), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("discount_type", sa.String(20), nullable=True),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("min_order_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("platform", "code", name="uq_coupons_platform_code"),
    )

    # ── Price Alerts ──────────────────────────────────────────────────────────
    op.create_table(
        "price_alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── Search History ──────────���─────────────────────────────────────────────
    op.create_table(
        "search_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("searched_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── Row Level Security ──────────��─────────────────────────────────────────
    op.execute("ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE search_history ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE products ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE price_records ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE coupons ENABLE ROW LEVEL SECURITY")

    # RLS Policies — user-scoped tables
    op.execute("""
        CREATE POLICY "Users can manage their own alerts"
            ON price_alerts FOR ALL
            USING (auth.uid() = user_id)
    """)
    op.execute("""
        CREATE POLICY "Users can view their own search history"
            ON search_history FOR ALL
            USING (auth.uid() = user_id)
    """)

    # RLS Policies — public read access
    for table in ["products", "price_records", "price_predictions", "coupons"]:
        op.execute(f"""
            CREATE POLICY "Public read access for {table}"
                ON {table} FOR SELECT
                USING (true)
        """)
        op.execute(f"""
            CREATE POLICY "Service role can manage {table}"
                ON {table} FOR ALL
                USING (true)
        """)


def downgrade() -> None:
    op.drop_table("search_history")
    op.drop_table("price_alerts")
    op.drop_table("coupons")
    op.drop_table("price_predictions")
    op.drop_index("idx_price_records_product_platform", table_name="price_records")
    op.drop_table("price_records")
    op.drop_table("products")
