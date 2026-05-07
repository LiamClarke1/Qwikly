-- Qwikly — reliability fixes
-- Run in Supabase SQL editor. Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout).

-- ────────────────────────────────────────────────────────────
-- 1. automation_logs
-- Was only in a source-code comment, never migrated. Every
-- automation run was crashing at the INSERT into this table.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_logs (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id  uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  source_id      text NOT NULL,
  fired_at       timestamptz DEFAULT now(),
  status         text NOT NULL DEFAULT 'completed',
  error_message  text,
  UNIQUE (automation_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation
  ON automation_logs(automation_id);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_logs_rw_own" ON automation_logs;
CREATE POLICY "automation_logs_rw_own" ON automation_logs
  FOR ALL USING (
    automation_id IN (
      SELECT id FROM automations
      WHERE client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 2. bookings — missing columns
-- customer_email was read/written by the app but never existed.
-- service_price, calendar_synced, confirmation_sent added for
-- proper revenue tracking and async sync observability.
-- ────────────────────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email    text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_price     numeric(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calendar_synced   boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_sent boolean NOT NULL DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 3. UNIQUE constraint on clients.whatsapp_number
-- Prevents .single() from crashing if a number is duplicated,
-- and blocks bad data at insert time.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_whatsapp_number_unique'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_whatsapp_number_unique UNIQUE (whatsapp_number);
  END IF;
END$$;

-- ────────────────────────────────────────────────────────────
-- 4. Fix contact upsert trigger
-- Was firing on INSERT OR UPDATE — every updated_at bump on a
-- conversation triggered an unnecessary upsert. Change to
-- INSERT only.
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_conversation_upsert_contact ON conversations;
CREATE TRIGGER trg_conversation_upsert_contact
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION fn_upsert_contact_from_conversation();
