-- 20260511_outbound_v1_signup_plans.sql
--
-- Companion to 20260511_outbound_v1.sql: that migration added the
-- products[] and pipeline_daily_quota columns, but did NOT expand the
-- CHECK constraints on clients.plan / subscriptions.plan to allow the
-- two new Pipeline tiers. Without this follow-up, the /api/signup
-- handler's INSERT into clients would fail with:
--   new row for relation "clients" violates check constraint
--   "clients_plan_check"
-- as soon as someone signs up at /signup?plan=pipeline_lite or
-- ?plan=pipeline_pro.
--
-- We also defensively expand subscriptions_plan_check to include the
-- new tiers AND backfill the inbound tiers that 20260101000009 missed
-- (business, enterprise) — those were already being written by the
-- signup flow against the older constraint, so any environment that
-- still has the old 4-value constraint would be silently broken for
-- business/enterprise signups. Aligning the two constraints here means
-- both inbound and outbound signups land successfully on every env.

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_plan_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_plan_check
  CHECK (plan IN (
    'trial', 'starter', 'pro', 'business', 'enterprise', 'premium',
    'pipeline_lite', 'pipeline_pro'
  ));

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN (
    'trial', 'starter', 'pro', 'business', 'enterprise', 'premium',
    'pipeline_lite', 'pipeline_pro'
  ));
