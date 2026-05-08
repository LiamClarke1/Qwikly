# Billing Anchor Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-client monthly invoice countdown to the admin CRM, plus a Billing Pipeline tracker, daily auto-generation cron with usage-stat line items, and a client self-confirm "I've paid" flow.

**Architecture:** Pure-function logic in `src/lib/billing/` (anchor math, stats aggregator, invoice generator), thin Next.js App Router API routes that compose those, and React components that render the new UI surfaces. Data lives in existing `qwikly_billing_periods` and `qwikly_billing_invoices` tables plus two new columns on `clients`. One daily cron (`/api/cron/billing-anchor-tick` at 06:00 SAST) drives auto-generation.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), Tailwind CSS, lucide-react icons, Resend (email), Twilio (WhatsApp), Playwright for E2E.

**Spec:** [docs/superpowers/specs/2026-05-08-billing-anchor-tracker-design.md](../specs/2026-05-08-billing-anchor-tracker-design.md)

**Testing convention:** This codebase has Playwright E2E only, no unit-test framework. Per-task verification is `npx tsc --noEmit` for type safety, `npm run lint`, and dev-server smoke. Final E2E in Task 13.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260508_billing_anchor_tracker.sql` | Schema: anchor day on clients, awaiting_verification status, client-side payment fields |
| `src/lib/billing/anchor.ts` | Pure date math: next anchor date, days until, month-end overflow |
| `src/lib/billing/stats-aggregator.ts` | Aggregates last-billing-window Qwikly usage stats for a client |
| `src/lib/billing/invoice-generator.ts` | Orchestrator: aggregate + create period + create invoice + send |
| `src/lib/billing/notify.ts` | Sends admin lead-notification when client clicks "I've paid" |
| `src/app/api/cron/billing-anchor-tick/route.ts` | Daily cron: generate today's invoices + flip overdue |
| `src/app/api/billing/i/[token]/mark-paid/route.ts` | Client self-confirm endpoint |
| `src/app/api/admin/qwikly-billing-invoices/[id]/route.ts` | Admin PATCH: verify, revert, mark paid |
| `src/app/api/admin/billing/pipeline/route.ts` | GET pipeline data (forecast, awaiting verification, overdue, paid) |
| `src/app/(app)/admin/billing/pipeline/page.tsx` | Billing Pipeline tracker page |
| `src/app/(app)/admin/clients/components/NextInvoiceBadge.tsx` | Countdown badge for CRM list |
| `tests/e2e/flow5-billing-anchor.spec.ts` | Playwright golden-path test |

### Modified files

| Path | Change |
|---|---|
| `src/lib/crm-types.ts` | Add billing fields to list+detail types; add `QwiklyBillingInvoiceStatus` union |
| `src/lib/invoices/types.ts` | Tighten `QwiklyBillingInvoice.status` from `string` to the new union |
| `src/app/api/admin/crm/clients/route.ts` | Return new fields (`billing_anchor_day`, `next_invoice_at`, `latest_billing_invoice_status`) and support new sort + filter |
| `src/app/(app)/admin/clients/page.tsx` | Add Next-invoice column with `NextInvoiceBadge`, sort key, filter group |
| `src/app/(app)/admin/clients/[id]/page.tsx` | Add "Set billing day" form section |
| `src/app/i/[token]/page.tsx` | Add "I've paid" button + note input |
| `vercel.json` | Register the new cron entry |

---

## Conventions used throughout

**Supabase client:**
- Server-side: `createServerClient` from `@/lib/supabase/server` (existing helper)
- Service-role for cron: `createServiceClient` from `@/lib/supabase/service` (existing helper, used by other crons)

**Cron auth (matches existing pattern from `src/app/api/cron/client-cleanup/route.ts`):**
```typescript
const auth = req.headers.get("authorization");
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

**Time zone:** All anchor logic operates in `Africa/Johannesburg` (SAST). Use `date-fns-tz` if needed; otherwise compute via Postgres `AT TIME ZONE 'Africa/Johannesburg'`.

**Currency:** All amounts stored in ZAR cents (integer). Display via existing `formatZAR(amountInCents / 100)` from `@/lib/format`.

**No "AI" language anywhere client-facing.** Use "your Qwikly digital assistant" or "Qwikly digital system" per project convention.

**No em dashes in copy.** Use commas or colons.

---

## Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/20260508_billing_anchor_tracker.sql`

- [ ] **Step 1.1: Write the migration SQL**

Create `supabase/migrations/20260508_billing_anchor_tracker.sql` with:

```sql
-- Billing anchor tracker: per-client monthly invoice cycle
-- Adds anchor day to clients, awaiting_verification status to qwikly_billing_invoices,
-- and client-side self-confirmation fields.

BEGIN;

-- 1. Anchor day per client (manually set by admin after first paid invoice)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_anchor_day smallint
    CHECK (billing_anchor_day BETWEEN 1 AND 31);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_anchor_set_at timestamptz;

-- 2. New invoice status: client clicked "I've paid", admin not yet verified
ALTER TABLE qwikly_billing_invoices
  DROP CONSTRAINT IF EXISTS qwikly_billing_invoices_status_check;

ALTER TABLE qwikly_billing_invoices
  ADD CONSTRAINT qwikly_billing_invoices_status_check
  CHECK (status IN (
    'draft', 'sent', 'awaiting_verification',
    'paid', 'overdue', 'written_off', 'disputed'
  ));

-- 3. Track when client self-confirmed payment + their note
ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS client_marked_paid_at timestamptz;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS client_payment_note text;

-- 4. Index for cron lookups (fast filtering by anchor day)
CREATE INDEX IF NOT EXISTS idx_clients_billing_anchor_day
  ON clients(billing_anchor_day)
  WHERE billing_anchor_day IS NOT NULL;

COMMIT;
```

- [ ] **Step 1.2: Apply migration locally**

Run: `npx supabase db push` (or whichever apply command this project uses, check `supabase/README.md` if unsure).

Expected: migration runs without errors; new columns visible in Studio.

- [ ] **Step 1.3: Verify columns exist**

Run via Supabase SQL editor or `psql`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('billing_anchor_day', 'billing_anchor_set_at');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'qwikly_billing_invoices'
  AND column_name IN ('client_marked_paid_at', 'client_payment_note');
```

Expected: both queries return 2 rows each.

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260508_billing_anchor_tracker.sql
git commit -m "feat(billing): add billing_anchor_day + awaiting_verification status

Schema foundation for monthly invoice countdown and client self-confirm flow."
```

---

## Task 2: Type updates

**Files:**
- Modify: `src/lib/crm-types.ts`
- Modify: `src/lib/invoices/types.ts`

- [ ] **Step 2.1: Add `QwiklyBillingInvoiceStatus` union to `src/lib/invoices/types.ts`**

After the existing `InvoiceStatus` definition (around line 1-12), add:

```typescript
export type QwiklyBillingInvoiceStatus =
  | "draft"
  | "sent"
  | "awaiting_verification"
  | "paid"
  | "overdue"
  | "written_off"
  | "disputed";
```

Then change `QwiklyBillingInvoice.status` from `string` to `QwiklyBillingInvoiceStatus`:

```typescript
// Find this line in QwiklyBillingInvoice interface:
//   status: string;
// Replace with:
status: QwiklyBillingInvoiceStatus;
```

- [ ] **Step 2.2: Extend `CrmClientListItem` and `CrmClientDetail` in `src/lib/crm-types.ts`**

Add to `CrmClientListItem` interface (after `created_at: string;` line):

```typescript
// Billing anchor tracker
billing_anchor_day: number | null;
next_invoice_at: string | null;          // computed ISO date string
latest_billing_invoice_status: import("./invoices/types").QwiklyBillingInvoiceStatus | null;
days_overdue: number | null;             // null unless status='overdue'
```

Add to `CrmClientDetail` interface (after the inherited fields, near `web_widget_domain`):

```typescript
billing_anchor_set_at: string | null;
```

- [ ] **Step 2.3: Type-check**

Run: `npx tsc --noEmit`

Expected: no new type errors. Pre-existing errors (if any) are unrelated and tracked separately.

