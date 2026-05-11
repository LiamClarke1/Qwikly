-- 20260513_payment_failures.sql
--
-- Tracks failed PayFast charges (renewals primarily) for the dunning cron
-- to escalate. One row per failure event. Resolved when a subsequent charge
-- succeeds or the customer updates payment method.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS payment_failures (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id          BIGINT       NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  payfast_payment_id       UUID         REFERENCES payfast_payments(id) ON DELETE SET NULL,
  failed_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reason                   TEXT,
  retry_count              INT          NOT NULL DEFAULT 0,
  resolved_at              TIMESTAMPTZ,
  notification_sent_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_failures_unresolved
  ON payment_failures (failed_at)
  WHERE resolved_at IS NULL;

ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_failures_owner_read ON payment_failures;
CREATE POLICY payment_failures_owner_read ON payment_failures
  FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

COMMENT ON TABLE payment_failures IS 'Failed PayFast charges, read by dunning cron.';
