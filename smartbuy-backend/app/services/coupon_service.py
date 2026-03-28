import logging
from datetime import datetime, timezone

from app.database import get_db

logger = logging.getLogger(__name__)


def get_coupons(
    platform: str | None = None,
    category: str | None = None,
) -> list[dict]:
    """Fetch coupons with optional platform and category filtering.

    Only returns coupons whose valid_until date has not yet passed.
    """
    try:
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        query = (
            db.table("coupons")
            .select("*")
            .gte("valid_until", now)
        )
        if platform:
            query = query.eq("platform", platform)
        if category:
            query = query.eq("category", category)

        result = query.order("valid_until", desc=False).execute()
        return result.data or []
    except Exception:
        logger.exception("Failed to get coupons")
        return []


def get_coupons_for_product(product_id: str) -> list[dict]:
    """Get applicable coupons for a product by matching its category and the
    platforms where it has price records."""
    try:
        db = get_db()

        # Retrieve the product to get its category
        product_result = (
            db.table("products")
            .select("category")
            .eq("id", product_id)
            .execute()
        )
        if not product_result.data:
            logger.warning("Product not found: %s", product_id)
            return []

        category = product_result.data[0].get("category")

        # Determine which platforms carry this product
        price_result = (
            db.table("price_records")
            .select("platform")
            .eq("product_id", product_id)
            .execute()
        )
        platforms = list({r["platform"] for r in (price_result.data or [])})

        if not platforms and not category:
            return []

        now = datetime.now(timezone.utc).isoformat()

        # Build a query for coupons matching the product's category or
        # platforms.  Supabase-py doesn't support OR across different columns
        # in a single call, so we fetch by each criterion and merge.
        coupons_by_id: dict[str, dict] = {}

        if category:
            cat_result = (
                db.table("coupons")
                .select("*")
                .eq("category", category)
                .gte("valid_until", now)
                .execute()
            )
            for c in cat_result.data or []:
                coupons_by_id[c["id"]] = c

        for plat in platforms:
            plat_result = (
                db.table("coupons")
                .select("*")
                .eq("platform", plat)
                .gte("valid_until", now)
                .execute()
            )
            for c in plat_result.data or []:
                coupons_by_id[c["id"]] = c

        return list(coupons_by_id.values())
    except Exception:
        logger.exception(
            "Failed to get coupons for product %s", product_id
        )
        return []


def store_coupons(coupons: list[dict]) -> None:
    """Upsert coupons into the database.

    Duplicates are detected by the combination of platform + code. Existing
    rows that match are updated with the new values.
    """
    if not coupons:
        return

    try:
        db = get_db()
        db.table("coupons").upsert(
            coupons,
            on_conflict="platform,code",
        ).execute()
    except Exception:
        logger.exception("Failed to store %d coupon(s)", len(coupons))