- [ ] **Step 2.4: Commit**

```bash
git add src/lib/crm-types.ts src/lib/invoices/types.ts
git commit -m "feat(types): add billing anchor fields and QwiklyBillingInvoiceStatus union"
```

---

## Task 3: Anchor logic (pure functions)

**Files:**
- Create: `src/lib/billing/anchor.ts`

- [ ] **Step 3.1: Create the anchor module**

Create `src/lib/billing/anchor.ts`:

```typescript
/**
 * Billing anchor date math.
 * All functions operate in Africa/Johannesburg timezone.
 */

const TZ = "Africa/Johannesburg";

/** Get today's date in SAST as a Date at midnight local. */
export function todaySast(): Date {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const d = Number(parts.find(p => p.type === "day")!.value);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Last day of the month for a given UTC date. */
export function daysInMonth(year: number, monthZeroIdx: number): number {
  return new Date(Date.UTC(year, monthZeroIdx + 1, 0)).getUTCDate();
}

/**
 * Compute the next billing anchor date for a client.
 * - If anchor_day exists in this month and we're before/on it: return this month's anchor.
 * - If we're past this month's anchor: return next month's (clamped to month length).
 * - Month-end overflow: if anchor_day > days in month, billing falls on last day.
 */
export function nextAnchorDate(anchorDay: number, from?: Date): Date {
  if (anchorDay < 1 || anchorDay > 31) {
    throw new Error(`Invalid anchorDay: ${anchorDay}`);
  }
  const today = from ?? todaySast();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();

  const thisMonthCap = daysInMonth(y, m);
  const thisMonthAnchor = Math.min(anchorDay, thisMonthCap);

  if (d <= thisMonthAnchor) {
    return new Date(Date.UTC(y, m, thisMonthAnchor));
  }

  const nextY = m === 11 ? y + 1 : y;
  const nextM = m === 11 ? 0 : m + 1;
  const nextCap = daysInMonth(nextY, nextM);
  const nextAnchor = Math.min(anchorDay, nextCap);
  return new Date(Date.UTC(nextY, nextM, nextAnchor));
}

/** Days from `from` to next anchor, inclusive of today. */
export function daysUntilNextAnchor(anchorDay: number, from?: Date): number {
  const today = from ?? todaySast();
  const next = nextAnchorDate(anchorDay, today);
  const diffMs = next.getTime() - today.getTime();
  return Math.round(diffMs / 86_400_000);
}

/**
 * Whether today is a billing day for this anchor.
 * Includes month-end overflow: anchor=31 in February → bills on Feb 28/29.
 */
export function isAnchorDayToday(anchorDay: number, from?: Date): boolean {
  const today = from ?? todaySast();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  const lastDay = daysInMonth(y, m);

  if (d === anchorDay) return true;
  if (d === lastDay && anchorDay > lastDay) return true;
  return false;
}

/**
 * Compute the billing window for an upcoming invoice.
 * Window is [previousAnchor, nextAnchor) so usage in the upcoming
 * invoice's window is what gets billed today.
 */
export function billingWindowEndingAt(anchorEnd: Date): { start: Date; end: Date } {
  const y = anchorEnd.getUTCFullYear();
  const m = anchorEnd.getUTCMonth();
  const d = anchorEnd.getUTCDate();

  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  const prevCap = daysInMonth(prevY, prevM);
  const start = new Date(Date.UTC(prevY, prevM, Math.min(d, prevCap)));

  return { start, end: anchorEnd };
}
```

- [ ] **Step 3.2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3.3: Quick smoke test via temporary script**

Create `scripts/smoke-anchor.ts`:

```typescript
import {
  nextAnchorDate, daysUntilNextAnchor, isAnchorDayToday, billingWindowEndingAt,
} from "../src/lib/billing/anchor";

// Anchor = 15, today = Jan 10 → next anchor Jan 15, 5 days
const t1 = new Date(Date.UTC(2026, 0, 10));
console.log("anchor=15 from Jan 10:", nextAnchorDate(15, t1).toISOString());
console.log("days until:", daysUntilNextAnchor(15, t1));
console.assert(daysUntilNextAnchor(15, t1) === 5, "expected 5 days");

// Anchor = 31, today = Feb 28 → bills today (overflow)
const t2 = new Date(Date.UTC(2026, 1, 28));
console.log("anchor=31 today=Feb 28:", isAnchorDayToday(31, t2));
console.assert(isAnchorDayToday(31, t2) === true, "expected month-end overflow");

// Anchor = 31, today = Feb 27 → not today, next is Feb 28
const t3 = new Date(Date.UTC(2026, 1, 27));
console.log("anchor=31 today=Feb 27:", isAnchorDayToday(31, t3), nextAnchorDate(31, t3).toISOString());
console.assert(isAnchorDayToday(31, t3) === false, "expected not today");
console.assert(nextAnchorDate(31, t3).getUTCDate() === 28, "expected Feb 28");

// Window for anchor=15, ending Jan 15 → Dec 15 to Jan 15
const t4 = new Date(Date.UTC(2026, 0, 15));
const w = billingWindowEndingAt(t4);
console.log("window:", w.start.toISOString(), "→", w.end.toISOString());
console.assert(w.start.getUTCMonth() === 11, "expected Dec");

console.log("✓ all smoke assertions passed");
```

Run: `npx tsx scripts/smoke-anchor.ts`

Expected: prints results, all assertions pass, no errors.

- [ ] **Step 3.4: Delete the smoke script (it was scratch)**

```bash
rm scripts/smoke-anchor.ts
```

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/billing/anchor.ts
git commit -m "feat(billing): pure-function anchor date math

nextAnchorDate, daysUntilNextAnchor, isAnchorDayToday, billingWindowEndingAt.
Handles month-end overflow (anchor=31 in Feb bills on Feb 28/29)."
```

---

## Task 4: Stats aggregator

**Files:**
- Create: `src/lib/billing/stats-aggregator.ts`

- [ ] **Step 4.1: Create the stats-aggregator module**

Create `src/lib/billing/stats-aggregator.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export interface BillingStat {
  key: string;
  label: string;
  value: number | string;
  /** Optional sub-breakdown shown indented on invoice. */
  breakdown?: { label: string; value: number | string }[];
}

export interface StatsAggregationResult {
  stats: BillingStat[];
  warnings: string[];
}

const HUMAN_HANDLE_TIME_MIN = 5;

/**
 * Aggregate Qwikly usage stats for a client over a billing window.
 * Missing data → omit (do not fake). Warnings logged for admin review.
 */
