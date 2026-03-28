"""Product search and comparison endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Header, status

from app.auth.dependencies import get_current_user
from app.scrapers.manager import ScraperManager
from app.services.product_service import (
    find_or_create_product,
    get_product,
    store_price_record,
    log_search,
)
from app.services.price_service import get_latest_prices
from app.services.coupon_service import get_coupons_for_product
from app.models.schemas import (
    Product,
    PriceRecord,
    ComparisonResult,
    SearchResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _extract_user_id(authorization: str | None) -> str | None:
    """Try to extract the user ID from an optional Bearer token.

    This is a best-effort helper so that search history is logged when the
    caller is authenticated, without making auth mandatory.
    """
    if not authorization:
        return None
    try:
        from app.database import get_db

        token = authorization.removeprefix("Bearer ").strip()
        if not token:
            return None
        db = get_db()
        user_response = db.auth.get_user(token)
        if user_response and user_response.user:
            return str(user_response.user.id)
    except Exception:
        logger.debug("Could not resolve user from auth header")
    return None


@router.get("/search", response_model=SearchResponse)
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    user: dict = Depends(get_current_user),
):
    """Search for products across all platforms and return comparison results.

    Requires authentication. Scrapes platforms concurrently, deduplicates
    results by fuzzy name matching, persists products and price records, and
    returns a structured comparison.
    """
    logger.info("Product search initiated: q='%s' by user=%s", q, user["id"])

    # Log search history for the authenticated user
    log_search(user_id=user["id"], query=q)

    # Scrape all platforms concurrently
    manager = ScraperManager()
    try:
        raw_results = await manager.search_all(q)
    finally:
        await manager.close_all()

    if not raw_results:
        return SearchResponse(results=[], query=q)

    # Deduplicate into product groups
    groups = ScraperManager.deduplicate_results(raw_results)

    comparison_results: list[ComparisonResult] = []

    for group in groups:
        # Persist (or find) the canonical product
        product_dict = find_or_create_product(
            name=group["name"],
            image_url=group.get("image_url"),
            google_product_id=group.get("google_product_id"),
        )
        if product_dict is None:
            logger.warning("Skipping group — could not persist product: %s", group["name"])
            continue

        product = Product(**product_dict)

        # Store a price record for each platform entry in the group
        price_records: list[PriceRecord] = []
        for entry in group.get("platforms", []):
            record_dict = store_price_record(
                product_id=product.id,
                platform=entry.get("platform", "unknown"),
                price=entry.get("price", 0),
                original_price=entry.get("original_price"),
                product_url=entry.get("product_url"),
                in_stock=entry.get("in_stock", True),
            )
            if record_dict:
                price_records.append(PriceRecord(**record_dict))

        # Determine lowest / highest / savings
        lowest_record: PriceRecord | None = None
        highest_price: float | None = None
        if price_records:
            lowest_record = min(price_records, key=lambda r: r.price)
            highest_price = max(r.price for r in price_records)

        savings: float | None = None
        if lowest_record and highest_price is not None:
            savings = round(highest_price - lowest_record.price, 2)

        comparison_results.append(
            ComparisonResult(
                product=product,
                prices=price_records,
                lowest_price=lowest_record,
                highest_price=highest_price,
                savings=savings,
            )
        )

    logger.info("Search for '%s' returned %d comparison groups", q, len(comparison_results))
    return SearchResponse(results=comparison_results, query=q)


@router.get("/{product_id}")
async def get_product_detail(product_id: str):
    """Retrieve a single product with its latest prices across all platforms."""
    product_dict = get_product(product_id)
    if not product_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {product_id}",
        )

    product = Product(**product_dict)
    latest_prices = get_latest_prices(product_id)
    price_records = [PriceRecord(**p) for p in latest_prices]

    return {
        "product": product,
        "prices": price_records,
    }


@router.get("/{product_id}/coupons")
async def get_product_coupons(product_id: str):
    """Get applicable coupons for a specific product."""
    product_dict = get_product(product_id)
    if not product_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {product_id}",
        )

    coupons = get_coupons_for_product(product_id)
    return {"product_id": product_id, "coupons": coupons}
