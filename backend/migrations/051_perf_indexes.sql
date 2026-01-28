-- Performance indexes to speed up common queries

-- Speed up bookings selection by listing/status/date (used in availability and unions)
CREATE INDEX IF NOT EXISTS idx_bookings_listing_status_checkout
  ON bookings(listing_id, status, check_out);

-- Speed up host-blocked date lookups
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_listing_avail_date
  ON calendar_pricing(listing_id, is_available, date);

-- Speed up cover photo and ordered photo retrievals
CREATE INDEX IF NOT EXISTS idx_listing_photos_cover_order
  ON listing_photos(listing_id, is_cover, display_order, id);
