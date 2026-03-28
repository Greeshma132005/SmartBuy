"""
Seed data script for SmartBuy backend.

Usage:
    python seed_data.py            # Seed all data
    python seed_data.py --reset    # Clear existing seed data, then re-seed
    python -m seed_data            # Alternative invocation
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta

from dotenv import load_dotenv

load_dotenv()

from app.database import get_db
from app.config import get_settings


# ---------------------------------------------------------------------------
# Product definitions
# ---------------------------------------------------------------------------

PRODUCTS = [
    {
        "name": "iPhone 15 128GB",
        "slug": "iphone-15-128gb",
        "category": "smartphones",
        "image_url": "https://m.media-amazon.com/images/I/71d7rfSl0wL._SX679_.jpg",
        "description": "Apple iPhone 15 with A16 Bionic chip, 128GB storage, Dynamic Island, and 48MP camera system.",
        "base_prices": {"amazon": 69900, "flipkart": 68999, "croma": 71900},
    },
    {
        "name": "Samsung Galaxy S24",
        "slug": "samsung-galaxy-s24",
        "category": "smartphones",
        "image_url": "https://m.media-amazon.com/images/I/71lzcELSMIL._SX679_.jpg",
        "description": "Samsung Galaxy S24 with Snapdragon 8 Gen 3, 8GB RAM, 128GB storage, and Galaxy AI features.",
        "base_prices": {"amazon": 74999, "flipkart": 73999, "croma": 76999},
    },
    {
        "name": "Sony WH-1000XM5 Headphones",
        "slug": "sony-wh-1000xm5",
        "category": "electronics",
        "image_url": "https://m.media-amazon.com/images/I/61+btxzpfDL._SX679_.jpg",
        "description": "Sony WH-1000XM5 wireless noise-cancelling headphones with 30-hour battery life and multipoint connection.",
        "base_prices": {"amazon": 26990, "flipkart": 27490, "croma": 28990},
    },
    {
        "name": "MacBook Air M2",
        "slug": "macbook-air-m2",
        "category": "laptops",
        "image_url": "https://m.media-amazon.com/images/I/71f5Eu5lJSL._SX679_.jpg",
        "description": "Apple MacBook Air with M2 chip, 8GB RAM, 256GB SSD, 13.6-inch Liquid Retina display.",
        "base_prices": {"amazon": 99900, "flipkart": 98990, "croma": 104900},
    },
    {
        "name": 'Samsung 55" Crystal 4K TV',
        "slug": "samsung-55-crystal-4k-tv",
        "category": "televisions",
        "image_url": "https://m.media-amazon.com/images/I/71RGMSzr0BL._SX679_.jpg",
        "description": "Samsung 55-inch Crystal 4K UHD Smart TV with Dynamic Crystal Color and Gaming Hub.",
        "base_prices": {"amazon": 47990, "flipkart": 46990, "croma": 49990},
    },
    {
        "name": "boAt Rockerz 450",
        "slug": "boat-rockerz-450",
        "category": "electronics",
        "image_url": "https://m.media-amazon.com/images/I/61bK8mMOJfL._SX679_.jpg",
        "description": "boAt Rockerz 450 wireless Bluetooth on-ear headphones with 15-hour playback and padded ear cushions.",
        "base_prices": {"amazon": 1299, "flipkart": 1199, "croma": 1499},
    },
    {
        "name": "Dyson V15 Detect",
        "slug": "dyson-v15-detect",
        "category": "home_appliances",
        "image_url": "https://m.media-amazon.com/images/I/61nqJUPVBNL._SX679_.jpg",
        "description": "Dyson V15 Detect cordless vacuum cleaner with laser dust detection and LCD screen.",
        "base_prices": {"amazon": 62900, "flipkart": 61990, "croma": 64900},
    },
    {
        "name": "Nike Air Max 270",
        "slug": "nike-air-max-270",
        "category": "footwear",
        "image_url": "https://m.media-amazon.com/images/I/61kRrRViQ-L._UY695_.jpg",
        "description": "Nike Air Max 270 lifestyle sneakers with the tallest Air unit yet for all-day comfort.",
        "base_prices": {"amazon": 13995, "flipkart": 13495, "croma": None},
    },
    {
        "name": "Prestige Induction Cooktop",
        "slug": "prestige-induction-cooktop",
        "category": "kitchen",
        "image_url": "https://m.media-amazon.com/images/I/61LdUR7ESPL._SX679_.jpg",
        "description": "Prestige PIC 16.0+ 2000W Induction Cooktop with Indian menu options and automatic voltage regulator.",
        "base_prices": {"amazon": 2499, "flipkart": 2399, "croma": 2699},
    },
    {
        "name": "Kindle Paperwhite",
        "slug": "kindle-paperwhite",
        "category": "electronics",
        "image_url": "https://m.media-amazon.com/images/I/61PHJHGVyUL._SX679_.jpg",
        "description": "Amazon Kindle Paperwhite (16GB) with 6.8-inch display, adjustable warm light, and waterproof design.",
        "base_prices": {"amazon": 14999, "flipkart": 15499, "croma": 15999},
    },
]


# ---------------------------------------------------------------------------
# Coupon definitions
# ---------------------------------------------------------------------------

COUPONS = [
    # Amazon coupons
    {"platform": "amazon", "code": "SAVE10", "description": "Get 10% off on electronics", "discount_type": "percentage", "discount_value": 10, "min_order_value": 5000, "category": "electronics", "is_verified": True},
    {"platform": "amazon", "code": "FLAT500", "description": "Flat Rs.500 off on orders above Rs.3000", "discount_type": "flat", "discount_value": 500, "min_order_value": 3000, "category": None, "is_verified": True},
    {"platform": "amazon", "code": "NEWUSER", "description": "Rs.200 off for new users on first order", "discount_type": "flat", "discount_value": 200, "min_order_value": 1000, "category": None, "is_verified": True},
    {"platform": "amazon", "code": "WEEKEND20", "description": "20% off on weekends, max Rs.1000", "discount_type": "percentage", "discount_value": 20, "min_order_value": 2000, "category": None, "is_verified": False},
    {"platform": "amazon", "code": "MOBILE15", "description": "15% off on smartphones via Amazon app", "discount_type": "percentage", "discount_value": 15, "min_order_value": 10000, "category": "smartphones", "is_verified": True},
    {"platform": "amazon", "code": "HDFC1000", "description": "Rs.1000 instant discount with HDFC cards", "discount_type": "flat", "discount_value": 1000, "min_order_value": 15000, "category": None, "is_verified": True},
    {"platform": "amazon", "code": "CASHBACK5", "description": "5% cashback up to Rs.300 with Amazon Pay", "discount_type": "cashback", "discount_value": 5, "min_order_value": 2000, "category": None, "is_verified": True},
    {"platform": "amazon", "code": "PRIMESAVE", "description": "Extra 10% off for Prime members on laptops", "discount_type": "percentage", "discount_value": 10, "min_order_value": 30000, "category": "laptops", "is_verified": True},
    {"platform": "amazon", "code": "AUDIO20", "description": "20% off on headphones and speakers", "discount_type": "percentage", "discount_value": 20, "min_order_value": 1000, "category": "electronics", "is_verified": False},
    {"platform": "amazon", "code": "KITCHEN300", "description": "Flat Rs.300 off on kitchen appliances", "discount_type": "flat", "discount_value": 300, "min_order_value": 2000, "category": "kitchen", "is_verified": True},

    # Flipkart coupons
    {"platform": "flipkart", "code": "FLIP10", "description": "10% off on all electronics", "discount_type": "percentage", "discount_value": 10, "min_order_value": 5000, "category": "electronics", "is_verified": True},
    {"platform": "flipkart", "code": "SUPERVALUE", "description": "Flat Rs.750 off on orders above Rs.5000", "discount_type": "flat", "discount_value": 750, "min_order_value": 5000, "category": None, "is_verified": True},
    {"platform": "flipkart", "code": "FIRSTBUY", "description": "15% off for first-time Flipkart buyers", "discount_type": "percentage", "discount_value": 15, "min_order_value": 500, "category": None, "is_verified": True},
    {"platform": "flipkart", "code": "BIGBILLION", "description": "Extra 10% off during Big Billion Days", "discount_type": "percentage", "discount_value": 10, "min_order_value": 3000, "category": None, "is_verified": False},
    {"platform": "flipkart", "code": "AXIS1500", "description": "Rs.1500 off with Axis Bank credit cards", "discount_type": "flat", "discount_value": 1500, "min_order_value": 20000, "category": None, "is_verified": True},
    {"platform": "flipkart", "code": "TVDEAL", "description": "Flat Rs.3000 off on televisions above Rs.25000", "discount_type": "flat", "discount_value": 3000, "min_order_value": 25000, "category": "televisions", "is_verified": True},
    {"platform": "flipkart", "code": "SHOE500", "description": "Rs.500 off on footwear above Rs.2000", "discount_type": "flat", "discount_value": 500, "min_order_value": 2000, "category": "footwear", "is_verified": True},
    {"platform": "flipkart", "code": "SUPERCOINS", "description": "Extra 5% cashback via SuperCoins", "discount_type": "cashback", "discount_value": 5, "min_order_value": 1000, "category": None, "is_verified": False},
    {"platform": "flipkart", "code": "GADGET25", "description": "25% off on select gadgets, max Rs.2000", "discount_type": "percentage", "discount_value": 25, "min_order_value": 3000, "category": "electronics", "is_verified": True},
    {"platform": "flipkart", "code": "LAPTOP5K", "description": "Flat Rs.5000 off on laptops above Rs.50000", "discount_type": "flat", "discount_value": 5000, "min_order_value": 50000, "category": "laptops", "is_verified": True},

    # Croma coupons
    {"platform": "croma", "code": "CROMA10", "description": "10% off on all products at Croma", "discount_type": "percentage", "discount_value": 10, "min_order_value": 5000, "category": None, "is_verified": True},
    {"platform": "croma", "code": "CROMANEW", "description": "Rs.500 off for new Croma customers", "discount_type": "flat", "discount_value": 500, "min_order_value": 3000, "category": None, "is_verified": True},
    {"platform": "croma", "code": "FESTIVE15", "description": "15% off during festive season", "discount_type": "percentage", "discount_value": 15, "min_order_value": 10000, "category": None, "is_verified": False},
    {"platform": "croma", "code": "SBI2000", "description": "Rs.2000 instant discount with SBI cards", "discount_type": "flat", "discount_value": 2000, "min_order_value": 25000, "category": None, "is_verified": True},
    {"platform": "croma", "code": "APPLEFEST", "description": "Extra 5% off on Apple products", "discount_type": "percentage", "discount_value": 5, "min_order_value": 30000, "category": "laptops", "is_verified": True},
    {"platform": "croma", "code": "TVCROMA", "description": "Flat Rs.4000 off on Smart TVs", "discount_type": "flat", "discount_value": 4000, "min_order_value": 30000, "category": "televisions", "is_verified": True},
    {"platform": "croma", "code": "CASHBACK10", "description": "10% cashback up to Rs.1500 on select items", "discount_type": "cashback", "discount_value": 10, "min_order_value": 5000, "category": None, "is_verified": True},
    {"platform": "croma", "code": "HOME20", "description": "20% off on home appliances", "discount_type": "percentage", "discount_value": 20, "min_order_value": 5000, "category": "home_appliances", "is_verified": False},
    {"platform": "croma", "code": "CROMAPAY", "description": "Extra Rs.300 off with Croma Pay wallet", "discount_type": "flat", "discount_value": 300, "min_order_value": 2000, "category": None, "is_verified": True},
    {"platform": "croma", "code": "SUMMER25", "description": "25% off on summer essentials", "discount_type": "percentage", "discount_value": 25, "min_order_value": 3000, "category": "home_appliances", "is_verified": False},

    # Myntra coupons
    {"platform": "myntra", "code": "MYNTRA15", "description": "15% off on all footwear at Myntra", "discount_type": "percentage", "discount_value": 15, "min_order_value": 2000, "category": "footwear", "is_verified": True},
    {"platform": "myntra", "code": "STYLE500", "description": "Flat Rs.500 off on orders above Rs.2500", "discount_type": "flat", "discount_value": 500, "min_order_value": 2500, "category": None, "is_verified": True},
    {"platform": "myntra", "code": "EOSS30", "description": "Extra 30% off during End of Season Sale", "discount_type": "percentage", "discount_value": 30, "min_order_value": 1500, "category": None, "is_verified": True},
    {"platform": "myntra", "code": "SNKR20", "description": "20% off on sneakers and sports shoes", "discount_type": "percentage", "discount_value": 20, "min_order_value": 3000, "category": "footwear", "is_verified": True},
    {"platform": "myntra", "code": "NEWMYNTRA", "description": "Flat Rs.400 off for new Myntra users", "discount_type": "flat", "discount_value": 400, "min_order_value": 999, "category": None, "is_verified": True},
    {"platform": "myntra", "code": "MYNT10", "description": "10% cashback via Myntra Credit", "discount_type": "cashback", "discount_value": 10, "min_order_value": 2000, "category": None, "is_verified": False},
    {"platform": "myntra", "code": "PREMIUM25", "description": "Extra 25% off on premium brands", "discount_type": "percentage", "discount_value": 25, "min_order_value": 5000, "category": "footwear", "is_verified": True},
    {"platform": "myntra", "code": "FLAT700", "description": "Flat Rs.700 off on orders above Rs.3000", "discount_type": "flat", "discount_value": 700, "min_order_value": 3000, "category": None, "is_verified": False},
    {"platform": "myntra", "code": "KOTAK500", "description": "Rs.500 off with Kotak Mahindra Bank cards", "discount_type": "flat", "discount_value": 500, "min_order_value": 3000, "category": None, "is_verified": True},
    {"platform": "myntra", "code": "MYNTRAAPP", "description": "Extra 5% off when ordering via Myntra app", "discount_type": "percentage", "discount_value": 5, "min_order_value": 1000, "category": None, "is_verified": True},
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_price_history(
    base_price: float,
    days: int = 60,
    num_records: int = 45,
    volatility: float = 0.04,
) -> list[float]:
    """
    Generate a realistic price series using a random-walk algorithm.

    The walk includes occasional spikes (sale events) and gradual drifts
    so the resulting chart looks believable.
    """
    prices: list[float] = []
    current = base_price

    # Pick random day offsets, sorted, so timestamps are chronological
    day_offsets = sorted(random.sample(range(days), min(num_records, days)))

    for i, _ in enumerate(day_offsets):
        # Random walk step
        change_pct = random.gauss(0, volatility)

        # Occasional sale-event drop (roughly 10% of records)
        if random.random() < 0.10:
            change_pct = -random.uniform(0.05, 0.15)

        # Occasional price spike (roughly 5% of records)
        if random.random() < 0.05:
            change_pct = random.uniform(0.03, 0.10)

        current = current * (1 + change_pct)

        # Keep price within +-20% of base to stay realistic
        current = max(base_price * 0.80, min(base_price * 1.20, current))

        prices.append(round(current, 2))

    return prices, day_offsets


def build_price_records(
    product_id: str,
    base_prices: dict[str, float | None],
    now: datetime,
) -> list[dict]:
    """Return a list of price_record dicts ready for Supabase insert."""
    records: list[dict] = []
    platforms = {k: v for k, v in base_prices.items() if v is not None}

    for platform, base in platforms.items():
        num_records = random.randint(30, 60)
        prices, day_offsets = generate_price_history(
            base_price=base,
            days=60,
            num_records=num_records,
        )

        for price, day_offset in zip(prices, day_offsets):
            scraped_at = now - timedelta(
                days=(59 - day_offset),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )

            # original_price is the MRP -- higher than sale price
            markup = random.uniform(1.05, 1.35)
            original_price = round(price * markup, 2)

            product_url_map = {
                "amazon": f"https://www.amazon.in/dp/B0FAKE{random.randint(1000,9999)}",
                "flipkart": f"https://www.flipkart.com/product/p/itm{random.randint(100000,999999)}",
                "croma": f"https://www.croma.com/product/{random.randint(100000,999999)}",
            }

            records.append({
                "id": str(uuid.uuid4()),
                "product_id": product_id,
                "platform": platform,
                "price": price,
                "original_price": original_price,
                "currency": "INR",
                "product_url": product_url_map.get(platform, ""),
                "in_stock": random.random() > 0.05,  # 95% in stock
                "scraped_at": scraped_at.isoformat(),
            })

    return records


def build_coupon_records(now: datetime) -> list[dict]:
    """Convert the COUPONS list into records with proper dates and IDs."""
    records: list[dict] = []
    for coupon in COUPONS:
        # Most coupons started 10-30 days ago
        valid_from = now - timedelta(days=random.randint(10, 30))

        # About 15% of coupons are expired (for realism)
        if random.random() < 0.15:
            valid_until = now - timedelta(days=random.randint(1, 5))
        else:
            valid_until = now + timedelta(days=random.randint(5, 45))

        records.append({
            "id": str(uuid.uuid4()),
            "platform": coupon["platform"],
            "code": coupon["code"],
            "description": coupon["description"],
            "discount_type": coupon["discount_type"],
            "discount_value": coupon["discount_value"],
            "min_order_value": coupon["min_order_value"],
            "category": coupon["category"],
            "valid_from": valid_from.isoformat(),
            "valid_until": valid_until.isoformat(),
            "source_url": None,
            "is_verified": coupon["is_verified"],
        })

    return records


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------

def reset_data(db) -> None:
    """Delete all rows from seeded tables (price_records first due to FK)."""
    print("[reset] Deleting existing price_records ...")
    db.table("price_records").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("[reset] Deleting existing coupons ...")
    db.table("coupons").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("[reset] Deleting existing products ...")
    db.table("products").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("[reset] Done.\n")


def seed_products(db) -> dict[str, str]:
    """Insert products and return a mapping of slug -> id."""
    print("--- Seeding products ---")
    slug_to_id: dict[str, str] = {}

    for prod in PRODUCTS:
        product_id = str(uuid.uuid4())
        row = {
            "id": product_id,
            "name": prod["name"],
            "slug": prod["slug"],
            "category": prod["category"],
            "image_url": prod["image_url"],
            "description": prod["description"],
        }
        try:
            db.table("products").insert(row).execute()
            slug_to_id[prod["slug"]] = product_id
            print(f"  + {prod['name']}")
        except Exception as exc:
            print(f"  ! Failed to insert {prod['name']}: {exc}")

    print(f"  => {len(slug_to_id)} products seeded.\n")
    return slug_to_id


def seed_price_records(db, slug_to_id: dict[str, str]) -> int:
    """Generate and insert price records for every product/platform pair."""
    print("--- Seeding price records ---")
    now = datetime.utcnow()
    total = 0

    for prod in PRODUCTS:
        product_id = slug_to_id.get(prod["slug"])
        if product_id is None:
            continue

        records = build_price_records(product_id, prod["base_prices"], now)

        # Insert in batches of 50 to avoid payload limits
        batch_size = 50
        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            try:
                db.table("price_records").insert(batch).execute()
            except Exception as exc:
                print(f"  ! Batch insert failed for {prod['name']}: {exc}")

        total += len(records)
        print(f"  + {prod['name']}: {len(records)} records")

    print(f"  => {total} price records seeded.\n")
    return total


def seed_coupons(db) -> int:
    """Insert coupon records."""
    print("--- Seeding coupons ---")
    now = datetime.utcnow()
    records = build_coupon_records(now)

    # Insert in batches
    batch_size = 25
    inserted = 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        try:
            db.table("coupons").insert(batch).execute()
            inserted += len(batch)
        except Exception as exc:
            print(f"  ! Batch insert failed: {exc}")

    expired_count = sum(
        1 for r in records if datetime.fromisoformat(r["valid_until"]) < now
    )
    print(f"  => {inserted} coupons seeded ({expired_count} already expired).\n")
    return inserted


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the SmartBuy database with sample data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete all existing data before seeding.",
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        return

    print("==============================================")
    print("  SmartBuy Seed Data Script")
    print("==============================================")
    print(f"  Supabase URL : {settings.supabase_url[:40]}...")
    print()

    db = get_db()

    if args.reset:
        reset_data(db)

    slug_to_id = seed_products(db)
    seed_price_records(db, slug_to_id)
    seed_coupons(db)

    print("==============================================")
    print("  Seeding complete!")
    print("==============================================")


if __name__ == "__main__":
    main()
