from datetime import datetime

from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Product(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_product_id: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)

    # Relationships
    price_records = relationship("PriceRecord", back_populates="product", cascade="all, delete-orphan")
    price_predictions = relationship("PricePrediction", back_populates="product", cascade="all, delete-orphan")
    price_alerts = relationship("PriceAlert", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name='{self.name}')>"
