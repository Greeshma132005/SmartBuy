import uuid
from datetime import datetime

from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class PriceRecord(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "price_records"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    original_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), server_default="INR", nullable=False)
    product_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    product = relationship("Product", back_populates="price_records")

    __table_args__ = (
        Index("idx_price_records_product_platform", "product_id", "platform", scraped_at.desc()),
    )

    def __repr__(self) -> str:
        return f"<PriceRecord(id={self.id}, platform='{self.platform}', price={self.price})>"