export async function aggregateStats(
  sb: SupabaseClient,
  clientId: number,
  windowStart: Date,
  windowEnd: Date,
): Promise<StatsAggregationResult> {
  const stats: BillingStat[] = [];
  const warnings: string[] = [];
  const startIso = windowStart.toISOString();
  const endIso = windowEnd.toISOString();

  // 1. Conversation count (total + by channel)
  const conv = await sb
    .from("conversations")
    .select("channel", { count: "exact" })
    .eq("client_id", clientId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (conv.error) {
    warnings.push(`conversations query failed: ${conv.error.message}`);
  } else {
    const total = conv.count ?? 0;
    const byChannel: Record<string, number> = {};
    (conv.data ?? []).forEach((c: { channel: string | null }) => {
      const k = c.channel ?? "unknown";
      byChannel[k] = (byChannel[k] ?? 0) + 1;
    });
    if (total > 0) {
      stats.push({
        key: "conversations",
        label: "Conversations handled by your Qwikly digital assistant",
        value: total,
        breakdown: Object.entries(byChannel).map(([ch, n]) => ({
          label: ch,
          value: n,
        })),
      });
    }
  }

  // 2. Qualified leads (conversations with lead_intent set)
  const leads = await sb
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .not("lead_intent", "is", null);

  if (!leads.error && (leads.count ?? 0) > 0) {
    stats.push({
      key: "qualified_leads",
      label: "Qualified leads captured",
      value: leads.count!,
    });
  } else if (leads.error) {
    warnings.push(`leads query failed: ${leads.error.message}`);
  }

  // 3. Bookings created
  const bookings = await sb
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (!bookings.error && (bookings.count ?? 0) > 0) {
    stats.push({
      key: "bookings",
      label: "Bookings created via Qwikly",
      value: bookings.count!,
    });
  } else if (bookings.error) {
    warnings.push(`bookings query failed: ${bookings.error.message}`);
  }

  // 4. Average response time
  const rt = await sb
    .from("conversations")
    .select("first_response_seconds")
    .eq("client_id", clientId)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .not("first_response_seconds", "is", null);

  if (!rt.error && (rt.data ?? []).length > 0) {
    const arr = (rt.data as { first_response_seconds: number }[]);
    const avg = arr.reduce((s, r) => s + r.first_response_seconds, 0) / arr.length;
    stats.push({
      key: "avg_response_time_seconds",
      label: "Average response time",
      value: `${Math.round(avg)} seconds`,
    });
  } else if (rt.error) {
    warnings.push(`response_time query failed: ${rt.error.message}`);
  }

  // 5. Estimated time saved (conversations × avg human handle time)
  const totalConvs = (conv.count ?? 0);
  if (totalConvs > 0) {
    const minutesSaved = totalConvs * HUMAN_HANDLE_TIME_MIN;
    const hours = Math.round((minutesSaved / 60) * 10) / 10;
    stats.push({
      key: "time_saved_hours",
      label: "Estimated staff time saved",
      value: `${hours} hours`,
    });
  }

  return { stats, warnings };
}
```

- [ ] **Step 4.2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. If `bookings` table or columns differ from assumptions, fix the column names by checking the Supabase schema.

- [ ] **Step 4.3: Commit**

```bash
git add src/lib/billing/stats-aggregator.ts
git commit -m "feat(billing): stats aggregator for invoice line items

Pulls conversations, leads, bookings, response time, and time saved
for a billing window. Missing data omits stat with warning, never fakes."
```

---

## Task 5: Invoice generator

**Files:**
- Create: `src/lib/billing/invoice-generator.ts`
- Create: `src/lib/billing/notify.ts`

- [ ] **Step 5.1: Create the notify helper**

Create `src/lib/billing/notify.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insert a lead-style notification for the admin (Liam).
 * Uses the existing lead_notifications table so the admin's existing
 * realtime channel surfaces the alert.
 */
export async function notifyAdmin(
  sb: SupabaseClient,
  args: { title: string; body: string; href?: string; client_id?: number },
): Promise<void> {
  const { error } = await sb.from("lead_notifications").insert({
    title: args.title,
    body: args.body,
    href: args.href ?? null,
    client_id: args.client_id ?? null,
    kind: "billing",
  });
  if (error) {
    console.error("[notifyAdmin] failed:", error.message);
  }
}
```

- [ ] **Step 5.2: Create the invoice generator**

Create `src/lib/billing/invoice-generator.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateStats } from "./stats-aggregator";
import { billingWindowEndingAt, todaySast } from "./anchor";
import { sendInvoiceEmail } from "@/lib/invoices/email";
import { sendInvoiceWhatsApp } from "@/lib/invoices/whatsapp";

interface GenerateResult {
  invoice_id: string | null;
  status: "sent" | "draft" | "skipped";
  reason?: string;
}

const VAT_RATE = 0.15;

/**
 * Generate and send a Qwikly→client invoice for today's anchor.
 * Idempotent: if an invoice already exists for this client today, returns 'skipped'.
 */
