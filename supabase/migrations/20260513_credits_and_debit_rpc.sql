-- 20260513_credits_and_debit_rpc.sql
--
-- Three things in one idempotent migration:
--
--   1. Add the split-balance columns to conversation_credits so the new
--      signup route and entitlement system can distinguish plan grants from
--      purchased top-ups.
--
--   2. Create debit_conversation_credits() — an atomic Postgres function
--      that drains granted credit first (if not expired), then purchased.
--      Called by recordApiUsage() after every Anthropic API call so the
--      balance reflects real spend.
--
--   3. Backfill existing clients with their plan's starting grant so they
--      don't boot up with a zero balance after the migration lands.
--
-- Safe to run repeatedly.

-- ── 1. Split balance columns ─────────────────────────────────────────────────

ALTER TABLE conversation_credits
  ADD COLUMN IF NOT EXISTS granted_balance_zar_cents   INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS granted_expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchased_balance_zar_cents INT          NOT NULL DEFAULT 0;

COMMENT ON COLUMN conversation_credits.granted_balance_zar_cents IS
  'Monthly plan grant. Drains first, resets on renewal. Never negative.';
COMMENT ON COLUMN conversation_credits.purchased_balance_zar_cents IS
  'Top-up balance (real money). Never expires. Drains after grant.';
COMMENT ON COLUMN conversation_credits.granted_expires_at IS
  'When the grant resets — normally equals subscriptions.current_period_end.';

-- ── 2. Atomic debit function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION debit_conversation_credits(
  p_client_id   BIGINT,
  p_amount_cents INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_granted    INT;
  v_purchased  INT;
  v_from_grant INT;
  v_from_purch INT;
BEGIN
  -- Lock the row for this client so concurrent calls don't double-debit.
  SELECT granted_balance_zar_cents,
         purchased_balance_zar_cents
  INTO   v_granted, v_purchased
  FROM   conversation_credits
  WHERE  client_id = p_client_id
  FOR UPDATE;

  -- Nothing to debit if the client has no credits row yet.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Drain granted first (clamp at 0).
  v_from_grant := LEAST(p_amount_cents, GREATEST(0, v_granted));
  -- Remainder comes from purchased (clamp at 0).
  v_from_purch := LEAST(p_amount_cents - v_from_grant, GREATEST(0, v_purchased));

  UPDATE conversation_credits
  SET
    granted_balance_zar_cents   = v_granted   - v_from_grant,
    purchased_balance_zar_cents = v_purchased - v_from_purch,
    total_spent_zar_cents       = COALESCE(total_spent_zar_cents, 0) + p_amount_cents
  WHERE client_id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION debit_conversation_credits(BIGINT, INT) TO service_role;

-- ── 3. Backfill existing clients ─────────────────────────────────────────────
-- Sets granted_balance_zar_cents to the plan's starting grant for any client
-- whose balance is still 0 (un-migrated). Amounts match PLAN_CONFIG in
-- src/lib/plan.ts — update both if plan grants ever change.
--
-- granted_expires_at is set to the first day of next month so the grant is
-- valid for the remainder of the current billing cycle.

UPDATE conversation_credits cc
SET
  granted_balance_zar_cents = CASE c.plan
    WHEN 'trial'      THEN  2000   -- R20
    WHEN 'starter'    THEN  8000   -- R80
    WHEN 'pro'        THEN 20000   -- R200
    WHEN 'founders'   THEN 25000   -- R250
    WHEN 'business'   THEN 50000   -- R500
    WHEN 'enterprise' THEN 120000  -- R1,200
    WHEN 'premium'    THEN 28000   -- R280 (legacy)
    ELSE                   2000    -- fallback: trial amount
  END,
  granted_expires_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM clients c
WHERE c.id = cc.client_id
  AND cc.granted_balance_zar_cents = 0;
