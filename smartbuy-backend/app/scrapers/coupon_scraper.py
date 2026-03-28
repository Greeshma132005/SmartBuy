"""
Coupon aggregation scraper.
Scrapes coupon/deal sites to find active discount codes for supported platforms.
"""

import logging
from typing import Dict, List

from bs4 import BeautifulSoup

from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

# Mapping of platform names to coupon aggregator URLs
COUPON_SOURCES: Dict[str, List[str]] = {
    "amazon": [
        "https://www.grabon.in/amazon-coupons/",
        "https://www.coupondunia.in/amazon",
    ],
    "flipkart": [
        "https://www.grabon.in/flipkart-coupons/",
        "https://www.coupondunia.in/flipkart",
    ],
    "croma": [
        "https://www.grabon.in/croma-coupons/",
        "https://www.coupondunia.in/croma",
    ],
}

# Selectors to try when parsing coupon cards (sites change layouts frequently)
COUPON_CARD_SELECTORS = [
    "div.coupon-card",
    "div.coupon-item",
    "div.coup-card",
    "li.coupon-item",
    "div.offer-card",
]

CODE_SELECTORS = [
    "span.coupon-code",
    "span.code",
    "div.coupon-code span",
    "span.coup-code",
]

DESCRIPTION_SELECTORS = [
    "h3.coupon-title",
    "div.coupon-desc",
    "p.coupon-description",
    "div.offer-desc",
    "h3.offer-title",
]


class CouponScraper(BaseScraper):
    """Scraper that aggregates coupon/promo codes for e-commerce platforms."""

    async def search(self, query: str) -> List[Dict]:
        """
        BaseScraper requires this method.
        Delegates to `scrape_coupons` treating *query* as a platform name.
        """
        return await self.scrape_coupons(platform=query)

    async def scrape_coupons(self, platform: str) -> List[Dict]:
        """
        Scrape coupon codes for the given *platform*.

        Returns a list of dicts with keys:
            code, description, discount_type, discount_value, platform,
            category, valid_until
        """
        platform = platform.lower().strip()
        source_urls = COUPON_SOURCES.get(platform, [])

        if not source_urls:
            logger.warning("CouponScraper: no coupon sources configured for platform '%s'", platform)
            return []

        all_coupons: List[Dict] = []

        for url in source_urls:
            try:
                self._rotate_user_agent()
                await self._random_delay()

                logger.info("CouponScraper: fetching coupons from %s", url)
                response = await self.fetch(url)

                coupons = self._parse_coupons(response.text, platform)
                all_coupons.extend(coupons)
            except Exception as exc:
                logger.error("CouponScraper: failed to fetch %s: %s", url, exc)
                continue

        # Deduplicate by code
        seen_codes: set[str] = set()
        unique: List[Dict] = []
        for coupon in all_coupons:
            code = coupon.get("code", "")
            key = code.lower() if code else id(coupon)
            if key not in seen_codes:
                seen_codes.add(key)
                unique.append(coupon)

        logger.info("CouponScraper: found %d unique coupons for '%s'", len(unique), platform)
        return unique

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_coupons(self, html: str, platform: str) -> List[Dict]:
        """Parse coupon cards from the HTML page."""
        soup = BeautifulSoup(html, "html.parser")
        coupons: List[Dict] = []

        # Find coupon card containers
        cards = []
        for selector in COUPON_CARD_SELECTORS:
            cards = soup.select(selector)
            if cards:
                break

        for card in cards:
            try:
                coupon = self._parse_coupon_card(card, platform)
                if coupon:
                    coupons.append(coupon)
            except Exception as exc:
                logger.debug("CouponScraper: failed to parse coupon card: %s", exc)
                continue

        return coupons

    def _parse_coupon_card(self, card, platform: str) -> Dict | None:
        """Extract coupon information from a single card element."""
        # --- Coupon code ---
        code = ""
        for sel in CODE_SELECTORS:
            tag = card.select_one(sel)
            if tag:
                code = tag.get_text(strip=True)
                break

        # --- Description ---
        description = ""
        for sel in DESCRIPTION_SELECTORS:
            tag = card.select_one(sel)
            if tag:
                description = tag.get_text(strip=True)
                break

        if not description and not code:
            return None

        # --- Infer discount type and value from description ---
        discount_type, discount_value = self._infer_discount(description)

        # --- Category (best-effort from card text) ---
        category = "general"
        card_text = card.get_text(separator=" ").lower()
        for cat in ("electronics", "fashion", "grocery", "mobile", "appliance"):
            if cat in card_text:
                category = cat
                break

        # --- Valid until ---
        valid_until = None
        expiry_tag = card.select_one("span.expiry") or card.select_one("span.validity")
        if expiry_tag:
            valid_until = expiry_tag.get_text(strip=True)

        return {
            "code": code,
            "description": description,
            "discount_type": discount_type,
            "discount_value": discount_value,
            "platform": platform,
            "category": category,
            "valid_until": valid_until,
        }

    @staticmethod
    def _infer_discount(description: str) -> tuple[str, float | None]:
        """Try to infer discount type and value from the coupon description text."""
        desc_lower = description.lower()

        # Percentage discount (e.g. "50% off")
        import re
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", desc_lower)
        if pct_match:
            return "percentage", float(pct_match.group(1))

        # Flat / fixed discount (e.g. "Rs.200 off", "flat 500 off")
        flat_match = re.search(r"(?:rs\.?|inr|flat\s*)\s*(\d+(?:,\d+)*)", desc_lower)
        if flat_match:
            value_str = flat_match.group(1).replace(",", "")
            return "flat", float(value_str)

        return "unknown", None