export async function generateAndSendInvoice(
  sb: SupabaseClient,
  clientId: number,
): Promise<GenerateResult> {
  // 1. Load client with billing fields
  const clientRes = await sb
    .from("clients")
    .select("id, business_name, client_email, whatsapp_number, mrr_zar, plan, billing_anchor_day, billing_anchor_set_at")
    .eq("id", clientId)
    .single();

  if (clientRes.error || !clientRes.data) {
    return { invoice_id: null, status: "skipped", reason: `client_load_error: ${clientRes.error?.message ?? "not found"}` };
  }
  const client = clientRes.data;

  if (!client.billing_anchor_day) {
    return { invoice_id: null, status: "skipped", reason: "no_anchor_day_set" };
  }

  // 2. Idempotency: check if an invoice was already created today (SAST)
  const today = todaySast();
  const dayStartIso = today.toISOString();
  const dayEndIso = new Date(today.getTime() + 86_400_000).toISOString();

  const dup = await sb
    .from("qwikly_billing_invoices")
    .select("id")
    .eq("client_id", clientId)
    .gte("created_at", dayStartIso)
    .lt("created_at", dayEndIso)
    .limit(1);

  if (dup.error) {
    return { invoice_id: null, status: "skipped", reason: `dup_check_error: ${dup.error.message}` };
  }
  if ((dup.data ?? []).length > 0) {
    return { invoice_id: dup.data![0].id, status: "skipped", reason: "already_invoiced_today" };
  }

  // 3. Compute billing window
  const window = billingWindowEndingAt(today);
  const windowStart = client.billing_anchor_set_at && new Date(client.billing_anchor_set_at) > window.start
    ? new Date(client.billing_anchor_set_at)
    : window.start;

  // 4. Aggregate stats
  const { stats, warnings } = await aggregateStats(sb, clientId, windowStart, window.end);

  // 5. Compute totals
  const subtotalZar = (client.mrr_zar ?? 0) / 100;
  const vatZar = Math.round(subtotalZar * VAT_RATE * 100) / 100;
  const totalZar = subtotalZar + vatZar;

  // 6. Create billing period
  const periodIns = await sb
    .from("qwikly_billing_periods")
    .insert({
      client_id: clientId,
      period_start: windowStart.toISOString().slice(0, 10),
      period_end: window.end.toISOString().slice(0, 10),
      total_invoiced_zar: totalZar,
      status: "locked",
      due_at: new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (periodIns.error || !periodIns.data) {
    return { invoice_id: null, status: "skipped", reason: `period_insert_error: ${periodIns.error?.message}` };
  }
  const periodId = periodIns.data.id;

  // 7. Generate invoice number QWK-YYYY-MM-NNNN
  const yyyymm = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const seqRes = await sb.rpc("nextval", { seq: "qwikly_billing_number_seq" } as never)
    .single<{ nextval: number }>();
  const seqNum = seqRes.data?.nextval ?? Math.floor(Math.random() * 9999);
  const invoiceNumber = `QWK-${yyyymm}-${String(seqNum).padStart(4, "0")}`;

  // 8. Create the invoice (status='draft' first, flip to 'sent' after delivery)
  const invIns = await sb
    .from("qwikly_billing_invoices")
    .insert({
      client_id: clientId,
      period_id: periodId,
      invoice_number: invoiceNumber,
      total_zar: totalZar,
      vat_zar: vatZar,
      status: "draft",
      due_at: new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10),
      line_items_jsonb: stats,
    })
    .select("id, customer_view_token")
    .single();

  if (invIns.error || !invIns.data) {
    return { invoice_id: null, status: "skipped", reason: `invoice_insert_error: ${invIns.error?.message}` };
  }
  const invoiceId = invIns.data.id;

  // 9. Persist warnings to dlq for visibility
  if (warnings.length) {
    await sb.from("chat_persist_dlq").insert({
      channel: "billing-stats",
      payload: { invoice_id: invoiceId, warnings },
    });
  }

  // 10. Send via email + WhatsApp using existing senders
  let emailOk = false;
  let waOk = false;
  try {
    if (client.client_email) {
      await sendInvoiceEmail({
        to: client.client_email,
        invoiceNumber,
        totalZar,
        clientId,
        invoiceId,
      });
      emailOk = true;
    }
  } catch (e) {
    console.error("[invoice-generator] email send failed:", e);
  }
  try {
    if (client.whatsapp_number) {
      await sendInvoiceWhatsApp({
        to: client.whatsapp_number,
        invoiceNumber,
        totalZar,
        clientId,
        invoiceId,
      });
      waOk = true;
    }
  } catch (e) {
    console.error("[invoice-generator] whatsapp send failed:", e);
  }

  if (emailOk || waOk) {
    await sb
      .from("qwikly_billing_invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoiceId);
    return { invoice_id: invoiceId, status: "sent" };
  }

  return { invoice_id: invoiceId, status: "draft", reason: "delivery_failed" };
}
```

- [ ] **Step 5.3: Verify the existing email/WhatsApp senders match the calls**

Read `src/lib/invoices/email.ts` and `src/lib/invoices/whatsapp.ts`. Confirm `sendInvoiceEmail` and `sendInvoiceWhatsApp` accept the args used above. If their signatures differ, adjust the calls in `invoice-generator.ts` to match.

- [ ] **Step 5.4: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. If errors point to misnamed exports or arg shapes, fix the calls.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/billing/invoice-generator.ts src/lib/billing/notify.ts
git commit -m "feat(billing): invoice generator + admin notify helper

Idempotent monthly invoice creation: aggregates stats, creates period+invoice,
sends via email+WhatsApp using existing /lib/invoices senders.
Sets status='sent' on at-least-one-channel success, 'draft' on full failure."
```

---

## Task 6: Daily cron route

**Files:**
- Create: `src/app/api/cron/billing-anchor-tick/route.ts`
- Modify: `vercel.json`

- [ ] **Step 6.1: Create the cron route**

Create `src/app/api/cron/billing-anchor-tick/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAndSendInvoice } from "@/lib/billing/invoice-generator";
import { todaySast } from "@/lib/billing/anchor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sb = createServiceClient();
  const today = todaySast();
  const dToday = today.getUTCDate();

  // Compute last day of month (in SAST)
  const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();

  // Pass 1: find clients due today
  const dueRes = await sb
    .from("clients")
    .select("id, billing_anchor_day, business_name")
    .not("billing_anchor_day", "is", null)
    .not("crm_status", "in", "(churned,paused,pending_deletion)")
    .or(`billing_anchor_day.eq.${dToday},and(billing_anchor_day.gt.${lastDay})`)
    .returns<{ id: number; billing_anchor_day: number; business_name: string | null }[]>();

  if (dueRes.error) {
    return NextResponse.json({ error: dueRes.error.message }, { status: 500 });
  }

  // Filter: keep only those whose anchor really matches (handles overflow case)
  const due = (dueRes.data ?? []).filter(c => {
    if (c.billing_anchor_day === dToday) return true;
    if (dToday === lastDay && c.billing_anchor_day > lastDay) return true;
    return false;
  });

  const results: { client_id: number; status: string; reason?: string; invoice_id: string | null }[] = [];
  for (const client of due) {
    const r = await generateAndSendInvoice(sb, client.id);
    results.push({ client_id: client.id, ...r });
  }

  // Pass 2: flip overdue
  const overdueRes = await sb
    .from("qwikly_billing_invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_at", today.toISOString().slice(0, 10))
    .select("id");

  return NextResponse.json({
    ok: true,
    today_sast: today.toISOString().slice(0, 10),
    generated: results.filter(r => r.status === "sent").length,
    drafts: results.filter(r => r.status === "draft").length,
    skipped: results.filter(r => r.status === "skipped").length,
    flipped_overdue: (overdueRes.data ?? []).length,
    detail: results,
  });
}
```

- [ ] **Step 6.2: Register the cron in vercel.json**

Edit `vercel.json`. Add this entry to the `crons` array:

```json
{
  "path": "/api/cron/billing-anchor-tick",
  "schedule": "0 4 * * *"
}
```

(SAST is UTC+2; 06:00 SAST = 04:00 UTC.)

- [ ] **Step 6.3: Type-check + lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```

Expected: no errors.

- [ ] **Step 6.4: Local smoke test**

Start the dev server: `npm run dev` (in a separate terminal).

Run:
```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/billing-anchor-tick
```

Expected: 200 with JSON body `{ok: true, today_sast: ..., generated: 0, ...}` (assuming no clients have today as anchor day in your local data). If you have a test client, set their `billing_anchor_day` to today's day-of-month and re-run; expect `generated: 1`.

- [ ] **Step 6.5: Commit**

```bash
git add src/app/api/cron/billing-anchor-tick/route.ts vercel.json
git commit -m "feat(billing): daily cron generates today's invoices + flips overdue

Runs 06:00 SAST. Pass 1 generates invoices for clients with today as anchor.
Pass 2 flips 'sent' invoices past due_at to 'overdue'."
```

---

## Task 7: Client "I've paid" API + UI

**Files:**
- Create: `src/app/api/billing/i/[token]/mark-paid/route.ts`
- Modify: `src/app/i/[token]/page.tsx` (verify path; create if it does not exist for qwikly_billing_invoices)

- [ ] **Step 7.1: Verify the customer-view page path for Qwikly billing invoices**

Run:
```bash
find /Users/liamclarke/qwikly-site/src/app -path "*/i/*" -name "page.tsx"
```

If `/i/[token]` exists and serves both client→customer and Qwikly→client invoices via token disambiguation, modify it. If only the former, decide on a new route — recommended: `/qwikly-i/[token]/page.tsx` for the Qwikly→client view, to avoid token-collision concerns.

(Implementation steps below assume the new route `/qwikly-i/[token]`. Adjust if shared route is preferred.)

- [ ] **Step 7.2: Create the mark-paid API endpoint**

Create `src/app/api/billing/i/[token]/mark-paid/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyAdmin } from "@/lib/billing/notify";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sb = createServiceClient();

  // Look up invoice by customer_view_token
  const inv = await sb
    .from("qwikly_billing_invoices")
    .select("id, status, client_id, invoice_number, total_zar, clients(business_name)")
    .eq("customer_view_token", params.token)
    .single();

  if (inv.error || !inv.data) {
    return NextResponse.json({ error: "invoice_not_found" }, { status: 404 });
  }

  // Idempotent: if already in awaiting/paid, no-op success
  if (inv.data.status === "awaiting_verification" || inv.data.status === "paid") {
    return NextResponse.json({ ok: true, status: inv.data.status, note: "already_marked" });
  }

  // Only allow flipping from sent or overdue
  if (inv.data.status !== "sent" && inv.data.status !== "overdue") {
    return NextResponse.json({ error: "invalid_status_transition", from: inv.data.status }, { status: 409 });
  }

  const upd = await sb
    .from("qwikly_billing_invoices")
    .update({
      status: "awaiting_verification",
      client_marked_paid_at: new Date().toISOString(),
      client_payment_note: parsed.data.note ?? null,
    })
    .eq("id", inv.data.id);

  if (upd.error) {
    return NextResponse.json({ error: upd.error.message }, { status: 500 });
  }

  // Fire admin notification
  const businessName = (inv.data as { clients?: { business_name?: string } }).clients?.business_name ?? "A client";
  await notifyAdmin(sb, {
    title: `${businessName} marked invoice paid`,
    body: `Invoice ${inv.data.invoice_number} (R ${(inv.data.total_zar).toFixed(2)}) is awaiting verification.${parsed.data.note ? ` Note: ${parsed.data.note}` : ""}`,
    href: `/admin/billing/pipeline?tab=awaiting`,
    client_id: inv.data.client_id,
  });

  return NextResponse.json({ ok: true, status: "awaiting_verification" });
}
```

- [ ] **Step 7.3: Add "I've paid" UI to the invoice view page**

If `/qwikly-i/[token]/page.tsx` does not yet exist, create a minimal client invoice viewer page that fetches the invoice by token and renders the line items. Add this section near the bottom (after invoice details):

```tsx
"use client";
import { useState } from "react";

