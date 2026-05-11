-- 20260511_outbound_v1.sql
-- Outbound Pipeline v1: products gating, per-tier daily quota, pipeline
-- data-cost tracking, delivery batch tagging on prospects.
--
-- See docs/superpowers/specs/2026-05-11-outbound-icp-capture-design.md.

-- ─── Product gating on clients ───────────────────────────────────────────
-- Every existing tenant defaults to inbound-only. Outbound access is granted
-- explicitly by the signup flow when a Pipeline plan is purchased.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS products              text[] NOT NULL DEFAULT ARRAY['inbound']::text[],
  ADD COLUMN IF NOT EXISTS pipeline_daily_quota  int    NOT NULL DEFAULT 3;

COMMENT ON COLUMN clients.products IS
  'Which Qwikly products this tenant has purchased. Allowed values: inbound, outbound. Drives UI gating.';
COMMENT ON COLUMN clients.pipeline_daily_quota IS
  'How many prospects the daily trickle cron generates for this tenant. 3 for Pipeline Lite, 8 for Pipeline Pro.';

-- ─── pipeline_api_usage ──────────────────────────────────────────────────
-- Mirrors the api_usage shape from 20260510_api_usage_tracking.sql, but
-- request-based (not token-based). Captures Google Places + Hunter spend
-- per tenant for usage display and end-of-month overage billing.
CREATE TABLE IF NOT EXISTS pipeline_api_usage (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  occurred_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  provider                 TEXT         NOT NULL,
  endpoint                 TEXT         NOT NULL,
  unit_count               INT          NOT NULL DEFAULT 1,
  wholesale_cost_zar_cents INT          NOT NULL DEFAULT 0,
  billing_period           DATE         NOT NULL DEFAULT date_trunc('month', now())::date,
  is_internal              BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_api_usage_client_period
  ON pipeline_api_usage (client_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_pipeline_api_usage_occurred_at
  ON pipeline_api_usage (occurred_at);

COMMENT ON TABLE pipeline_api_usage IS
  'Per-tenant cost ledger for Pipeline scraping/enrichment APIs (Google Places, Hunter). Service role writes, owner reads.';

-- RLS: only the service role (used by enrichment + cron) writes, only the
-- tenant owner reads their own rows. Matches the api_usage_owner_read
-- pattern from 20260510_api_usage_tracking.sql.
ALTER TABLE pipeline_api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_api_usage_owner_read ON pipeline_api_usage;
CREATE POLICY pipeline_api_usage_owner_read ON pipeline_api_usage
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- ─── Delivery batch tagging on prospects ─────────────────────────────────
-- Tags each prospect with the date it was delivered to the tenant and the
-- kind of batch (wizard first batch vs scheduled trickle). Drives the
-- dashboard's "Today's N prospects" view.
ALTER TABLE pipeline_prospects
  ADD COLUMN IF NOT EXISTS delivery_batch_date date,
  ADD COLUMN IF NOT EXISTS delivery_batch_kind text;

CREATE INDEX IF NOT EXISTS idx_pipeline_prospects_client_batch
  ON pipeline_prospects (client_id, delivery_batch_date);

COMMENT ON COLUMN pipeline_prospects.delivery_batch_date IS
  'The date this prospect was delivered to the tenant. Drives the dashboard "Today''s N prospects" view.';
COMMENT ON COLUMN pipeline_prospects.delivery_batch_kind IS
  'first_batch = wizard onboarding batch of 5; daily_trickle = scheduled cron batch.';
