-- Drop existing foreign keys if they have known names or just use the columns
-- Since they were created without explicit names, PostgreSQL likely named them:
-- conversations_listing_id_fkey
-- conversations_guest_id_fkey
-- conversations_host_id_fkey

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_listing_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_guest_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_host_id_fkey;

ALTER TABLE conversations
ADD CONSTRAINT conversations_listing_id_fkey
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE conversations
ADD CONSTRAINT conversations_guest_id_fkey
FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE conversations
ADD CONSTRAINT conversations_host_id_fkey
FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE;
