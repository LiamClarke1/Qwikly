-- 20260513_subscriptions_client_id.sql
--
-- The /api/signup handler selects "id, client_id" from subscriptions and
-- then wires the subscription → client foreign key so applySubscriptionToClient
-- can read clients.id. Without this column the upsert+select fails with a
-- PostgREST column-not-found error, which the signup route catches as
-- "account_setup_failed" and returns to the browser as "Something went wrong."
--
-- Idempotent. Safe to run repeatedly.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id
  ON subscriptions (client_id)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN subscriptions.client_id IS
  'FK to clients.id — wired during signup so applySubscriptionToClient can locate the derived row.';
