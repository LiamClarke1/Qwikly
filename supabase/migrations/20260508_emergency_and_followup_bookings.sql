-- Emergency + multi-day follow-up bookings.
--
-- Adds three concepts to the bookings table:
--   1. is_emergency       — visitor flagged the job as urgent (today/ASAP)
--   2. parent_booking_id  — links a follow-up day back to the original booking
--                            so day 2/3 of the same job render as one card
--   3. tentative_until    — when status='tentative', this is the deadline before
--                            the cron auto-promotes (emergency) or auto-releases
--                            (multi-day follow-up) the slot
--
-- Status check is widened to include 'tentative'.

-- bookings.id is bigint in production (the original CREATE TABLE pre-dates
-- the uuid migration), so parent_booking_id must match. The other invoicing
-- tables already FK to bookings.id as bigint, confirming this.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_emergency       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_booking_id  bigint REFERENCES bookings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tentative_until    timestamptz,
  ADD COLUMN IF NOT EXISTS tentative_action   text;

-- tentative_action: what the cron should do when tentative_until passes.
--   'confirm' — flip to 'booked' (emergency lane: assume the tradesman is busy
--                and let the slot stick if they didn't reroute in time)
--   'release' — flip to 'cancelled' (multi-day follow-up: tradesman must
--                actively confirm day 2/3 once day 1 is done, otherwise free
--                the slot for someone else)
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check,
  DROP CONSTRAINT IF EXISTS bookings_tentative_action_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('booked', 'completed', 'cancelled', 'no-show', 'tentative')),
  ADD CONSTRAINT bookings_tentative_action_check
    CHECK (tentative_action IS NULL OR tentative_action IN ('confirm', 'release'));

CREATE INDEX IF NOT EXISTS idx_bookings_emergency
  ON bookings(client_id, is_emergency)
  WHERE is_emergency = true;

CREATE INDEX IF NOT EXISTS idx_bookings_parent
  ON bookings(parent_booking_id)
  WHERE parent_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_tentative_expiry
  ON bookings(status, tentative_until)
  WHERE status = 'tentative' AND tentative_until IS NOT NULL;

COMMENT ON COLUMN bookings.is_emergency IS
  'Visitor flagged the job as urgent (today/ASAP). Routes notification to the urgent lane.';
COMMENT ON COLUMN bookings.parent_booking_id IS
  'For multi-day jobs: points to the original day-1 booking. NULL for standalone bookings.';
COMMENT ON COLUMN bookings.tentative_until IS
  'When status=tentative, the cron auto-resolves (per tentative_action) at or after this time.';
COMMENT ON COLUMN bookings.tentative_action IS
  'What the cron does at tentative_until: confirm (emergency default) or release (follow-up default).';

-- Conversations: track when the visitor flagged the job as urgent in chat,
-- and (optionally) how many days they expect the work to take. Both feed
-- into the lead-notification email so the tradesman can triage at a glance.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_urgent     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expected_days integer;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_expected_days_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_expected_days_check
    CHECK (expected_days IS NULL OR (expected_days >= 1 AND expected_days <= 14));

CREATE INDEX IF NOT EXISTS idx_conversations_urgent
  ON conversations(client_id, is_urgent)
  WHERE is_urgent = true;

COMMENT ON COLUMN conversations.is_urgent IS
  'Visitor signalled urgency (today/ASAP/emergency keywords). Drives URGENT lead alerts.';
COMMENT ON COLUMN conversations.expected_days IS
  'Visitor estimate of how many days the job will take. NULL means unknown.';
