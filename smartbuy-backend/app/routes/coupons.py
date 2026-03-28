"""Coupon listing endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Query

from app.services.coupon_service import get_coupons
from app.models.schemas import Coupon

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[Coupon])
async def list_coupons(
    platform: Optional[str] = Query(None, description="Filter by platform (e.g. amazon, flipkart)"),
    category: Optional[str] = Query(None, description="Filter by product category"),
):
    """Return active coupons, optionally filtered by platform and/or category.

    Only coupons whose ``valid_until`` date is in the future are returned.
    """
    logger.info("Fetching coupons: platform=%s, category=%s", platform, category)
    coupon_rows = get_coupons(platform=platform, category=category)
    return [Coupon(**c) for c in coupon_rows]