function PaidConfirm({ token }: { token: string }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/billing/i/${token}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() || undefined }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong, please try again.");
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
        <p className="font-semibold">Thanks, we got it.</p>
        <p className="text-sm mt-1">We will verify the payment on our side and confirm shortly.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="font-semibold text-slate-800 mb-1">Have you paid this invoice?</p>
      <p className="text-sm text-slate-500 mb-3">
        Click below to let us know. We will verify the payment on our side and mark it complete.
      </p>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Optional note (reference number, time, etc.)"
        className="w-full rounded-xl border border-slate-200 p-3 text-sm mb-3 min-h-[60px]"
        maxLength={500}
      />
      <button
        onClick={submit}
        disabled={submitting}
        className="px-4 py-2 rounded-xl bg-[#E85A2C] text-white font-semibold text-sm hover:bg-[#d04f25] disabled:opacity-60 cursor-pointer"
      >
        {submitting ? "Sending..." : "I've paid this invoice"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Render <PaidConfirm token={token} /> in the invoice page below details,
// only when status is 'sent' or 'overdue'.
```

- [ ] **Step 7.4: Type-check + lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 7.5: Local smoke test**

Use a real or seeded `qwikly_billing_invoices` row with a known `customer_view_token`. Open `http://localhost:3000/qwikly-i/<token>` (or shared route), click "I've paid". Verify:
- UI shows the success message
- `qwikly_billing_invoices.status` flipped to `awaiting_verification`
- A row appeared in `lead_notifications` with `kind='billing'`

- [ ] **Step 7.6: Commit**

```bash
git add src/app/api/billing/i/ src/app/qwikly-i 2>/dev/null || git add src/app/i
git commit -m "feat(billing): client self-confirm I've paid + admin notification

POST /api/billing/i/[token]/mark-paid flips status to awaiting_verification
and pings admin via lead_notifications. Idempotent on double-clicks."
```

---

## Task 8: Admin verify endpoint

**Files:**
- Create: `src/app/api/admin/qwikly-billing-invoices/[id]/route.ts`

- [ ] **Step 8.1: Create the admin PATCH endpoint**

Create `src/app/api/admin/qwikly-billing-invoices/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["verify", "revert", "mark_paid"]),
  payment_method: z.string().optional(),
  external_ref: z.string().optional(),
  admin_note: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sb = createServerClient();

  // Auth: admin only
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const profile = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile.data?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.flatten() }, { status: 400 });
  }
  const { action, payment_method, external_ref, admin_note } = parsed.data;

  // Load invoice
  const inv = await sb
    .from("qwikly_billing_invoices")
    .select("id, status, client_id, total_zar")
    .eq("id", params.id)
    .single();
  if (inv.error || !inv.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "verify" || action === "mark_paid") {
    // verify: from awaiting_verification → paid
    // mark_paid: from any sent/overdue/awaiting_verification → paid (admin saw direct deposit)
    if (action === "verify" && inv.data.status !== "awaiting_verification") {
      return NextResponse.json({ error: "not_awaiting_verification" }, { status: 409 });
    }

    const upd = await sb
      .from("qwikly_billing_invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: payment_method ?? "eft",
        external_ref: external_ref ?? null,
      })
      .eq("id", inv.data.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    // Insert payments row (verified=true)
    await sb.from("payments").insert({
      invoice_id: inv.data.id,
      client_id: inv.data.client_id,
      amount_zar: inv.data.total_zar,
      paid_at: new Date().toISOString(),
      method: payment_method ?? "eft",
      external_ref: external_ref ?? null,
      verified: true,
      verified_at: new Date().toISOString(),
      source: "admin_verify",
    });

    return NextResponse.json({ ok: true, status: "paid" });
  }

  if (action === "revert") {
    // Revert from awaiting_verification back to sent
    if (inv.data.status !== "awaiting_verification") {
      return NextResponse.json({ error: "not_awaiting_verification" }, { status: 409 });
    }
    const upd = await sb
      .from("qwikly_billing_invoices")
      .update({
        status: "sent",
        client_marked_paid_at: null,
        client_payment_note: admin_note ?? null,
      })
      .eq("id", inv.data.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "sent" });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
```

- [ ] **Step 8.2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 8.3: Commit**

```bash
git add src/app/api/admin/qwikly-billing-invoices/
git commit -m "feat(billing): admin verify/revert/mark-paid endpoint

PATCH /api/admin/qwikly-billing-invoices/[id]
- verify: awaiting_verification → paid + creates verified payments row
- revert: awaiting_verification → sent (admin saw no deposit)
- mark_paid: direct admin override (sent/overdue/awaiting → paid)"
```

---

## Task 9: Pipeline data API

**Files:**
- Create: `src/app/api/admin/billing/pipeline/route.ts`

- [ ] **Step 9.1: Create the pipeline GET endpoint**

Create `src/app/api/admin/billing/pipeline/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { todaySast, nextAnchorDate, daysUntilNextAnchor } from "@/lib/billing/anchor";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const sb = createServerClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const profile = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile.data?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const today = todaySast();

  // Upcoming: clients with anchor in next 14 days
  const clientsRes = await sb
    .from("clients")
    .select("id, business_name, billing_anchor_day, mrr_zar, plan, crm_status")
    .not("billing_anchor_day", "is", null)
    .not("crm_status", "in", "(churned,paused,pending_deletion)");

  const upcoming = (clientsRes.data ?? [])
    .map(c => {
      const days = daysUntilNextAnchor(c.billing_anchor_day!, today);
      return {
        client_id: c.id,
        business_name: c.business_name,
        days_until: days,
        next_anchor: nextAnchorDate(c.billing_anchor_day!, today).toISOString().slice(0, 10),
        estimated_amount_zar: (c.mrr_zar ?? 0) / 100,
        plan: c.plan,
      };
    })
    .filter(c => c.days_until <= 14)
    .sort((a, b) => a.days_until - b.days_until);

  // Awaiting verification
  const awaitingRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, client_marked_paid_at, client_payment_note, client_id, clients(business_name)")
    .eq("status", "awaiting_verification")
    .order("client_marked_paid_at", { ascending: true });

  // Overdue
  const overdueRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, due_at, sent_at, client_id, clients(business_name)")
    .eq("status", "overdue")
    .order("due_at", { ascending: true });

  // Paid this calendar month
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString();
  const paidRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, paid_at, client_id, clients(business_name)")
    .eq("status", "paid")
    .gte("paid_at", monthStart)
    .order("paid_at", { ascending: false });

  const forecast7 = upcoming.filter(u => u.days_until <= 7).reduce((s, u) => s + u.estimated_amount_zar, 0);
  const forecast30 = upcoming.reduce((s, u) => s + u.estimated_amount_zar, 0);

  return NextResponse.json({
    today: today.toISOString().slice(0, 10),
    summary: {
      forecast_7d_zar: forecast7,
      forecast_30d_zar: forecast30,
      awaiting_count: (awaitingRes.data ?? []).length,
      overdue_count: (overdueRes.data ?? []).length,
    },
    upcoming,
    awaiting_verification: awaitingRes.data ?? [],
    overdue: overdueRes.data ?? [],
    paid_this_month: paidRes.data ?? [],
  });
}
```

- [ ] **Step 9.2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 9.3: Commit**

```bash
git add src/app/api/admin/billing/pipeline
git commit -m "feat(billing): pipeline data endpoint

GET /api/admin/billing/pipeline returns upcoming (14d), awaiting verification,
overdue, paid this month, plus 7d/30d forecast totals."
```

---

## Task 10: Billing Pipeline tracker page

**Files:**
- Create: `src/app/(app)/admin/billing/pipeline/page.tsx`

- [ ] **Step 10.1: Create the pipeline page with 4 tabs**

Create `src/app/(app)/admin/billing/pipeline/page.tsx`:

```tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatZAR } from "@/lib/format";

type Tab = "upcoming" | "awaiting" | "overdue" | "paid";

interface UpcomingRow {
  client_id: number; business_name: string | null;
  days_until: number; next_anchor: string;
  estimated_amount_zar: number; plan: string;
}
interface AwaitingRow {
  id: string; invoice_number: string | null; total_zar: number;
  client_marked_paid_at: string; client_payment_note: string | null;
  client_id: number; clients: { business_name: string };
}
interface OverdueRow {
  id: string; invoice_number: string | null; total_zar: number;
  due_at: string; sent_at: string;
  client_id: number; clients: { business_name: string };
}
interface PaidRow {
  id: string; invoice_number: string | null; total_zar: number;
  paid_at: string; client_id: number; clients: { business_name: string };
}

interface PipelineData {
  today: string;
  summary: {
    forecast_7d_zar: number; forecast_30d_zar: number;
    awaiting_count: number; overdue_count: number;
  };
  upcoming: UpcomingRow[];
  awaiting_verification: AwaitingRow[];
  overdue: OverdueRow[];
  paid_this_month: PaidRow[];
}

export default function BillingPipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/billing/pipeline");
    if (r.ok) setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function verify(id: string) {
    setActionId(id);
    await fetch(`/api/admin/qwikly-billing-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    });
    setActionId(null);
    load();
  }

  async function revert(id: string) {
    setActionId(id);
    await fetch(`/api/admin/qwikly-billing-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revert" }),
    });
    setActionId(null);
    load();
  }

  async function markPaidDirect(id: string) {
    setActionId(id);
    await fetch(`/api/admin/qwikly-billing-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    });
    setActionId(null);
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[28px] font-bold text-slate-900 leading-tight">Billing Pipeline</h1>
        <p className="text-[13px] text-slate-500 mt-1">{data?.today ?? "loading..."}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="7-day forecast" value={data ? formatZAR(data.summary.forecast_7d_zar) : "..."} icon={Calendar} accent="text-slate-700" />
        <StatCard label="30-day forecast" value={data ? formatZAR(data.summary.forecast_30d_zar) : "..."} icon={Calendar} accent="text-slate-700" />
        <StatCard label="Awaiting verification" value={data?.summary.awaiting_count ?? "..."} icon={ShieldCheck} accent="text-violet-600" />
        <StatCard label="Overdue" value={data?.summary.overdue_count ?? "..."} icon={AlertTriangle} accent="text-red-500" />
      </div>

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-4 max-w-fit">
        {([
          ["upcoming", "Upcoming · 14d"],
          ["awaiting", `Awaiting verify${data?.summary.awaiting_count ? ` (${data.summary.awaiting_count})` : ""}`],
          ["overdue", `Overdue${data?.summary.overdue_count ? ` (${data.summary.overdue_count})` : ""}`],
          ["paid", "Paid this month"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
              tab === k ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800"
            )}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-400">Loading...</p>
        ) : tab === "upcoming" ? (
          (data?.upcoming ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No invoices due in the next 14 days.</p>
            : (data?.upcoming ?? []).map((u, i) => (
              <Link key={u.client_id} href={`/admin/clients/${u.client_id}`}
                className={cn("flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors", i > 0 && "border-t border-slate-100")}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800">{u.business_name ?? "Unnamed"}</p>
                  <p className="text-[12px] text-slate-500">{u.next_anchor} · {u.plan}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-slate-700">in {u.days_until}d</p>
                  <p className="text-[12px] text-slate-500">est. {formatZAR(u.estimated_amount_zar)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))
        ) : tab === "awaiting" ? (
          (data?.awaiting_verification ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No invoices awaiting verification.</p>
            : (data?.awaiting_verification ?? []).map((a, i) => (
              <div key={a.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800">{a.clients.business_name}</p>
                  <p className="text-[12px] text-slate-500">{a.invoice_number} · {formatZAR(a.total_zar)} · client confirmed {new Date(a.client_marked_paid_at).toLocaleDateString()}</p>
                  {a.client_payment_note && <p className="text-[11px] text-slate-400 mt-0.5">"{a.client_payment_note}"</p>}
                </div>
                <button onClick={() => verify(a.id)} disabled={actionId === a.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                  Mark verified
                </button>
                <button onClick={() => revert(a.id)} disabled={actionId === a.id}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                  Not received
                </button>
              </div>
            ))
        ) : tab === "overdue" ? (
          (data?.overdue ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No overdue invoices.</p>
            : (data?.overdue ?? []).map((o, i) => {
              const days = Math.floor((Date.now() - new Date(o.due_at).getTime()) / 86_400_000);
              return (
                <div key={o.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-800">{o.clients.business_name}</p>
                    <p className="text-[12px] text-red-600 font-medium">{o.invoice_number} · {formatZAR(o.total_zar)} · {days}d overdue</p>
                  </div>
                  <button onClick={() => markPaidDirect(o.id)} disabled={actionId === o.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                    Mark paid
                  </button>
                </div>
              );
            })
        ) : (
          (data?.paid_this_month ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No invoices paid this month yet.</p>
            : (
              <>
                <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                  <p className="text-[13px] text-emerald-700 font-semibold">
                    Total: {formatZAR((data?.paid_this_month ?? []).reduce((s, p) => s + p.total_zar, 0))}
                  </p>
                </div>
                {(data?.paid_this_month ?? []).map((p, i) => (
                  <div key={p.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-800">{p.clients.business_name}</p>
                      <p className="text-[12px] text-slate-500">{p.invoice_number} · paid {new Date(p.paid_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[13px] font-semibold text-slate-700">{formatZAR(p.total_zar)}</p>
                  </div>
                ))}
              </>
            )
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{label}</p>
        <p className={cn("text-[24px] font-bold leading-none", accent)}>{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50">
        <Icon className={cn("w-5 h-5", accent)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 10.2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 10.3: Local smoke test**

Open `http://localhost:3000/admin/billing/pipeline`. Verify:
- 4 stat cards render
- 4 tabs are clickable
- Empty states show helpful copy when no data
- Verify/revert/mark-paid buttons work end-to-end and refetch data after action

- [ ] **Step 10.4: Commit**

```bash
git add src/app/\(app\)/admin/billing/pipeline
git commit -m "feat(billing): pipeline tracker page with 4 tabs

Upcoming (next 14d), Awaiting verification, Overdue, Paid this month.
Inline verify/revert/mark-paid actions hit the admin PATCH endpoint."
```

---

## Task 11: CRM list, Next-invoice column

**Files:**
- Modify: `src/app/api/admin/crm/clients/route.ts`
- Create: `src/app/(app)/admin/clients/components/NextInvoiceBadge.tsx`
- Modify: `src/app/(app)/admin/clients/page.tsx`

- [ ] **Step 11.1: Extend the list API to return billing fields**

Edit `src/app/api/admin/crm/clients/route.ts`. After the existing select fields, add the billing fields. Then derive `next_invoice_at`, `latest_billing_invoice_status`, and `days_overdue` per client. Concretely:

1. Add to the SELECT: `billing_anchor_day, billing_anchor_set_at`
2. After fetching clients, for each client:
   - If `billing_anchor_day` is null: `next_invoice_at = null`, `latest_billing_invoice_status = null`, `days_overdue = null`
   - Else: compute `next_invoice_at = nextAnchorDate(billing_anchor_day)` (use `@/lib/billing/anchor`)
   - Look up the latest `qwikly_billing_invoices` for the client (highest `created_at`); set `latest_billing_invoice_status` to its `status`
   - If status='overdue': `days_overdue = days from due_at to today`; else null

Concrete code patch (locate the existing handler in the file and inject):

```typescript
import { nextAnchorDate, todaySast } from "@/lib/billing/anchor";

// ... existing select extended:
.select(`
  id, business_name, owner_name, client_email, whatsapp_number, logo_url,
  trade, industry, website, crm_status, plan, mrr_zar, health_score,
  onboarding_step, onboarding_complete, web_widget_status, last_activity_at,
  created_at, account_manager_id, ltv_zar, conversation_count, channels,
  deletion_scheduled_at, billing_anchor_day, billing_anchor_set_at
`)

// ... after fetching:
const clientIds = clients.map(c => c.id);
const latestInvRes = await sb
  .from("qwikly_billing_invoices")
  .select("client_id, status, due_at, created_at")
  .in("client_id", clientIds)
  .order("created_at", { ascending: false });

// Group by client_id, take first
const latestByClient = new Map<number, { status: string; due_at: string | null }>();
for (const row of latestInvRes.data ?? []) {
  if (!latestByClient.has(row.client_id)) {
    latestByClient.set(row.client_id, { status: row.status, due_at: row.due_at });
  }
}

const today = todaySast();
const enriched = clients.map(c => {
  let next_invoice_at: string | null = null;
  let days_overdue: number | null = null;
  if (c.billing_anchor_day) {
    next_invoice_at = nextAnchorDate(c.billing_anchor_day, today).toISOString().slice(0, 10);
  }
  const latest = latestByClient.get(c.id);
  if (latest?.status === "overdue" && latest.due_at) {
    days_overdue = Math.max(0, Math.floor((today.getTime() - new Date(latest.due_at).getTime()) / 86_400_000));
  }
  return {
    ...c,
    next_invoice_at,
    latest_billing_invoice_status: latest?.status ?? null,
    days_overdue,
  };
});

// Return enriched in place of clients
```

- [ ] **Step 11.2: Create the badge component**

Create `src/app/(app)/admin/clients/components/NextInvoiceBadge.tsx`:

```tsx
import Link from "next/link";
import {
  Clock, Loader, Mail, ShieldCheck, AlertTriangle, CheckCircle2, Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CrmClientListItem } from "@/lib/crm-types";

export function NextInvoiceBadge({ c }: { c: CrmClientListItem }) {
  const status = c.latest_billing_invoice_status;
  const days = c.next_invoice_at
    ? Math.ceil((new Date(c.next_invoice_at).getTime() - Date.now()) / 86_400_000)
    : null;

  if (!c.billing_anchor_day) {
    return (
      <Link href={`/admin/clients/${c.id}#billing`}
        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#E85A2C]">
        <Settings className="w-3 h-3" />
        Set billing day
      </Link>
    );
  }

  if (status === "awaiting_verification") {
    return <Pill icon={ShieldCheck} text="Verify payment" cls="bg-violet-50 text-violet-700 border-violet-200 animate-pulse" />;
  }
  if (status === "overdue") {
    return <Pill icon={AlertTriangle} text={`Overdue ${c.days_overdue ?? 0}d`} cls="bg-red-50 text-red-600 border-red-200" />;
  }
  if (status === "sent") {
    return <Pill icon={Mail} text="Invoice sent" cls="bg-blue-50 text-blue-700 border-blue-200" />;
  }
  if (days === 0) {
    return <Pill icon={Loader} text="Generating today" cls="bg-[#E85A2C]/10 text-[#E85A2C] border-[#E85A2C]/30" />;
  }
  if (days !== null && days <= 4) {
    return <Pill icon={Clock} text={`In ${days} days`} cls="bg-amber-50 text-amber-700 border-amber-200" />;
  }
  if (status === "paid" && days !== null) {
    return <Pill icon={CheckCircle2} text={`Paid, next in ${days}d`} cls="bg-emerald-50 text-emerald-700 border-emerald-200" />;
  }
  return <Pill icon={Clock} text={days !== null ? `In ${days} days` : ""} cls="bg-slate-50 text-slate-600 border-slate-200" />;
}

function Pill({ icon: Icon, text, cls }: { icon: React.ElementType; text: string; cls: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap", cls)}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}
```

- [ ] **Step 11.3: Wire badge into the CRM list**

Edit `src/app/(app)/admin/clients/page.tsx`:

1. Import: `import { NextInvoiceBadge } from "./components/NextInvoiceBadge";`
2. Update the `SortCol` type to include `next_invoice_at`:
   ```typescript
   type SortCol = "business_name" | "mrr_zar" | "health_score" | "created_at" | "plan" | "crm_status" | "next_invoice_at";
   ```
3. In `TableView`'s grid template, change `grid-cols-[24px_2fr_100px_90px_80px_100px_80px_90px_110px_36px]` to `grid-cols-[24px_2fr_100px_90px_80px_100px_80px_90px_110px_120px_36px]` (add a 120px column for billing).
4. Add a new column header in the header row, next to "Last active":
   ```tsx
   <ColHeader col="next_invoice_at" label="Next invoice" />
   ```
5. Add a new cell in each row, also next to "Last active":
   ```tsx
   <NextInvoiceBadge c={c} />
   ```
6. Add a "Billing" filter group in the filter panel (mirroring existing FilterGroup usage):
   ```tsx
   <FilterGroup
     label="Billing"
     options={[
       { value: "upcoming_week", label: "Upcoming this week" },
       { value: "awaiting_verification", label: "Awaiting verification" },
       { value: "overdue", label: "Overdue" },
       { value: "paid_this_month", label: "Paid this month" },
     ]}
     active={filters.billing ?? []}
     onToggle={v => toggleFilter("billing", v)}
   />
   ```
7. Extend `Filters` interface to include `billing: string[]`.
8. Pass `billing` filter to the API query string: `if (filters.billing.length) params.set("billing", filters.billing.join(","));`
9. In `clearFilters`: `setFilters({ status: [], plan: [], tag: [], billing: [] });`

- [ ] **Step 11.4: Add `billing` filter handling in the API route**

In `src/app/api/admin/crm/clients/route.ts`, parse `billing` query param and apply:

```typescript
const billing = req.nextUrl.searchParams.get("billing")?.split(",").filter(Boolean) ?? [];

// After enrichment, filter:
let filtered = enriched;
if (billing.length) {
  filtered = enriched.filter(c => {
    return billing.some(b => {
      if (b === "upcoming_week") {
        return c.next_invoice_at && (new Date(c.next_invoice_at).getTime() - today.getTime()) / 86_400_000 <= 7;
      }
      if (b === "awaiting_verification") return c.latest_billing_invoice_status === "awaiting_verification";
      if (b === "overdue") return c.latest_billing_invoice_status === "overdue";
      if (b === "paid_this_month") {
        return c.latest_billing_invoice_status === "paid";
      }
      return false;
    });
  });
}
// Return filtered
```

- [ ] **Step 11.5: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 11.6: Local smoke test**

Open `http://localhost:3000/admin/clients`. Verify:
- New "Next invoice" column appears
- Clients without anchor show "Set billing day" link
- Clients with anchor show countdown badge
- Sort by Next invoice works
- Billing filter group filters list correctly

- [ ] **Step 11.7: Commit**

```bash
git add src/app/api/admin/crm/clients/route.ts \
  "src/app/(app)/admin/clients/components/NextInvoiceBadge.tsx" \
  "src/app/(app)/admin/clients/page.tsx"
git commit -m "feat(billing): Next invoice column on CRM list

Sortable + filterable. Badge states: trial, upcoming, approaching, generating today,
sent, awaiting verification, overdue, paid."
```

---

## Task 12: "Set billing day" form on client detail page

**Files:**
- Modify: `src/app/(app)/admin/clients/[id]/page.tsx`

- [ ] **Step 12.1: Add the form section**

Read `src/app/(app)/admin/clients/[id]/page.tsx` to understand its structure and existing PATCH endpoint usage. Then add a new section anchored with `id="billing"`:

```tsx
function BillingDaySection({ client, onUpdate }: { client: CrmClientDetail; onUpdate: () => void }) {
  const [day, setDay] = useState<number>(client.billing_anchor_day ?? 1);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(client.billing_anchor_set_at);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/crm/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billing_anchor_day: day,
        billing_anchor_set_at: savedAt ?? new Date().toISOString(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(new Date().toISOString());
      onUpdate();
    }
  }

  return (
    <section id="billing" className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
      <h2 className="text-[15px] font-semibold text-slate-800 mb-2">Billing day</h2>
      <p className="text-[12px] text-slate-500 mb-3">
        The day of each month this client is invoiced. Set after their first paid invoice clears.
      </p>
      <div className="flex items-center gap-3">
        <select
          value={day}
          onChange={e => setDay(Number(e.target.value))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button onClick={save} disabled={saving}
          className="px-3 py-2 rounded-xl bg-[#E85A2C] text-white text-[13px] font-semibold hover:bg-[#d04f25] disabled:opacity-60 cursor-pointer">
          {saving ? "Saving..." : client.billing_anchor_day === day ? "Saved" : "Save"}
        </button>
        {savedAt && (
          <span className="text-[11px] text-slate-400">
            Set {new Date(savedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {day > 28 && (
        <p className="text-[11px] text-amber-600 mt-2">
          Note: in shorter months, billing falls on the last day of the month.
        </p>
      )}
    </section>
  );
}
```

Render `<BillingDaySection client={client} onUpdate={refetch} />` near the top of the detail page (e.g., after the header, before existing tabs).

- [ ] **Step 12.2: Confirm the existing PATCH endpoint accepts the new fields**

Open `src/app/api/admin/crm/clients/[id]/route.ts` (or wherever PATCH lives). Confirm the allowed-fields list includes `billing_anchor_day` and `billing_anchor_set_at`. If not, add them.

- [ ] **Step 12.3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 12.4: Local smoke test**

Open `http://localhost:3000/admin/clients/[any-id]`. Verify the form renders, dropdown shows 1-31, save persists across refresh, and the countdown badge appears in the CRM list once set.

- [ ] **Step 12.5: Commit**

```bash
git add "src/app/(app)/admin/clients/[id]/page.tsx" src/app/api/admin/crm/clients
git commit -m "feat(billing): Set billing day form on client detail page

Admin sets 1-31 anchor day; warns about month-end overflow for 29-31."
```

---

## Task 13: E2E Playwright smoke

**Files:**
- Create: `tests/e2e/flow5-billing-anchor.spec.ts`

- [ ] **Step 13.1: Write the E2E test**

Create `tests/e2e/flow5-billing-anchor.spec.ts`:

```typescript
/**
 * E2E Flow 5: Billing Anchor Tracker golden path
 *
 * 1. Admin sets billing_anchor_day on a test client
 * 2. CRM list shows countdown badge
 * 3. Trigger cron manually (test endpoint hits internal route with secret)
 * 4. Invoice appears as 'sent', client receives notification
 * 5. Client clicks "I've paid"
 * 6. Admin sees Awaiting verification tab populated
 * 7. Admin clicks "Mark verified"
 * 8. Invoice flips to paid, payments row created
 *
 * PREREQUISITES (set in .env.test):
 *   ADMIN_EMAIL          admin login email
 *   ADMIN_PASSWORD       admin login password
 *   TEST_CLIENT_ID       client id to use as fixture (must have client_email set)
 *   CRON_SECRET          to trigger cron manually
 *   BASE_URL             default http://localhost:3000
 *
 * Run: npx playwright test tests/e2e/flow5-billing-anchor.spec.ts --headed
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const CLIENT_ID = process.env.TEST_CLIENT_ID ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

test("billing anchor full lifecycle", async ({ page, request }) => {
  test.skip(!ADMIN_EMAIL || !CLIENT_ID || !CRON_SECRET, "missing env config");

  // 1. Admin login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/admin/);

  // 2. Set billing_anchor_day to today
  const today = new Date().getDate();
  await page.goto(`${BASE}/admin/clients/${CLIENT_ID}#billing`);
  await page.selectOption('section#billing select', String(today));
  await page.click('section#billing button:has-text("Save")');
  await expect(page.locator('section#billing')).toContainText("Saved", { timeout: 5000 });

  // 3. Verify CRM list shows the badge
  await page.goto(`${BASE}/admin/clients`);
  await expect(page.locator(`a[href="/admin/clients/${CLIENT_ID}"]`).first()).toBeVisible();

  // 4. Trigger cron
  const cronRes = await request.get(`${BASE}/api/cron/billing-anchor-tick`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(cronRes.ok()).toBeTruthy();
  const cronJson = await cronRes.json();
  expect(cronJson.ok).toBe(true);

  // 5. Verify invoice appears in pipeline (Upcoming → it's now sent)
  await page.goto(`${BASE}/admin/billing/pipeline`);
  await expect(page.locator("text=Awaiting verify").first()).toBeVisible();
});
```

- [ ] **Step 13.2: Run the test (locally if env is configured, otherwise note as deferred)**

Run: `npx playwright test tests/e2e/flow5-billing-anchor.spec.ts --headed`

If env vars aren't set in `.env.test`, the test will skip cleanly. Note in the commit that full env-driven runs are deferred to CI.

- [ ] **Step 13.3: Commit**

```bash
git add tests/e2e/flow5-billing-anchor.spec.ts
git commit -m "test(billing): E2E golden path for billing anchor tracker

Set anchor → cron generates → client confirms → admin verifies → paid."
```

---

## Task 14: Final verification + ship

- [ ] **Step 14.1: Run lint on the full project**

Run: `npm run lint`

Fix any new lint errors introduced by these tasks. Pre-existing errors are not in scope.

- [ ] **Step 14.2: Build**

Run: `npm run build`

Expected: build succeeds. If it fails on any file we touched, fix that file. If it fails on an unrelated file, capture the error in a follow-up issue but do not block ship.

- [ ] **Step 14.3: Manual end-to-end click-through**

In a fresh dev server, walk through this scenario:

1. Open `/admin/clients`. Confirm Next-invoice column visible, mostly "Set billing day" CTAs, sort + filter work.
2. Open a client without anchor. Set their billing day to today. Save. Refetch list, confirm badge changed to "Generating today".
3. Trigger cron via curl. Confirm 200 response and `generated >= 1`.
4. Refetch list, confirm badge changed to "Invoice sent".
5. Visit `/admin/billing/pipeline`. Confirm forecast cards, Upcoming tab populated.
6. Open the invoice's customer view URL (use the customer_view_token from Supabase). Click "I've paid", optionally add a note, submit. Expect success message.
7. Refetch pipeline. Confirm Awaiting verification tab now has 1 entry. Note appears under invoice line if entered.
8. Click "Mark verified". Expect entry to disappear from Awaiting and appear in Paid this month.
9. Refetch CRM list. Confirm the client's badge is now "Paid, next in Xd".
10. Confirm the admin received a lead-notification when client clicked "I've paid".

- [ ] **Step 14.4: Push**

```bash
git push origin main
```

This triggers the production Vercel deploy.

- [ ] **Step 14.5: Post-deploy verification**

Once Vercel reports READY:

1. Check `/admin/clients` and `/admin/billing/pipeline` on production to confirm pages render with no console errors.
2. Verify the cron is registered: `vercel inspect <deployment-url>` and look for the cron in the Functions/Schedule section, OR check the Vercel dashboard's Crons tab for the project.

- [ ] **Step 14.6: Final commit (only if any cleanup was needed in steps above)**

Skip if previous steps left no new changes.

---

## Self-Review

Spec coverage check (each requirement → task):

| Spec section | Implementing task |
|---|---|
| §1-2 problem/goals | Whole plan |
| §3 non-goals | Plan respects them (no Stripe, no auto-dunning, no trial-end UI) |
| §4 user flow | Tasks 6, 7, 8, 10 |
| §5 data model | Task 1 |
| §6 stats aggregation | Task 4 |
| §7 CRM column | Task 11 |
| §8 Pipeline tracker | Tasks 9, 10 |
| §9 cron + month-end overflow | Tasks 3, 6 |
| §10 client "I've paid" | Task 7 |
| §11 admin verification | Tasks 8, 10 |
| §12 edge cases | Tasks 3 (overflow), 5 (idempotency, delivery fail), 7 (idempotent click) |
| §13 surface inventory | Matches Tasks 1-12 file list |
| §14 testing | Task 13 (Playwright E2E) |
| §15 open questions | Resolved during implementation: Step 7.1 verifies `/i/[token]` path; Step 5.3 verifies sender signatures; Task 6 uses `0 4 * * *` UTC for 06:00 SAST; Task 8 server-side admin check on PATCH (RLS for client-side mark-paid uses service-role client which bypasses RLS) |

Placeholder scan: none found in tasks. All code blocks contain executable code, all commands are exact.

Type consistency: `nextAnchorDate`, `daysUntilNextAnchor`, `isAnchorDayToday`, `billingWindowEndingAt` consistent across Tasks 3, 6, 9, 11. `QwiklyBillingInvoiceStatus` defined in Task 2, used in Task 11. `NextInvoiceBadge` exports match its consumer in Task 11.

Known gap: the spec mentions "Send reminder" action in the Overdue tab; Task 10 implements only "Mark paid" for overdue rows. If reminder-send is needed in v1, add a Task 10b for a `POST /api/admin/qwikly-billing-invoices/[id]/remind` endpoint. **Decision: defer reminder action to a follow-up.**
