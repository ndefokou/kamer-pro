-- Migration to fix foreign key constraints in messages table
-- This allows cascading deletes when a user or conversation is removed

-- Drop existing foreign keys
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Add them back with ON DELETE CASCADE
ALTER TABLE messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
