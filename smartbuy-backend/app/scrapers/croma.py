"""
Croma scraper.
Searches croma.com and parses product listing pages using BeautifulSoup.
"""

import logging
import re
from typing import Dict, List, Optional
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup, Tag

from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

BASE_URL = "https://www.croma.com"
SEARCH_URL = f"{BASE_URL}/searchB?q={{query}}%3Arelevance&text={{query}}"
MAX_RESULTS = 5

# Structural selectors for product cards on Croma
CARD_SELECTORS = [
    "li.product-item",
    "div.product-item",
    "div.product__list--item",
    "div.cp-product",
]

TITLE_SELECTORS = [
    "h3.product-title a",
    "a.product__list--name",
    "h3 a",
    "div.product-title a",
]

PRICE_SELECTORS = [
    "span.amount",
    "span.pdpPrice",
    "span.new-price",
    "div.new-price span",
    "span.amount plp-srp-new-amount",
]

ORIGINAL_PRICE_SELECTORS = [
    "span.old-price",
    "span.pdpPriceMrp",
    "span.list-price",
]

IMAGE_SELECTORS = [
    "img.product-img",
    "img.lazy-load-image",
    "img[data-src]",
    "img",
]

LINK_SELECTORS = [
    "a.product__list--name",
    "h3.product-title a",
    "h3 a",
    "a[href*='/p/']",
]


class CromaScraper(BaseScraper):
    """Scraper for Croma product search results."""

    async def search(self, query: str) -> List[Dict]:
        """Search Croma for *query* and return up to 5 product dicts."""
        try:
            self._rotate_user_agent()
            encoded = quote_plus(query)
            url = SEARCH_URL.format(query=encoded)
            logger.info("Croma: searching for '%s'", query)

            await self._random_delay()
            # Croma is a JS-rendered SPA — needs browser rendering
            response = await self.fetch(url, render=True)

            soup = BeautifulSoup(response.text, "html.parser")

            # Try each container selector until we find product cards
            product_cards: list[Tag] = []
            for selector in CARD_SELECTORS:
                product_cards = soup.select(selector)
                if product_cards:
                    logger.debug("Croma: matched selector '%s' (%d cards)", selector, len(product_cards))
                    break

            if not product_cards:
                logger.warning("Croma: no product cards found for '%s'", query)
                return []

            results: List[Dict] = []

            for card in product_cards[:MAX_RESULTS]:
                try:
                    product = self._parse_card(card)
                    if product and product.get("name"):
                        results.append(product)
                except Exception as exc:
                    logger.debug("Croma: failed to parse a card: %s", exc)
                    continue

            logger.info("Croma: found %d results for '%s'", len(results), query)
            return results

        except Exception as exc:
            logger.error("Croma: search failed for '%s': %s", query, exc)
            return []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_card(self, card: Tag) -> Optional[Dict]:
        """Extract product information from a single Croma product card."""
        # --- Title ---
        name = self._find_text(card, TITLE_SELECTORS)
        if not name:
            return None

        # --- Price ---
        price_text = self._find_text(card, PRICE_SELECTORS)
        price = _safe_float(price_text) if price_text else None

        # --- Original price ---
        original_price = None
        orig_text = self._find_text(card, ORIGINAL_PRICE_SELECTORS)
        if orig_text:
            original_price = _safe_float(orig_text)

        # --- Image ---
        image_url = ""
        for sel in IMAGE_SELECTORS:
            img_tag = card.select_one(sel)
            if img_tag:
                # Prefer data-src (lazy-loaded) over src
                image_url = img_tag.get("data-src") or img_tag.get("src", "")
                if image_url:
                    break

        # --- Product URL ---
        product_url = ""
        for sel in LINK_SELECTORS:
            link_tag = card.select_one(sel)
            if link_tag:
                href = link_tag.get("href", "")
                product_url = urljoin(BASE_URL, href)
                break

        # --- Stock heuristic ---
        in_stock = True
        card_text = card.get_text(separator=" ").lower()
        if "out of stock" in card_text or "sold out" in card_text:
            in_stock = False

        return {
            "name": name,
            "price": price,
            "original_price": original_price,
            "image_url": image_url,
            "product_url": product_url,
            "platform": "croma",
            "in_stock": in_stock,
        }

    @staticmethod
    def _find_text(tag: Tag, selectors: list[str]) -> Optional[str]:
        """Return text from the first matching selector inside *tag*."""
        for sel in selectors:
            found = tag.select_one(sel)
            if found:
                return found.get_text(strip=True)
        return None


def _safe_float(value: str) -> Optional[float]:
    """Try to convert *value* to float, return None on failure."""
    try:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None
