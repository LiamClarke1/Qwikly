-- 24-hour onboarding checklist state.
--
-- Stores per-tenant progress through the five-step "Live in 24 hours" setup
-- on /dashboard/onboarding. We piggy-back on the existing clients table
-- (which is the canonical tenant row) rather than adding a new table, since
-- the state is tiny and always read alongside the rest of the client record.
--
-- Shape of the JSONB payload:
--   {
--     "step1": false,
--     "step2": false,
--     "step3": false,
--     "step4": false,
--     "step5": false,
--     "started_at": "2026-05-10T12:34:56Z"
--   }

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: any tenant that has onboarding_completed_at set should be marked
-- as having all five steps done so we do not nag returning customers.
UPDATE clients
   SET onboarding_state = jsonb_build_object(
         'step1', true,
         'step2', true,
         'step3', true,
         'step4', true,
         'step5', true,
         'started_at', COALESCE(created_at, now())
       )
 WHERE onboarding_completed_at IS NOT NULL
   AND (onboarding_state = '{}'::jsonb OR onboarding_state IS NULL);
