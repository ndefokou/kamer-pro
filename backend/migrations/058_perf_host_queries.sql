-- Migration 058: Performance optimizations for host queries
-- This migration adds indexes specifically targeted at the slow host dashboard and reservations pages.

-- 1. Index for "Your Listing" page: fetches all listings for a specific host ordered by creation date.
-- Target handler: kamer_listings::get_my_listings
CREATE INDEX IF NOT EXISTS idx_listings_host_id_created_at 
  ON listings(host_id, created_at DESC);

-- 2. Index for Reservations page: fetches bookings for a specific host's listings.
-- Target handlers: kamer_bookings::get_today_bookings, kamer_bookings::get_upcoming_bookings
-- Also helps with calendar availability checks.
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id_check_in 
  ON bookings(listing_id, check_in DESC);

-- 3. Composite index for calendar pricing range queries.
-- Target handler: kamer_calendar::get_calendar
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_listing_date 
  ON calendar_pricing(listing_id, date);

-- 4. Analyze tables to ensure the query planner uses the new indexes effectively.
ANALYZE listings;
ANALYZE bookings;
ANALYZE calendar_pricing;
