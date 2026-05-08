# Billing Anchor Tracker: Design Spec

**Date:** 2026-05-08
**Status:** Approved (brainstorming complete, awaiting implementation plan)
**Author:** Claude (with Liam Clarke)
**Surface:** Admin-only. Touches `/admin/clients`, `/admin/billing/pipeline`, `/admin/invoicing`, `/api/cron/billing-anchor-tick`, client invoice page `/i/[token]`.

---

## 1. Problem

When a Qwikly client converts from trial to paid, they are billed monthly on a per-client anchor day. Today, the admin CRM at `/admin/clients` shows business statistics (status, MRR, health, channels, last active) but does not show **when each client is next due to be invoiced**.

This means the admin (Liam) cannot:
- See at a glance which clients are about to be billed
- Track who has been sent an invoice but has not yet paid
- See which clients have self-confirmed payment but still need bank verification
- See who is overdue without manually scanning the invoicing page

The current invoicing page (`/admin/invoicing`) is per-invoice operational, not per-client forecasting. The data model already has `qwikly_billing_periods` and `qwikly_billing_invoices` tables, and the client detail type has `next_renewal_at` and `billing_cycle` fields, but none of this is surfaced on the CRM list and no automation generates invoices.

## 2. Goals

1. Every client row in the admin CRM shows a visual countdown badge for their next invoice.
2. A new **Billing Pipeline** tracker page gives a focused workspace for upcoming, awaiting-verification, overdue, and recently-paid invoices.
3. Invoices auto-generate and auto-send on each client's anchor day, with that month's Qwikly usage statistics baked in as line items.
4. Clients can self-confirm payment via an "I've paid" button on their invoice page, queueing the invoice for admin verification rather than requiring the admin to chase silently.
5. The admin verifies bank-side receipt and marks the invoice paid, which resets the cycle counter.

## 3. Non-goals

- No payment integration (Stripe/Paystack/Yoco). Clients pay manually via EFT or one-time card link as today.
- No automated chasing/dunning emails for overdue invoices in this iteration. Admin chases manually using the Overdue tab.
- No changes to the existing per-invoice operational page at `/admin/invoicing`. It stays as-is.
- No changes to client → end-customer invoicing (the existing `invoices` table). This spec only touches `qwikly_billing_invoices` (Qwikly → client).
- No trial-ending countdown UI in this iteration. Anchor day is set by the admin manually after first paid invoice clears.

## 4. User flow

```
[Trial period]
   ↓
Client converts → first invoice paid manually
   ↓
Admin opens client detail → sets billing_anchor_day (1-31)
   ↓
[Recurring monthly cycle]
   ↓
Daily 06:00 SAST cron checks: any client where today's day-of-month == anchor_day?
   ├─ Yes:
   │    1. Aggregate last 30 days Qwikly usage stats
   │    2. Create qwikly_billing_invoices row (status='draft')
   │    3. Snapshot stats into line_items_jsonb
   │    4. Send via email + WhatsApp using existing /lib/invoices senders
   │    5. Status → 'sent', sent_at = now()
   ↓
Client receives invoice → either:
   ├─ Clicks "I've paid" → status='awaiting_verification'
   │    → Admin sees in Billing Pipeline → Awaiting verification
   │    → Admin checks bank → "Mark verified" → status='paid'
   │
   ├─ Pays without clicking → admin notices deposit → opens invoice → "Mark paid"
   │
   └─ Does nothing past due_at → cron flips status='overdue'
        → Admin sees in Billing Pipeline → Overdue
```

## 5. Data model changes

Single migration (`20260508_billing_anchor_tracker.sql`):

```sql
-- 1. Anchor day per client (manual, set by admin after first paid invoice)
ALTER TABLE clients
  ADD COLUMN billing_anchor_day smallint
    CHECK (billing_anchor_day BETWEEN 1 AND 31);
ALTER TABLE clients
  ADD COLUMN billing_anchor_set_at timestamptz;

-- 2. New invoice status: client self-confirmed, admin not yet verified
ALTER TABLE qwikly_billing_invoices
  DROP CONSTRAINT qwikly_billing_invoices_status_check;
ALTER TABLE qwikly_billing_invoices
  ADD CONSTRAINT qwikly_billing_invoices_status_check
  CHECK (status IN (
    'draft', 'sent', 'awaiting_verification',
    'paid', 'overdue', 'written_off', 'disputed'
  ));

-- 3. Track when client self-confirmed payment
ALTER TABLE qwikly_billing_invoices
  ADD COLUMN client_marked_paid_at timestamptz;
ALTER TABLE qwikly_billing_invoices
  ADD COLUMN client_payment_note text;

-- 4. Index for cron lookups
CREATE INDEX IF NOT EXISTS idx_clients_billing_anchor_day
  ON clients(billing_anchor_day)
  WHERE billing_anchor_day IS NOT NULL;
```

