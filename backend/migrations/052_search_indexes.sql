-- Enable trigram indexes for fast LIKE/I18N searches
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_trgm extension not available or insufficient privileges; skipping';
  WHEN undefined_file THEN
    RAISE NOTICE 'pg_trgm extension not found; skipping';
END $$;

-- Composite index to speed listing feeds ordered by recency
CREATE INDEX IF NOT EXISTS idx_listings_status_created_at
  ON listings(status, created_at DESC);

-- Filters used on marketplace
CREATE INDEX IF NOT EXISTS idx_listings_price_per_night ON listings(price_per_night);
CREATE INDEX IF NOT EXISTS idx_listings_max_guests ON listings(max_guests);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_host_status_created_at ON listings(host_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_host_created_at ON listings(host_id, created_at DESC);

-- Trigram indexes for text search/filtering
CREATE INDEX IF NOT EXISTS idx_listings_city_trgm ON listings USING GIN (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_description_trgm ON listings USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_country_trgm ON listings USING GIN (country gin_trgm_ops);
