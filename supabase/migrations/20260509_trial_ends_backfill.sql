-- Migration: 20260509_trial_ends_backfill.sql
-- Backfill trial_ends_at for existing trial clients that pre-date the
-- canonical TRIAL_DAYS=14 wiring. Idempotent: only fills where the column
-- is NULL. Reflects the same 14-day window enforced by /src/lib/trial.ts.

UPDATE clients
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE plan = 'trial'
  AND trial_ends_at IS NULL
  AND created_at IS NOT NULL;

UPDATE subscriptions
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE plan = 'trial'
  AND trial_ends_at IS NULL
  AND created_at IS NOT NULL;
