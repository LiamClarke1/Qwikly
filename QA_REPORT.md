# Qwikly — Pre-Launch QA Report (v2 Product Pivot)

**Site:** https://www.qwikly.co.za
**Date:** 2026-05-02
**Tester:** Claude QA Agent
**Scope:** v1 product pivot — website chat widget, new pricing (Starter/Pro/Premium), no phone imagery
**Verdict:** ⛔ **NO-GO** — 2 P0 bugs block launch (billing page broken, security issues from prior QA unresolved)

---

## Journey Results

| Journey | Status | Notes |
|---|---|---|
| 1. Anonymous visitor → signup | ✅ PASS | Widget mockup on homepage, correct pricing, signup flow loads |
| 2. Lead capture via widget | ✅ PASS | Chat API works, cap enforcement added, widget <6KB gzipped |
| 3. Starter → Pro upgrade | ❌ FAIL (P0) | Billing page calls `/api/subscription` which doesn't exist |
| 4. Pro over-cap top-up | ⚠️ PARTIAL | `is_top_up` flag set on conversations, billing invoice not wired |
| 5. Cancellation | ❌ FAIL (P0) | Same billing page issue |
| 6. Cross-page consistency | ✅ PASS | Pricing consistent R0/R599/R1,299; all banned language clear |
| 7. Visual regression | ✅ PASS | Widget mockup on homepage (not phone), correct vibe |

---

## Bugs Found and Fixed This Session

### FIXED — P0 (was blocking launch)

#### V2-QA-001 — Chat assistant quoting wrong pricing
- **File:** `src/app/api/web/chat/route.ts:175`
- **Was:** "Lite is R399, Pro is R799, Business is R1,499"
- **Fixed:** "Starter is free forever. Pro is R599/month. Premium is R1,299/month."
- **Status:** ✅ FIXED

#### V2-QA-002 — Chat assistant pitching WhatsApp as current feature
- **File:** `src/app/api/web/chat/route.ts` — "THREE CHANNELS" rule
- **Was:** Instructed AI to always mention WhatsApp as a current channel
- **Fixed:** Rewrote section to describe website widget only; WhatsApp noted as coming soon
- **Status:** ✅ FIXED

#### V2-QA-003 — No lead cap enforcement in widget chat API
- **File:** `src/app/api/web/chat/route.ts`
- **Was:** Zero cap logic — Starter users could capture unlimited leads
- **Fixed:** Fetches client plan + counts monthly leads before allowing lead capture. Starter: blocks at 25, injects prompt override. Pro: allows with `is_top_up` flag on conversation.
- **Status:** ✅ FIXED

#### V2-QA-004 — connect-your-website page uses old plan names and treats calendar/WhatsApp as live
- **File:** `src/app/(landing)/connect-your-website/page.tsx`
- **Was:** "Business" and "Lite" plan names; calendar booking and WhatsApp described as current features
- **Fixed:** Updated to Starter/Pro/Premium; calendar and WhatsApp now marked "coming soon"; comparison table updated; FAQs rewritten
- **Status:** ✅ FIXED

#### V2-QA-005 — Duplicate /auth/callback route
- **File:** `src/app/(app)/auth/callback/route.ts`
- **Was:** Two routes resolving to `/auth/callback` — the simpler one would skip onboarding for new Google OAuth users
- **Fixed:** Removed the simpler duplicate; top-level `src/app/auth/callback/route.ts` (with onboarding redirect logic) is now sole handler
- **Status:** ✅ FIXED

---

### OPEN — P0 (blocks launch)

#### V2-QA-006 — Billing page completely broken
- **File:** `src/app/(app)/dashboard/billing/page.tsx`
- **Detail:** Page calls `/api/subscription`, `/api/subscription/invoices`, `/api/subscription/change`, `/api/subscription/cancel`, `/api/subscription/payment-method` — none of these routes exist. The page shows "No active subscription found" for every user, including paid users. Plan changes and cancellation are non-functional.
- **Available:** `POST /api/billing/checkout` (Stripe checkout), `POST /api/billing/portal` (Stripe billing portal) — these exist but are not wired to the billing page UI.
- **Minimum fix:** Replace the 5 stub API calls with the actual billing endpoints, or redirect users to the Stripe billing portal for all subscription management.
- **Effort:** 2–4 hours
- **Status:** ❌ OPEN — blocks Journey 3 and Journey 5

#### V2-QA-007 — Security issues from prior QA still open
- **Detail:** QA-SEC-001 (Yoco webhook signature bypass) and QA-SEC-002 (CRON auth bypass) from the 2026-04-30 report were not addressed. These are business-critical security issues that should have been fixed before this sprint.
- **Files:** `src/app/api/webhooks/yoco/route.ts`, `src/app/api/automations/run/route.ts`
- **Status:** ❌ OPEN — verify `YOCO_WEBHOOK_SECRET` and `CRON_SECRET` are set in Vercel env vars as a minimum

---

### OPEN — P1

#### V2-QA-008 — top_up_count not aggregated for Stripe billing
- **Detail:** When Pro users exceed 200 leads, conversations get `is_top_up = true` on the record, but there's no aggregation into `top_up_count` and no Stripe usage-record trigger. End-of-cycle invoices won't include top-up charges.
- **Effort:** 3–6 hours (aggregate on cron, trigger Stripe metered billing)
- **Status:** ❌ OPEN

