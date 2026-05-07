-- Add 'trial' to plan options and trial tracking columns
-- Run this in Supabase SQL editor AFTER migration-paystack.sql

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('trial', 'starter', 'pro', 'premium'));

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
