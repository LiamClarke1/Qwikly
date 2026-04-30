# Qwikly Changelog

## T4 + T3 — 2026-04-30

### Fixed: Three automation triggers that never fired

`/api/automations/run/route.ts`

- `job_starting_soon` — Now finds bookings starting in `[now + delay_minutes, now + delay_minutes + 15 min]` and sends the configured WhatsApp message. Covers the 1-hour alert, 30-min alert, and 2-hour reminder recipes.
- `quote_sent` — Now finds invoices with `sent_at` in the delay window that are still in `sent`/`overdue` status and sends a follow-up WhatsApp to the customer mobile.
- `payment_due` — Now finds invoices whose `due_at` falls in the delay window and are still unpaid (`sent`/`overdue`), and sends a payment reminder WhatsApp.

All three use the same `automation_logs` idempotency pattern as the existing triggers — no double-fires if the cron overlaps.

### Fixed: Email replies had no Reply-To header

`/api/conversations/[id]/reply/route.ts`

- Added `notification_email` to the client select query.
- Set `replyTo` to the client's `notification_email` when sending email replies from the conversations inbox. Customer replies now land in the business owner's inbox, not a dead Qwikly sending address.

### Fixed: Campaign send had no error feedback

`/dashboard/campaigns/page.tsx`

- The "Send now" button now awaits the `/api/campaigns/[id]/send` response.
- If the send API returns a non-2xx status, the error message is shown inline in the modal and the modal stays open. Previously the modal closed silently even if the send failed.

### Fixed: Pre-existing build error

`/dashboard/settings/api-keys/page.tsx`

- Escaped unescaped apostrophe (`won't` → `won&apos;t`) that was blocking the production build.

### Fixed: Analytics "Avg. response time" was hardcoded fake data

`/dashboard/analytics/page.tsx`

- Replaced the static `"< 5s"` value with a real computed **Booking rate** (`bookings ÷ conversations × 100%`) using data already fetched in the same query.
- KPI label updated to "Booking rate", sub-label "chats that convert". Shows `"—"` when there are no conversations yet (honest empty state).

### Fixed: Web chat error fallback was Qwikly-branded

`/api/web/chat/route.ts`

- Replaced `"Ja, something went wrong on our end. Try again or WhatsApp us directly."` (Qwikly-specific, mentions WhatsApp with no number) with a neutral `"Sorry, I ran into a technical issue. Please try again in a moment."` that works for any client's widget.

### Fixed: WhatsApp inbound left customers on read when Claude failed

`/api/whatsapp/route.ts`

- When the Claude API call throws, the handler now sends a generic fallback WhatsApp message to the customer, logs it to `messages_log`, and marks the conversation as `escalated` so the business owner sees it in the "needs attention" panel.
- If even the fallback send fails, it still returns `200 OK` to Twilio (preventing retries) without throwing.

---

## Still needed (not this terminal's scope)

- `YOCO_SECRET_KEY` — add to `.env.local` and Vercel env vars (get from app.yoco.com → Developers → Keys). Without it, customers cannot pay by card.
- `YOCO_WEBHOOK_SECRET` — add to `.env.local` and Vercel env vars (get from Yoco → Developers → Webhooks). Without it, webhook signature validation is skipped in production.
