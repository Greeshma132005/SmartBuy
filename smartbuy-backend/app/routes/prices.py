"""Price history, prediction, and deal verdict endpoints."""

import logging
from dataclasses import asdict
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Query, HTTPException, status

from app.services.price_service import (
    get_price_history,
    get_price_stats,
    get_latest_prices,
    store_prediction,
)
from app.services.product_service import get_product
from app.ml.price_predictor import PricePredictor
from app.models.schemas import PricePredictionResponse, PriceStats

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{product_id}/prices")
async def get_product_price_history(
    product_id: str,
    platform: Optional[str] = Query(None, description="Filter by platform"),
    days: Optional[int] = Query(None, ge=1, description="Limit to last N days"),
):
    """Fetch price history for a product with optional platform and date filters.

    Returns the historical price records along with summary statistics
    (min, max, average, current price).
    """
    # Verify product exists
    product_dict = get_product(product_id)
    if not product_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {product_id}",
        )

    history = get_price_history(product_id, platform=platform, days=days)
    stats = get_price_stats(product_id, platform=platform)

    # Build a typed stats object when data is available
    price_stats = None
    if stats.get("min_price") is not None:
        price_stats = PriceStats(
            min_price=stats["min_price"],
            max_price=stats["max_price"],
            avg_price=stats["avg_price"],
            current_price=stats["current_price"],
            platform=platform or "all",
        )

    return {
        "product_id": product_id,
        "platform": platform or "all",
        "days": days,
        "history": history,
        "stats": price_stats,
    }


@router.get("/{product_id}/prices/predict", response_model=PricePredictionResponse)
async def predict_product_prices(
    product_id: str,
    platform: Optional[str] = Query(None, description="Filter by platform"),
):
    """Run the ML price predictor on a product's price history and return
    forecasted prices for the next 7 days.

    If a *platform* is specified, only that platform's data is used for
    training; otherwise data from all platforms is combined.
    """
    # Verify product exists
    product_dict = get_product(product_id)
    if not product_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {product_id}",
        )

    # Retrieve historical price data
    history = get_price_history(product_id, platform=platform)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No price history available for prediction",
        )

    # Build a DataFrame for the predictor
    df = pd.DataFrame(history)

    predictor = PricePredictor()
    result = predictor.train_and_predict(df, days_ahead=7)

    if result.get("insufficient_data"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient price data for prediction (need at least 15 data points)",
        )

    if result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"],
        )

    resolved_platform = platform or "all"

    # Persist predictions in the database
    prediction_rows = [
        {"predicted_price": p["predicted_price"], "predicted_date": p["date"]}
        for p in result["predictions"]
    ]
    store_prediction(
        product_id=product_id,
        platform=resolved_platform,
        predictions=prediction_rows,
        confidence=result["confidence_score"],
        model_used=result["model_used"],
    )

    return PricePredictionResponse(
        product_id=product_id,
        platform=resolved_platform,
        predictions=result["predictions"],
        confidence_score=result["confidence_score"],
        model_used=result["model_used"],
        trend=result["trend"],
        summary=result["summary"],
    )


@router.get("/{product_id}/verdict")
async def get_deal_verdict(product_id: str):
    """Get AI deal verdict — is this a good time to buy?"""
    from app.services.verdict_service import calculate_verdict

    # Verify product exists
    product_dict = get_product(product_id)
    if not product_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {product_id}",
        )

    # Get current prices (latest per platform)
    current_prices = get_latest_prices(product_id)

    # Get historical prices (last 90 days)
    history = get_price_history(product_id, days=90)

    # Calculate verdict
    verdict = calculate_verdict(current_prices, history)

    return asdict(verdict)
