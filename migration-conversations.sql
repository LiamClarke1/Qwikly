-- Qwikly — core messaging tables
-- Creates: conversations, messages_log, bookings
-- Safe to re-run (IF NOT EXISTS throughout)
-- Run in Supabase SQL editor

-- ────────────────────────────────────────────────────────────
-- 1. conversations
-- One row per customer thread. Webhook upserts into this.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  customer_name   text,
  customer_phone  text NOT NULL,
  channel         text NOT NULL DEFAULT 'whatsapp',  -- 'whatsapp' | 'email'
  status          text NOT NULL DEFAULT 'active',    -- 'active' | 'escalated' | 'completed'
  ai_paused       boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_client   ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone    ON conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_updated  ON conversations(updated_at DESC);

-- ────────────────────────────────────────────────────────────
-- 2. messages_log
-- Every inbound/outbound message, keyed to a conversation.
-- role: 'customer' | 'assistant' | 'owner'
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages_log (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role             text NOT NULL,
  content          text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages_log(conversation_id, created_at);

-- ────────────────────────────────────────────────────────────
-- 3. bookings
-- Created automatically when the AI extracts booking details.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  customer_name    text,
  customer_phone   text NOT NULL,
  job_type         text,
  area             text,
  booking_datetime timestamptz,
  status           text NOT NULL DEFAULT 'booked',  -- 'booked' | 'completed' | 'cancelled' | 'no-show'
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client  ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_phone   ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_date    ON bookings(booking_datetime);

-- ────────────────────────────────────────────────────────────
-- 4. RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;

-- Conversations: read/write own client's rows
DROP POLICY IF EXISTS "conversations_rw_own" ON conversations;
CREATE POLICY "conversations_rw_own" ON conversations
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- messages_log: access via parent conversation ownership
DROP POLICY IF EXISTS "messages_log_rw_own" ON messages_log;
CREATE POLICY "messages_log_rw_own" ON messages_log
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN clients cl ON cl.id = c.client_id
      WHERE cl.auth_user_id = auth.uid()::text
    )
  );

-- Bookings: read/write own client's rows
DROP POLICY IF EXISTS "bookings_rw_own" ON bookings;
CREATE POLICY "bookings_rw_own" ON bookings
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. Service-role bypass (webhook uses service role key)
-- Supabase service role bypasses RLS by default — no extra
-- policy needed. The above policies cover dashboard queries.
-- ────────────────────────────────────────────────────────────
