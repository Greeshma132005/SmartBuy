from datetime import datetime

from sqlalchemy import String, Text, Numeric, Boolean, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin


class Coupon(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "coupons"

    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    discount_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    discount_value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    min_order_value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("platform", "code", name="uq_coupons_platform_code"),
    )

    def __repr__(self) -> str:
        return f"<Coupon(id={self.id}, platform='{self.platform}', code='{self.code}')>"
