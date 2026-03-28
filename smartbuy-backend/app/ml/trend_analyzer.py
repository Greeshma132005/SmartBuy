"""
Price trend analysis utilities.
Provides volatility calculation, trend detection, best-buy-time analysis,
and a quick price summary.
"""

import logging
from collections import defaultdict
from datetime import datetime

import numpy as np

logger = logging.getLogger(__name__)


class TrendAnalyzer:
    """Collection of static helpers for analysing price trends."""

    @staticmethod
    def calculate_volatility(prices: list[float]) -> float:
        """Return the coefficient of variation (std / mean) of *prices*.

        A higher value means more volatile pricing.  Returns ``0.0`` when
        the input is empty or the mean is zero.
        """
        if not prices:
            return 0.0
        mean = np.mean(prices)
        if mean == 0:
            return 0.0
        return float(np.std(prices) / mean)

    @staticmethod
    def detect_trend(prices: list[float]) -> str:
        """Detect whether prices are trending *upward*, *downward*, or *stable*.

        Uses simple linear regression on the price sequence.  A slope whose
        magnitude exceeds 1 % of the mean price is considered significant.
        """
        if len(prices) < 2:
            return "stable"

        x = np.arange(len(prices))
        y = np.array(prices, dtype=float)

        # Simple linear regression: slope = cov(x, y) / var(x)
        slope = np.polyfit(x, y, 1)[0]
        mean_price = np.mean(y)

        if mean_price == 0:
            return "stable"

        # Threshold: 1 % of the mean price per data point
        threshold = 0.01 * mean_price

        if slope > threshold:
            return "upward"
        elif slope < -threshold:
            return "downward"
        return "stable"

    @staticmethod
    def find_best_buy_time(price_history: list[dict]) -> dict:
        """Identify which day of the week tends to have the lowest prices.

        Parameters
        ----------
        price_history : list[dict]
            Each dict must contain ``price`` (float) and ``scraped_at``
            (ISO-format string or datetime).

        Returns
        -------
        dict
            ``best_day`` (str), ``best_day_avg`` (float),
            ``all_days`` (dict mapping day names to average prices),
            and ``recommendation`` (str).
        """
        day_names = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]

        if not price_history:
            return {
                "best_day": "Unknown",
                "best_day_avg": 0.0,
                "all_days": {},
                "recommendation": "Not enough data to determine the best buy time.",
            }

        day_prices: dict[int, list[float]] = defaultdict(list)

        for record in price_history:
            try:
                price = float(record["price"])
                scraped_at = record["scraped_at"]
                if isinstance(scraped_at, str):
                    scraped_at = datetime.fromisoformat(scraped_at.replace("Z", "+00:00"))
                day_prices[scraped_at.weekday()].append(price)
            except (KeyError, ValueError, TypeError) as exc:
                logger.debug("Skipping malformed record: %s", exc)
                continue

        if not day_prices:
            return {
                "best_day": "Unknown",
                "best_day_avg": 0.0,
                "all_days": {},
                "recommendation": "Not enough valid data to determine the best buy time.",
            }

        day_averages: dict[str, float] = {}
        for day_num, day_price_list in day_prices.items():
            day_averages[day_names[day_num]] = round(float(np.mean(day_price_list)), 2)

        best_day_name = min(day_averages, key=day_averages.get)  # type: ignore[arg-type]
        best_day_avg = day_averages[best_day_name]

        return {
            "best_day": best_day_name,
            "best_day_avg": best_day_avg,
            "all_days": day_averages,
            "recommendation": (
                f"Prices tend to be lowest on {best_day_name}s "
                f"(avg: {best_day_avg:.2f}). Consider buying on that day."
            ),
        }

    @staticmethod
    def price_summary(prices: list[dict]) -> dict:
        """Return a quick statistical summary of price records.

        Parameters
        ----------
        prices : list[dict]
            Each dict must contain a ``price`` key with a numeric value.

        Returns
        -------
        dict
            ``min``, ``max``, ``avg``, ``current``, and ``change_pct``
            (percentage difference of current price versus average).
        """
        if not prices:
            return {
                "min": 0.0,
                "max": 0.0,
                "avg": 0.0,
                "current": 0.0,
                "change_pct": 0.0,
            }

        try:
            values = [float(p["price"]) for p in prices if p.get("price") is not None]
        except (ValueError, TypeError):
            logger.exception("Failed to parse prices for summary")
            return {
                "min": 0.0,
                "max": 0.0,
                "avg": 0.0,
                "current": 0.0,
                "change_pct": 0.0,
            }

        if not values:
            return {
                "min": 0.0,
                "max": 0.0,
                "avg": 0.0,
                "current": 0.0,
                "change_pct": 0.0,
            }

        min_price = round(float(np.min(values)), 2)
        max_price = round(float(np.max(values)), 2)
        avg_price = round(float(np.mean(values)), 2)
        current_price = round(values[-1], 2)

        change_pct = 0.0
        if avg_price != 0:
            change_pct = round(((current_price - avg_price) / avg_price) * 100, 2)

        return {
            "min": min_price,
            "max": max_price,
            "avg": avg_price,
            "current": current_price,
            "change_pct": change_pct,
        }
