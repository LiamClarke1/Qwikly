# Billing Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an invoice list page, branded PDF download, and a simplified pricing page to the existing Qwikly 8% commission billing system.

**Architecture:** Thin additions to the existing billing layer. A new `/api/billing/invoices` route lists `qwikly_billing_invoices` rows. A new `/api/billing/invoices/[id]/pdf` route generates a branded PDF on-demand using `@react-pdf/renderer` (already a dependency). A new `/dashboard/billing/invoices` page shows the list. The pricing page is simplified in-place — no new routes or data.

**Tech Stack:** Next.js 14 App Router, Supabase (supabaseAdmin + RLS), @react-pdf/renderer, Tailwind CSS, TypeScript, Lucide icons

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `src/app/api/billing/invoices/route.ts` | **Create** | GET — list billing invoices for authenticated client |
| `src/app/api/billing/invoices/[id]/pdf/route.ts` | **Create** | GET — generate + stream branded PDF |
| `src/lib/billing/commission-invoice-pdf.tsx` | **Create** | React PDF component for commission invoices |
| `src/app/(app)/dashboard/billing/invoices/page.tsx` | **Create** | Invoice list page with download buttons |
| `src/app/(app)/dashboard/billing/page.tsx` | **Modify** | Add "View invoices" link above period list |
| `src/app/(landing)/pricing/page.tsx` | **Modify** | Remove calculator, simplify to clean 8% presentation |

---

## Task 1: List billing invoices API

**Files:**
- Create: `src/app/api/billing/invoices/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/billing/invoices/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getClientId(): Promise<number | null> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data?.id ?? null;
}

export async function GET() {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("qwikly_billing_invoices")
    .select(`
      id, invoice_number, total_zar, vat_zar, status,
      due_at, paid_at, created_at,
      qwikly_billing_periods (period_start, period_end)
    `)
    .eq("client_id", clientId)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  return NextResponse.json({ invoices: data ?? [] });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors on the new file. Ignore pre-existing errors in other files if any.

- [ ] **Step 3: Verify route responds**

Start the dev server if not running:
```bash
cd ~/qwikly-site && npm run dev
```

Then in a second terminal (must be logged in to the app first via browser):
```bash
curl -s http://localhost:3000/api/billing/invoices | head -100
```

Expected: `{"invoices":[...]}` (may be empty array if no non-draft invoices exist — that's fine).

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add src/app/api/billing/invoices/route.ts && git commit -m "feat: add GET /api/billing/invoices route"
```

---

## Task 2: Commission invoice PDF component

**Files:**
- Create: `src/lib/billing/commission-invoice-pdf.tsx`

- [ ] **Step 1: Create the directory and component**

```bash
mkdir -p ~/qwikly-site/src/lib/billing
```

