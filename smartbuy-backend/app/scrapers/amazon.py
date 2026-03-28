"""
Amazon India scraper.
Searches amazon.in and parses product listing pages using BeautifulSoup.
"""

import logging
import re
from typing import Dict, List
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup

from app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

BASE_URL = "https://www.amazon.in"
SEARCH_URL = f"{BASE_URL}/s?k={{query}}"
MAX_RESULTS = 5


class AmazonScraper(BaseScraper):
    """Scraper for Amazon India product search results."""

    async def search(self, query: str) -> List[Dict]:
        """Search Amazon India for *query* and return up to 5 product dicts."""
        try:
            self._rotate_user_agent()
            url = SEARCH_URL.format(query=quote_plus(query))
            logger.info("Amazon: searching for '%s'", query)

            await self._random_delay()
            response = await self.fetch(url)

            soup = BeautifulSoup(response.text, "html.parser")
            product_cards = soup.select('div[data-component-type="s-search-result"]')

            if not product_cards:
                logger.warning("Amazon: no product cards found for '%s'", query)
                return []

            results: List[Dict] = []

            for card in product_cards[:MAX_RESULTS]:
                try:
                    product = self._parse_card(card)
                    if product and product.get("name"):
                        results.append(product)
                except Exception as exc:
                    logger.debug("Amazon: failed to parse a card: %s", exc)
                    continue

            logger.info("Amazon: found %d results for '%s'", len(results), query)
            return results

        except Exception as exc:
            logger.error("Amazon: search failed for '%s': %s", query, exc)
            return []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_card(card) -> Dict | None:
        """Extract product information from a single search-result card."""
        # --- Title ---
        title_tag = card.select_one("h2 a span")
        if not title_tag:
            return None
        name = title_tag.get_text(strip=True)

        # --- Product URL ---
        link_tag = card.select_one("h2 a[href]")
        product_url = ""
        if link_tag:
            href = link_tag.get("href", "")
            product_url = urljoin(BASE_URL, href)

        # --- Current price ---
        price = None
        price_tag = card.select_one(".a-price-whole")
        if price_tag:
            raw = price_tag.get_text(strip=True).replace(",", "").replace(".", "")
            price = _safe_float(raw)

        # --- Original / strike-through price ---
        original_price = None
        orig_tag = card.select_one(".a-text-price .a-offscreen")
        if orig_tag:
            raw = orig_tag.get_text(strip=True).replace(",", "").replace("\u20b9", "").strip()
            original_price = _safe_float(raw)

        # --- Image ---
        image_url = ""
        img_tag = card.select_one(".s-image")
        if img_tag:
            image_url = img_tag.get("src", "")

        # --- Stock (simple heuristic) ---
        in_stock = True
        card_text = card.get_text(separator=" ").lower()
        if "currently unavailable" in card_text or "out of stock" in card_text:
            in_stock = False

        return {
            "name": name,
            "price": price,
            "original_price": original_price,
            "image_url": image_url,
            "product_url": product_url,
            "platform": "amazon",
            "in_stock": in_stock,
        }


def _safe_float(value: str) -> float | None:
    """Try to convert *value* to float, return None on failure."""
    try:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None
