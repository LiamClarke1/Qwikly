-- Migration: 20260506_owner_first_name.sql
-- Adds the owner's first name to businesses so lead alert emails can greet
-- them personally ("Hi Liam,") and sign the auto-filled reply with their
-- actual name instead of just the business name.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_first_name TEXT;

-- Best-effort backfill from clients.owner_name (legacy v1 onboarding field).
-- Takes the first whitespace-delimited token, so "Liam Clarke" → "Liam".
-- clients.auth_user_id is TEXT (legacy), businesses.user_id is UUID — cast to compare.
UPDATE businesses b
SET    owner_first_name = SPLIT_PART(TRIM(c.owner_name), ' ', 1)
FROM   clients c
WHERE  c.auth_user_id::uuid = b.user_id
  AND  b.owner_first_name IS NULL
  AND  c.owner_name IS NOT NULL
  AND  TRIM(c.owner_name) <> '';
