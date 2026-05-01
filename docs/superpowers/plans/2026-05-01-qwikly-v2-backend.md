# Qwikly v2 Widget Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend powering the Qwikly website chat widget: database tables, public widget API, plan enforcement, lead-to-email pipeline, Stripe subscription billing, and webhook handling.

**Architecture:** New tables (`businesses`, `leads`, `subscriptions`, `usage_periods`, `lead_rate_windows`) added alongside existing `clients` infrastructure — they share the same Supabase project and `auth.users`. New API routes at `/api/widget-config`, `/api/leads`, `/api/business`, `/api/usage`, `/api/billing/*`, and `/api/webhooks/stripe`. All auth uses the existing Supabase SSR cookie pattern. Rate limiting is DB-backed via a PostgreSQL UPSERT function (serverless-safe).

**Tech Stack:** Next.js 14 App Router, Supabase SSR + service-role admin client, Stripe Node SDK (`stripe`), Resend (already installed), Zod (already installed), TypeScript

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `migration-v2-widget-backend.sql` | Creates all 5 new tables + RPC function + RLS |
| `src/lib/stripe.ts` | Stripe singleton |
| `src/lib/v2-auth.ts` | Auth helper: resolves business + plan from cookie session |
| `src/lib/rate-limit.ts` | Serverless-safe DB rate limiter (100 req/min per api_key) |
| `src/lib/email/templates/lead-v2.ts` | Lead notification (to owner) + visitor confirmation HTML |
| `src/app/api/signup/route.ts` | POST /api/signup |
| `src/app/api/login/route.ts` | POST /api/login |
| `src/app/api/widget-config/route.ts` | GET /api/widget-config?key=xxx (public, CORS) |
| `src/app/api/leads/route.ts` | POST (public) + GET (auth) /api/leads |
| `src/app/api/leads/[id]/route.ts` | PATCH /api/leads/:id (auth) |
| `src/app/api/leads/confirm/[token]/route.ts` | GET /api/leads/confirm/:token (public, email action link) |
| `src/app/api/business/route.ts` | GET + PATCH /api/business (auth) |
| `src/app/api/usage/route.ts` | GET /api/usage (auth) |
| `src/app/api/billing/checkout/route.ts` | POST /api/billing/checkout (auth, Stripe checkout session) |
| `src/app/api/billing/portal/route.ts` | POST /api/billing/portal (auth, Stripe customer portal) |
| `src/app/api/webhooks/stripe/route.ts` | POST /api/webhooks/stripe |

### Modified Files
| File | Change |
|------|--------|
| `src/middleware.ts` | Add new public path prefixes |
| `.env.local` | Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` IDs |

---

## Task 1: Database Migration

**Files:**
- Create: `migration-v2-widget-backend.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Qwikly v2 Widget Backend — Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. businesses
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  industry TEXT,
  contact_email TEXT NOT NULL DEFAULT '',
  accent_colour TEXT NOT NULL DEFAULT '#E85A2C',
  greeting TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',
  qualifying_questions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  api_key TEXT NOT NULL UNIQUE DEFAULT ('qw_' || encode(gen_random_bytes(24), 'hex')),
  branding_removed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_user_id_idx ON businesses(user_id);
CREATE INDEX IF NOT EXISTS businesses_api_key_idx ON businesses(api_key);

-- 2. leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT,
  contact TEXT NOT NULL,
  need TEXT,
  preferred_time TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'confirmed', 'suggest_other', 'closed', 'no_show')),
  confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_conversation JSONB
);

CREATE INDEX IF NOT EXISTS leads_business_id_idx ON leads(business_id);
CREATE INDEX IF NOT EXISTS leads_captured_at_idx ON leads(captured_at);
CREATE UNIQUE INDEX IF NOT EXISTS leads_confirm_token_idx ON leads(confirm_token);

-- 3. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'premium')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_topup_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions(stripe_customer_id);

-- 4. usage_periods
CREATE TABLE IF NOT EXISTS usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  leads_captured INT NOT NULL DEFAULT 0,
  top_up_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS usage_periods_business_id_idx ON usage_periods(business_id);
CREATE INDEX IF NOT EXISTS usage_periods_period_idx ON usage_periods(business_id, period_start DESC);

-- 5. rate limiting (serverless-safe, per api_key per minute)
CREATE TABLE IF NOT EXISTS lead_rate_windows (
  api_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key, window_start)
);

CREATE INDEX IF NOT EXISTS lead_rate_windows_cleanup_idx ON lead_rate_windows(window_start);

