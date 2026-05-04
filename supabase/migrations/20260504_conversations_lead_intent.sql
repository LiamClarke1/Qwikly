-- Migration: 20260504_conversations_lead_intent.sql
-- Adds is_lead flag (contact captured) and booking_intent flag (visitor committed to a booking/call)
-- to the conversations table.
--
-- is_lead: true when phone or email has been captured (replaces status='lead' for cap counting)
-- booking_intent: true when the visitor explicitly committed to a callback, booking, or signup

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_lead       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS booking_intent BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: existing conversations with status='lead' are real leads
UPDATE conversations SET is_lead = TRUE WHERE status = 'lead' AND is_lead = FALSE;

-- Index for the monthly cap query (client_id + is_lead + created_at)
CREATE INDEX IF NOT EXISTS idx_conversations_is_lead
  ON conversations(client_id, is_lead, created_at)
  WHERE is_lead = TRUE;

-- Index for booking intent filtering in the leads dashboard
CREATE INDEX IF NOT EXISTS idx_conversations_booking_intent
  ON conversations(client_id, booking_intent)
  WHERE booking_intent = TRUE;
