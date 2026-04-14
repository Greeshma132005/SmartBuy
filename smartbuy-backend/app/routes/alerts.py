"""Price alert and dashboard endpoints (authenticated)."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.services.product_service import get_product
from app.services.price_service import get_latest_prices
from app.models.schemas import (
    AlertCreate,
    Alert,
    AlertWithProduct,
    Product,
    DashboardSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Price Alerts
# ---------------------------------------------------------------------------


@router.post("/", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def create_alert(
    body: AlertCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new price alert for the authenticated user.

    The alert will be triggered when the product's price drops to or below
    the specified ``target_price``.
    """
    # Verify the product exists
    product_dict = get_product(body.product_id)
    if not product_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {body.product_id}",
        )

    try:
        db = get_db()
        # Prefer the email passed in the body (from frontend),
        # fall back to email on the JWT user if available.
        alert_email = body.email or user.get("email")

        payload: dict = {
            "user_id": user["id"],
            "product_id": body.product_id,
            "target_price": body.target_price,
        }
        if alert_email:
            payload["email"] = alert_email

        result = db.table("price_alerts").insert(payload).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create alert",
            )
        return Alert(**result.data[0])
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create alert for user %s", user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert",
        )


@router.get("/", response_model=list[AlertWithProduct])
async def list_alerts(user: dict = Depends(get_current_user)):
    """List all price alerts belonging to the authenticated user.

    Each alert is enriched with the associated product information and the
    current lowest price across platforms.
    """
    try:
        db = get_db()
        result = (
            db.table("price_alerts")
            .select("*")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        alerts = result.data or []
    except Exception:
        logger.exception("Failed to list alerts for user %s", user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alerts",
        )

    enriched: list[AlertWithProduct] = []
    for alert_row in alerts:
        product_dict = get_product(alert_row["product_id"])
        product = Product(**product_dict) if product_dict else None

        current_price: float | None = None
        latest_prices = get_latest_prices(alert_row["product_id"])
        if latest_prices:
            current_price = min(p["price"] for p in latest_prices)

        enriched.append(
            AlertWithProduct(
                **alert_row,
                product=product,
                current_price=current_price,
            )
        )

    return enriched


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a price alert. Only the owning user may delete their alert."""
    try:
        db = get_db()

        # Verify the alert exists and belongs to the caller
        result = (
            db.table("price_alerts")
            .select("*")
            .eq("id", alert_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert not found: {alert_id}",
            )

        alert = result.data[0]
        if alert["user_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this alert",
            )

        db.table("price_alerts").delete().eq("id", alert_id).execute()
        return {"message": "Alert deleted successfully"}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete alert %s", alert_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert",
        )


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard/history")
async def get_search_history(user: dict = Depends(get_current_user)):
    """Return the authenticated user's recent search history."""
    try:
        db = get_db()
        result = (
            db.table("search_history")
            .select("*")
            .eq("user_id", user["id"])
            .order("searched_at", desc=True)
            .limit(50)
            .execute()
        )
        return {"searches": result.data or []}
    except Exception:
        logger.exception("Failed to fetch search history for user %s", user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch search history",
        )


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(user: dict = Depends(get_current_user)):
    """Return a summary of the user's activity for the dashboard.

    Includes counts of active alerts, triggered alerts, tracked products,
    and the most recent searches.
    """
    try:
        db = get_db()

        # Active alerts
        active_result = (
            db.table("price_alerts")
            .select("id", count="exact")
            .eq("user_id", user["id"])
            .eq("is_active", True)
            .execute()
        )
        active_alerts = active_result.count or 0

        # Triggered alerts
        triggered_result = (
            db.table("price_alerts")
            .select("id", count="exact")
            .eq("user_id", user["id"])
            .eq("is_active", False)
            .not_.is_("triggered_at", "null")
            .execute()
        )
        triggered_alerts = triggered_result.count or 0

        # Tracked products (distinct product_ids from the user's alerts)
        products_result = (
            db.table("price_alerts")
            .select("product_id")
            .eq("user_id", user["id"])
            .execute()
        )
        tracked_products = len(
            {row["product_id"] for row in (products_result.data or [])}
        )

        # Recent searches
        searches_result = (
            db.table("search_history")
            .select("*")
            .eq("user_id", user["id"])
            .order("searched_at", desc=True)
            .limit(10)
            .execute()
        )
        recent_searches = searches_result.data or []

        return DashboardSummary(
            active_alerts=active_alerts,
            triggered_alerts=triggered_alerts,
            tracked_products=tracked_products,
            recent_searches=recent_searches,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to build dashboard summary for user %s", user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard summary",
        )
