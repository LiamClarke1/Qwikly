# Instant Reply 60s

The differentiator. When the chat widget captures a lead, the business owner
gets a WhatsApp (or SMS, or email) ping inside 60 seconds with the lead's name,
contact, and what they asked about. The owner replies "YES" and Qwikly fires
the booking link straight back to the lead.

## Pipeline

1. Lead captured by the chat widget (or any source) and inserted into `leads`.
2. Trigger fires (one of):
   - Supabase row-inserted webhook on `leads`, calling
     `POST /api/leads/instant-reply` with `{ leadId }`.
   - Direct call from the widget capture handler immediately after insert.
3. `dispatchInstantReply` loads the lead + tenant settings, checks
   `instant_reply_enabled` and `business_hours`, composes a short owner
   message, and sends through the cheapest reachable channel:
   - Twilio WhatsApp (preferred)
   - Twilio SMS (fallback)
   - Resend email (final fallback)
4. Owner replies "YES" (or a one-letter shortcut). Twilio inbound webhook hits
   `POST /api/leads/instant-reply/inbound`. Qwikly auto-sends the booking link
   to the captured lead via the same channel hierarchy.

## SLA

- Dispatch handler must run inside 5 seconds of capture.
- WhatsApp delivery target under 60 seconds end-to-end.
- All attempts logged via `log()` for traceability.

## Schema (assumed / required)

The existing `leads` table (see `supabase/migrations/20260501_v2_widget_backend.sql`)
already has: `id`, `business_id`, `name`, `contact`, `need`, `captured_at`,
`raw_conversation`. We map `business_id -> tenant_id`, `need -> summary`,
`contact -> contact`. No new columns required on `leads`.

A new `tenant_settings` (or extension of `businesses`) is required:

```sql
-- New migration: 20260510_instant_reply.sql
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_whatsapp        TEXT,
  ADD COLUMN IF NOT EXISTS owner_sms_fallback    TEXT,
  ADD COLUMN IF NOT EXISTS owner_email_fallback  TEXT,
  ADD COLUMN IF NOT EXISTS instant_reply_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS business_hours        JSONB
    DEFAULT '{"start":"08:00","end":"18:00","tz":"Africa/Johannesburg"}'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_link_url      TEXT;
```

If a separate `tenant_settings` table is preferred, mirror the same fields
keyed by `tenant_id` (= `businesses.id`).

## Cost note

Twilio WhatsApp business-initiated messages in ZA: roughly USD 0.005 per
message (~ZAR 0.10). SMS in ZA: roughly USD 0.04 per message (~ZAR 0.75).
Email is effectively free under the existing Resend allowance. Owner reply
inbound messages are free. Budget worst case ZAR 1.00 per captured lead
covering both directions.

## Required env vars

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER` (e.g. `whatsapp:+14155238886`)
- `TWILIO_SMS_NUMBER` (sender id for SMS fallback)
- `RESEND_API_KEY`
- `RESEND_FROM`
- `QWIKLY_INTERNAL_TOKEN` (gate for `/api/leads/instant-reply`)
- `NEXT_PUBLIC_SITE_URL`
