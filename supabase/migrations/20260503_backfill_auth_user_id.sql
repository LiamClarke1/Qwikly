-- Migration: 20260503_backfill_auth_user_id.sql
-- Ensures auth_user_id column exists on clients and is indexed.
-- Backfills any rows created before the column existed by matching
-- against the businesses table (which stores user_id from auth.users).

ALTER TABLE clients ADD COLUMN IF NOT EXISTS auth_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);

-- Backfill rows that have no auth_user_id by matching to businesses via contact email
UPDATE clients c
SET auth_user_id = b.user_id::text
FROM businesses b
WHERE c.auth_user_id IS NULL
  AND (
    b.contact_email = c.client_email
    OR b.contact_email = c.notification_email
    OR b.contact_email = c.billing_email
    OR b.contact_email = c.support_email
  );