```tsx
// src/lib/billing/commission-invoice-pdf.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const EMBER  = "#E85A2C";
const DARK   = "#0E0E0C";
const MUTED  = "#6A6A63";
const LIGHT  = "#F4EEE4";
const WHITE  = "#FFFFFF";

export interface CommissionInvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string | null;
  periodStart: string;
  periodEnd: string;
  businessName: string;
  billingEmail: string | null;
  commissionExVat: number;
  vatZar: number;
  totalZar: number;
  vatNumber: string;
}

const s = StyleSheet.create({
  page:              { backgroundColor: WHITE, fontFamily: "Helvetica", padding: 48, paddingBottom: 80 },
  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 },
  logoBox:           { backgroundColor: EMBER, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  logoText:          { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 18 },
  invoiceLabel:      { fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 4 },
  invoiceNumber:     { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK },
  divider:           { borderBottomWidth: 1, borderBottomColor: "rgba(14,14,12,0.12)", marginVertical: 24 },
  metaRow:           { flexDirection: "row", gap: 48, marginBottom: 32 },
  metaBlock:         { flex: 1 },
  metaLabel:         { fontSize: 8, color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  metaValue:         { fontSize: 13, color: DARK },
  metaValueMuted:    { fontSize: 12, color: MUTED, marginTop: 2 },
  tableHeaderRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(14,14,12,0.10)" },
  tableHeaderText:   { fontSize: 8, color: MUTED, letterSpacing: 1.5 },
  tableRow:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(14,14,12,0.06)" },
  tableLabel:        { fontSize: 12, color: DARK },
  tableLabelMuted:   { fontSize: 12, color: MUTED },
  tableValue:        { fontSize: 12, color: DARK },
  tableValueMuted:   { fontSize: 12, color: MUTED },
  totalRow:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, backgroundColor: LIGHT, borderRadius: 6, marginTop: 8 },
  totalLabel:        { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },
  totalValue:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: EMBER },
  footer:            { position: "absolute", bottom: 40, left: 48, right: 48 },
  footerText:        { fontSize: 9, color: MUTED, textAlign: "center" },
  footerTextSmall:   { fontSize: 9, color: MUTED, textAlign: "center", marginTop: 4 },
});

function fmtZar(n: number): string {
  return "R " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function CommissionInvoicePDF({ data }: { data: CommissionInvoiceData }) {
  const periodLabel = `${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`;

  return (
    <Document title={`Qwikly Invoice ${data.invoiceNumber}`}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>Qwikly</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Meta: billed to, period, dates */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>BILLED TO</Text>
            <Text style={s.metaValue}>{data.businessName}</Text>
            {data.billingEmail ? <Text style={s.metaValueMuted}>{data.billingEmail}</Text> : null}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>PERIOD</Text>
            <Text style={s.metaValue}>{periodLabel}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>ISSUED</Text>
            <Text style={s.metaValue}>{fmtDate(data.issuedAt)}</Text>
            {data.dueAt ? (
              <>
                <Text style={[s.metaLabel, { marginTop: 12 }]}>DUE</Text>
                <Text style={s.metaValue}>{fmtDate(data.dueAt)}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={s.divider} />

        {/* Line items */}
        <View style={s.tableHeaderRow}>
          <Text style={s.tableHeaderText}>DESCRIPTION</Text>
          <Text style={s.tableHeaderText}>AMOUNT</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Qwikly platform commission — {periodLabel}</Text>
          <Text style={s.tableValue}>{fmtZar(data.commissionExVat)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabelMuted}>VAT (15%)</Text>
          <Text style={s.tableValueMuted}>{fmtZar(data.vatZar)}</Text>
        </View>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total due</Text>
          <Text style={s.totalValue}>{fmtZar(data.totalZar)}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Qwikly (Pty) Ltd — VAT No: {data.vatNumber} — billing@qwikly.co.za
          </Text>
          <Text style={s.footerTextSmall}>
            Pay by EFT or at qwikly.co.za/dashboard/billing
          </Text>
        </View>

      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | grep "commission-invoice-pdf"
```

Expected: no output (no errors on this file).

- [ ] **Step 3: Commit**

```bash
cd ~/qwikly-site && git add src/lib/billing/commission-invoice-pdf.tsx && git commit -m "feat: add CommissionInvoicePDF component"
```

---

## Task 3: PDF download API route

**Files:**
- Create: `src/app/api/billing/invoices/[id]/pdf/route.ts`

- [ ] **Step 1: Create the route**

```bash
mkdir -p ~/qwikly-site/src/app/api/billing/invoices/\[id\]/pdf
```

```typescript
// src/app/api/billing/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CommissionInvoicePDF } from "@/lib/billing/commission-invoice-pdf";
import type { CommissionInvoiceData } from "@/lib/billing/commission-invoice-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function getClient(): Promise<{ clientId: number; businessName: string; billingEmail: string | null } | null> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db
    .from("clients")
    .select("id, business_name, billing_email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { clientId: data.id, businessName: data.business_name, billingEmail: data.billing_email ?? null };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = await getClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: inv } = await db
    .from("qwikly_billing_invoices")
    .select(`
      id, invoice_number, total_zar, vat_zar, due_at, created_at,
      qwikly_billing_periods (period_start, period_end)
    `)
    .eq("id", params.id)
    .eq("client_id", client.clientId)
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const period = inv.qwikly_billing_periods as { period_start: string; period_end: string } | null;
  const commissionExVat = inv.vat_zar > 0 ? inv.total_zar - inv.vat_zar : inv.total_zar;

  const data: CommissionInvoiceData = {
    invoiceNumber: inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase(),
    issuedAt:      inv.created_at,
    dueAt:         inv.due_at ?? null,
    periodStart:   period?.period_start ?? inv.created_at,
    periodEnd:     period?.period_end   ?? inv.created_at,
    businessName:  client.businessName,
    billingEmail:  client.billingEmail,
    commissionExVat,
    vatZar:        inv.vat_zar,
    totalZar:      inv.total_zar,
    vatNumber:     process.env.QWIKLY_VAT_NUMBER ?? "pending registration",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(CommissionInvoicePDF, { data }) as any);
  const filename = `QWK-${data.invoiceNumber}.pdf`;

  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "private, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | grep -E "billing/invoices|commission-invoice"
```

Expected: no output.

- [ ] **Step 3: Test the PDF endpoint in browser**

With dev server running, go to `http://localhost:3000/dashboard/billing`. Click through to any period that has a billing invoice (status: invoiced or paid). Note its `period_id`.

Then navigate to:
```
http://localhost:3000/api/billing/invoices
```

Copy an invoice `id` from the response, then navigate to:
```
http://localhost:3000/api/billing/invoices/<id>/pdf
```

Expected: browser prompts to download a PDF file named `QWK-<invoice-number>.pdf`.

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add "src/app/api/billing/invoices/[id]/pdf/route.ts" && git commit -m "feat: add GET /api/billing/invoices/[id]/pdf — on-demand PDF generation"
```

---

## Task 4: Invoice list page

**Files:**
- Create: `src/app/(app)/dashboard/billing/invoices/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(app)/dashboard/billing/invoices/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Receipt, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";
import { PageHeader } from "@/components/ui/page";
import { Skeleton, EmptyState } from "@/components/ui/empty";

interface BillingInvoice {
  id: string;
  invoice_number: string | null;
  total_zar: number;
  vat_zar: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  qwikly_billing_periods: { period_start: string; period_end: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent:        { label: "Invoice sent", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",       icon: Receipt },
  paid:        { label: "Paid",         color: "bg-success/10 text-success border border-success/20",          icon: CheckCircle },
  overdue:     { label: "Overdue",      color: "bg-danger/10 text-danger border border-danger/20",             icon: AlertTriangle },
  disputed:    { label: "Disputed",     color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", icon: AlertTriangle },
  written_off: { label: "Written off",  color: "bg-white/5 text-fg-muted border border-white/10",              icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.sent;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-tiny font-medium px-2.5 py-1 rounded-full whitespace-nowrap", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/invoices")
      .then(r => r.json())
      .then(d => { setInvoices(d.invoices ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function downloadPdf(inv: BillingInvoice) {
    setDownloading(inv.id);
    try {
      const res = await fetch(`/api/billing/invoices/${inv.id}/pdf`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QWK-${inv.invoice_number ?? inv.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/dashboard/billing"
        className="inline-flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to billing
      </Link>

      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="All Qwikly platform invoices issued to your account."
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Your first invoice will appear here at the end of your first billing period."
        />
      ) : (
        <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_140px_44px] gap-4 px-5 py-3 border-b border-line">
            {["Invoice", "Period", "Ex-VAT", "VAT", "Status", ""].map((h, i) => (
              <p key={i} className={cn(
                "text-tiny uppercase tracking-wider text-fg-subtle font-semibold",
                i >= 2 && i < 5 ? "text-right" : ""
              )}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-line">
            {invoices.map(inv => {
              const period = inv.qwikly_billing_periods;
              const monthLabel = period
                ? new Date(period.period_start).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })
                : fmtDate(inv.created_at);
              const exVat = inv.vat_zar > 0 ? inv.total_zar - inv.vat_zar : inv.total_zar;
              return (
                <div key={inv.id} className="flex sm:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_140px_44px] gap-4 items-center px-5 py-4">
                  <div>
                    <p className="text-body font-medium text-fg font-mono">
                      {inv.invoice_number ?? "—"}
                    </p>
                    <p className="text-tiny text-fg-muted mt-0.5">{fmtDate(inv.created_at)}</p>
                  </div>
                  <p className="hidden md:block text-small text-fg-muted">{monthLabel}</p>
                  <p className="hidden md:block text-small text-fg-muted text-right">{fmt(exVat)}</p>
                  <p className="hidden md:block text-small text-fg-muted text-right">{fmt(inv.vat_zar)}</p>
                  <div className="hidden sm:flex justify-end">
                    <StatusBadge status={inv.status} />
                  </div>
                  <button
                    onClick={() => downloadPdf(inv)}
                    disabled={downloading === inv.id}
                    title="Download PDF"
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-fg-muted hover:text-fg transition-colors disabled:opacity-40 ml-auto shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-5 text-tiny text-fg-subtle">
        Questions about a charge?{" "}
        <a href="mailto:billing@qwikly.co.za" className="text-brand hover:underline">Contact billing support</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | grep "billing/invoices"
```

Expected: no output.

- [ ] **Step 3: Check in browser**

Navigate to `http://localhost:3000/dashboard/billing/invoices` (must be logged in).

Expected:
- If no non-draft invoices: empty state with icon and description
- If invoices exist: table with invoice number, period, amounts, status badge, download button

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add "src/app/(app)/dashboard/billing/invoices/page.tsx" && git commit -m "feat: add /dashboard/billing/invoices page"
```

---

## Task 5: Add invoices link to billing portal

**Files:**
- Modify: `src/app/(app)/dashboard/billing/page.tsx`

- [ ] **Step 1: Add the import and link**

In `src/app/(app)/dashboard/billing/page.tsx`, add `Link` to the imports at the top (it is not currently imported):

Find this line:
```typescript
import { Receipt, ChevronRight, CheckCircle, AlertTriangle,
  Clock, Lock, TrendingUp, DollarSign
} from "lucide-react";
```

Replace with:
```typescript
import Link from "next/link";
import { Receipt, ChevronRight, CheckCircle, AlertTriangle,
  Clock, Lock, TrendingUp, DollarSign
} from "lucide-react";
```

Then find this comment block:
```tsx
      {/* Billing periods */}
      {loading ? (
```

Replace with:
```tsx
      {/* Billing periods */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-small font-semibold text-fg">Billing periods</p>
        <Link
          href="/dashboard/billing/invoices"
          className="text-small text-brand hover:underline inline-flex items-center gap-1.5"
        >
          <Receipt className="w-3.5 h-3.5" />
          View invoices
        </Link>
      </div>
      {loading ? (
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | grep "dashboard/billing/page"
```

Expected: no output.

- [ ] **Step 3: Check in browser**

Navigate to `http://localhost:3000/dashboard/billing`.

Expected: "View invoices" link appears above the billing periods list. Clicking it navigates to `/dashboard/billing/invoices`.

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add "src/app/(app)/dashboard/billing/page.tsx" && git commit -m "feat: add View invoices link to billing portal"
```

---

## Task 6: Simplify pricing page

**Files:**
- Modify: `src/app/(landing)/pricing/page.tsx`

This task replaces the existing 411-line calculator-heavy pricing page with a clean 8% model presentation. Keep: hero, comparison cards, FAQ. Remove: the interactive `calcPrice` calculator state and `Calculator` import.

- [ ] **Step 1: Replace the file**

```tsx
// src/app/(landing)/pricing/page.tsx
"use client";

import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";

const comparisons = [
  {
    title: "A receptionist",
    cost: "R6,000 – R12,000 / month",
    lines: [
      "Works 8 a.m. – 4 p.m. only",
      "No weekends, no after-hours",
      "Salary, UIF, leave, sick days",
      "Can't juggle five leads at once",
      "No automated follow-ups",
    ],
    kind: "outline" as const,
  },
  {
    title: "A WhatsApp auto-reply",
    cost: "Free, and it shows.",
    lines: [
      "'We'll get back to you.' The customer knows.",
      "No qualification, no booking",
      "No follow-ups, ever",
      "Lead still goes to whoever replies first",
      "You pay in lost jobs, not rands",
    ],
    kind: "outline" as const,
  },
  {
    title: "Qwikly",
    cost: "8% per booked job",
    lines: [
      "On every day, every hour, every holiday",
      "Qualifies and books, start to finish",
      "WhatsApp and email, trained on your trade",
      "Follow-ups, no-show rescue, dormant revival",
      "Only earns when you earn",
    ],
    kind: "highlight" as const,
  },
];

const examples = [
  { trade: "Plumber",      job: "Blocked drain",       price: "R1,500",  fee: "R150" },
  { trade: "Electrician",  job: "DB board upgrade",     price: "R12,000", fee: "R960" },
  { trade: "Dentist",      job: "Root canal",           price: "R6,000",  fee: "R480" },
  { trade: "Auto mechanic",job: "Full service",         price: "R4,500",  fee: "R360" },
  { trade: "Beauty salon", job: "Full set nails",       price: "R800",    fee: "R150" },
  { trade: "Roofer",       job: "Full re-roof",         price: "R80,000", fee: "R5,000" },
];

export default function PricingPage() {
  return (
    <main className="bg-paper">
      {/* Hero */}
      <section className="relative pt-36 pb-16 md:pt-44 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Pricing</p>
          <h1 className="display-xl text-ink max-w-[18ch]">
            Only pays when{" "}
            <em className="italic font-light">you</em> get paid.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            Qwikly charges <strong>8%</strong> of every job payment your customers make.
            Minimum R150, maximum R5,000 per booking. No monthly fee. No setup fee. No lock-in.
          </p>
          <div className="mt-10">
            <CTAButton href="/get-started" label="Start free trial" />
          </div>
        </div>
      </section>

      {/* How the fee works */}
      <section className="py-16 md:py-24 bg-ink text-paper">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-paper/50 mb-4">The fee</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-paper mb-6">Simple. No surprises.</h2>
          <p className="text-paper/70 max-w-xl leading-relaxed mb-12">
            When your customer pays, Qwikly takes 8% of the collected amount (ex-VAT).
            The fee is capped so large jobs stay profitable.
          </p>

          <div className="grid grid-cols-3 gap-px bg-paper/10 rounded-2xl overflow-hidden max-w-md">
            {[
              { label: "Rate", value: "8%" },
              { label: "Minimum", value: "R150" },
              { label: "Maximum", value: "R5,000" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-ink px-6 py-8 text-center">
                <p className="text-3xl font-semibold text-paper mb-1">{value}</p>
                <p className="text-sm text-paper/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-4">Examples</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-10">What the fee looks like</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {examples.map(({ trade, job, price, fee }) => (
              <div key={job} className="bg-white border border-ink/8 rounded-2xl p-5">
                <p className="text-xs font-semibold text-ink/40 uppercase tracking-wider mb-2">{trade}</p>
                <p className="text-base font-medium text-ink mb-3">{job}</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-ink/50">Job price: {price}</p>
                  <p className="text-base font-semibold text-ink">Fee: {fee}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 md:py-24 bg-ink/3">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-4">Compare</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-10">How Qwikly stacks up</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {comparisons.map(({ title, cost, lines, kind }) => (
              <div
                key={title}
                className={
                  kind === "highlight"
                    ? "bg-ink text-paper rounded-2xl p-6"
                    : "bg-white border border-ink/8 rounded-2xl p-6"
                }
              >
                <p className={kind === "highlight" ? "text-lg font-semibold text-paper mb-1" : "text-lg font-semibold text-ink mb-1"}>
                  {title}
                </p>
                <p className={kind === "highlight" ? "text-sm text-paper/60 mb-5" : "text-sm text-ink/40 mb-5"}>
                  {cost}
                </p>
                <ul className="space-y-2">
                  {lines.map(line => (
                    <li key={line} className={kind === "highlight" ? "text-sm text-paper/80 flex gap-2" : "text-sm text-ink/60 flex gap-2"}>
                      <span>{kind === "highlight" ? "✓" : "·"}</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <FAQ />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | grep "pricing"
```

Expected: no output.

- [ ] **Step 3: Check in browser**

Navigate to `http://localhost:3000/pricing`.

Expected:
- Hero with "Only pays when you get paid." headline
- "Simple. No surprises." section with 8% / R150 / R5,000 stats
- Worked examples grid (6 trade cards)
- Comparison section (3 cards)
- FAQ section
- No calculator, no input field, no `Calculator` icon

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add "src/app/(landing)/pricing/page.tsx" && git commit -m "feat: simplify pricing page — remove calculator, clean 8% presentation"
```

---

## Self-Review

**Spec coverage:**
- ✅ `/dashboard/billing` — "View invoices" link added (Task 5)
- ✅ `/dashboard/billing/invoices` — new invoice list page (Task 4)
- ✅ `/api/billing/invoices/[id]/pdf` — branded PDF download (Tasks 2+3)
- ✅ `/pricing` — simplified, 8% model only (Task 6)
- ✅ VAT line on PDF (Task 2)
- ✅ Status badges on invoice list (Task 4)
- ✅ Yoco untouched — no changes to any Yoco file

**Placeholder scan:** None found. All code blocks complete.

**Type consistency:**
- `CommissionInvoiceData` defined in Task 2, imported in Task 3 — consistent
- `BillingInvoice` type defined locally in Task 4 (not shared) — consistent
- `getClientId()` pattern matches all existing billing routes — consistent
