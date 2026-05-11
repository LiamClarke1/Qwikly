-- 20260513_conversation_credits_split.sql
--
-- Splits conversation_credits.balance_zar_cents into two ledgers:
--   - granted_balance_zar_cents: monthly plan grant, resets on renewal
--   - purchased_balance_zar_cents: top-ups, never expire (real money)
--
-- Backfills purchased_balance from existing balance so no top-up money is
-- lost. The legacy balance_zar_cents column is kept for one release of
-- rollback safety and dropped in a Phase 2 cleanup migration.
--
-- Idempotent. Safe to re-run.

ALTER TABLE conversation_credits
  ADD COLUMN IF NOT EXISTS granted_balance_zar_cents   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS granted_expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchased_balance_zar_cents INT NOT NULL DEFAULT 0;

-- Backfill: existing balance becomes purchased (it was customer-paid top-up money).
UPDATE conversation_credits
  SET purchased_balance_zar_cents = balance_zar_cents
  WHERE purchased_balance_zar_cents = 0
    AND balance_zar_cents > 0;

COMMENT ON COLUMN conversation_credits.granted_balance_zar_cents IS
  'Plan grant balance, resets on renewal. Drains first.';
COMMENT ON COLUMN conversation_credits.purchased_balance_zar_cents IS
  'Top-up balance, never expires. Drains after granted.';
COMMENT ON COLUMN conversation_credits.granted_expires_at IS
  'When the granted balance resets, normally = subscriptions.current_period_end.';
