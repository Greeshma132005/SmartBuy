import uuid
from datetime import datetime, date

from sqlalchemy import String, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin


class PricePrediction(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "price_predictions"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    predicted_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    predicted_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    model_used: Mapped[str] = mapped_column(String(50), server_default="linear_regression", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    product = relationship("Product", back_populates="price_predictions")

    def __repr__(self) -> str:
        return f"<PricePrediction(id={self.id}, predicted_price={self.predicted_price})>"
