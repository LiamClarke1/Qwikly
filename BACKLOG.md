# Qwikly v1 Backlog

Features excluded from the initial build — implement in priority order.

## Billing

- [ ] Wire `POST /api/billing/checkout` to Stripe — create checkout session for Pro/Premium, return `{ url }` redirect
- [ ] Wire `GET /api/subscription` — return `{ plan, cycle, renewsAt, paymentMethod }` from Stripe subscription
- [ ] Wire `GET /api/subscription/invoices` — return Stripe invoice history
- [ ] Wire `POST /api/subscription/change` — upgrade/downgrade with prorate logic
- [ ] Wire `POST /api/subscription/cancel` — cancel at period end
- [ ] Wire `POST /api/subscription/payment-method` — return Stripe billing portal URL
- [ ] Top-up billing: auto-charge R20/lead when cap is exceeded (Stripe metered billing)
- [ ] Annual billing toggle on the public pricing page (currently only in onboarding)

## Onboarding

- [ ] `POST /api/onboarding/email-snippet` — email the widget snippet to the client's notification_email
- [ ] Widget detection polling: ensure `web_widget_last_seen_at` is updated by the embed script when it loads (Terminal 2 / widget service)
- [ ] Google OAuth callback: persist `?plan=` param through OAuth redirect and into onboarding

## Dashboard — Settings

- [ ] `/dashboard/settings/assistant` — expose greeting, qualifying questions, and colour as an editable form (same UI as StepAssistant but in settings context)
- [ ] `/dashboard/settings/business` — verify `industry`, `support_email`, `contact_phone` fields are editable
- [ ] API keys page: show `public_key` + rotate key button (generate new UUID, update DB)

## Dashboard — Premium tabs

- [ ] WhatsApp routing tab (visible on Premium): show "Coming soon" placeholder with badge
- [ ] Calendar integration tab (visible on Premium): show "Coming soon" placeholder with badge
- [ ] API access tab (visible on Premium): show API key + docs link

## Dashboard — Leads inbox

- [ ] Database migration: add `customer_email`, `preferred_time`, `area` columns to `conversations` table if missing
- [ ] Lead email notification: send email to `notification_email` on each new captured lead (Resend)
- [ ] One-click confirm flow: include "Confirm lead" link in email that updates status to `confirmed`

## Admin

- [ ] Update `/admin/clients` to display new plan names (starter/pro/premium)
- [ ] Update billing risk/dispute pages for new plan pricing

## Pricing page

- [ ] Update `/pricing` page to new plan names, pricing (R0/R599/R1,299), and feature comparison
- [ ] Remove "per-job", "commission", and "8%" language from any landing page copy
- [ ] Link "Start Free", "Choose Pro", "Choose Premium" CTAs to `/signup?plan=starter/pro/premium`

## Landing page hero

- [ ] Remove phone imagery from hero and feature sections
- [ ] Replace with browser/laptop widget mockup (SVG or Framer component)
- [ ] Update hero headline to match new positioning: "The AI assistant for your website"

## POPIA / Legal

- [ ] Review privacy policy for lead capture data handling
- [ ] Verify widget visitor data is not stored beyond session if visitor declines
