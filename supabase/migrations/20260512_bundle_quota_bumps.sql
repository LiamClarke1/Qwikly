-- 20260512_bundle_quota_bumps.sql
--
-- Bumps daily Outbound prospect quotas to match the honest copy pass:
--   Pro:        5/day   (unchanged)
--   Founders:   5 -> 10 (was Pro-equivalent, now its own tier)
--   Business:  10 -> 15
--   Enterprise 20 -> 25 (still "custom" in marketing copy, this is the default)
--
-- Idempotent. Safe to run repeatedly.

UPDATE clients SET pipeline_daily_quota = 10 WHERE plan = 'founders'   AND pipeline_daily_quota <> 10;
UPDATE clients SET pipeline_daily_quota = 15 WHERE plan = 'business'   AND pipeline_daily_quota <> 15;
UPDATE clients SET pipeline_daily_quota = 25 WHERE plan = 'enterprise' AND pipeline_daily_quota <> 25;
