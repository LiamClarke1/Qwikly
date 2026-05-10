-- Instant Reply 60s feature: owner notification routing on the businesses table.
-- Dispatch helper at src/lib/instant-reply/dispatch.ts reads these columns and
-- falls back to existing notification_email / contact_email when null.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS owner_sms_fallback TEXT,
  ADD COLUMN IF NOT EXISTS owner_email_fallback TEXT,
  ADD COLUMN IF NOT EXISTS instant_reply_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS business_hours JSONB NOT NULL DEFAULT
    '{"start":"08:00","end":"18:00","tz":"Africa/Johannesburg"}'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_link_url TEXT;

COMMENT ON COLUMN businesses.owner_whatsapp IS
  'E.164 number for WhatsApp owner ping on new lead. Primary channel for Instant Reply 60s.';
COMMENT ON COLUMN businesses.owner_sms_fallback IS
  'E.164 number for SMS fallback when WhatsApp send fails.';
COMMENT ON COLUMN businesses.owner_email_fallback IS
  'Email used when both WhatsApp and SMS fail.';
COMMENT ON COLUMN businesses.instant_reply_enabled IS
  'Per-tenant kill switch for the 60s push. Defaults true on Pro+.';
COMMENT ON COLUMN businesses.business_hours IS
  'JSON {start, end, tz} controlling when owner pings fire. Outside window, the system delivers via email only.';
COMMENT ON COLUMN businesses.booking_link_url IS
  'Per-tenant calendar link. Sent to lead when owner replies YES.';
