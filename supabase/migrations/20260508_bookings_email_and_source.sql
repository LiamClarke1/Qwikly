-- Make bookings table support email-only call bookings from the Qwikly chat.
--
-- Today the chat-driven call booking flow (src/lib/booking-create.ts) asks for
-- email only and creates a Google Calendar event, but never inserts a row in
-- the `bookings` table. That's why the Analytics tab shows 0 bookings even
-- when calls are being booked. We need:
--   1. customer_phone must be nullable (chat bookings are email-only)
--   2. customer_email column for the visitor's email
--   3. external_event_id to link the booking row to the Google Calendar event
--   4. source column so analytics can group by origin (chat vs trade vs other)
--   5. conversation_id so we can join bookings back to conversations

BEGIN;

ALTER TABLE bookings ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email     text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_event_id  text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source             text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS conversation_id    uuid REFERENCES conversations(id) ON DELETE SET NULL;

-- Index for fast linking from a conversation to its booking.
CREATE INDEX IF NOT EXISTS idx_bookings_conversation ON bookings(conversation_id);

-- Index for source-based analytics grouping.
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);

COMMIT;
