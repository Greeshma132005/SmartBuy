import logging
from datetime import datetime, timezone, timedelta

from app.database import get_db

logger = logging.getLogger(__name__)


def get_price_history(
    product_id: str,
    platform: str | None = None,
    days: int | None = None,
) -> list[dict]:
    """Fetch price records for a product, optionally filtered by platform and
    date range. Results are ordered by scraped_at ascending."""
    try:
        db = get_db()
        query = (
            db.table("price_records")
            .select("*")
            .eq("product_id", product_id)
        )
        if platform:
            query = query.eq("platform", platform)
        if days:
            since = (
                datetime.now(timezone.utc) - timedelta(days=days)
            ).isoformat()
            query = query.gte("scraped_at", since)

        result = query.order("scraped_at", desc=False).execute()
        return result.data or []
    except Exception:
        logger.exception(
            "Failed to get price history for product %s", product_id
        )
        return []


def get_latest_prices(product_id: str) -> list[dict]:
    """Get the most recent price per platform for a given product.

    Supabase does not natively support DISTINCT ON, so we fetch recent records
    ordered by scraped_at descending and de-duplicate in Python by keeping only
    the first (most recent) entry per platform.
    """
    try:
        db = get_db()
        result = (
            db.table("price_records")
            .select("*")
            .eq("product_id", product_id)
            .order("scraped_at", desc=True)
            .execute()
        )
        if not result.data:
            return []

        seen_platforms: set[str] = set()
        latest: list[dict] = []
        for record in result.data:
            plat = record.get("platform")
            if plat not in seen_platforms:
                seen_platforms.add(plat)
                latest.append(record)
        return latest
    except Exception:
        logger.exception(
            "Failed to get latest prices for product %s", product_id
        )
        return []


def get_price_stats(
    product_id: str, platform: str | None = None
) -> dict:
    """Calculate min, max, average, and current price for a product.

    Optionally scoped to a specific platform.
    """
    try:
        db = get_db()
        query = (
            db.table("price_records")
            .select("price, platform, scraped_at")
            .eq("product_id", product_id)
        )
        if platform:
            query = query.eq("platform", platform)

        result = query.order("scraped_at", desc=False).execute()
        records = result.data or []

        if not records:
            return {
                "min_price": None,
                "max_price": None,
                "avg_price": None,
                "current_price": None,
            }

        prices = [r["price"] for r in records]
        return {
            "min_price": min(prices),
            "max_price": max(prices),
            "avg_price": round(sum(prices) / len(prices), 2),
            "current_price": records[-1]["price"],
        }
    except Exception:
        logger.exception(
            "Failed to get price stats for product %s", product_id
        )
        return {
            "min_price": None,
            "max_price": None,
            "avg_price": None,
            "current_price": None,
        }


def store_prediction(
    product_id: str,
    platform: str,
    predictions: list[dict],
    confidence: float,
    model_used: str,
) -> None:
    """Insert price prediction records for a product.

    Each entry in *predictions* should contain ``predicted_price`` and
    ``predicted_date`` keys.
    """
    try:
        db = get_db()
        rows = [
            {
                "product_id": product_id,
                "platform": platform,
                "predicted_price": p["predicted_price"],
                "predicted_date": p["predicted_date"],
                "confidence_score": confidence,
                "model_used": model_used,
            }
            for p in predictions
        ]
        db.table("price_predictions").insert(rows).execute()
    except Exception:
        logger.exception(
            "Failed to store predictions for product %s on %s",
            product_id,
            platform,
        )


def get_predictions(
    product_id: str, platform: str | None = None
) -> list[dict]:
    """Fetch recent price predictions for a product."""
    try:
        db = get_db()
        query = (
            db.table("price_predictions")
            .select("*")
            .eq("product_id", product_id)
        )
        if platform:
            query = query.eq("platform", platform)

        result = (
            query.order("predicted_date", desc=False)
            .limit(30)
            .execute()
        )
        return result.data or []
    except Exception:
        logger.exception(
            "Failed to get predictions for product %s", product_id
        )
        return []


def check_alerts(
    product_id: str, platform: str, current_price: float
) -> None:
    """Find active price alerts where the target price has been met and mark
    them as triggered.

    An alert is considered triggered when the current price drops to or below
    the user's target price.
    """
    try:
        db = get_db()
        # Fetch matching active alerts
        result = (
            db.table("price_alerts")
            .select("id, user_id, target_price")
            .eq("product_id", product_id)
            .eq("is_active", True)
            .gte("target_price", current_price)
            .execute()
        )
        triggered = result.data or []
        if not triggered:
            return

        now = datetime.now(timezone.utc).isoformat()
        triggered_ids = [alert["id"] for alert in triggered]

        for alert_id in triggered_ids:
            db.table("price_alerts").update({
                "is_active": False,
                "triggered_at": now,
            }).eq("id", alert_id).execute()

        logger.info(
            "Triggered %d alert(s) for product %s on %s at price %.2f",
            len(triggered_ids),
            product_id,
            platform,
            current_price,
        )
    except Exception:
        logger.exception(
            "Failed to check alerts for product %s on %s",
            product_id,
            platform,
        )
