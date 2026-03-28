"""
Scraper orchestrator.
Provides a unified interface to run scrapers concurrently, deduplicate results,
and manage scraper lifecycle.
"""

import asyncio
import logging
from typing import Dict, List, Optional

from thefuzz import fuzz

from app.scrapers.amazon import AmazonScraper
from app.scrapers.flipkart import FlipkartScraper
from app.scrapers.croma import CromaScraper
from app.scrapers.coupon_scraper import CouponScraper

logger = logging.getLogger(__name__)

# Minimum fuzzy-match ratio to consider two product names as the same product
SIMILARITY_THRESHOLD = 80

# Registry mapping platform keys to their scraper classes
PLATFORM_SCRAPERS: Dict[str, type] = {
    "amazon": AmazonScraper,
    "flipkart": FlipkartScraper,
    "croma": CromaScraper,
}


class ScraperManager:
    """
    Orchestrates multiple platform scrapers.

    Usage::

        manager = ScraperManager()
        results = await manager.search_all("iphone 15")
        unique  = manager.deduplicate_results(results)
        await manager.close_all()
    """

    def __init__(self) -> None:
        self.scrapers: Dict[str, object] = {
            name: cls() for name, cls in PLATFORM_SCRAPERS.items()
        }
        self.coupon_scraper = CouponScraper()

    # ------------------------------------------------------------------
    # Search methods
    # ------------------------------------------------------------------

    async def search_all(self, query: str) -> List[Dict]:
        """
        Run all platform scrapers concurrently and return a combined list of
        product dicts.
        """
        tasks = [
            scraper.search(query)
            for scraper in self.scrapers.values()
        ]

        gathered = await asyncio.gather(*tasks, return_exceptions=True)

        combined: List[Dict] = []
        for idx, result in enumerate(gathered):
            platform_name = list(self.scrapers.keys())[idx]
            if isinstance(result, Exception):
                logger.error("ScraperManager: %s scraper raised an exception: %s", platform_name, result)
                continue
            if isinstance(result, list):
                combined.extend(result)

        logger.info("ScraperManager: search_all returned %d total results for '%s'", len(combined), query)
        return combined

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
        Each group is represented by a single dict with a ``platforms`` key
        containing the list of per-platform entries.

        Returns a list of grouped product dicts.
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
                    # Keep the lowest price as the representative price
                    product_price = product.get("price")
                    group_price = group.get("price")
                    if product_price is not None:
                        if group_price is None or product_price < group_price:
                            group["price"] = product_price
                    matched = True
                    break

            if not matched:
                groups.append({
                    "name": name,
                    "price": product.get("price"),
                    "image_url": product.get("image_url", ""),
                    "platforms": [product],
                })

        logger.info(
            "ScraperManager: deduplicated %d results into %d groups",
            len(results),
            len(groups),
        )
        return groups

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def close_all(self) -> None:
        """Close all scraper HTTP clients."""
        tasks = [scraper.close() for scraper in self.scrapers.values()]
        tasks.append(self.coupon_scraper.close())
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("ScraperManager: all scrapers closed")
