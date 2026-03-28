"""
Background scheduler for periodic price scraping.
Uses APScheduler to run a full price-update sweep every N hours.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import get_settings
from app.database import get_db
from app.scrapers.amazon import AmazonScraper
from app.scrapers.google_shopping import GoogleShoppingClient
from app.services.product_service import store_price_record

logger = logging.getLogger(__name__)

# Module-level scheduler instance
scheduler: AsyncIOScheduler | None = None


async def scheduled_price_update() -> None:
    """Scrape fresh prices for every tracked product and store the results.

    This function is designed to *never* raise — any exception is caught and
    logged so the scheduler keeps running.
    """
    logger.info("Scheduled price update starting")

    try:
        db = get_db()

        # Only refresh products that have active price alerts (saves API quota)
        alerts_result = (
            db.table("price_alerts")
            .select("product_id")
            .eq("is_active", True)
            .execute()
        )
        alert_product_ids = list({r["product_id"] for r in (alerts_result.data or [])})

        if alert_product_ids:
            products_result = (
                db.table("products")
                .select("*")
                .in_("id", alert_product_ids)
                .execute()
            )
            products = products_result.data or []
        else:
            # No active alerts — refresh all products via scrapers
            result = db.table("products").select("*").execute()
            products = result.data or []

        if not products:
            logger.info("No products to update")
            return

        logger.info("Updating prices for %d products", len(products))

        google_client = GoogleShoppingClient()
        scraper = AmazonScraper()

        try:
            for product in products:
                try:
                    product_name = product.get("name", "")
                    product_id = product.get("id", "")
                    google_id = product.get("google_product_id")

                    if not product_name or not product_id:
                        continue

                    search_results = []

                    # Try Google Shopping API first (1 call per product)
                    if google_id and google_client.enabled:
                        logger.info("Refreshing via API: %s", product_name)
                        offers_response = await google_client.get_product_offers(
                            google_id, country="in",
                        )
                        if offers_response:
                            search_results = google_client.parse_offers(
                                offers_response, product_name=product_name,
                            )

                    # Fallback to scraper
                    if not search_results:
                        logger.info("Refreshing via scraper: %s", product_name)
                        search_results = await scraper.search(product_name)

                    for item in search_results:
                        price = item.get("price")
                        if price is None:
                            continue
                        store_price_record(
                            product_id=product_id,
                            platform=item.get("platform", "unknown"),
                            price=price,
                            original_price=item.get("original_price"),
                            product_url=item.get("product_url"),
                            in_stock=item.get("in_stock", True),
                        )

                    logger.info(
                        "Stored %d price records for '%s'",
                        len(search_results), product_name,
                    )

                except Exception:
                    logger.exception(
                        "Failed to update prices for product: %s",
                        product.get("name", "unknown"),
                    )
                    continue
        finally:
            await scraper.close()
            await google_client.close()

        # Check for price alerts
        try:
            _check_price_alerts(db)
        except Exception:
            logger.exception("Failed to check price alerts")

        logger.info("Scheduled price update completed")

    except Exception:
        logger.exception("Scheduled price update failed")


def _check_price_alerts(db) -> None:
    """Check active alerts and flag any whose target price has been met.

    This is a best-effort helper — failures are logged but not re-raised.
    """
    try:
        alerts_result = (
            db.table("price_alerts")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        alerts = alerts_result.data or []

        if not alerts:
            return

        for alert in alerts:
            try:
                product_id = alert.get("product_id")
                target_price = alert.get("target_price")

                if product_id is None or target_price is None:
                    continue

                # Get the latest price record for this product
                price_result = (
                    db.table("price_records")
                    .select("price")
                    .eq("product_id", product_id)
                    .order("scraped_at", desc=True)
                    .limit(1)
                    .execute()
                )

                if not price_result.data:
                    continue

                current_price = price_result.data[0].get("price")
                if current_price is not None and current_price <= target_price:
                    # Mark the alert as triggered
                    db.table("price_alerts").update(
                        {"is_active": False, "triggered": True}
                    ).eq("id", alert["id"]).execute()

                    logger.info(
                        "Price alert triggered for product %s: "
                        "target=%.2f, current=%.2f",
                        product_id,
                        target_price,
                        current_price,
                    )

            except Exception:
                logger.exception("Failed to process alert %s", alert.get("id"))
                continue

    except Exception:
        logger.exception("Failed to query price alerts")


def start_scheduler() -> None:
    """Create and start the background scheduler."""
    global scheduler

    settings = get_settings()
    interval_hours = settings.scraping_interval_hours

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        scheduled_price_update,
        "interval",
        hours=interval_hours,
        id="price_update_job",
        name="Periodic price scraping",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Scheduler started — price updates every %d hours", interval_hours
    )


def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler if it is running."""
    global scheduler

    if scheduler is not None:
        try:
            scheduler.shutdown(wait=False)
            logger.info("Scheduler shut down successfully")
        except Exception:
            logger.exception("Error shutting down scheduler")
        finally:
            scheduler = None
