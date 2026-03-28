"""
Real-Time Product Search API Client (via RapidAPI / OpenWeb Ninja)
Powered by Google Shopping — returns product data from ALL stores in one call.

API Host: real-time-product-search.p.rapidapi.com
Free tier: 100 requests/month, 1000 req/hour
"""

import re
import logging
from typing import List, Dict, Optional, Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

RAPIDAPI_HOST = "real-time-product-search.p.rapidapi.com"
BASE_URL = f"https://{RAPIDAPI_HOST}"


def parse_price_string(price_str: Optional[str]) -> Optional[float]:
    """Parse price strings like '₹62,999', '$272.00', '₹1,09,990' into float."""
    if not price_str:
        return None
    try:
        cleaned = re.sub(r"[^\d.,]", "", price_str.strip())
        cleaned = cleaned.replace(",", "")
        if not cleaned:
            return None
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def normalize_store_name(store_name: str) -> str:
    """Normalize store names to our platform column values."""
    if not store_name:
        return "unknown"

    name_lower = store_name.lower().strip()

    STORE_MAP = {
        "amazon.in": "amazon",
        "amazon india": "amazon",
        "amazon": "amazon",
        "flipkart": "flipkart",
        "croma": "croma",
        "croma retail": "croma",
        "reliance digital": "reliance_digital",
        "tata cliq": "tatacliq",
        "tatacliq": "tatacliq",
        "vijay sales": "vijay_sales",
        "snapdeal": "snapdeal",
        "jiomart": "jiomart",
        "paytm mall": "paytm",
        "shopclues": "shopclues",
    }

    for key, value in STORE_MAP.items():
        if key in name_lower:
            return value

    return re.sub(r"[^a-z0-9]+", "_", name_lower).strip("_")


class GoogleShoppingClient:
    """Async client for Real-Time Product Search API via RapidAPI."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.rapidapi_key
        self.enabled = bool(self.api_key)
        self.headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": RAPIDAPI_HOST,
        }
        self.client = httpx.AsyncClient(timeout=30.0, headers=self.headers)

    async def _get(self, endpoint: str, params: Optional[dict] = None) -> Optional[dict]:
        """Make a GET request. Returns None on any failure."""
        if not self.enabled:
            return None

        url = f"{BASE_URL}{endpoint}"
        try:
            response = await self.client.get(url, params=params or {})

            if response.status_code == 429:
                logger.warning("RapidAPI rate limit hit")
                return None
            if response.status_code == 403:
                logger.error("RapidAPI quota exceeded or invalid key")
                return None
            if response.status_code != 200:
                logger.error(
                    "Google Shopping API error: %s — URL: %s — Response: %s",
                    response.status_code, url, response.text[:300],
                )
                return None

            data = response.json()
            if data.get("status") != "OK":
                logger.error("Google Shopping API non-OK status: %s", data.get("status"))
                return None

            return data

        except httpx.TimeoutException:
            logger.error("Google Shopping API timeout")
            return None
        except Exception as exc:
            logger.error("Google Shopping API error: %s", exc)
            return None

    # ─── Search ───────────────────────────────────────────────────

    async def search_products(
        self,
        query: str,
        country: str = "in",
        language: str = "en",
        page: int = 1,
        sort_by: str = "BEST_MATCH",
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> Optional[dict]:
        """Search products on Google Shopping."""
        params: dict[str, Any] = {
            "q": query,
            "country": country,
            "language": language,
            "page": page,
            "sort_by": sort_by,
        }
        if min_price is not None:
            params["min_price"] = min_price
        if max_price is not None:
            params["max_price"] = max_price

        return await self._get("/search-v2", params)

    # ─── Product Offers (ALL stores) ──────────────────────────────

    async def get_product_offers(
        self,
        product_id: str,
        country: str = "in",
        language: str = "en",
        page: int = 1,
    ) -> Optional[dict]:
        """Get ALL store offers for a specific product — the key endpoint for price comparison."""
        params = {
            "product_id": product_id,
            "country": country,
            "language": language,
            "page": page,
        }
        return await self._get("/product-offers-v2", params)

    # ─── Product Reviews ──────────────────────────────────────────

    async def get_product_reviews(
        self,
        product_id: str,
        country: str = "in",
        language: str = "en",
        page: int = 1,
        limit: int = 10,
    ) -> Optional[dict]:
        """Get product reviews from multiple sources."""
        params = {
            "product_id": product_id,
            "country": country,
            "language": language,
            "page": page,
            "limit": limit,
        }
        return await self._get("/product-reviews-v2", params)

    # ─── Parsers ──────────────────────────────────────────────────

    def parse_search_results(self, api_response: dict) -> List[Dict[str, Any]]:
        """Parse search response. Each result has ONE offer (the pinned/best one)."""
        results: List[Dict[str, Any]] = []
        products = api_response.get("data", {}).get("products", [])

        for product in products:
            offer = product.get("offer")
            if not offer:
                continue

            price = parse_price_string(offer.get("price", ""))
            if not price:
                continue

            original_price = parse_price_string(offer.get("original_price"))
            photos = product.get("product_photos", [])

            results.append({
                "name": product.get("product_title", ""),
                "price": price,
                "original_price": original_price,
                "image_url": photos[0] if photos else None,
                "product_url": offer.get("offer_page_url", ""),
                "platform": normalize_store_name(offer.get("store_name", "")),
                "in_stock": True,
                "google_product_id": product.get("product_id"),
            })

        return results

    def parse_offers(
        self,
        api_response: dict,
        product_name: str = "",
        image_url: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Parse product-offers response — one entry per store."""
        results: List[Dict[str, Any]] = []
        offers = api_response.get("data", {}).get("offers", [])

        for offer in offers:
            price = parse_price_string(offer.get("price", ""))
            if not price:
                continue

            original_price = parse_price_string(offer.get("original_price"))

            results.append({
                "name": product_name,
                "price": price,
                "original_price": original_price,
                "image_url": image_url,
                "product_url": offer.get("offer_page_url", ""),
                "platform": normalize_store_name(offer.get("store_name", "")),
                "in_stock": True,
            })

        return results

    async def close(self) -> None:
        await self.client.aclose()
