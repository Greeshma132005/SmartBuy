"""Deal Verdict Service — pure Python math to decide if now is a good time to buy."""

from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import List, Optional


@dataclass
class DealVerdict:
    verdict: str              # "GREAT_DEAL", "GOOD_PRICE", "FAIR_PRICE", "WAIT", "UNKNOWN"
    title: str
    description: str
    current_lowest: float
    current_platform: str
    all_time_low: float
    all_time_low_platform: str
    all_time_high: float
    average_30d: float
    percent_vs_average: float
    percent_vs_all_time_low: float
    price_position: float     # 0.0 to 1.0 in min-max range
    confidence: str           # "high", "medium", "low"
    confidence_reason: str
    data_points: int
    color: str                # "green", "teal", "amber", "red", "gray"


def _no_data_verdict() -> DealVerdict:
    """Return an UNKNOWN verdict when no price data exists at all."""
    return DealVerdict(
        verdict="UNKNOWN",
        title="No Price Data",
        description="We don't have any price information for this product yet.",
        current_lowest=0.0,
        current_platform="unknown",
        all_time_low=0.0,
        all_time_low_platform="unknown",
        all_time_high=0.0,
        average_30d=0.0,
        percent_vs_average=0.0,
        percent_vs_all_time_low=0.0,
        price_position=0.0,
        confidence="low",
        confidence_reason="No data available",
        data_points=0,
        color="gray",
    )


