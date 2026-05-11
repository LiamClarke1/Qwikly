-- 20260512_bundle_plans.sql
--
-- Collapses Inbound and Outbound product lines into a single bundle ladder
-- (see docs/superpowers/specs/2026-05-11-bundle-and-payments-design.md).
--
-- 1. Adds 'founders' to the plan CHECK constraints on clients and subscriptions
-- 2. Adds a 'founders' row to plan_prices
-- 3. Marks pipeline_lite and pipeline_pro as inactive in plan_prices
-- 4. Backfills any existing pipeline_* clients into their bundle equivalents
--
-- Idempotent. Safe to run repeatedly.

-- 1. Plan CHECK constraints, expand to include 'founders'.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_plan_check
  CHECK (plan IN (
    'trial', 'starter', 'pro', 'founders', 'business', 'enterprise', 'premium',
    'pipeline_lite', 'pipeline_pro'
  ));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN (
    'trial', 'starter', 'pro', 'founders', 'business', 'enterprise', 'premium',
    'pipeline_lite', 'pipeline_pro'
  ));

-- 2. Founders plan price row.
INSERT INTO plan_prices (plan_key, display_name, amount_zar_cents, billing_cadence, is_active)
VALUES ('founders', 'Founders Concierge', 299900, 'monthly', true)
ON CONFLICT (plan_key) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  amount_zar_cents = EXCLUDED.amount_zar_cents,
  is_active        = EXCLUDED.is_active,
  updated_at       = now();

-- 3. Retire standalone pipeline tiers, hidden from new flows but kept so
--    any straggler rows continue resolving cleanly.
UPDATE plan_prices
  SET is_active = false, updated_at = now()
  WHERE plan_key IN ('pipeline_lite', 'pipeline_pro');

-- 4. Backfill: existing pipeline_lite clients land on Pro, pipeline_pro on
--    Business. Products + quota set to match the bundle.
UPDATE clients
  SET plan = 'pro',
      products = ARRAY['inbound','outbound'],
      pipeline_daily_quota = 5
  WHERE plan = 'pipeline_lite';

UPDATE clients
  SET plan = 'business',
      products = ARRAY['inbound','outbound'],
      pipeline_daily_quota = 10
  WHERE plan = 'pipeline_pro';

UPDATE subscriptions SET plan = 'pro'      WHERE plan = 'pipeline_lite';
UPDATE subscriptions SET plan = 'business' WHERE plan = 'pipeline_pro';

-- 5. We keep the old pipeline_* values in the CHECK list for one release
--    of safety so any straggler rows still resolve cleanly. A follow-up
--    migration in Phase 2 will drop them once we have confirmed zero rows
--    remain.
