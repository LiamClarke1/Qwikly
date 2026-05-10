-- Expand the CHECK constraint on clients.plan to allow the new pricing tiers
-- introduced 2026-05-10:
--   starter, business, enterprise (NEW)
--   trial, pro, premium           (KEPT, premium is now legacy-only for
--                                  grandfathered subscriptions)
--
-- The previous constraint (20260509_clients_plan_check.sql) only allowed
-- 'trial', 'pro', 'premium'. New signups landing in starter/business/
-- enterprise would fail with a CHECK constraint violation without this.

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_plan_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_plan_check
  CHECK (plan IN ('trial', 'starter', 'pro', 'business', 'enterprise', 'premium'));