def calculate_verdict(
    current_prices: list[dict],
    historical_prices: list[dict],
) -> DealVerdict:
    """Calculate whether the current price is a good deal based on historical data.

    Parameters
    ----------
    current_prices : list of {"platform": str, "price": float}
    historical_prices : list of {"price": float, "platform": str, "scraped_at": str}

    Returns
    -------
    DealVerdict
    """
    # ── 1. Find current lowest price ────────────────────────────────────────
    if not current_prices:
        return _no_data_verdict()

    valid_current = [p for p in current_prices if p.get("price") is not None]
    if not valid_current:
        return _no_data_verdict()

    lowest_entry = min(valid_current, key=lambda p: p["price"])
    current_lowest = float(lowest_entry["price"])
    current_platform = lowest_entry.get("platform", "unknown")

    # ── 2. Not enough historical data ───────────────────────────────────────
    data_points = len(historical_prices) if historical_prices else 0

    if data_points < 2:
        return DealVerdict(
            verdict="FAIR_PRICE",
            title="Not Enough Data",
            description=(
                f"Current lowest is ₹{current_lowest:,.0f} on {current_platform}. "
                "We need more historical data to give a confident verdict."
            ),
            current_lowest=current_lowest,
            current_platform=current_platform,
            all_time_low=current_lowest,
            all_time_low_platform=current_platform,
            all_time_high=current_lowest,
            average_30d=current_lowest,
            percent_vs_average=0.0,
            percent_vs_all_time_low=0.0,
            price_position=0.5,
            confidence="low",
            confidence_reason="Not enough data",
            data_points=data_points,
            color="amber",
        )

    # ── 3. Calculate statistics ─────────────────────────────────────────────
    all_prices = [float(h["price"]) for h in historical_prices if h.get("price") is not None]

    all_time_low = min(all_prices)
    all_time_high = max(all_prices)

    # Find ATL platform
    atl_entry = min(
        (h for h in historical_prices if h.get("price") is not None),
        key=lambda h: float(h["price"]),
    )
    all_time_low_platform = atl_entry.get("platform", "unknown")

    # 30-day average: filter by scraped_at when available
    now = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    prices_30d: list[float] = []

    for h in historical_prices:
        if h.get("price") is None:
            continue
        scraped_at = h.get("scraped_at")
        if scraped_at:
            try:
                if isinstance(scraped_at, str):
                    # Try ISO format first, then common alternatives
                    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
                        try:
                            ts = datetime.strptime(scraped_at.split("+")[0].split("Z")[0], fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        # If none of the formats matched, include the price anyway
                        prices_30d.append(float(h["price"]))
                        continue
                elif isinstance(scraped_at, datetime):
                    ts = scraped_at
                else:
                    prices_30d.append(float(h["price"]))
                    continue

                if ts >= cutoff_30d:
                    prices_30d.append(float(h["price"]))
            except Exception:
                # On any parsing error, include the price
                prices_30d.append(float(h["price"]))
        else:
            # No scraped_at → include in 30-day bucket
            prices_30d.append(float(h["price"]))

    # If no prices fall within 30 days, use all historical prices
    if not prices_30d:
        prices_30d = all_prices

    average_30d = sum(prices_30d) / len(prices_30d)

    # ── 4. Percentage calculations ──────────────────────────────────────────
    if average_30d > 0:
        percent_vs_average = ((current_lowest - average_30d) / average_30d) * 100
    else:
        percent_vs_average = 0.0

    if all_time_low > 0:
        percent_vs_all_time_low = ((current_lowest - all_time_low) / all_time_low) * 100
    else:
        percent_vs_all_time_low = 0.0

    # ── 5. Price position (0.0 = at ATL, 1.0 = at ATH) ─────────────────────
    price_range = all_time_high - all_time_low
    if price_range > 0:
        price_position = (current_lowest - all_time_low) / price_range
        price_position = max(0.0, min(1.0, price_position))  # clamp 0-1
    else:
        price_position = 0.5  # all prices identical

    # ── 6. Determine verdict ────────────────────────────────────────────────
    if percent_vs_all_time_low <= 5.0:
        # Within 5% of all-time low
        verdict = "GREAT_DEAL"
        color = "green"
        title = "Great Deal!"
        description = (
            f"At ₹{current_lowest:,.0f}, this is within 5% of the all-time low "
            f"(₹{all_time_low:,.0f}). Buy now!"
        )
    elif percent_vs_average < -5.0:
        # More than 5% below 30-day average
        verdict = "GOOD_PRICE"
        color = "teal"
        title = "Good Price"
        description = (
            f"₹{current_lowest:,.0f} is {abs(percent_vs_average):.1f}% below the "
            f"30-day average of ₹{average_30d:,.0f}. A solid time to buy."
        )
    elif 5.0 < percent_vs_all_time_low <= 15.0:
        # 5-15% above ATL
        verdict = "GOOD_PRICE"
        color = "teal"
        title = "Good Price"
        description = (
            f"₹{current_lowest:,.0f} is only {percent_vs_all_time_low:.1f}% above the "
            f"all-time low of ₹{all_time_low:,.0f}. Still a good price."
        )
    elif -5.0 <= percent_vs_average <= 5.0:
        # Within ±5% of 30-day average
        verdict = "FAIR_PRICE"
        color = "amber"
        title = "Fair Price"
        description = (
            f"₹{current_lowest:,.0f} is close to the 30-day average of "
            f"₹{average_30d:,.0f}. Not a steal, but not overpriced either."
        )
    else:
        # More than 5% above 30-day average
        verdict = "WAIT"
        color = "red"
        title = "Wait for a Drop"
        description = (
            f"₹{current_lowest:,.0f} is {percent_vs_average:.1f}% above the "
            f"30-day average of ₹{average_30d:,.0f}. Consider waiting."
        )

    # ── 7. Confidence ───────────────────────────────────────────────────────
    if data_points >= 15:
        confidence = "high"
        confidence_reason = f"Based on {data_points} historical data points"
    elif data_points >= 5:
        confidence = "medium"
        confidence_reason = f"Based on {data_points} data points — more data would improve accuracy"
    else:
        confidence = "low"
        confidence_reason = f"Only {data_points} data points available — verdict may change with more data"

    return DealVerdict(
        verdict=verdict,
        title=title,
        description=description,
        current_lowest=round(current_lowest, 2),
        current_platform=current_platform,
        all_time_low=round(all_time_low, 2),
        all_time_low_platform=all_time_low_platform,
        all_time_high=round(all_time_high, 2),
        average_30d=round(average_30d, 2),
        percent_vs_average=round(percent_vs_average, 2),
        percent_vs_all_time_low=round(percent_vs_all_time_low, 2),
        price_position=round(price_position, 4),
        confidence=confidence,
        confidence_reason=confidence_reason,
        data_points=data_points,
        color=color,
    )
