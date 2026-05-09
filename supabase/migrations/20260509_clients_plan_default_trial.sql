-- Migration: 20260509_clients_plan_default_trial.sql
-- Change clients.plan default from 'starter' (legacy) to 'trial' so new
-- signups land on the 14-day free tier shown on the public pricing page.
-- Only affects future inserts. Existing clients keep their current plan.

ALTER TABLE clients ALTER COLUMN plan SET DEFAULT 'trial';
