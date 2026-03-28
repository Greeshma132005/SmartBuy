"""
Scraper orchestrator.
Provides a unified interface to search products — Google Shopping API first,
existing scrapers (Amazon, Flipkart, Croma) as fallback.
Includes TTL caching to conserve API quota (100 req/month free tier).
"""

import asyncio
import logging
from typing import Dict, List, Optional

from cachetools import TTLCache
from thefuzz import fuzz

from app.scrapers.amazon import AmazonScraper
from app.scrapers.flipkart import FlipkartScraper
from app.scrapers.croma import CromaScraper
from app.scrapers.coupon_scraper import CouponScraper
from app.scrapers.google_shopping import GoogleShoppingClient, parse_price_string, normalize_store_name

logger = logging.getLogger(__name__)

# Minimum fuzzy-match ratio to consider two product names as the same product
SIMILARITY_THRESHOLD = 80

# Registry mapping platform keys to their scraper classes
PLATFORM_SCRAPERS: Dict[str, type] = {
    "amazon": AmazonScraper,
    "flipkart": FlipkartScraper,
    "croma": CromaScraper,
}

# ── Caches (conserve API quota) ───────────────────────────────────────────────
# Search results: 1 hour TTL
_search_cache: TTLCache = TTLCache(maxsize=100, ttl=3600)
# Product offers: 2 hours TTL
_offers_cache: TTLCache = TTLCache(maxsize=200, ttl=7200)


