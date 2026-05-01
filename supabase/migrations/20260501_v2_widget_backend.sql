-- Migration: 20260501_v2_widget_backend.sql
-- Creates the core v2 widget backend database schema:
-- - businesses: Multi-tenant business accounts with branding config
-- - leads: Captured visitor contacts from widget conversations
-- - subscriptions: Stripe subscription tracking per user
-- - usage_periods: Lead capture tracking across billing cycles
-- - lead_rate_windows: Per-minute rate limiting for widget API
-- - increment_rate_window() RPC function for atomic rate limit checks
-- Includes full RLS policies for multi-tenant data isolation

-- ── Businesses ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  industry TEXT,
  contact_email TEXT NOT NULL DEFAULT '',
  accent_colour TEXT NOT NULL DEFAULT '#E85A2C',
  greeting TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',
  qualifying_questions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  api_key TEXT NOT NULL UNIQUE DEFAULT ('qw_' || encode(gen_random_bytes(24), 'hex')),
  branding_removed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_user_id_idx ON businesses(user_id);
CREATE INDEX IF NOT EXISTS businesses_api_key_idx ON businesses(api_key);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_business" ON businesses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "owners_update_business" ON businesses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Leads ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT,
  contact TEXT NOT NULL,
  need TEXT,
  preferred_time TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'confirmed', 'suggest_other', 'closed', 'no_show')),
  confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_conversation JSONB
);

CREATE INDEX IF NOT EXISTS leads_business_id_idx ON leads(business_id);
CREATE INDEX IF NOT EXISTS leads_captured_at_idx ON leads(captured_at);
CREATE UNIQUE INDEX IF NOT EXISTS leads_confirm_token_idx ON leads(confirm_token);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_leads" ON leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = leads.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "owners_update_leads" ON leads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = leads.business_id AND b.user_id = auth.uid()
    )
  );

-- ── Subscriptions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'premium')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_topup_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions(stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_subscription" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ── Usage Periods ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  leads_captured INT NOT NULL DEFAULT 0,
  top_up_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS usage_periods_business_id_idx ON usage_periods(business_id);
CREATE INDEX IF NOT EXISTS usage_periods_period_idx ON usage_periods(business_id, period_start DESC);

ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_usage" ON usage_periods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = usage_periods.business_id AND b.user_id = auth.uid()
    )
  );

-- ── Rate Limiting ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_rate_windows (
  api_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key, window_start)
);

CREATE INDEX IF NOT EXISTS lead_rate_windows_cleanup_idx ON lead_rate_windows(window_start);

-- ── Rate Limiting RPC Function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_rate_window(p_api_key TEXT, p_window_start TIMESTAMPTZ)
RETURNS INT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO lead_rate_windows (api_key, window_start, count)
  VALUES (p_api_key, p_window_start, 1)
  ON CONFLICT (api_key, window_start) DO UPDATE
    SET count = lead_rate_windows.count + 1
  RETURNING count;
$$;
