-- Paystack billing migration
-- Run this in Supabase SQL editor

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_email_token TEXT,
  ADD COLUMN IF NOT EXISTS paystack_card_brand TEXT,
  ADD COLUMN IF NOT EXISTS paystack_card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS subscriptions_paystack_customer_idx
  ON subscriptions (paystack_customer_code)
  WHERE paystack_customer_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paystack_subscription_idx
  ON subscriptions (paystack_subscription_code)
  WHERE paystack_subscription_code IS NOT NULL;