#### V2-QA-009 — connect-your-website page CTA links to /pricing instead of /signup
- **File:** `src/app/(landing)/connect-your-website/page.tsx:75`
- **Detail:** Hero CTA button says "Start with Pro" but links to `/pricing`. Should link to `/signup?plan=pro`.
- **Effort:** 5 min
- **Status:** ❌ OPEN

#### V2-QA-010 — Chat assistant still mentions Google Calendar as current feature in one objection
- **File:** `src/app/api/web/chat/route.ts:183` (was "I already have a chatbot?" response)
- **Status:** ✅ FIXED in this session — removed calendar reference from that response

---

### OPEN — P2 (non-blocking for launch)

#### V2-QA-011 — get-started page has old "Per job quote" charge type option
- **File:** `src/app/(landing)/get-started/page.tsx:23`
- **Detail:** `CHARGE_OPTS` array includes "Per job quote" as an option. Fine as a questionnaire answer (user is describing their own pricing), but could be confusing given our "no per-job fees" positioning.
- **Status:** ⚠️ REVIEW INTENT

#### V2-QA-012 — Embed page gate is incorrect
- **File:** `src/app/(app)/dashboard/embed/page.tsx:17`
- **Detail:** `canUseWidget` checks `tier === "pro" || tier === "premium" || tier === "starter"` — this is always true (all three tiers). The gate below it ("Web widget is a Pro feature") can never display. If the intent is that Starter gets a limited/branded widget, the gate is meaningless. If the intent is all tiers get the widget, the gate copy is wrong.
- **Status:** ⚠️ REVIEW INTENT

---

## Performance Results

| Check | Result | Target | Status |
|---|---|---|---|
| Homepage load (dev server) | 1.3s | <2s | ✅ PASS |
| widget.js gzipped | 6.0 KB | <50 KB | ✅ PASS |
| embed.js gzipped | 5.5 KB | <50 KB | ✅ PASS |
| Dashboard initial paint | Not tested (requires auth) | <1.5s | ⚠️ PENDING |

---

## Cross-Page Pricing Consistency

| Page | R599 Pro | R1,299 Premium | No 'Lite' | No 'Business' plan | No '8%' | No 'commission' | WhatsApp 'coming soon' |
|---|---|---|---|---|---|---|---|
| Homepage (/) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /pricing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /signup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /connect-your-website | ✅ | ✅ | ✅ | ✅ (FIXED) | ✅ | ✅ | ✅ (FIXED) |
| Chat assistant system prompt | ✅ (FIXED) | ✅ (FIXED) | ✅ (FIXED) | ✅ (FIXED) | ✅ | ✅ | ✅ (FIXED) |

---

## Minimum Launch Checklist

**Must fix before Monday:**
- [ ] **V2-QA-006** — Fix billing page (wire to `/api/billing/checkout` and `/api/billing/portal`, or render a Stripe portal redirect). This is the only remaining P0 code bug.
- [ ] **V2-QA-007** — Confirm `YOCO_WEBHOOK_SECRET` and `CRON_SECRET` are set in Vercel production env vars. Check takes 2 minutes.

**Should fix before Monday:**
- [ ] **V2-QA-009** — Change `/connect-your-website` hero CTA from `/pricing` → `/signup?plan=pro` (5 min)
- [ ] **V2-QA-008** — Top-up billing aggregation (if you're selling Pro at launch, you need this)

**Can ship with:**
- [ ] V2-QA-011, V2-QA-012 — review intent but not blocking

---

## Carryover from Prior QA (2026-04-30)

The following bugs from the previous QA report remain open and should be addressed before or alongside this launch:

| ID | Severity | Description |
|---|---|---|
| QA-SEC-001 | 🚨 CRITICAL | Yoco webhook signature bypass — `YOCO_WEBHOOK_SECRET` conditional |
| QA-SEC-002 | HIGH | CRON auth bypass — `CRON_SECRET` conditional |
| QA-BRAND-001 | HIGH | 27 AI language violations in user-facing copy |
| QA-DATA-001 | HIGH | Status page shows fake hardcoded uptime data |

---

## Go / No-Go Recommendation

### ⛔ NO-GO for Monday launch as-is

**Hard blockers:**
1. **Billing page is broken.** Every user sees "No active subscription found." Plan upgrades (Journey 3) and cancellations (Journey 5) are non-functional. This is a 2–4 hour fix.
2. **Security gaps from prior QA are unresolved.** Yoco webhook bypass is a revenue-theft risk. Verify the env var is set in Vercel — takes 2 minutes.

**If V2-QA-006 and V2-QA-007 are resolved by Sunday evening:**

### ✅ CONDITIONALLY GO

The lead capture core (Journey 2) works. Pricing is correct across all pages. The widget is tiny (6KB). The homepage shows the right product. Cap enforcement is now live. The duplicate auth callback is fixed.

Estimated time to clear hard blockers: **3–5 hours of focused work.**

---

*Previous QA report (2026-04-30) retained for reference — see git history.*
