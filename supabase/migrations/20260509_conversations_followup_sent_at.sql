-- Tracks when the ghosted-lead follow-up email has been sent for a conversation.
-- Used by /api/cron/ghosted-followup to make sure each ghosted visitor is
-- nudged at most once.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz;

-- Partial index keeps the cron query fast: only the rows the job ever scans.
CREATE INDEX IF NOT EXISTS idx_conversations_ghosted_followup_pending
  ON conversations(updated_at)
  WHERE follow_up_sent_at IS NULL
    AND customer_email IS NOT NULL
    AND is_lead = false;
