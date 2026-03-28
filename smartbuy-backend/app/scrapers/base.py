"""
Abstract base scraper class for all platform scrapers.
Provides shared HTTP client setup, rotating User-Agent headers, and utility methods.
When SCRAPER_API_KEY is set, requests are routed through ScraperAPI to bypass anti-bot blocks.
"""

import asyncio
import logging
import random
from abc import ABC, abstractmethod
from typing import Dict, List
from urllib.parse import urlencode

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Pool of realistic User-Agent strings that rotate randomly
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) "
    "Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
]

DEFAULT_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}

SCRAPER_API_BASE = "https://api.scraperapi.com"


class BaseScraper(ABC):
    """Abstract base class that all platform scrapers inherit from."""

    def __init__(self) -> None:
        settings = get_settings()
        self._scraper_api_key = settings.scraper_api_key or ""
        self.client = httpx.AsyncClient(
            headers=self._build_headers(),
            follow_redirects=True,
            timeout=httpx.Timeout(60.0, connect=15.0),
        )

    @property
    def _use_proxy(self) -> bool:
        return bool(self._scraper_api_key)

    def _proxy_url(self, target_url: str, render: bool = False) -> str:
        """Wrap a target URL through ScraperAPI proxy."""
        params = urlencode({
            "api_key": self._scraper_api_key,
            "url": target_url,
            "country_code": "in",
            "render": "true" if render else "false",
        })
        return f"{SCRAPER_API_BASE}?{params}"

    async def fetch(self, url: str, render: bool = False) -> httpx.Response:
        """Fetch a URL, routing through ScraperAPI if a key is configured.

        Set *render=True* for JavaScript-rendered pages (uses more API credits).
        """
        if self._use_proxy:
            proxy_url = self._proxy_url(url, render=render)
            logger.debug("Fetching via ScraperAPI (render=%s): %s", render, url)
            response = await self.client.get(proxy_url)
        else:
            logger.debug("Fetching directly: %s", url)
            response = await self.client.get(url)
        response.raise_for_status()
        return response

    def _build_headers(self) -> Dict[str, str]:
        """Return default headers with a randomly chosen User-Agent."""
        headers = DEFAULT_HEADERS.copy()
        headers["User-Agent"] = random.choice(USER_AGENTS)
        return headers

    def _rotate_user_agent(self) -> None:
        """Swap the current User-Agent to a new random one."""
        self.client.headers["User-Agent"] = random.choice(USER_AGENTS)

    @staticmethod
    async def _random_delay() -> None:
        """Sleep for a random duration between 2 and 3 seconds to mimic human behaviour."""
        delay = random.uniform(2.0, 3.0)
        await asyncio.sleep(delay)

    @abstractmethod
    async def search(self, query: str) -> List[Dict]:
        """
        Search the platform for the given query and return a list of product dicts.

        Each dict should contain at minimum:
            name, price, original_price, image_url, product_url, platform, in_stock
        """
        ...

    async def close(self) -> None:
        """Gracefully close the underlying HTTP client."""
        try:
            await self.client.aclose()
        except Exception as exc:
            logger.warning("Error closing HTTP client: %s", exc)
