-- Per-tenant API usage tracking + conversation credit wallet (2026-05-10)
--
-- Goal: every Anthropic API call writes a row tagged with the client_id that
-- triggered it, so we can show the owner exactly what their tenant costs and
-- bill them at month end. No tenant ever pays for another tenant's
-- conversations. Each client gets their own credit wallet from day one.
--
-- This migration is the foundation. Phase 1 ships data collection only.
-- Phase 2 adds the dashboard widget. Phase 3 adds top-up flow + overage
-- billing. The schema below supports all three phases with no further
-- ALTERs.

-- ─────────────────────────────────────────────────────────────────────────
-- api_usage
-- One row per LLM call. The chat route inserts on every messages.create
-- response, capturing tokens, costs, and the conversation that triggered it.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_usage (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                   BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- conversations.id is BIGINT in this database (the early v1 schema used
  -- UUID, recent migrations standardised on BIGINT). FK matches that.
  conversation_id             BIGINT       REFERENCES conversations(id) ON DELETE SET NULL,
  occurred_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Anthropic returns these on every messages.create response.
  input_tokens                INT          NOT NULL DEFAULT 0,
  output_tokens               INT          NOT NULL DEFAULT 0,
  cache_creation_tokens       INT          NOT NULL DEFAULT 0,
  cache_read_tokens           INT          NOT NULL DEFAULT 0,
  -- Computed at insert time, in ZAR cents (rounded up to the next cent).
  -- wholesale = our actual Anthropic bill for this call.
  -- retail = what we charge the client (wholesale × markup factor).
  wholesale_cost_zar_cents    INT          NOT NULL DEFAULT 0,
  retail_cost_zar_cents       INT          NOT NULL DEFAULT 0,
  -- First day of the month this call falls in (UTC). Pre-computed so
  -- aggregation queries don't have to date_trunc on every row at read time.
  billing_period              DATE         NOT NULL DEFAULT date_trunc('month', now())::date,
  -- Set TRUE on Qwikly's own marketing site (client_id = 1) and any other
  -- internal tenants. Internal usage is tracked for visibility but never
  -- billed back to anyone.
  is_internal                 BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Free-text marker for which surface triggered the call. Helps us split
  -- web-chat usage from any future channels (WhatsApp, voice, etc).
  source                      TEXT         NOT NULL DEFAULT 'web_chat'
);

CREATE INDEX IF NOT EXISTS idx_api_usage_client_period   ON api_usage (client_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_api_usage_conversation    ON api_usage (conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_occurred_at     ON api_usage (occurred_at);

COMMENT ON TABLE  api_usage IS 'Every Anthropic API call, tagged to the client_id that triggered it. Used for per-tenant usage display and end-of-month billing.';
COMMENT ON COLUMN api_usage.is_internal IS 'TRUE for Qwikly own-site (client_id=1) and other internal tenants. Internal rows are excluded from client billing aggregations.';

-- RLS: only the service role (used by chat route) writes, only the tenant
-- owner reads their own rows. Belt-and-braces against any frontend leak.
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_usage_owner_read ON api_usage;
CREATE POLICY api_usage_owner_read ON api_usage
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- service_role bypasses RLS so the chat route writes without restriction.

-- ─────────────────────────────────────────────────────────────────────────
-- conversation_credits
-- Per-tenant prepaid credit wallet. Top-ups go in, overage usage comes out.
-- Each client gets one row at signup (auto-created via trigger below).
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversation_credits (
  client_id                  BIGINT       PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  -- Current spendable credit balance in ZAR cents. Top-ups add, overage
  -- conversations subtract retail_cost_zar_cents.
  balance_zar_cents          INT          NOT NULL DEFAULT 0,
  -- Lifetime totals for analytics, never decremented.
  total_topped_up_zar_cents  BIGINT       NOT NULL DEFAULT 0,
  total_spent_zar_cents      BIGINT       NOT NULL DEFAULT 0,
  -- Owner's choice for what happens when balance hits zero AND they're
  -- past the plan's conversationsIncluded for the month.
  --   'pause'   = stop responding to new visitors until top-up or next month
  --               (default, safer)
  --   'overage' = keep responding, accrue an end-of-month overage charge on
  --               the Paystack subscription
  zero_balance_behaviour     TEXT         NOT NULL DEFAULT 'pause'
                                          CHECK (zero_balance_behaviour IN ('pause', 'overage')),
  updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE conversation_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_credits_owner_read ON conversation_credits;
CREATE POLICY conversation_credits_owner_read ON conversation_credits
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS conversation_credits_owner_update ON conversation_credits;
CREATE POLICY conversation_credits_owner_update ON conversation_credits
  FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- credit_topups
-- Audit trail of every top-up purchase. Phase 3 will write to this when
-- Paystack confirms a credit-pack payment. Created now so the schema is
-- in place from day one.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_topups (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_zar_cents         INT          NOT NULL,
  paystack_reference       TEXT,
  source                   TEXT         NOT NULL DEFAULT 'paystack'
                                        CHECK (source IN ('paystack', 'manual_admin', 'plan_signup_bonus')),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  note                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_credit_topups_client_created ON credit_topups (client_id, created_at DESC);

ALTER TABLE credit_topups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_topups_owner_read ON credit_topups;
CREATE POLICY credit_topups_owner_read ON credit_topups
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-provision conversation_credits row on every new client INSERT.
-- Means owners never have to "set up" the tracker, it's there from signup.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ensure_conversation_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO conversation_credits (client_id, balance_zar_cents, zero_balance_behaviour)
  VALUES (NEW.id, 0, 'pause')
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_after_insert_credits ON clients;
CREATE TRIGGER clients_after_insert_credits
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION ensure_conversation_credits();

-- Backfill existing clients so the table is consistent after this migration.
INSERT INTO conversation_credits (client_id, balance_zar_cents, zero_balance_behaviour)
SELECT id, 0, 'pause' FROM clients
ON CONFLICT (client_id) DO NOTHING;
