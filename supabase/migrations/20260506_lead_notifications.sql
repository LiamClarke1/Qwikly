-- Migration: 20260506_lead_notifications.sql
-- Adds proper lead-notification controls to the v2 backend.
--
-- businesses:
--   notification_email      = where lead alerts are delivered (overrides contact_email)
--   lead_emails_enabled     = master on/off toggle for lead alert emails
--
-- leads:
--   email_status            = delivery state for the lead-notification email
--                             ('pending', 'sent', 'failed', 'skipped')
--   email_error             = Resend error string when delivery fails
--   email_message_id        = Resend message id on success (for traceability)
--   email_sent_at           = timestamp of the delivery attempt that succeeded

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS notification_email   TEXT,
  ADD COLUMN IF NOT EXISTS lead_emails_enabled  BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill: where notification_email is null, copy contact_email so existing
-- accounts keep getting alerts at the address they're already used to.
UPDATE businesses
   SET notification_email = NULLIF(contact_email, '')
 WHERE notification_email IS NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS email_status     TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sent', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS email_error      TEXT,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS leads_email_status_idx ON leads(business_id, email_status);
