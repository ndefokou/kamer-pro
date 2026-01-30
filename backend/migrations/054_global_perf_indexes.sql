-- Global performance indexes for all pages

-- Improve amenity filtering
CREATE INDEX IF NOT EXISTS idx_listing_amenities_type ON listing_amenities(amenity_type);

-- Improve cover photo retrieval
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_cover ON listing_photos(listing_id, is_cover);

-- Improve address-based search (used in get_all_listings)
CREATE INDEX IF NOT EXISTS idx_listings_address_trgm ON listings USING GIN (address gin_trgm_ops);

-- Improve conversation lookup for specific listings
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);

-- Improve message ordering and unread counts
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

-- Improve wishlist lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_user_listing ON wishlists(user_id, listing_id);

-- Improve review lookup by listing and rating
CREATE INDEX IF NOT EXISTS idx_reviews_listing_created ON reviews(listing_id, created_at DESC);