class ScraperManager:
    """
    Orchestrates product search.

    Flow: Google Shopping API → scraper fallback → deduplicate.

    Usage::

        manager = ScraperManager()
        results = await manager.search_all("iphone 15")
        unique  = ScraperManager.deduplicate_results(results)
        await manager.close_all()
    """

    def __init__(self) -> None:
        self.scrapers: Dict[str, object] = {
            name: cls() for name, cls in PLATFORM_SCRAPERS.items()
        }
        self.coupon_scraper = CouponScraper()
        self.google_shopping = GoogleShoppingClient()

    # ------------------------------------------------------------------
    # Main search — API first, scrapers fallback
    # ------------------------------------------------------------------

    async def search_all(self, query: str) -> List[Dict]:
        """
        Search for products. Google Shopping API first, scrapers as fallback.
        Results are cached for 1 hour to conserve API quota.
        """
        cache_key = query.lower().strip()
        if cache_key in _search_cache:
            logger.info("Cache hit for '%s'", query)
            return _search_cache[cache_key]

        results: List[Dict] = []

        # ── Try Google Shopping API first ──
        if self.google_shopping.enabled:
            try:
                results = await self._search_via_google_shopping(query)
                if results:
                    logger.info(
                        "Google Shopping returned %d results for '%s'",
                        len(results), query,
                    )
            except Exception as exc:
                logger.error("Google Shopping search failed: %s", exc)

        # ── Fallback to scrapers ──
        if not results:
            logger.info("Falling back to scrapers for '%s'", query)
            results = await self._search_via_scrapers(query)

        if results:
            _search_cache[cache_key] = results

        return results

    # ------------------------------------------------------------------
    # Google Shopping path
    # ------------------------------------------------------------------

    async def _search_via_google_shopping(self, query: str) -> List[Dict]:
        """
        1. Search Google Shopping (1 API call)
        2. For top 3 results, get all store prices via /product-offers (up to 3 calls)
        Total: ~4 API calls per user search.
        """
        search_response = await self.google_shopping.search_products(query, country="in")
        if not search_response:
            return []

        products = search_response.get("data", {}).get("products", [])
        if not products:
            return []

        all_results: List[Dict] = []

        for product in products[:3]:
            product_id = product.get("product_id")
            product_title = product.get("product_title", "")
            photos = product.get("product_photos", [])
            image_url = photos[0] if photos else None

            if not product_id:
                continue

            # Check offers cache
            offers_key = f"offers:{product_id}"
            if offers_key in _offers_cache:
                all_results.extend(_offers_cache[offers_key])
                continue

            # Get all store offers for this product
            offers_response = await self.google_shopping.get_product_offers(
                product_id=product_id, country="in",
            )

            if offers_response:
                parsed = self.google_shopping.parse_offers(
                    offers_response,
                    product_name=product_title,
                    image_url=image_url,
                )
                if parsed:
                    # Tag each result with the google_product_id
                    for item in parsed:
                        item["google_product_id"] = product_id
                    _offers_cache[offers_key] = parsed
                    all_results.extend(parsed)
            else:
                # Offers endpoint failed — use single offer from search
                offer = product.get("offer")
                if offer:
                    price = parse_price_string(offer.get("price", ""))
                    if price:
                        all_results.append({
                            "name": product_title,
                            "price": price,
                            "original_price": parse_price_string(offer.get("original_price")),
                            "image_url": image_url,
                            "product_url": offer.get("offer_page_url", ""),
                            "platform": normalize_store_name(offer.get("store_name", "")),
                            "in_stock": True,
                            "google_product_id": product_id,
                        })

        return all_results

    # ------------------------------------------------------------------
    # Scraper fallback path (existing logic, unchanged)
    # ------------------------------------------------------------------

    async def _search_via_scrapers(self, query: str) -> List[Dict]:
        """Run all platform scrapers concurrently — the fallback path."""
        tasks = [scraper.search(query) for scraper in self.scrapers.values()]
        gathered = await asyncio.gather(*tasks, return_exceptions=True)

        combined: List[Dict] = []
        for idx, result in enumerate(gathered):
            platform_name = list(self.scrapers.keys())[idx]
            if isinstance(result, Exception):
                logger.error(
                    "ScraperManager: %s scraper raised an exception: %s",
                    platform_name, result,
                )
                continue
            if isinstance(result, list):
                combined.extend(result)

        logger.info(
            "ScraperManager: scrapers returned %d total results for '%s'",
            len(combined), query,
        )
        return combined

    # ------------------------------------------------------------------
    # Other search methods
    # ------------------------------------------------------------------

    async def search_platform(self, query: str, platform: str) -> List[Dict]:
        """Run the scraper for a specific platform and return results."""
        platform = platform.lower().strip()
        scraper = self.scrapers.get(platform)

        if scraper is None:
            logger.warning("ScraperManager: unknown platform '%s'", platform)
            return []

        try:
            return await scraper.search(query)
        except Exception as exc:
            logger.error("ScraperManager: %s scraper failed: %s", platform, exc)
            return []

    async def search_coupons(self, platform: str) -> List[Dict]:
        """Fetch coupons for a given platform."""
        try:
            return await self.coupon_scraper.scrape_coupons(platform)
        except Exception as exc:
            logger.error("ScraperManager: coupon scraper failed for '%s': %s", platform, exc)
            return []

    # ------------------------------------------------------------------
    # Deduplication
    # ------------------------------------------------------------------

    @staticmethod
    def deduplicate_results(results: List[Dict]) -> List[Dict]:
        """
        Group similar products using fuzzy name matching (thefuzz).

        Products whose names are >= 80% similar are grouped together.
        Each group has a ``platforms`` key with per-platform entries.
        """
        if not results:
            return []

        groups: List[Dict] = []

        for product in results:
            name = product.get("name", "")
            matched = False

            for group in groups:
                representative_name = group.get("name", "")
                ratio = fuzz.token_sort_ratio(name.lower(), representative_name.lower())
                if ratio >= SIMILARITY_THRESHOLD:
                    group["platforms"].append(product)
                    product_price = product.get("price")
                    group_price = group.get("price")
                    if product_price is not None:
                        if group_price is None or product_price < group_price:
                            group["price"] = product_price
                    # Preserve google_product_id if available
                    if product.get("google_product_id") and not group.get("google_product_id"):
                        group["google_product_id"] = product["google_product_id"]
                    matched = True
                    break

            if not matched:
                groups.append({
                    "name": name,
                    "price": product.get("price"),
                    "image_url": product.get("image_url", ""),
                    "google_product_id": product.get("google_product_id"),
                    "platforms": [product],
                })

        logger.info(
            "ScraperManager: deduplicated %d results into %d groups",
            len(results), len(groups),
        )
        return groups

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def close_all(self) -> None:
        """Close all HTTP clients."""
        tasks = [scraper.close() for scraper in self.scrapers.values()]
        tasks.append(self.coupon_scraper.close())
        tasks.append(self.google_shopping.close())
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("ScraperManager: all clients closed")
