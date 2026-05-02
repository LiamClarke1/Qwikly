-- Add is_top_up flag to conversations for over-cap Pro lead tracking
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_top_up BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_top_up ON conversations(client_id, is_top_up) WHERE is_top_up = TRUE;
