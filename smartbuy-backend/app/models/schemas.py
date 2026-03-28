from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel


# ── Products ──────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str
    slug: str | None = None
    category: str | None = None
    image_url: str | None = None
    description: str | None = None


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ── Price Records ─────────────────────────────────────────────────────────────

class PriceRecordBase(BaseModel):
    platform: str
    price: float
    original_price: float | None = None
    currency: str = "INR"
    product_url: str | None = None
    in_stock: bool = True


class PriceRecordCreate(PriceRecordBase):
    product_id: str


class PriceRecord(PriceRecordBase):
    id: str
    product_id: str
    scraped_at: datetime | None = None


# ── Price Predictions ─────────────────────────────────────────────────────────

class PricePrediction(BaseModel):
    date: str
    predicted_price: float


class PricePredictionResponse(BaseModel):
    product_id: str
    platform: str
    predictions: list[PricePrediction]
    confidence_score: float
    model_used: str = "random_forest"
    trend: str  # "drop", "stable", "increase"
    summary: str  # human-readable summary


# ── Coupons ───────────────────────────────────────────────────────────────────

class CouponBase(BaseModel):
    platform: str
    code: str | None = None
    description: str
    discount_type: str | None = None
    discount_value: float | None = None
    min_order_value: float | None = None
    category: str | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    source_url: str | None = None
    is_verified: bool = False


class CouponCreate(CouponBase):
    pass


class Coupon(CouponBase):
    id: str
    created_at: datetime | None = None


# ── Price Alerts ──────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    product_id: str
    target_price: float


class Alert(BaseModel):
    id: str
    user_id: str
    product_id: str
    target_price: float
    is_active: bool = True
    triggered_at: datetime | None = None
    created_at: datetime | None = None


class AlertWithProduct(Alert):
    product: Product | None = None
    current_price: float | None = None


# ── Search ────────────────────────────────────────────────────────────────────

class SearchQuery(BaseModel):
    q: str


class ScrapedProduct(BaseModel):
    name: str
    price: float
    original_price: float | None = None
    image_url: str | None = None
    product_url: str | None = None
    platform: str
    in_stock: bool = True


class ComparisonResult(BaseModel):
    product: Product
    prices: list[PriceRecord]
    lowest_price: PriceRecord | None = None
    highest_price: float | None = None
    savings: float | None = None


class SearchResponse(BaseModel):
    results: list[ComparisonResult]
    query: str


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    active_alerts: int
    triggered_alerts: int
    tracked_products: int
    recent_searches: list[dict]


class PriceStats(BaseModel):
    min_price: float
    max_price: float
    avg_price: float
    current_price: float
    platform: str
