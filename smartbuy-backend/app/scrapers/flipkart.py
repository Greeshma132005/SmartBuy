"""
Flipkart scraper.
Searches flipkart.com and parses product listing pages using BeautifulSoup.
Flipkart changes class names frequently, so multiple selector strategies are used.
"""

import logging
import re
from typing import Dict, List, Optional
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup, Tag

from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

BASE_URL = "https://www.flipkart.com"
SEARCH_URL = f"{BASE_URL}/search?q={{query}}"
MAX_RESULTS = 5

# Flipkart changes class names regularly -- try multiple selectors in order.
# Updated March 2026
CONTAINER_SELECTORS = [
    "a.k7wcnx",       # current list-view card (March 2026)
    "div.jIjQ8S",      # parent wrapper of a.k7wcnx
    "div.tUxRFH",
    "div._1AtVbE",
    "div._75nlfW",
    "a.CGtC98",
]

TITLE_SELECTORS = [
    "div.RG5Slk",      # current (March 2026)
    "div.KzDlHZ",
    "div._4rR01T",
    "a.IRpwTa",
    "a.s1Q9rs",
]

PRICE_SELECTORS = [
    "div.hZ3P6w",      # current (March 2026)
    "div.Nx9bqj",
    "div._30jeq3",
]

ORIGINAL_PRICE_SELECTORS = [
    "div.QiMO5r",      # current (March 2026)
    "div.yRaY8j",
    "div._3I9_wc",
]

IMAGE_SELECTORS = [
    "img.DByuf4",
    "img._396cs4",
    "img._2r_T1I",
    "img",
]

LINK_SELECTORS = [
    "a.k7wcnx",
    "a.CGtC98",
    "a._1fQZEK",
    "a._2rpwqI",
    "a.s1Q9rs",
]


class FlipkartScraper(BaseScraper):
    """Scraper for Flipkart product search results."""

    async def search(self, query: str) -> List[Dict]:
        """Search Flipkart for *query* and return up to 5 product dicts."""
        try:
            self._rotate_user_agent()
            url = SEARCH_URL.format(query=quote_plus(query))
            logger.info("Flipkart: searching for '%s'", query)

            await self._random_delay()
            response = await self.fetch(url)

            soup = BeautifulSoup(response.text, "html.parser")

            # Try each container selector until we find product cards
            product_cards: list[Tag] = []
            for selector in CONTAINER_SELECTORS:
                product_cards = soup.select(selector)
                if product_cards:
                    logger.debug("Flipkart: matched selector '%s' (%d cards)", selector, len(product_cards))
                    break

            if not product_cards:
                logger.warning("Flipkart: no product cards found for '%s'", query)
                return []

            results: List[Dict] = []

            for card in product_cards[:MAX_RESULTS]:
                try:
                    product = self._parse_card(card, soup)
                    if product and product.get("name") and product.get("price"):
                        results.append(product)
                except Exception as exc:
                    logger.debug("Flipkart: failed to parse a card: %s", exc)
                    continue

            logger.info("Flipkart: found %d results for '%s'", len(results), query)
            return results

        except Exception as exc:
            logger.error("Flipkart: search failed for '%s': %s", query, exc)
            return []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_card(self, card: Tag, soup: BeautifulSoup) -> Optional[Dict]:
        """Extract product information from a single product card."""
        # --- Title ---
        name = self._find_text(card, TITLE_SELECTORS)
        if not name:
            return None

        # --- Price ---
        price_text = self._find_text(card, PRICE_SELECTORS)
        price = _safe_float(price_text) if price_text else None

        # --- Original price (strike-through) ---
        original_price = None
        orig_text = self._find_text(card, ORIGINAL_PRICE_SELECTORS)
        if orig_text:
            # QiMO5r may contain both prices concatenated e.g. "₹85,899₹85,900"
            # Take the last price-like number as the original
            prices_in_text = re.findall(r'[\d,]+', orig_text)
            if len(prices_in_text) >= 2:
                original_price = _safe_float(prices_in_text[-1])
            elif prices_in_text:
                original_price = _safe_float(prices_in_text[0])

        # --- Image ---
        image_url = ""
        for sel in IMAGE_SELECTORS:
            img_tag = card.select_one(sel)
            if img_tag:
                image_url = img_tag.get("src", "")
                if image_url:
                    break

        # --- Product URL ---
        product_url = ""
        # If the card itself is an anchor tag, use its href
        if card.name == "a":
            href = card.get("href", "")
            if href:
                product_url = urljoin(BASE_URL, href)
        if not product_url:
            for sel in LINK_SELECTORS:
                link_tag = card.select_one(sel)
                if link_tag:
                    href = link_tag.get("href", "")
                    product_url = urljoin(BASE_URL, href)
                    break

        # --- Stock heuristic ---
        in_stock = True
        card_text = card.get_text(separator=" ").lower()
        if "out of stock" in card_text or "currently unavailable" in card_text:
            in_stock = False

        return {
            "name": name,
            "price": price,
            "original_price": original_price,
            "image_url": image_url,
            "product_url": product_url,
            "platform": "flipkart",
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
