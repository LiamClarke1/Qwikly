-- 20260513_subscriptions_billing_columns.sql
--
-- Adds the PayFast and billing-anchor columns to subscriptions that the
-- end-to-end billing design requires. See:
--   docs/superpowers/specs/2026-05-11-end-to-end-billing-design.md
--
-- Idempotent. Safe to re-run.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payfast_token TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_plan         TEXT,
  ADD COLUMN IF NOT EXISTS proration_credit_zar_cents INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions (current_period_end)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_plan
  ON subscriptions (pending_plan)
  WHERE pending_plan IS NOT NULL;

COMMENT ON COLUMN subscriptions.payfast_token IS
  'PayFast subscription token for ad-hoc charges and recurring renewals.';
COMMENT ON COLUMN subscriptions.pending_plan IS
  'Plan tier to switch to at next renewal (downgrade flow).';
