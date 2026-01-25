-- Enforce single review per user per listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review_per_guest ON reviews(listing_id, guest_id);
