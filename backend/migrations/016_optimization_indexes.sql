-- Optimization indexes for host section

-- Improve primary photo selection performance
CREATE INDEX IF NOT EXISTS idx_listing_photos_optimized 
ON listing_photos(listing_id, is_cover DESC, display_order, id);

-- Improve booking lookup by check-in date and status (common for host 'today' and 'upcoming' views)
CREATE INDEX IF NOT EXISTS idx_bookings_host_view 
ON bookings(status, check_in);

-- Composite index for listing ownership checks which are frequent in the calendar and editor sections
CREATE INDEX IF NOT EXISTS idx_listings_id_host_id 
ON listings(id, host_id);
