-- Add onboarding_complete boolean column that is referenced widely in code
-- but was never formally migrated. Using IF NOT EXISTS to be safe if it
-- already exists in production.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Back-fill: any row that has onboarding_completed_at set should also have
-- onboarding_complete = true so both flags stay in sync.
UPDATE clients
  SET onboarding_complete = TRUE
  WHERE onboarding_completed_at IS NOT NULL AND onboarding_complete = FALSE;
