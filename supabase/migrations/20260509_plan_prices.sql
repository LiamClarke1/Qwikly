-- Migration: 20260509_plan_prices.sql
-- plan_prices — Qwikly subscription plan pricing, editable from /admin/settings/plans
--
-- Replaces the hardcoded PLAN_PRICES_ZAR_CENTS map in src/lib/billing/plan-prices.ts.
-- Used as the FALLBACK when a client's clients.mrr_zar is null or 0. Real mrr_zar
-- always wins, this table just stops the pipeline forecast and draft invoice
-- generator from showing R0 when an admin forgot to set mrr_zar on a paid client.
--
-- amount_zar_cents is stored as an integer (cents) to match clients.mrr_zar
-- and to avoid float drift on prices that get multiplied through VAT and tax math.

CREATE TABLE IF NOT EXISTS plan_prices (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_key           text NOT NULL UNIQUE,
  display_name       text NOT NULL,
  amount_zar_cents   integer NOT NULL CHECK (amount_zar_cents >= 0),
  billing_cadence    text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cadence IN ('monthly','annual')),
  is_active          boolean NOT NULL DEFAULT true,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_prices_active ON plan_prices(is_active);

-- RLS: mirror the admin_users / crm_notes pattern. We do NOT enable RLS for
-- public read here, all reads and writes go through supabaseAdmin() (service
-- role) gated by assertAdmin() at the API layer. Keeping RLS on with a
-- deny-all default ensures any leaked anon/auth client cannot read or write.
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_prices_no_public" ON plan_prices;
CREATE POLICY "plan_prices_no_public" ON plan_prices FOR ALL USING (false);

-- Touch updated_at on every UPDATE. Reuses touch_updated_at() defined in the
-- invoicing migrations, which sets NEW.updated_at = now().
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_plan_prices_updated ON plan_prices;
    CREATE TRIGGER trg_plan_prices_updated
      BEFORE UPDATE ON plan_prices FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

-- Seed: mirror the current placeholder values from src/lib/billing/plan-prices.ts
-- so behavior does not change on deploy. Trial intentionally excluded, it is
-- never billed and the fallback for a 'trial' plan is hardcoded to 0 in code.
INSERT INTO plan_prices (plan_key, display_name, amount_zar_cents, billing_cadence, is_active)
VALUES
  ('starter',  'Starter',  29900,  'monthly', true),
  ('pro',      'Pro',      69900,  'monthly', true),
  ('premium',  'Premium',  149900, 'monthly', true),
  ('billions', 'Billions', 399900, 'monthly', true)
ON CONFLICT (plan_key) DO NOTHING;