-- RPC: atomic increment for rate limiting
CREATE OR REPLACE FUNCTION increment_rate_window(p_api_key TEXT, p_window_start TIMESTAMPTZ)
RETURNS INT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO lead_rate_windows (api_key, window_start, count)
  VALUES (p_api_key, p_window_start, 1)
  ON CONFLICT (api_key, window_start) DO UPDATE
    SET count = lead_rate_windows.count + 1
  RETURNING count;
$$;

-- RLS: businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_read_business"   ON businesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners_update_business" ON businesses FOR UPDATE USING (auth.uid() = user_id);

-- RLS: leads (owners can read/update their own leads; service role bypasses)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_read_leads"   ON leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses b WHERE b.id = leads.business_id AND b.user_id = auth.uid())
);
CREATE POLICY "owners_update_leads" ON leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses b WHERE b.id = leads.business_id AND b.user_id = auth.uid())
);

-- RLS: subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_read_subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- RLS: usage_periods
ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_read_usage" ON usage_periods FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses b WHERE b.id = usage_periods.business_id AND b.user_id = auth.uid())
);

-- Auto-cleanup: delete rate windows older than 2 minutes (keeps table tiny)
-- Run this as a cron or manually; not required for correctness.
-- DELETE FROM lead_rate_windows WHERE window_start < NOW() - INTERVAL '2 minutes';
```

- [ ] **Step 2: Run in Supabase SQL Editor**

  Open: https://supabase.com/dashboard/project/alqdujrwazxwasroxqxa/sql/new

  Paste the full SQL above and click "Run". Verify no errors in the output panel.

- [ ] **Step 3: Confirm tables exist**

  In Supabase Table Editor, confirm these tables are visible:
  - `businesses`
  - `leads`
  - `subscriptions`
  - `usage_periods`
  - `lead_rate_windows`

---

## Task 2: Install Stripe SDK

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install Stripe**

```bash
cd ~/qwikly-site && npm install stripe
```

Expected: `added 1 package` (Stripe has minimal deps).

- [ ] **Step 2: Verify**

```bash
node -e "require('stripe'); console.log('ok')"
```

Expected: `ok`

---

## Task 3: Shared Library Files

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/lib/v2-auth.ts`
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/email/templates/lead-v2.ts`

- [ ] **Step 1: Create `src/lib/stripe.ts`**

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});
```

- [ ] **Step 2: Create `src/lib/v2-auth.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-server";

export type PlanTier = "starter" | "pro" | "premium";

export type V2AuthContext = {
  userId: string;
  businessId: string;
  plan: PlanTier;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeTopupItemId: string | null;
};

export async function v2Auth(): Promise<V2AuthContext | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();

  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) return null;

  const { data: sub } = await db
    .from("subscriptions")
    .select(
      "plan, status, stripe_customer_id, stripe_subscription_id, stripe_topup_item_id"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    businessId: business.id,
    plan: (sub?.plan as PlanTier) ?? "starter",
    subscriptionStatus: sub?.status ?? "active",
    stripeCustomerId: sub?.stripe_customer_id ?? null,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    stripeTopupItemId: sub?.stripe_topup_item_id ?? null,
  };
}
```

- [ ] **Step 3: Create `src/lib/rate-limit.ts`**

```typescript
import { supabaseAdmin } from "./supabase-server";

/**
 * Returns true if the request is within the rate limit.
 * Uses an atomic DB increment — safe across serverless instances.
 */
export async function checkRateLimit(
  apiKey: string,
  maxPerMinute: number
): Promise<boolean> {
  const db = supabaseAdmin();
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);

  const { data: count, error } = await db.rpc("increment_rate_window", {
    p_api_key: apiKey,
    p_window_start: windowStart.toISOString(),
  });

  if (error) {
    console.error("[rate-limit] rpc error:", error.message);
    return true; // fail open on DB error; don't block legitimate traffic
  }

  return (count as number) <= maxPerMinute;
}
```

- [ ] **Step 4: Create `src/lib/email/templates/lead-v2.ts`**

```typescript
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export function leadNotificationHtml({
  businessName,
  leadName,
  contact,
  need,
  preferredTime,
  visitorEmail,
  confirmUrl,
  suggestUrl,
}: {
  businessName: string;
  leadName: string | null;
  contact: string;
  need: string | null;
  preferredTime: string | null;
  visitorEmail: string | null;
  confirmUrl: string;
  suggestUrl: string;
}) {
  const rows = [
    leadName
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Name</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(leadName)}</td></tr>`
      : "",
    `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Contact</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(contact)}</td></tr>`,
    visitorEmail
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Email</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(visitorEmail)}</td></tr>`
      : "",
    need
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Need</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(need)}</td></tr>`
      : "",
    preferredTime
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Preferred time</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(preferredTime)}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">
            Qwikly<span style="color:#E85A2C;">.</span>
          </span>
        </td></tr>

        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">New lead captured</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">Someone's interested, ${esc(businessName)}.</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">Your digital assistant captured a new lead. Confirm their preferred time or suggest another.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:28px;">
            ${rows}
          </table>

          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;">
                <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#E85A2C;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">Confirm this slot</a>
              </td>
              <td>
                <a href="${suggestUrl}" style="display:inline-block;padding:12px 24px;background:#1A2030;color:#9CA3AF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,0.1);">Suggest another time</a>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Powered by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function visitorConfirmationHtml({
  visitorName,
  businessName,
  preferredTime,
}: {
  visitorName: string | null;
  businessName: string;
  preferredTime: string | null;
}) {
  const name = visitorName ?? "there";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">
            Qwikly<span style="color:#E85A2C;">.</span>
          </span>
        </td></tr>

        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#22C55E;">Confirmed</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You're booked in, ${esc(name)}.</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            <strong style="color:#F4F4F5;">${esc(businessName)}</strong> has confirmed your booking${preferredTime ? ` for <strong style="color:#F4F4F5;">${esc(preferredTime)}</strong>` : ""}.
            They'll be in touch to finalise the details.
          </p>
          <p style="margin:0;font-size:13px;color:#6B7280;">Got questions? Just reply to this email.</p>
        </td></tr>

        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Powered by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function capReachedNotificationHtml({ businessName }: { businessName: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span>
        </td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#F59E0B;">Lead cap reached</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You've hit your 25-lead limit.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            Your Starter plan captures up to 25 leads per month. You've reached that limit for this billing cycle. Upgrade to Pro to keep capturing leads — no cap up to 200/month.
          </p>
          <a href="https://www.qwikly.co.za/dashboard/billing" style="display:inline-block;padding:12px 24px;background:#E85A2C;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">Upgrade to Pro — R599/mo</a>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Powered by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from the 4 new files. If `stripe` types are missing run `npm install -D @types/stripe` (usually not needed — Stripe ships its own types).

---

## Task 4: Auth Endpoints

**Files:**
- Create: `src/app/api/signup/route.ts`
- Create: `src/app/api/login/route.ts`

- [ ] **Step 1: Create `src/app/api/signup/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; businessName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { email, password, businessName } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    const db = supabaseAdmin();
    await db.from("businesses").insert({
      user_id: data.user.id,
      name: businessName ?? "",
      contact_email: email,
    });
    await db.from("subscriptions").insert({
      user_id: data.user.id,
      plan: "starter",
      billing_cycle: "monthly",
      status: "active",
    });
  }

  return NextResponse.json(
    { user: { id: data.user?.id, email: data.user?.email } },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Create `src/app/api/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    access_token: data.session.access_token,
  });
}
```

- [ ] **Step 3: Smoke test signup**

Start the dev server in a separate terminal: `npm run dev`

```bash
curl -s -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test-v2@example.com","password":"TestPass123!","businessName":"Acme Plumbing"}' | jq
```

Expected: `{"user":{"id":"...","email":"test-v2@example.com"}}`

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add src/app/api/signup/route.ts src/app/api/login/route.ts src/lib/stripe.ts src/lib/v2-auth.ts src/lib/rate-limit.ts src/lib/email/templates/lead-v2.ts migration-v2-widget-backend.sql && git commit -m "feat: v2 backend lib files and auth endpoints"
```

---

## Task 5: Widget Config Endpoint

**Files:**
- Create: `src/app/api/widget-config/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json(
      { error: "key_required" },
      { status: 400, headers: CORS }
    );
  }

  const db = supabaseAdmin();

  const { data: business, error } = await db
    .from("businesses")
    .select(
      "id, name, accent_colour, greeting, qualifying_questions, branding_removed, user_id"
    )
    .eq("api_key", key)
    .maybeSingle();

  if (error || !business) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS }
    );
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan")
    .eq("user_id", business.user_id)
    .maybeSingle();

  const plan = sub?.plan ?? "starter";
  const brandingRemoved = plan === "starter" ? false : business.branding_removed;

  return NextResponse.json(
    {
      business_id: business.id,
      name: business.name,
      accent_colour: business.accent_colour,
      greeting: business.greeting,
      qualifying_questions: business.qualifying_questions ?? [],
      branding_removed: brandingRemoved,
    },
    { headers: CORS }
  );
}
```

- [ ] **Step 2: Smoke test**

After creating a test business via signup, get its api_key from the Supabase dashboard, then:

```bash
curl -s "http://localhost:3000/api/widget-config?key=qw_TEST_KEY_HERE" | jq
```

Expected: `{ "business_id": "...", "name": "Acme Plumbing", "greeting": "Hi! How can we help you today?", ... }`

---

## Task 6: Leads Endpoints (public POST + auth GET)

**Files:**
- Create: `src/app/api/leads/route.ts`

This is the most critical endpoint. Plan enforcement logic lives here.

- [ ] **Step 1: Create `src/app/api/leads/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { v2Auth } from "@/lib/v2-auth";
import { resend, FROM } from "@/lib/resend";
import {
  leadNotificationHtml,
  capReachedNotificationHtml,
} from "@/lib/email/templates/lead-v2";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

// ─── POST /api/leads (PUBLIC — called by widget) ─────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    api_key?: string;
    name?: string;
    contact?: string;
    need?: string;
    preferred_time?: string;
    visitor_email?: string;
    raw_conversation?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: CORS }
    );
  }

  const { api_key, contact } = body;

  if (!api_key || !contact) {
    return NextResponse.json(
      { error: "api_key and contact are required" },
      { status: 400, headers: CORS }
    );
  }

  // Rate limit: 100 req/min per api_key
  const allowed = await checkRateLimit(api_key, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: CORS }
    );
  }

  const db = supabaseAdmin();

  // Resolve business
  const { data: business } = await db
    .from("businesses")
    .select("id, name, contact_email, user_id")
    .eq("api_key", api_key)
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      { error: "invalid_api_key" },
      { status: 401, headers: CORS }
    );
  }

  // Resolve plan
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, current_period_start, current_period_end")
    .eq("user_id", business.user_id)
    .maybeSingle();

  const plan = (sub?.plan ?? "starter") as "starter" | "pro" | "premium";

  // Resolve or create current usage period
  const usagePeriod = await ensureUsagePeriod(db, business.id, sub);

  // Plan cap logic
  if (plan === "starter") {
    const STARTER_CAP = 25;
    if (usagePeriod.leads_captured >= STARTER_CAP) {
      // Don't store the lead. Notify owner (fire-and-forget).
      resend.emails
        .send({
          from: FROM,
          to: [business.contact_email],
          subject: "You've hit your Qwikly lead cap — upgrade to keep capturing",
          html: capReachedNotificationHtml({ businessName: business.name }),
        })
        .catch(() => {});
      return NextResponse.json(
        { ok: true, capped: true },
        { headers: CORS }
      );
    }
  }

  // Store the lead
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({
      business_id: business.id,
      name: body.name ?? null,
      contact,
      need: body.need ?? null,
      preferred_time: body.preferred_time ?? null,
      visitor_email: body.visitor_email ?? null,
      raw_conversation: body.raw_conversation ?? null,
    })
    .select("id, confirm_token, name, contact, need, preferred_time, visitor_email")
    .single();

  if (leadError || !lead) {
    console.error("[leads] insert error:", leadError?.message);
    return NextResponse.json(
      { error: "failed_to_store" },
      { status: 500, headers: CORS }
    );
  }

  // Increment usage
  await db
    .from("usage_periods")
    .update({
      leads_captured: usagePeriod.leads_captured + 1,
      ...(plan === "pro" && usagePeriod.leads_captured >= 200
        ? { top_up_count: usagePeriod.top_up_count + 1 }
        : {}),
    })
    .eq("id", usagePeriod.id);

  // Send lead notification email to business owner
  const confirmUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=confirm`;
  const suggestUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=suggest`;

  resend.emails
    .send({
      from: FROM,
      to: [business.contact_email],
      subject: `New lead from your website — ${lead.name ?? lead.contact}`,
      html: leadNotificationHtml({
        businessName: business.name,
        leadName: lead.name,
        contact: lead.contact,
        need: lead.need,
        preferredTime: lead.preferred_time,
        visitorEmail: lead.visitor_email,
        confirmUrl,
        suggestUrl,
      }),
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, lead_id: lead.id }, { headers: CORS });
}

// ─── GET /api/leads (AUTH — dashboard) ───────────────────────────────────────

export async function GET() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select(
      "id, name, contact, need, preferred_time, visitor_email, status, captured_at"
    )
    .eq("business_id", auth.businessId)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureUsagePeriod(
  db: ReturnType<typeof supabaseAdmin>,
  businessId: string,
  sub: {
    current_period_start?: string | null;
    current_period_end?: string | null;
  } | null
) {
  const now = new Date();

  // Determine period bounds: use Stripe period if available, else calendar month
  const periodStart = sub?.current_period_start
    ? new Date(sub.current_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { data: existing } = await db
    .from("usage_periods")
    .select("id, leads_captured, top_up_count")
    .eq("business_id", businessId)
    .gte("period_end", now.toISOString())
    .lte("period_start", now.toISOString())
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await db
    .from("usage_periods")
    .insert({
      business_id: businessId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      leads_captured: 0,
      top_up_count: 0,
    })
    .select("id, leads_captured, top_up_count")
    .single();

  return created!;
}
```

- [ ] **Step 2: Test POST (happy path)**

```bash
# Replace API_KEY with a key from the businesses table in Supabase
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "qw_REPLACE_ME",
    "name": "Jane Doe",
    "contact": "+27821234567",
    "need": "Leak under sink",
    "preferred_time": "Tomorrow morning",
    "visitor_email": "jane@example.com"
  }' | jq
```

Expected: `{"ok":true,"lead_id":"..."}`

Check Supabase `leads` table — 1 row inserted. Check Resend dashboard — 1 email sent.

- [ ] **Step 3: Test rate limit**

```bash
# Send 101 requests quickly — the 101st should return 429
for i in $(seq 1 102); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/leads \
    -H "Content-Type: application/json" \
    -d '{"api_key":"qw_REPLACE_ME","contact":"+1234"}';
done | tail -5
```

Expected: last few lines show `429`.

---

## Task 7: Lead Confirm Action (email link handler)

**Files:**
- Create: `src/app/api/leads/confirm/[token]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { visitorConfirmationHtml } from "@/lib/email/templates/lead-v2";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const action = req.nextUrl.searchParams.get("action") ?? "confirm";
  const { token } = params;

  const db = supabaseAdmin();

  const { data: lead } = await db
    .from("leads")
    .select("id, name, contact, visitor_email, preferred_time, business_id, status")
    .eq("confirm_token", token)
    .maybeSingle();

  if (!lead) {
    return NextResponse.redirect(`${BASE}/?lead=not_found`);
  }

  if (action === "confirm") {
    await db
      .from("leads")
      .update({ status: "confirmed" })
      .eq("id", lead.id);

    // Email the visitor if we have their address
    if (lead.visitor_email) {
      const { data: biz } = await db
        .from("businesses")
        .select("name")
        .eq("id", lead.business_id)
        .maybeSingle();

      resend.emails
        .send({
          from: FROM,
          to: [lead.visitor_email],
          subject: `Your booking is confirmed — ${biz?.name ?? "your request"}`,
          html: visitorConfirmationHtml({
            visitorName: lead.name,
            businessName: biz?.name ?? "the business",
            preferredTime: lead.preferred_time,
          }),
        })
        .catch(() => {});
    }

    return NextResponse.redirect(`${BASE}/?lead=confirmed`);
  }

  // action === "suggest"
  await db
    .from("leads")
    .update({ status: "suggest_other" })
    .eq("id", lead.id);

  return NextResponse.redirect(`${BASE}/?lead=suggest_other`);
}
```

---

## Task 8: Lead Update Endpoint

**Files:**
- Create: `src/app/api/leads/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["new", "confirmed", "suggest_other", "closed", "no_show"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Verify lead belongs to this business
  const { data: lead } = await db
    .from("leads")
    .select("id, business_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!lead || lead.business_id !== auth.businessId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await db
    .from("leads")
    .update({ status })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
```

---

## Task 9: Business Endpoints

**Files:**
- Create: `src/app/api/business/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("businesses")
    .select(
      "id, name, industry, contact_email, accent_colour, greeting, qualifying_questions, api_key, branding_removed, created_at"
    )
    .eq("id", auth.businessId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Enforce branding for Starter plan
  const branding_removed =
    auth.plan === "starter" ? false : data.branding_removed;

  return NextResponse.json({ ...data, branding_removed });
}

export async function PATCH(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Whitelist of patchable fields
  const PATCHABLE = [
    "name",
    "industry",
    "contact_email",
    "accent_colour",
    "greeting",
    "qualifying_questions",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of PATCHABLE) {
    if (field in body) updates[field] = body[field];
  }

  // branding_removed: only Pro+ can set this
  if ("branding_removed" in body && auth.plan !== "starter") {
    updates.branding_removed = Boolean(body.branding_removed);
  }

  // api_key rotation
  if (body.rotate_api_key === true) {
    updates.api_key = `qw_${randomBytes(24).toString("hex")}`;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("businesses")
    .update(updates)
    .eq("id", auth.businessId)
    .select(
      "id, name, industry, contact_email, accent_colour, greeting, qualifying_questions, api_key, branding_removed"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
```

---

## Task 10: Usage Endpoint

**Files:**
- Create: `src/app/api/usage/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { PLAN_CONFIG, resolvePlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();

  const { data: usage } = await db
    .from("usage_periods")
    .select("id, period_start, period_end, leads_captured, top_up_count")
    .eq("business_id", auth.businessId)
    .gte("period_end", now.toISOString())
    .lte("period_start", now.toISOString())
    .maybeSingle();

  const planConfig = PLAN_CONFIG[resolvePlan(auth.plan)];
  const cap = planConfig.leadLimit; // null = unlimited

  return NextResponse.json({
    plan: auth.plan,
    cap,
    leads_captured: usage?.leads_captured ?? 0,
    top_up_count: usage?.top_up_count ?? 0,
    period_start: usage?.period_start ?? null,
    period_end: usage?.period_end ?? null,
    at_cap: cap !== null && (usage?.leads_captured ?? 0) >= cap,
  });
}
```

---

## Task 11: Billing Endpoints (Stripe)

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`
- Create: `src/app/api/billing/portal/route.ts`

- [ ] **Step 1: Add env vars to `.env.local`**

Append to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
STRIPE_PRICE_PRO_MONTHLY=price_REPLACE_ME
STRIPE_PRICE_PRO_ANNUAL=price_REPLACE_ME
STRIPE_PRICE_PREMIUM_MONTHLY=price_REPLACE_ME
STRIPE_PRICE_PREMIUM_ANNUAL=price_REPLACE_ME
STRIPE_PRICE_TOPUP_LEAD=price_REPLACE_ME
```

(See Task 14 for the Stripe CLI commands to create the actual products/prices.)

- [ ] **Step 2: Create `src/app/api/billing/checkout/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const PRICE_MAP: Record<string, string | undefined> = {
  pro_monthly:      process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:       process.env.STRIPE_PRICE_PRO_ANNUAL,
  premium_monthly:  process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_annual:   process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string; billing_cycle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { plan, billing_cycle } = body;
  if (!plan || !billing_cycle) {
    return NextResponse.json(
      { error: "plan and billing_cycle are required" },
      { status: 400 }
    );
  }

  const priceKey = `${plan}_${billing_cycle}`;
  const priceId = PRICE_MAP[priceKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `unsupported plan/cycle: ${priceKey}` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Get or create Stripe customer
  let customerId = auth.stripeCustomerId;
  if (!customerId) {
    const { data: biz } = await db
      .from("businesses")
      .select("name, contact_email")
      .eq("id", auth.businessId)
      .maybeSingle();

    const customer = await stripe.customers.create({
      email: biz?.contact_email,
      name: biz?.name,
      metadata: { user_id: auth.userId, business_id: auth.businessId },
    });
    customerId = customer.id;

    await db
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", auth.userId);
  }

  const lineItems = [{ price: priceId, quantity: 1 }];

  // Add metered top-up price for Pro
  const topupPriceId = process.env.STRIPE_PRICE_TOPUP_LEAD;
  if (plan === "pro" && topupPriceId) {
    lineItems.push({ price: topupPriceId, quantity: 1 });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: lineItems,
    success_url: `${BASE}/dashboard/billing?upgraded=1`,
    cancel_url: `${BASE}/dashboard/billing`,
    subscription_data: {
      metadata: {
        user_id: auth.userId,
        business_id: auth.businessId,
        plan,
        billing_cycle,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 3: Create `src/app/api/billing/portal/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!auth.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Upgrade first." },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: auth.stripeCustomerId,
    return_url: `${BASE}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
```

---

## Task 12: Stripe Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import Stripe from "stripe";
import { resend, FROM } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature mismatch:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpserted(db, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(db, event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(db, event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleSubscriptionUpserted(
  db: ReturnType<typeof supabaseAdmin>,
  sub: Stripe.Subscription
) {
  const userId = sub.metadata?.user_id;
  if (!userId) return;

  const plan = sub.metadata?.plan ?? "starter";
  const billingCycle = sub.metadata?.billing_cycle ?? "monthly";

  // Find the metered top-up item ID if present
  const topupItem = sub.items.data.find(
    (item) => item.price.id === process.env.STRIPE_PRICE_TOPUP_LEAD
  );

  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      billing_cycle: billingCycle,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_topup_item_id: topupItem?.id ?? null,
      status: sub.status === "active" || sub.status === "trialing" ? "active" : sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    },
    { onConflict: "user_id" }
  );
}

async function handleSubscriptionDeleted(
  db: ReturnType<typeof supabaseAdmin>,
  sub: Stripe.Subscription
) {
  await db
    .from("subscriptions")
    .update({ plan: "starter", status: "canceled", stripe_subscription_id: null })
    .eq("stripe_subscription_id", sub.id);
}

async function handleInvoicePaid(
  db: ReturnType<typeof supabaseAdmin>,
  invoice: Stripe.Invoice
) {
  // Reset past_due to active on successful payment
  if (invoice.subscription) {
    await db
      .from("subscriptions")
      .update({ status: "active" })
      .eq("stripe_subscription_id", invoice.subscription as string);
  }
}

async function handlePaymentFailed(
  db: ReturnType<typeof supabaseAdmin>,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) return;

  await db
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", invoice.subscription as string);

  // Notify owner
  const { data: sub } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", invoice.subscription as string)
    .maybeSingle();

  if (sub?.user_id) {
    const { data: biz } = await db
      .from("businesses")
      .select("contact_email, name")
      .eq("user_id", sub.user_id)
      .maybeSingle();

    if (biz?.contact_email) {
      resend.emails
        .send({
          from: FROM,
          to: [biz.contact_email],
          subject: "Action needed: your Qwikly payment failed",
          html: `<p>Hi ${biz.name}, your latest Qwikly payment failed. Please update your payment method at <a href="https://www.qwikly.co.za/dashboard/billing">your billing page</a> to keep capturing leads.</p>`,
        })
        .catch(() => {});
    }
  }
}
```

---

## Task 13: Middleware Update

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add new public prefixes**

In `src/middleware.ts`, the `PUBLIC_PREFIXES` array needs these additions:

```typescript
const PUBLIC_PREFIXES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/get-started",
  "/legal",
  "/about",
  "/contact",
  "/status",
  "/help",
  "/og-image",
  "/api/health",
  "/api/web",
  "/api/assistant/chat",
  "/api/cron",
  "/api/automations/run",
  "/api/invoices/daily",
  "/api/l",
  "/api/pdf",
  "/connect-your-website",
  "/widget",
  // v2 public endpoints
  "/api/widget-config",
  "/api/leads/confirm",
  "/api/webhooks/stripe",
  "/api/signup",
  "/api/login",
];
```

Note: `/api/leads` itself is NOT in the public prefixes because the GET requires auth. The POST is public but the route handler checks auth internally (based on method, not middleware).

- [ ] **Step 2: Verify middleware boots**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/widget-config
```

Expected: `400` (missing key param, not `302` redirect to login).

---

## Task 14: Stripe Product Setup

**Files:**
- No code changes — Stripe CLI commands only.

- [ ] **Step 1: Create products and prices in Stripe**

Run these commands with the Stripe CLI (or create manually in Stripe Dashboard):

```bash
# Install Stripe CLI if not present: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Starter (free — no Stripe product needed, just used in DB as plan=starter)

# Pro
PRODUCT_PRO=$(stripe products create --name="Qwikly Pro" --description="200 leads/month, custom branding, CSV export" --json | jq -r '.id')

PRICE_PRO_MONTHLY=$(stripe prices create \
  --product=$PRODUCT_PRO \
  --unit-amount=59900 \
  --currency=zar \
  --recurring-interval=month \
  --nickname="Pro Monthly" \
  --json | jq -r '.id')

PRICE_PRO_ANNUAL=$(stripe prices create \
  --product=$PRODUCT_PRO \
  --unit-amount=598800 \
  --currency=zar \
  --recurring-interval=year \
  --nickname="Pro Annual (2 months free)" \
  --json | jq -r '.id')

# Premium
PRODUCT_PREMIUM=$(stripe products create --name="Qwikly Premium" --description="Unlimited leads, API access, dedicated support" --json | jq -r '.id')

PRICE_PREMIUM_MONTHLY=$(stripe prices create \
  --product=$PRODUCT_PREMIUM \
  --unit-amount=129900 \
  --currency=zar \
  --recurring-interval=month \
  --nickname="Premium Monthly" \
  --json | jq -r '.id')

PRICE_PREMIUM_ANNUAL=$(stripe prices create \
  --product=$PRODUCT_PREMIUM \
  --unit-amount=1298800 \
  --currency=zar \
  --recurring-interval=year \
  --nickname="Premium Annual (2 months free)" \
  --json | jq -r '.id')

# Top-up lead (metered, per Pro overage)
PRODUCT_TOPUP=$(stripe products create --name="Qwikly Lead Top-up" --description="R20 per extra qualified lead over cap" --json | jq -r '.id')

PRICE_TOPUP=$(stripe prices create \
  --product=$PRODUCT_TOPUP \
  --unit-amount=2000 \
  --currency=zar \
  --recurring-interval=month \
  --recurring-usage-type=metered \
  --nickname="Lead Top-up R20/lead" \
  --json | jq -r '.id')

echo "PRO_MONTHLY=$PRICE_PRO_MONTHLY"
echo "PRO_ANNUAL=$PRICE_PRO_ANNUAL"
echo "PREMIUM_MONTHLY=$PRICE_PREMIUM_MONTHLY"
echo "PREMIUM_ANNUAL=$PRICE_PREMIUM_ANNUAL"
echo "TOPUP=$PRICE_TOPUP"
```

- [ ] **Step 2: Copy price IDs into `.env.local`**

Replace the `REPLACE_ME` placeholders in `.env.local` with the printed price IDs.

- [ ] **Step 3: Set up Stripe webhook**

```bash
# Local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret printed by the CLI into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

For production, add the webhook in the Stripe Dashboard:
- URL: `https://www.qwikly.co.za/api/webhooks/stripe`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

---

## Task 15: Final Build Verification

- [ ] **Step 1: TypeScript check**

```bash
cd ~/qwikly-site && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 2: Build check**

```bash
cd ~/qwikly-site && npm run build 2>&1 | tail -20
```

Expected: `Route (app)` table with all new routes listed, `✓ Compiled successfully`.

- [ ] **Step 3: Smoke test all endpoints against localhost**

```bash
# widget-config (no key → 400)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/widget-config"
# → 400

# leads GET (no auth → 401)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/leads"
# → 401

# business GET (no auth → 401)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/business"
# → 401

# usage GET (no auth → 401)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/usage"
# → 401

# billing/checkout (no auth → 401)
curl -s -X POST -o /dev/null -w "%{http_code}" "http://localhost:3000/api/billing/checkout"
# → 401
```

- [ ] **Step 4: Final commit**

```bash
cd ~/qwikly-site && git add -p && git commit -m "feat: qwikly v2 widget backend — all API endpoints, Stripe billing, plan enforcement"
```

---

## Env Vars Checklist

All env vars required by this backend, beyond what already exists:

| Variable | Description | Source |
|----------|-------------|--------|
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_... or sk_live_...) | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `stripe listen` or Stripe Dashboard → Webhooks |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID for Pro monthly | Task 14 |
| `STRIPE_PRICE_PRO_ANNUAL` | Price ID for Pro annual | Task 14 |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Price ID for Premium monthly | Task 14 |
| `STRIPE_PRICE_PREMIUM_ANNUAL` | Price ID for Premium annual | Task 14 |
| `STRIPE_PRICE_TOPUP_LEAD` | Price ID for metered top-up lead | Task 14 |

Existing vars used by v2 (already in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `RESEND_API_KEY` ✓
- `RESEND_FROM` ✓
- `NEXT_PUBLIC_SITE_URL` ✓

---

## Stripe Products Summary

| Product | Price | Stripe Amount | Billing |
|---------|-------|---------------|---------|
| Qwikly Pro | R599/month | 59900 ZAR cents | monthly |
| Qwikly Pro | R5,988/year | 598800 ZAR cents | annual (2 months free = 10×599) |
| Qwikly Premium | R1,299/month | 129900 ZAR cents | monthly |
| Qwikly Premium | R12,988/year | 1298800 ZAR cents | annual (2 months free = 10×1299) |
| Lead Top-up | R20/lead | 2000 ZAR cents | metered, monthly |

---

## API Spec Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/signup` | public | Create user + business + starter subscription |
| POST | `/api/login` | public | Sign in, set session cookie |
| GET | `/api/widget-config?key=xxx` | public | Widget bootstrap config |
| POST | `/api/leads` | public (api_key) | Capture lead; enforces plan cap |
| GET | `/api/leads` | session | List leads for authenticated business |
| PATCH | `/api/leads/:id` | session | Update lead status |
| GET | `/api/leads/confirm/:token?action=confirm\|suggest` | public | Email action link handler |
| GET | `/api/business` | session | Get business settings |
| PATCH | `/api/business` | session | Update business settings, rotate API key |
| GET | `/api/usage` | session | Current period usage vs cap |
| POST | `/api/billing/checkout` | session | Create Stripe checkout session |
| POST | `/api/billing/portal` | session | Create Stripe customer portal session |
| POST | `/api/webhooks/stripe` | Stripe-signed | Handle subscription lifecycle events |

---

## BACKLOG (out of v1 scope)

Items the spec explicitly defers — add to `BACKLOG.md` when tempted to build them:

- WhatsApp routing for lead notifications
- Google Calendar slot booking
- Metered top-up usage reporting cron (currently top_up_count is tracked but not auto-reported to Stripe)
- `lead_rate_windows` cleanup cron (old rows accumulate; negligible at small scale)
- API access for Premium tier (spec lists it as a feature, but no widget/dashboard uses it yet)
- Stripe Billing Portal customisation
