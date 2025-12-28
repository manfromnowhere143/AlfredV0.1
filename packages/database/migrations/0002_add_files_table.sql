-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Add Files Table
-- Run this in your database or use drizzle-kit push
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Basic info
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Type info
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  extension TEXT,
  
  -- Size info
  size INTEGER NOT NULL,
  
  -- Media dimensions
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  
  -- Previews
  thumbnail_url TEXT,
  preview_url TEXT,
  
  -- Processing status
  status TEXT DEFAULT 'ready',
  error TEXT,
  
  -- Relations
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS files_user_idx ON files(user_id);
CREATE INDEX IF NOT EXISTS files_conv_idx ON files(conversation_id);
CREATE INDEX IF NOT EXISTS files_message_idx ON files(message_id);
CREATE INDEX IF NOT EXISTS files_status_idx ON files(status);

-- Add file_ids column to messages table if not exists
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_ids JSONB DEFAULT '[]'::jsonb;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USEFUL QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get all files for a conversation
-- SELECT * FROM files WHERE conversation_id = 'xxx' ORDER BY created_at;

-- Get files with their messages
-- SELECT f.*, m.content as message_content 
-- FROM files f 
-- LEFT JOIN messages m ON f.message_id = m.id 
-- WHERE f.conversation_id = 'xxx';

-- Get total storage used by user
-- SELECT user_id, SUM(size) as total_bytes 
-- FROM files 
-- GROUP BY user_id;

-- Clean up orphaned files (no conversation)
-- DELETE FROM files 
-- WHERE conversation_id IS NULL 
-- AND created_at < NOW() - INTERVAL '24 hours';