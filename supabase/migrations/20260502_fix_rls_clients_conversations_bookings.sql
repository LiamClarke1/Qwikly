-- Migration: 20260502_fix_rls_clients_conversations_bookings.sql
-- CRITICAL SECURITY FIX: Enable RLS on clients, conversations, and bookings tables.
-- Without this, any authenticated user can read every other user's data.

-- ── clients ──────────────────────────────────────────────────────────────────

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_own" ON clients;
DROP POLICY IF EXISTS "clients_insert_own" ON clients;
DROP POLICY IF EXISTS "clients_update_own" ON clients;

CREATE POLICY "clients_select_own"
  ON clients FOR SELECT
  USING (auth_user_id = auth.uid()::text);

CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT
  WITH CHECK (auth_user_id = auth.uid()::text);

CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE
  USING (auth_user_id = auth.uid()::text);

-- ── conversations ─────────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_own" ON conversations;

CREATE POLICY "conversations_own"
  ON conversations FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- ── bookings ──────────────────────────────────────────────────────────────────

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_own" ON bookings;

CREATE POLICY "bookings_own"
  ON bookings FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );
