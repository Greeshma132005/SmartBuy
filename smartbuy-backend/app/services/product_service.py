import re
import logging
from datetime import datetime, timezone

from app.database import get_db

logger = logging.getLogger(__name__)


def _slugify(name: str) -> str:
    """Convert a product name into a URL-friendly slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def create_product(
    name: str,
    slug: str,
    category: str | None = None,
    image_url: str | None = None,
    description: str | None = None,
) -> dict | None:
    """Insert a new product and return the created row."""
    try:
        db = get_db()
        payload: dict = {
            "name": name,
            "slug": slug,
        }
        if category is not None:
            payload["category"] = category
        if image_url is not None:
            payload["image_url"] = image_url
        if description is not None:
            payload["description"] = description

        result = db.table("products").insert(payload).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception:
        logger.exception("Failed to create product: %s", name)
        return None


def get_product(product_id: str) -> dict | None:
    """Fetch a single product by its UUID."""
    try:
        db = get_db()
        result = (
            db.table("products")
            .select("*")
            .eq("id", product_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception:
        logger.exception("Failed to get product: %s", product_id)
        return None


def get_product_by_slug(slug: str) -> dict | None:
    """Fetch a single product by its slug."""
    try:
        db = get_db()
        result = (
            db.table("products")
            .select("*")
            .eq("slug", slug)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception:
        logger.exception("Failed to get product by slug: %s", slug)
        return None


def search_products(query: str) -> list[dict]:
    """Search products by name using case-insensitive partial match."""
    try:
        db = get_db()
        result = (
            db.table("products")
            .select("*")
            .ilike("name", f"%{query}%")
            .execute()
        )
        return result.data or []
    except Exception:
        logger.exception("Failed to search products: %s", query)
        return []


def find_or_create_product(
    name: str,
    category: str | None = None,
    image_url: str | None = None,
) -> dict | None:
    """Find an existing product by fuzzy name match, or create a new one.

    Uses ilike for a loose match on the product name. If no match is found,
    a new product is created with an auto-generated slug.
    """
    try:
        db = get_db()
        # Try a fuzzy match first
        result = (
            db.table("products")
            .select("*")
            .ilike("name", f"%{name}%")
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]

        # No existing product found — create one
        slug = _slugify(name)
        return create_product(
            name=name,
            slug=slug,
            category=category,
            image_url=image_url,
        )
    except Exception:
        logger.exception("Failed to find or create product: %s", name)
        return None


def store_price_record(
    product_id: str,
    platform: str,
    price: float,
    original_price: float | None = None,
    product_url: str | None = None,
    in_stock: bool = True,
) -> dict | None:
    """Insert a new price record for a product."""
    try:
        db = get_db()
        payload: dict = {
            "product_id": product_id,
            "platform": platform,
            "price": price,
            "in_stock": in_stock,
        }
        if original_price is not None:
            payload["original_price"] = original_price
        if product_url is not None:
            payload["product_url"] = product_url

        result = db.table("price_records").insert(payload).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception:
        logger.exception(
            "Failed to store price record for product %s on %s",
            product_id,
            platform,
        )
        return None


def log_search(user_id: str | None, query: str) -> None:
    """Log a search query to search_history if user_id is provided."""
    if user_id is None:
        return
    try:
        db = get_db()
        db.table("search_history").insert({
            "user_id": user_id,
            "query": query,
        }).execute()
    except Exception:
        logger.exception(
            "Failed to log search for user %s: %s", user_id, query
        )
