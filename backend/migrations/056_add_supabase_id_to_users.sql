-- Add supabase_id to users table to support Supabase Auth mapping
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_id);
