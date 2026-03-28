-- SmartBuy Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table (canonical product info)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    category TEXT,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price records from different platforms
CREATE TABLE price_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2),
    currency TEXT DEFAULT 'INR',
    product_url TEXT,
    in_stock BOOLEAN DEFAULT TRUE,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast price history queries
CREATE INDEX idx_price_records_product_platform ON price_records(product_id, platform, scraped_at DESC);

-- Price predictions
CREATE TABLE price_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    predicted_price DECIMAL(12, 2),
    predicted_date DATE,
    confidence_score DECIMAL(3, 2),
    model_used TEXT DEFAULT 'linear_regression',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons and deals
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL,
    code TEXT,
    description TEXT NOT NULL,
    discount_type TEXT,
    discount_value DECIMAL(10, 2),
    min_order_value DECIMAL(10, 2),
    category TEXT,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    source_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, code)
);

-- User price alerts
CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    target_price DECIMAL(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User search history
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alerts"
    ON price_alerts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own search history"
    ON search_history FOR ALL
    USING (auth.uid() = user_id);

-- Public read access for products, prices, coupons
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for products"
    ON products FOR SELECT USING (true);

CREATE POLICY "Service role can manage products"
    ON products FOR ALL
    USING (true);

CREATE POLICY "Public read access for price_records"
    ON price_records FOR SELECT USING (true);

CREATE POLICY "Service role can manage price_records"
    ON price_records FOR ALL
    USING (true);

CREATE POLICY "Public read access for price_predictions"
    ON price_predictions FOR SELECT USING (true);

CREATE POLICY "Service role can manage price_predictions"
    ON price_predictions FOR ALL
    USING (true);

CREATE POLICY "Public read access for coupons"
    ON coupons FOR SELECT USING (true);

CREATE POLICY "Service role can manage coupons"
    ON coupons FOR ALL
    USING (true);