No new tables. No changes to `qwikly_billing_periods` schema.

## 6. Stats aggregation

When the cron generates an invoice for a client, it queries the **billing window** (from the previous invoice's period_end, or from `billing_anchor_set_at` for the first invoice) up to today. The following stats are pulled and snapshotted into `qwikly_billing_invoices.line_items_jsonb`:

| Stat | Source | Display on invoice |
|---|---|---|
| Conversations handled (total) | `conversations` table count | "X conversations handled by your Qwikly digital assistant" |
| Conversations by channel | `conversations.channel` group by | breakdown line per channel |
| Qualified leads captured | `conversations` where `lead_intent` is set | "X qualified leads captured" |
| Bookings created | `bookings` table count | "X bookings booked through Qwikly" |
| Average response time | `conversations.first_response_seconds` average | "Average X seconds response time" |
| Revenue attributed | sum of paid `invoices.total_zar` linked to Qwikly bookings, if linkage exists | "R X,XXX in revenue from Qwikly leads" |
| Estimated time saved | conversations × avg human handle time (default 5 min) | "X hours of staff time saved" |

**Rules:**
- If a stat cannot be computed (data missing, view doesn't exist, query times out), it is **omitted from the invoice**, not faked or zeroed. A warning is logged to `chat_persist_dlq` so the admin can review.
- Stats are **snapshotted**: the line_items_jsonb is the source of truth on the invoice forever. Even if conversations are later deleted, the invoice stays correct.
- Per the project memory rule, the invoice copy refers to "your Qwikly digital assistant" or "Qwikly digital system", **not** "AI" or "bot".

## 7. CRM list: Next invoice column

Replaces unused space between "Last active" and the row actions menu in [admin/clients/page.tsx](../../../src/app/(app)/admin/clients/page.tsx). Sortable. Filterable in the existing filter panel under a new "Billing" group.

### Visual states

| Condition | Badge text | Color | Icon |
|---|---|---|---|
| `billing_anchor_day IS NULL` (trial / not yet set) | `Set billing day` (CTA link) | slate-400 | gear |
| Anchor set, more than 7 days away | `In 18 days` | slate | clock |
| 4-7 days away | `In 4 days` | amber | clock |
| Today (anchor_day == today's date) | `Generating today` | brand orange (#E85A2C) | loader |
| Latest invoice status `sent`, not yet paid | `Invoice sent · 2d ago` | blue | mail |
| Latest invoice status `awaiting_verification` | `Verify payment` (pulsing) | violet | shield-check |
| Latest invoice status `overdue` | `Overdue 5d` | red | alert-triangle |
| Latest invoice status `paid` and next anchor more than 7 days | `Paid · next in 24d` | emerald | check-circle |

### Sort
New `SortCol` value: `next_invoice_at`. Sort ascending = soonest-due first.

### Filter
New filter group "Billing" with toggles: `Upcoming this week`, `Awaiting verification`, `Overdue`, `Paid this month`.

## 8. Billing Pipeline tracker page

New route: `/admin/billing/pipeline` ([admin/billing](../../../src/app/(app)/admin/billing) folder). Server component for stats, client component for tabs.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Admin                                                            │
│ Billing Pipeline                                                 │
│                                                                  │
│ ┌──────────┬──────────┬───────────────────┬──────────────────┐  │
│ │ 7d fcst  │ 30d fcst │ Awaiting verify   │ Overdue          │  │
│ │ R 12,400 │ R 48,200 │ 3                 │ 1                │  │
│ └──────────┴──────────┴───────────────────┴──────────────────┘  │
│                                                                  │
│ [Upcoming · 14d] [Awaiting verify] [Overdue] [Paid this month]  │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Acme Dental         · in 3 days  · est R 1,200  → [Preview] ││
│ │ Sunshine Plumbing   · in 6 days  · est R 950    → [Preview] ││
│ │ ...                                                          ││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Tabs

1. **Upcoming (next 14 days)**: clients whose next anchor day is within 14 days. Each row: business name, days until invoice, estimated amount (last invoice total, or plan MRR if first), [Preview invoice draft] button.
2. **Awaiting verification**: invoices with status `awaiting_verification`. Each row: business name, amount, when client clicked "I've paid", optional note, [Mark verified] / [Mark not received] actions.
3. **Overdue**: invoices with status `overdue`. Each row: business name, amount, days overdue, [Send reminder] / [Mark paid] actions.
4. **Paid this month**: invoices paid in the calendar month. Read-only celebration view. Sum at top.

### Stat cards (top)

- **7-day forecast (R)**: sum of estimated next-invoice amounts for clients due within 7 days
- **30-day forecast (R)**: same, 30 days
- **Awaiting verification count**: count of `awaiting_verification` invoices
- **Overdue count**: count of `overdue` invoices

## 9. Cron job

**Endpoint:** `POST /api/cron/billing-anchor-tick`
**Schedule:** Daily at 06:00 SAST (configured in `vercel.json`)
**Auth:** `CRON_SECRET` header, same pattern as existing crons.

### Pass 1: Generate today's invoices

```
SELECT id, billing_anchor_day, ...
FROM clients
WHERE billing_anchor_day = EXTRACT(DAY FROM now() AT TIME ZONE 'Africa/Johannesburg')
  AND crm_status NOT IN ('churned', 'paused', 'pending_deletion')
  AND NOT EXISTS (
    SELECT 1 FROM qwikly_billing_invoices
    WHERE client_id = clients.id
    AND created_at::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date
  );

For each client:
  1. Determine billing window [previous period_end | billing_anchor_set_at, today]
  2. Aggregate stats (Section 6). On any DB failure: skip this client, log to dlq.
  3. INSERT qwikly_billing_periods row (status='locked')
  4. INSERT qwikly_billing_invoices row (status='draft', line_items_jsonb=stats snapshot)
  5. Generate invoice_number using qwikly_billing_number_seq → 'QWK-YYYY-MM-NNNN'
  6. Send via /lib/invoices/email.ts and /lib/invoices/whatsapp.ts
  7. On send success: UPDATE status='sent', sent_at=now()
  8. On any send failure: leave status='draft', log to chat_persist_dlq, alert via existing lead-notification channel
```

### Pass 2: Flip overdue

```
UPDATE qwikly_billing_invoices
SET status = 'overdue'
WHERE status = 'sent'
  AND due_at < (now() AT TIME ZONE 'Africa/Johannesburg')::date;
```

### Month-end overflow rule

A client with `billing_anchor_day = 31` in February should bill on Feb 28 (or 29 in a leap year). The rule:

> Bill a client today if **either**:
> 1. `billing_anchor_day == today's day-of-month`, **or**
> 2. Today is the last day of the month **and** `billing_anchor_day > days_in_this_month`

The Pass 1 query becomes:

```sql
WITH today_info AS (
  SELECT
    EXTRACT(DAY FROM now() AT TIME ZONE 'Africa/Johannesburg')::int AS d_today,
    EXTRACT(DAY FROM
      (date_trunc('month', now() AT TIME ZONE 'Africa/Johannesburg')
        + interval '1 month - 1 day'))::int AS d_last
)
SELECT id FROM clients, today_info
WHERE crm_status NOT IN ('churned', 'paused', 'pending_deletion')
  AND billing_anchor_day IS NOT NULL
  AND (
    billing_anchor_day = d_today
    OR (d_today = d_last AND billing_anchor_day > d_last)
  )
  AND NOT EXISTS (
    SELECT 1 FROM qwikly_billing_invoices
    WHERE client_id = clients.id
      AND (created_at AT TIME ZONE 'Africa/Johannesburg')::date
        = (now() AT TIME ZONE 'Africa/Johannesburg')::date
  );
```

## 10. Client "I've paid" flow

Existing client invoice page `/i/[token]` (token in `qwikly_billing_invoices.customer_view_token` if present, otherwise add to schema during implementation).

Add a section below the invoice details:

```
┌──────────────────────────────────────────────────────┐
│ Have you paid this invoice?                          │
│                                                       │
│ Click below to let us know. We'll verify the payment │
│ on our side and mark it complete.                    │
│                                                       │
│ ┌────────────────────────────────────────────────┐   │
│ │ Optional note (reference number, time, etc.)   │   │
│ │                                                │   │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ [ I've paid this invoice ]                           │
└──────────────────────────────────────────────────────┘
```

Click handler `POST /api/billing/i/[token]/mark-paid`:
- Validates token, idempotent (no-op if already `awaiting_verification` or `paid`)
- Sets `status='awaiting_verification'`, `client_marked_paid_at=now()`, `client_payment_note=<input>`
- Triggers a lead-notification to the admin (per the existing `/api/lead-notifications` pattern, since the project memory mandates lead notifications must always reach the admin end-to-end)
- Returns confirmation page: "Thanks. We'll verify on our side and confirm shortly."

## 11. Admin verification flow

In Billing Pipeline → Awaiting verification tab. Each row has two actions:

- **Mark verified** → `PATCH /api/admin/qwikly-billing-invoices/[id]` body `{status: 'paid', payment_method: 'eft', external_ref: '<input>'}`. Status → `paid`, `paid_at=now()`. Creates a `payments` row with `verified=true`.
- **Mark not received** → reverts to `status='sent'`. Optional admin note. Sends a follow-up email to the client.

## 12. Edge cases

| Case | Handling |
|---|---|
| Client paused mid-cycle | `crm_status` filter in cron skips them; CRM badge frozen at last state |
| Plan changed mid-cycle | Anchor day unchanged; next invoice uses new plan's MRR + actual usage stats |
| First invoice covers partial month | Stats window is `[billing_anchor_set_at, today]`, full plan price still charged. Optional pro-rata is out of scope |
| Email bounce + WhatsApp delivery fail | Invoice stays `draft`, alerted as "Send failed" in pipeline |
| Client clicks "I've paid" twice | Idempotent: second click is a no-op (already `awaiting_verification`) |
| Refund | Out of scope this iteration. Use existing `refunded` status manually if needed |
| Anchor_day=29/30/31, short month | Bill on last day of month per Section 9 overflow rule |
| Two invoices accidentally generated same day | Cron query's `NOT EXISTS` clause prevents this at application level. If we want belt-and-braces, implementation can add a partial unique index on `(client_id, (created_at AT TIME ZONE 'Africa/Johannesburg')::date)`: decide during implementation, not required for correctness |
| Client clicks "I've paid" but admin sees no deposit | Admin clicks "Mark not received", status reverts to `sent`, follow-up email sent |
| Invoice marked paid manually before cron's overdue pass | Pass 2 only flips `sent` → `overdue`. Paid invoices unaffected |

## 13. Surface inventory (files touched / created)

### New files

- `supabase/migrations/20260508_billing_anchor_tracker.sql`: schema migration
- `src/app/(app)/admin/billing/pipeline/page.tsx`: pipeline tracker page
- `src/app/api/cron/billing-anchor-tick/route.ts`: daily cron
- `src/app/api/billing/i/[token]/mark-paid/route.ts`: client self-confirm endpoint
- `src/app/api/admin/qwikly-billing-invoices/[id]/route.ts`: admin verify/revert endpoint (if not already present)
- `src/lib/billing/anchor.ts`: pure-function helpers (next-anchor-date, days-until, month-end overflow)
- `src/lib/billing/stats-aggregator.ts`: usage stats query module
- `src/lib/billing/invoice-generator.ts`: orchestrates aggregator + insert + send

### Modified files

- `src/app/(app)/admin/clients/page.tsx`: new "Next invoice" column, sort, filter
- `src/lib/crm-types.ts`: extend `CrmClientListItem` with `next_invoice_at`, `latest_billing_invoice_status`, `billing_anchor_day`
- `src/app/api/admin/crm/clients/route.ts`: return new fields
- `src/app/(app)/admin/clients/[id]/page.tsx`: add "Set billing day" form
- `src/app/i/[token]/page.tsx`: add "I've paid" section (verify if path; create if missing)
- `vercel.json`: add cron entry for `/api/cron/billing-anchor-tick`
- `src/lib/invoices/types.ts`: introduce a `QwiklyBillingInvoiceStatus` union (`'draft' | 'sent' | 'awaiting_verification' | 'paid' | 'overdue' | 'written_off' | 'disputed'`) and tighten `QwiklyBillingInvoice.status` from `string` to this union. Do **not** modify the existing `InvoiceStatus` union, that's for client→customer invoices and is unaffected.

## 14. Testing

- **Unit tests** for `anchor.ts`: next-anchor-date logic, month-end overflow (Jan 31 → Feb 28, leap year, 30-day months)
- **Unit tests** for `stats-aggregator.ts`: missing data → omit, empty result → empty stats array, channel grouping
- **Integration test** for the cron endpoint: seed a client with anchor_day=today, run cron, assert invoice created + sent_at set + line_items snapshot non-empty
- **Integration test** for the "I've paid" flow: POST mark-paid → status flips, admin notification fires
- **Integration test** for verify flow: PATCH verify → status='paid', payments row created, anchor counter resets
- **E2E (Playwright) smoke**: admin views CRM list, sees countdown column with correct copy for at least three different states

## 15. Open questions for implementation phase

These will be resolved during the implementation plan, not now:

1. Does `clients.last_invoiced_at` exist or do we derive from `MAX(qwikly_billing_invoices.sent_at)`?
2. Does the customer_view_token already exist on `qwikly_billing_invoices`, or do we need to add it?
3. What is the exact `vercel.json` cron syntax used by existing crons in this project?
4. Are there RLS policies that need updating for the new `client_marked_paid_at` and `billing_anchor_day` columns?

## 16. Approval

Brainstorming approved by Liam Clarke on 2026-05-08 with the message: "if you think this is good and that this works and this is everything we're going to need, go ahead."

Next step: writing-plans skill produces a detailed implementation plan from this spec.
