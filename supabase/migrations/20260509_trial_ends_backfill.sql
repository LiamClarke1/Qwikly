-- Migration: 20260509_trial_ends_backfill.sql
-- Backfill trial_ends_at for existing trial clients that pre-date the
-- canonical TRIAL_DAYS=14 wiring. Idempotent: only fills where the column
-- is NULL. Reflects the same 14-day window enforced by /src/lib/trial.ts.

UPDATE clients
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE plan = 'trial'
  AND trial_ends_at IS NULL
  AND created_at IS NOT NULL;

-- subscriptions has no created_at column, so join to clients via auth_user_id
-- to source a timestamp. clients.auth_user_id is TEXT, subscriptions.user_id
-- is UUID, hence the cast.
UPDATE subscriptions s
SET trial_ends_at = c.created_at + INTERVAL '14 days'
FROM clients c
WHERE c.auth_user_id = s.user_id::text
  AND c.plan = 'trial'
  AND s.trial_ends_at IS NULL
  AND c.created_at IS NOT NULL;
