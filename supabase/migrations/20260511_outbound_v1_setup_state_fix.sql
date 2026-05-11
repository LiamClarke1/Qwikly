-- 20260511_outbound_v1_setup_state_fix.sql
--
-- Fix pre-existing schema/code mismatch on pipeline_setup_state. The table
-- (from 20260510_pipeline_platform.sql) has:
--   - business_id UUID UNIQUE
--   - status TEXT CHECK IN ('draft','ready','launched','paused','completed')
--   - icp JSONB
--   - seed_list, sending_domains, copy_approvals JSONB
--   - notes TEXT
--   - created_at, updated_at TIMESTAMPTZ
--
-- But src/lib/pipeline/setup-state.ts uses internal status values 'pending',
-- 'generated', 'refreshing' and persists a single { icp, status,
-- last_generated_at } blob. Two things need to change to make these match:
--
-- 1. Add a last_generated_at TIMESTAMPTZ column so we can record when the
--    first batch (or any subsequent batch) was successfully produced.
-- 2. Widen the status CHECK to also accept 'pending', 'generated',
--    'refreshing' so the internal vocabulary persists losslessly.

ALTER TABLE pipeline_setup_state
  ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ;

-- Drop the narrow CHECK and replace it with one that covers both vocabularies.
-- IF EXISTS keeps this idempotent on fresh databases where the constraint
-- name might differ.
ALTER TABLE pipeline_setup_state
  DROP CONSTRAINT IF EXISTS pipeline_setup_state_status_check;

ALTER TABLE pipeline_setup_state
  ADD CONSTRAINT pipeline_setup_state_status_check
  CHECK (status IN (
    -- Legacy 5-step wizard vocabulary
    'draft','ready','launched','paused','completed',
    -- Outbound v1 wizard vocabulary
    'pending','generated','refreshing'
  ));

COMMENT ON COLUMN pipeline_setup_state.last_generated_at IS
  'Timestamp of the most recent successful prospect generation for this business. Set by updateSetupState after the wizard or trickle cron finishes.';
