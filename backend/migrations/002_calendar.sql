-- Calendar pricing table for date-specific pricing and availability
CREATE TABLE IF NOT EXISTS calendar_pricing (
    id SERIAL PRIMARY KEY,
    listing_id TEXT NOT NULL,
    date DATE NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    UNIQUE(listing_id, date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_pricing_listing_id ON calendar_pricing(listing_id);
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_date ON calendar_pricing(date);

-- Listing settings for pricing and availability rules
CREATE TABLE IF NOT EXISTS listing_settings (
    id SERIAL PRIMARY KEY,
    listing_id TEXT NOT NULL UNIQUE,
    -- Pricing
    base_price DOUBLE PRECISION,
    weekend_price DOUBLE PRECISION,
    smart_pricing_enabled BOOLEAN DEFAULT FALSE,
    weekly_discount DOUBLE PRECISION DEFAULT 0,
    monthly_discount DOUBLE PRECISION DEFAULT 0,
    -- Availability
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER DEFAULT 365,
    advance_notice TEXT DEFAULT 'same_day',
    same_day_cutoff_time TEXT DEFAULT '12:00',
    preparation_time TEXT DEFAULT 'none',
    availability_window INTEGER DEFAULT 12,
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_settings_listing_id ON listing_settings(listing_id);
