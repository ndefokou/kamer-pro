-- Add composite index for faster publish/unpublish operations
-- This speeds up queries like: SELECT * FROM listings WHERE id = $1 AND host_id = $2

-- Composite index on (id, host_id) for ownership verification
CREATE INDEX IF NOT EXISTS idx_listings_id_host 
  ON listings(id, host_id);

-- Index on (host_id, status) for faster "my listings" queries
CREATE INDEX IF NOT EXISTS idx_listings_host_status 
  ON listings(host_id, status);

-- Index on status for filtering published listings
CREATE INDEX IF NOT EXISTS idx_listings_status 
  ON listings(status) 
  WHERE status = 'published';
