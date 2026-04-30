# Qwikly — Billing System Design
**Date:** 2026-04-30
**Scope:** Billing portal, invoice management, and PDF downloads on top of the existing 8% commission model
**Target:** qwikly.co.za (repo: ~/qwikly-site)

---

## 1. Context

Qwikly charges clients 8% of every collected invoice payment, billed monthly. The commission model, Yoco webhook, and commission tables are already built and working. This spec covers improvements to the client-facing billing experience: a cleaner billing portal, a proper invoice list, and branded PDF invoice downloads.

No new payment provider. No subscription plans. Yoco is not touched.

---

## 2. What Is Being Built

| Area | Change |
|------|--------|
| `/dashboard/billing` | Rewrite — cleaner layout, stats at top, period list below |
| `/dashboard/billing/invoices` | New page — full invoice list with status, amounts, PDF download |
| `/api/billing/invoices/[id]/pdf` | New route — generate + serve branded PDF for a commission invoice |
| `/pricing` | Simplify — clean presentation of the 8% model, no plan cards |

---

## 3. Billing Portal (`/dashboard/billing`)

### Top section — stats strip
Four stat cards (already partially built, needs tightening):
- **This month invoiced** — total invoiced to customers this period
- **Current commission** — 8% owed to Qwikly this period
- **Lifetime paid** — all-time commission paid
- **Outstanding** — unpaid/overdue commission

### Period list
Each row: period label (e.g. "April 2026"), status badge (In progress / Locked / Invoice sent / Paid / Overdue), total invoiced, commission amount, link to detail view.

### Status badges
Reuse existing `PERIOD_STATUS_CONFIG`. No changes to status logic.

---

## 4. Invoice List (`/dashboard/billing/invoices`)

New page at `/dashboard/billing/invoices`.

Table columns:
- Invoice number
- Period (e.g. "April 2026")
- Date issued
- Amount (ex-VAT)
- VAT (15%)
- Total
- Status badge
- Download PDF button

Empty state: "No invoices yet. Your first invoice will appear here at the end of your first billing period."

---

## 5. Invoice PDF

New `@react-pdf/renderer` component: `CommissionInvoicePDF`.

Contents:
- Qwikly logo + brand colour (`#E85A2C`)
- Client business name + billing email
- Invoice number, issue date, due date
- Line item: "Qwikly platform commission — [Month Year]"
- Sub-total (ex-VAT)
- VAT line: 15%
- Total due
- Payment instructions (EFT details or Yoco link)
- Footer: "VAT registered under SARS — VAT No: [env var]"

Generated on demand at `/api/billing/invoices/[id]/pdf`. Stored in Supabase Storage at `commission-invoices/{client_id}/{invoice_id}.pdf`. Signed URL returned; cached for 1 hour.

---

## 6. Pricing Page (`/pricing`)

Remove the existing calculator-heavy layout. Replace with a clean single-model page:

- Hero: "Only pays when you get paid."
- The 8% model explained clearly: min R150, max R5,000 per booking
- Simple worked examples (3–4 trade types)
- One CTA: "Get started free"
- No plan comparison table. No subscription cards.

The existing FAQ component stays below.

---

## 7. API Changes

| Method | Path | Change |
|--------|------|--------|
| GET | `/api/billing/invoices/[id]/pdf` | New — generate/serve PDF |
| GET | `/api/billing/periods` | Exists — no change |
| GET | `/api/billing/periods/[id]` | Exists — no change |

No new webhook handlers. No new payment provider routes.

---

## 8. Environment Variables

```
QWIKLY_VAT_NUMBER=...    # printed on invoice PDFs
```

Already present: `YOCO_WEBHOOK_SECRET`, Supabase keys, Resend key.

---

## 9. What Is Not Touched

- Yoco webhook (`/api/webhooks/yoco`) — unchanged
- Commission calculation logic — unchanged
- `commissions`, `billing_periods`, `payments`, `receipts` tables — unchanged
- WhatsApp, assistant runtime, analytics

---

## 10. Acceptance Tests

1. `/dashboard/billing` loads with correct stats and period list
2. Clicking a period shows the detail view with invoice link
3. `/dashboard/billing/invoices` lists all commission invoices with correct status badges
4. Clicking Download PDF on a paid invoice returns a branded PDF with correct amounts, VAT line, and invoice number
5. `/pricing` renders cleanly with the 8% model — no plan cards, no broken calculator
