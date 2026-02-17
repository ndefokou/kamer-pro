-- Critical performance indexes to fix slow queries
-- This migration addresses the main bottlenecks in listing queries

-- 1. Composite index for the main get_all_listings query
-- This speeds up: WHERE status = 'published' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_published_created 
  ON listings(status, created_at DESC) 
  WHERE status = 'published';

-- 2. Partial index for published listings with price filtering
-- This speeds up price range queries on published listings
CREATE INDEX IF NOT EXISTS idx_listings_published_price 
  ON listings(price_per_night) 
  WHERE status = 'published' AND price_per_night IS NOT NULL;

-- 3. Partial index for published listings with guest capacity
-- This speeds up guest filtering on published listings
CREATE INDEX IF NOT EXISTS idx_listings_published_guests 
  ON listings(max_guests) 
  WHERE status = 'published' AND max_guests IS NOT NULL;

-- 4. Covering index for photo batch queries
-- This speeds up the ranked photo query in get_all_listings
CREATE INDEX IF NOT EXISTS idx_listing_photos_batch_query 
  ON listing_photos(listing_id, is_cover DESC, display_order, id);

-- 5. Index for faster host profile lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
  ON user_profiles(user_id);

-- 6. Composite index for bookings availability check
-- This speeds up the unavailable dates query
CREATE INDEX IF NOT EXISTS idx_bookings_availability 
  ON bookings(listing_id, status, check_out) 
  WHERE status = 'confirmed';

-- 7. Index for calendar pricing availability
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_availability 
  ON calendar_pricing(listing_id, date, is_available) 
  WHERE is_available = FALSE;

-- 8. Analyze tables to update statistics for query planner
ANALYZE listings;
ANALYZE listing_photos;
ANALYZE bookings;
ANALYZE calendar_pricing;
ANALYZE user_profiles;
