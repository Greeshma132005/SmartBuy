from app.models.base import Base
from app.models.product import Product
from app.models.price_record import PriceRecord
from app.models.price_prediction import PricePrediction
from app.models.coupon import Coupon
from app.models.price_alert import PriceAlert
from app.models.search_history import SearchHistory

__all__ = [
    "Base",
    "Product",
    "PriceRecord",
    "PricePrediction",
    "Coupon",
    "PriceAlert",
    "SearchHistory",
]
