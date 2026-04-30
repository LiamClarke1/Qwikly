# Qwikly — Pre-Launch QA Report

**Site:** https://www.qwikly.co.za  
**Date:** 2026-04-30  
**Tester:** Claude QA Agent  
**Verdict:** ⛔ **DO NOT SHIP** — 1 Critical, 3 High severity bugs must be fixed first

---

## Summary Scorecard

| Area | Status | Notes |
|---|---|---|
| Public pages (HTTP) | ✅ PASS | All 14 routes return 200 |
| Console errors | ✅ PASS | Zero JS errors on any public page |
| Broken images | ✅ PASS | No broken images detected |
| Navigation links | ✅ PASS | No broken nav links |
| Real data (no mocks in dashboard) | ✅ PASS | Analytics fetches live Supabase data |
| **Hardcoded status page** | ❌ FAIL | /status presents fake uptime as live data |
| **AI language violations** | ❌ FAIL | 27 instances of "AI"/"chatbot" in user-facing copy |
| **Security — Yoco webhook** | 🚨 CRITICAL | Signature verification conditional on env var |
| **Security — Automations CRON** | ❌ HIGH | Auth bypassed when CRON_SECRET unset |
| Security — Admin UI | ⚠️ MEDIUM | Client-side only redirect (data APIs are protected) |
| Security — IDOR | ✅ PASS | Invoice token page is safe; no ownership bypasses |
| Security — Secrets in source | ✅ PASS | No hardcoded API keys or secrets found |
| Security — WhatsApp webhook | ✅ PASS | Twilio signature validation present |
| Accessibility (axe-core) | ❌ FAIL | Critical/serious violations on all 13 pages |
| Performance — / | ❌ FAIL | 77 (target >85), TBT 460ms |
| Performance — /pricing | ✅ PASS | 89 |
| Performance — /about | ✅ PASS | 91 |
| Performance — /login | ❌ FAIL | 76 (target >85), TBT 460ms |
| Accessibility score — / | ❌ FAIL | 91 (target >95) |
| Accessibility score — /pricing | ✅ PASS | 96 |
| Accessibility score — /about | ✅ PASS | 96 |
| Accessibility score — /login | ❌ FAIL | 88 (target >95) |
| SEO | ✅ PASS | 100 on all pages |
| Best practices | ✅ PASS | 100 on all pages |
| Page titles | ⚠️ MEDIUM | 5 pages share generic title; 2 pages have "Qwikly | Qwikly" |
| Meta descriptions | ⚠️ MEDIUM | 6 pages missing page-level OG tags |
| Missing pages | ⚠️ MEDIUM | /docs referenced but does not exist |
| E2E flows | ⚠️ PENDING | Written; require test credentials to execute |
| Cross-browser | ⚠️ PENDING | Playwright config written; requires run with browsers installed |
| Email deliverability | ⚠️ PENDING | Requires manual send to Gmail/Outlook/ProtonMail |

---

## 🚨 Bugs by Severity

### CRITICAL

#### QA-SEC-001 — Yoco Webhook: Signature Verification Skipped When Env Var Absent
- **File:** `src/app/api/webhooks/yoco/route.ts:26`
- **Terminal:** T1 (Backend / API)
- **Impact:** Attacker can POST a forged `payment.succeeded` event to `/api/webhooks/yoco` with no signature. The endpoint processes it, marks any invoice as paid, issues a receipt, and notifies the client — all without real payment.
- **Repro:**
  ```bash
  curl -X POST https://www.qwikly.co.za/api/webhooks/yoco \
    -H "Content-Type: application/json" \
    -d '{"type":"payment.succeeded","id":"fake-123","payload":{"id":"fake-123","amount":100000,"metadata":{"invoice_id":"<real-invoice-uuid>"}}}'
  ```
  If `YOCO_WEBHOOK_SECRET` is not set in Vercel env vars, this returns 200 and the invoice is marked paid.
- **Fix:** Change `if (webhookSecret) { verify }` to `if (!webhookSecret) { return 401 }` — i.e., make the secret **required**, not optional. Or better: throw a startup error if `YOCO_WEBHOOK_SECRET` is undefined.
- **Fix status:** ❌ OPEN

---

### HIGH

#### QA-SEC-002 — Automations CRON: Auth Bypassed When CRON_SECRET Unset
- **File:** `src/app/api/automations/run/route.ts:8`
- **Terminal:** T1 (Backend / API)
- **Impact:** The CRON endpoint only checks `CRON_SECRET` if the env var is defined. If unset, any unauthenticated HTTP POST triggers bulk automation runs (WhatsApp messages to all leads across all clients).
- **Repro:**
  ```bash
  curl -X POST https://www.qwikly.co.za/api/automations/run
  ```
  If `CRON_SECRET` is not set, this fires all active automations.
- **Fix:** Same pattern as above — make the secret required. Replace `if (secret && req.headers.get("x-cron-secret") !== secret)` with `if (!secret || req.headers.get("x-cron-secret") !== secret)`.
- **Fix status:** ❌ OPEN

#### QA-DATA-001 — Status Page Presents Hardcoded Data as Live
- **File:** `src/app/(landing)/status/page.tsx:44`
- **Terminal:** T2 (Frontend / Landing)
- **Impact:** `/status` shows fabricated uptime percentages (99.9%, 99.8%, 99.7%) and hardcoded "operational" status for all services. If a service actually goes down, the page will still show green. Users/investors who check this page during an incident will be misled.
- **Evidence:** `SERVICES` array is a static TypeScript constant. No API call, no DB query, no external status provider.
- **Fix options (pick one):**
  1. Connect to a real status provider (Instatus, Betterstack, or custom Supabase health check)
  2. Display "Status data not yet live" with a note — at minimum, don't show fake uptime percentages
  3. Remove the page until real data is connected
- **Fix status:** ❌ OPEN

#### QA-BRAND-001 — 27 AI Language Violations in User-Facing Copy
- **Terminal:** T2 (Frontend / Landing) + T3 (Frontend / Dashboard)
- **Impact:** Brand rule is "never say AI, chatbot, bot, artificial intelligence." These terms appear 27 times in customer-facing copy including meta tags, OG data, JSON-LD schema, landing pages, and WhatsApp dunning messages. Violates the explicit brand agreement.
- **Full list of violations:**

| File | Line | Text (truncated) |
|---|---|---|
| `src/app/layout.tsx` | 48 | keywords: `'AI booking system South Africa'` |
| `src/app/layout.tsx` | 71 | OG image alt: `'Qwikly — AI receptionist...'` |
| `src/app/layout.tsx` | 105 | JSON-LD description: `'AI receptionist...'` |
| `src/app/(landing)/connect-your-website/page.tsx` | 9 | meta description: `'Qwikly's AI answers visitors'` |
| `src/app/(landing)/connect-your-website/page.tsx` | 22 | Feature title: `'The AI answers your visitors'` |
| `src/app/(landing)/connect-your-website/page.tsx` | 70 | Body: `'Connect your existing website to a Qwikly AI assistant.'` |
| `src/app/(landing)/how-it-works/page.tsx` | 43 | `'The AI is trained on your specific trade…'` |
| `src/app/(landing)/how-it-works/page.tsx` | 53 | `'See exactly what the AI said…'` |
| `src/app/(landing)/page.tsx` | 67 | `'Not a chatbot script.'` |
| `src/app/(landing)/page.tsx` | 322 | `'Speaks in your business voice, not like a chatbot'` |
| `src/app/(landing)/pricing/page.tsx` | 18 | `'Trade-specific AI training'` |
| `src/app/(landing)/pricing/layout.tsx` | 22 | OG meta: `'AI-powered lead response…'` |
| `src/app/(landing)/status/page.tsx` | 52 | Service name: `'AI Messaging'` |
| `src/app/(landing)/status/page.tsx` | 5 | Meta desc: `'…AI messaging, WhatsApp…'` |
| `src/components/FAQ.tsx` | 55 | FAQ answer: `'The AI uses natural, conversational language…'` |
| `src/lib/faq-data.ts` | 50 | Same FAQ data source |
| `src/app/(landing)/get-started/page.tsx` | 526 | H1: `'Set up your AI assistant'` |
| `src/app/(landing)/get-started/page.tsx` | 528 | Subheading: `'…the smarter your AI responds.'` |
| `src/app/(landing)/get-started/page.tsx` | 947 | Field label: `'Language your AI replies in'` |
| `src/app/(app)/dashboard/setup/page.tsx` | 56 | Step title: `'AI Personality'` |
| `src/app/(app)/dashboard/setup/page.tsx` | 65 | Loading msg: `'Building your AI profile...'` |
| `src/app/(app)/dashboard/settings/assistant/page.tsx` | 120 | Card header: `'How should your AI come across…'` |
| `src/app/(app)/dashboard/settings/assistant/page.tsx` | 131 | Field: `'AI tone (detailed)'` |
| `src/app/(app)/dashboard/settings/assistant/page.tsx` | 227 | Button: `'Update AI knowledge'` |
| `src/app/(app)/dashboard/settings/business/page.tsx` | 300 | Select option: `'AI books directly'` |
| `src/app/api/billing/dunning/route.ts` | 85 | WhatsApp message sent to client: `'Your AI receptionist has also been paused'` |

- **Fix:** Global find-and-replace across all .tsx/.ts files in src/:
  - "AI assistant" → "digital assistant"
  - "AI receptionist" → "digital assistant"
  - "AI books" → "your assistant books"
  - "chatbot" → "digital assistant"
  - "AI training" → "business training"
  - "AI Messaging" → "Digital Messaging"
  - "AI personality" → "Assistant personality"
  - "AI tone" → "Assistant tone"
  - "AI knowledge" → "Assistant knowledge"
  - Dunning WhatsApp message: replace "AI receptionist" → "digital assistant"
- **Fix status:** ❌ OPEN

---

### MEDIUM

#### QA-SEC-003 — Admin Panel: Client-Side Only Auth (UI Protection Gap)
- **File:** `src/app/(app)/admin/layout.tsx:25`
- **Terminal:** T1 (Backend / API)
- **Impact:** The `/admin` shell renders for any logged-in user before the `useEffect` redirect fires. Admin API routes all use `assertAdmin()` server-side so data is protected, but the admin UI chrome briefly loads for non-admins.
- **Fix:** Add a server-side admin check in a server component wrapper, or add `/admin` to middleware role checks.
- **Fix status:** ❌ OPEN

#### QA-A11Y-001 — Color Contrast Failures on All Pages (amber/cream combination)
- **Terminal:** T2 (Frontend)
- **Impact:** `text-ember` (#D97706 amber on cream background #F4EEE4) fails WCAG AA 4.5:1 contrast ratio. Affects eyebrow labels, badges, inline links, and button text across every page (16–23 nodes per page).
- **Fix:** Darken the amber shade for text (e.g. #B45309 or #92400E) — or use the amber on a darker background only. The border version (border-only badges) can stay amber.
- **Fix status:** ❌ OPEN

#### QA-A11Y-002 — Duplicate / Nested `<main>` Landmark
- **Terminal:** T2 (Frontend)
- **Affects:** /pricing, /how-it-works, /connect-your-website, /get-started (landmark-main-is-top-level, landmark-no-duplicate-main)
- **Impact:** Screen readers announce multiple "main" regions. Root cause is a `<main>` in the root layout and another `<main>` in individual page components.
- **Fix:** Remove the inner `<main>` from the affected page components. The layout's `<main>` is sufficient.
- **Fix status:** ❌ OPEN

#### QA-A11Y-003 — Unlabelled Form Controls
- **File:** `/get-started` — `<select>` with no accessible name; `/` — `<input type="range">` with no label
- **Terminal:** T2 (Frontend)
- **Impact:** Screen reader users cannot identify what these controls do.
- **Fix:** Add `<label>` or `aria-label` to both elements.
- **Fix status:** ❌ OPEN

#### QA-A11Y-004 — Links in Text Blocks Not Visually Distinguished
- **Affects:** /about, /pricing, /contact, /how-it-works, /connect-your-website, /get-started, /status, /legal/privacy, /legal/terms, /login, /signup, /forgot-password
- **Terminal:** T2 (Frontend)
- **Impact:** Privacy/legal links in prose blocks are only distinguished by color (no underline at rest). Fails WCAG 1.4.1 (Use of Color).
- **Fix:** Add `underline` to `<a>` tags within text blocks. Current class is `text-ember hover:underline` — remove the `hover:` so the underline is always visible.
- **Fix status:** ❌ OPEN

#### QA-PERF-001 — Homepage Performance 77 (TBT 460ms, LCP 3.7s)
- **Terminal:** T2 (Frontend)
- **Impact:** Homepage misses the >85 target. TBT of 460ms indicates heavy JS on the main thread. LCP of 3.7s is slow for a marketing page.
- **Root cause (likely):** Large JS bundle from interactive pricing/lead simulator widgets. Heavy fonts (Fraunces) may block LCP.
- **Fix:** `next/font` with `display: swap` (verify it's set), preload LCP hero image, defer non-critical widgets with dynamic import + `{ ssr: false, loading: () => <Skeleton/> }`.
- **Fix status:** ❌ OPEN

#### QA-PERF-002 — Login Page Performance 76 (TBT 460ms, LCP 4.0s)
- **Terminal:** T2 (Frontend)
- **Fix:** Same bundle/font investigation as homepage. Auth libraries may be loading eagerly.
- **Fix status:** ❌ OPEN

#### QA-COPY-001 — Duplicate "Qwikly" in Page Titles
- **Affects:** /legal/privacy → "Privacy Policy | Qwikly | Qwikly", /legal/terms → "Terms of Service | Qwikly | Qwikly"
- **Terminal:** T2 (Frontend)
- **Fix:** Remove the redundant `| Qwikly` suffix from the page-level `metadata.title` since the root layout appends it.
- **Fix status:** ❌ OPEN

#### QA-COPY-002 — Generic Page Title on 5 Auth/App Pages
- **Affects:** /login, /signup, /forgot-password, /get-started, /onboarding — all show "Qwikly | Never Miss a Lead Again" instead of a page-specific title
- **Terminal:** T2 (Frontend)
- **Fix:** Add page-specific `export const metadata: Metadata = { title: "Sign In | Qwikly" }` to each page.
- **Fix status:** ❌ OPEN

#### QA-COPY-003 — /connect-your-website Title Contains "AI booking"
- **File:** `/connect-your-website` title = "Connect Your Website | Qwikly — AI booking on your own site | Qwikly"
- **Terminal:** T2 (Frontend)
- **Fix:** Change to "Connect Your Website | Qwikly — Book leads directly from your site". Also remove duplicate "| Qwikly" suffix.
- **Fix status:** ❌ OPEN

#### QA-SEO-001 — 6 Pages Missing Page-Level OG Tags
- **Affects:** /connect-your-website, /contact, /about, /status, /legal/privacy, /legal/terms
- **Terminal:** T2 (Frontend)
- **Impact:** Social sharing will use root layout OG tags (generic homepage image). Pages won't get custom previews.
- **Fix:** Add `openGraph` block to each page's `metadata` export.
- **Fix status:** ❌ OPEN

---

### LOW

#### QA-DATA-002 — "Coming Soon" Badges Visible in Production UI
- **Files:** `src/app/(app)/dashboard/setup/page.tsx:492`, `src/app/(app)/onboarding/page.tsx:97`
- **Terminal:** T3 (Dashboard)
- **Impact:** "Coming soon" badges on plan options are visible to paying users. Fine if intentional — flag for confirmation.
- **Fix status:** ⚠️ CONFIRM INTENT

#### QA-A11Y-005 — Heading Order Violation on /how-it-works
- **Terminal:** T2 (Frontend)
- **Impact:** An `<h3>` appears before any `<h2>` in document order, breaking heading hierarchy for screen reader users.
- **Fix:** Promote the heading to `<h2>` or restructure the section.
- **Fix status:** ❌ OPEN

#### QA-A11Y-006 — Missing Landmark Regions on Auth Pages
- **Affects:** /login, /signup, /forgot-password
- **Terminal:** T2 (Frontend)
- **Impact:** Page content outside `<main>` / `<nav>` / `<footer>` regions is not accessible to screen reader landmark navigation.
- **Fix:** Wrap auth page content in `<main>`.
- **Fix status:** ❌ OPEN

#### QA-SEC-004 — dangerouslySetInnerHTML in Landing Layout (Low Risk, Static Content)
- **Files:** `src/app/(landing)/layout.tsx:16`, `src/app/layout.tsx:134`
- **Terminal:** T1 (Backend / API)
- **Impact:** Both uses inject statically-defined strings — no user input involved. No XSS risk in practice. Informational.
- **Fix:** Cosmetic; lower to comment or leave as-is.
- **Fix status:** ℹ️ INFORMATIONAL

---

## UI Element Checklist — Public Pages

| Route | HTTP | Title OK | Forms | Buttons | Console Errors | AI Violations | a11y Critical | PASS/FAIL |
|---|---|---|---|---|---|---|---|---|
| / | 200 | ⚠️ Generic* | range input unlabelled | 77 | 0 | AI, chatbot | 2 | ❌ FAIL |
| /about | 200 | ✅ | — | 37 | 0 | AI | 2 | ❌ FAIL |
| /pricing | 200 | ✅ | — | 46 | 0 | AI, chatbot | 2 + 3 mod | ❌ FAIL |
| /contact | 200 | ✅ | 9 inputs | 33 | 0 | — | 2 | ⚠️ PASS† |
| /how-it-works | 200 | ✅ | — | 31 | 0 | AI | 1 + 4 mod | ❌ FAIL |
| /connect-your-website | 200 | ❌ AI+duplicate | — | 33 | 0 | AI, chatbot | 1 + 3 mod | ❌ FAIL |
| /get-started | 200 | ⚠️ Generic | 8 inputs | 33 | 0 | AI | 3 | ❌ FAIL |
| /status | 200 | ✅ | — | 31 | 0 | — | 2 | ❌ FAIL (fake data) |
| /legal/privacy | 200 | ❌ Duplicate | — | 36 | 0 | — | 2 | ❌ FAIL |
| /legal/terms | 200 | ❌ Duplicate | — | 37 | 0 | — | 2 | ❌ FAIL |
| /login | 200 | ⚠️ Generic | 2 inputs | 10 | 0 | — | 2 + 1 mod | ❌ FAIL |
| /signup | 200 | ⚠️ Generic | 2 inputs | 9 | 0 | — | 2 + 1 mod | ❌ FAIL |
| /forgot-password | 200 | ⚠️ Generic | 1 input | 6 | 0 | — | 2 + 1 mod | ❌ FAIL |
| /onboarding | 200 | ⚠️ Redirects to login | — | — | 0 | — | — | ✅ PASS |

*Generic = "Qwikly | Never Miss a Lead Again" used across multiple pages.  
†Contact form functional, no critical a11y, but 2 serious violations (contrast + link-in-text).

---

## Performance Scores (Lighthouse)

| Page | Perf | A11y | Best Practices | SEO | Target | PASS/FAIL |
|---|---|---|---|---|---|---|
| / | **77** | **91** | 100 | 100 | Perf>85, A11y>95 | ❌ FAIL |
| /pricing | **89** | **96** | 100 | 100 | Perf>85, A11y>95 | ✅ PASS |
| /about | **91** | **96** | 100 | 100 | Perf>85, A11y>95 | ✅ PASS |
| /login | **76** | **88** | 100 | 92 | Perf>85, A11y>95 | ❌ FAIL |
| /dashboard | n/a (auth required) | — | — | — | — | ⚠️ PENDING |

**Key metrics — homepage:**
- FCP: 1.7s (good)
- Speed Index: 2.9s (good)
- LCP: 3.7s (poor — needs improvement)
- TBT: 460ms (poor — heavy JS)
- CLS: 0 (excellent)
- TTI: 4.5s (needs improvement)

---

## Security Summary

| Check | Status | Notes |
|---|---|---|
| Yoco webhook signature | 🚨 CRITICAL | Bypassed when env var unset — QA-SEC-001 |
| CRON/automations auth | ❌ HIGH | Bypassed when env var unset — QA-SEC-002 |
| Admin route protection | ⚠️ MEDIUM | Client-side only redirect — QA-SEC-003 |
| Invoice token IDOR | ✅ PASS | Token-based lookup, no user-supplied ID |
| WhatsApp webhook sig | ✅ PASS | Twilio signature validated |
| Hardcoded secrets | ✅ PASS | None found in source |
| SQL injection | ✅ PASS | Supabase SDK with parameterised queries only |
| dangerouslySetInnerHTML | ✅ LOW | Static strings only, no user input |
| Env var exposure | ✅ PASS | Only NEXT_PUBLIC_ vars in client components |
| Admin API server check | ✅ PASS | All admin API routes use assertAdmin() |

---

## Accessibility Summary (axe-core)

**Pattern across all pages:**
1. **Color contrast** (serious) — `text-ember` amber on cream fails WCAG AA everywhere
2. **link-in-text-block** (serious) — links only distinguished by color (no underline at rest)
3. **Duplicate `<main>`** (moderate) — nested main landmarks on 6 pages
4. **Unlabelled controls** (critical) — `<select>` on /get-started, `<input type="range">` on /
5. **Missing landmark regions** (moderate) — auth pages content outside landmarks

**Total violations by severity:**
- Critical: 3 unique issues
- Serious: 2 recurring issues (present on nearly every page)
- Moderate: 4 unique issues

---

## Real-Data Audit

| Area | Status | Notes |
|---|---|---|
| Dashboard analytics charts | ✅ REAL DATA | Fetches from `conversations`, `bookings`, `invoices` tables |
| Dashboard conversations | ✅ REAL DATA | Live Supabase query |
| Dashboard leads | ✅ REAL DATA | Live Supabase query |
| Dashboard billing | ✅ REAL DATA | Live Supabase query |
| Status page uptime | ❌ HARDCODED | Static 99.x% values — QA-DATA-001 |
| Status page incidents | ❌ HARDCODED | Static "No incidents in 90 days" |
| Setup wizard "Coming soon" | ⚠️ STATIC | "Coming soon" badge — QA-DATA-002 |
| Social proof stats (/) | ⚠️ CONDITIONAL | Gated by `NEXT_PUBLIC_STATS_VERIFIED` env var |

---

## Missing / Unimplemented Pages

| Route | Status |
|---|---|
| /docs | ❌ Missing — no page.tsx exists |
| /dashboard/chats | ✅ Exists as redirect alias to /dashboard/conversations |
| /api-keys (settings) | ⚠️ UNKNOWN — no dedicated API key management page found in settings |

---

## E2E Test Suite

Four Playwright test suites written and ready to execute. Require credentials via env vars.

| Flow | File | Status |
|---|---|---|
| Signup → Onboarding → Lead → Export | `tests/e2e/flow1-signup-to-lead.spec.ts` | Written — needs credentials |
| Billing → Upgrade → Invoice | `tests/e2e/flow2-billing-upgrade.spec.ts` | Written — needs credentials + Yoco test mode |
| Invite Teammate → Role Enforcement | `tests/e2e/flow3-team-invite-roles.spec.ts` | Written — needs 2 accounts |
| API Key Create → Curl → Revoke → 401 | `tests/e2e/flow4-api-key-lifecycle.spec.ts` | Written — includes SEC-001 auto-detect |

**To run:**
```bash
cd /Users/liamclarke/qwikly-site
TEST_EMAIL=qa@example.com TEST_PASSWORD=... npx playwright test tests/e2e/ --config=tests/e2e/playwright.config.ts
```

Flow 4, test 4.7 will auto-detect QA-SEC-001 (Yoco webhook bypass) — if it passes, the env var is set; if it fails with 200, the critical bug is live in production.

---

## Cross-Browser Status

| Browser | Status |
|---|---|
| Chrome (desktop) | ✅ Recon done |
| Firefox (desktop) | ⚠️ Pending — Playwright config written |
| Safari (desktop) | ⚠️ Pending — Playwright config written |
| Mobile Chrome | ⚠️ Pending — Playwright config written |
| Mobile Safari | ⚠️ Pending — Playwright config written |

---

## Email Deliverability

**Status: PENDING MANUAL TEST**

Required: send each transactional email to a Gmail, Outlook, and ProtonMail inbox. Check:
- [ ] Signup confirmation
- [ ] Password reset
- [ ] Booking confirmation
- [ ] Invoice delivery
- [ ] Payment receipt
- [ ] Team invite

Check for: inbox placement (not spam), rendering, SPF/DKIM pass.

---

## Bug Fix Priority & Owner Assignment

| ID | Severity | Terminal | Description | Fix Effort |
|---|---|---|---|---|
| QA-SEC-001 | 🚨 CRITICAL | T1 | Yoco webhook signature conditional | 5 min |
| QA-SEC-002 | HIGH | T1 | CRON auth bypassed when env var unset | 5 min |
| QA-DATA-001 | HIGH | T2 | Status page fully hardcoded | 1–2 days (connect real source) |
| QA-BRAND-001 | HIGH | T2+T3 | 27 AI language violations | 2–4 hours |
| QA-A11Y-001 | MEDIUM | T2 | Color contrast — amber on cream | 1 hour |
| QA-A11Y-002 | MEDIUM | T2 | Duplicate `<main>` landmark | 30 min |
| QA-A11Y-003 | MEDIUM | T2 | Unlabelled form controls | 15 min |
| QA-A11Y-004 | MEDIUM | T2 | Links not underlined in text blocks | 30 min |
| QA-SEC-003 | MEDIUM | T1 | Admin UI client-side only redirect | 1–2 hours |
| QA-PERF-001 | MEDIUM | T2 | Homepage perf 77 — TBT 460ms | 2–4 hours |
| QA-PERF-002 | MEDIUM | T2 | Login perf 76 | 1–2 hours |
| QA-COPY-001 | MEDIUM | T2 | Duplicate "Qwikly" in titles | 15 min |
| QA-COPY-002 | MEDIUM | T2 | Generic titles on 5 pages | 30 min |
| QA-COPY-003 | MEDIUM | T2 | /connect-your-website title has "AI" | 5 min |
| QA-SEO-001 | MEDIUM | T2 | Missing OG tags on 6 pages | 1 hour |
| QA-DATA-002 | LOW | T3 | "Coming soon" badges — confirm intent | — |
| QA-A11Y-005 | LOW | T2 | Heading order /how-it-works | 5 min |
| QA-A11Y-006 | LOW | T2 | Missing landmark regions on auth pages | 15 min |
| QA-SEC-004 | INFO | T1 | dangerouslySetInnerHTML (static) | — |

---

## Ship / Don't Ship Recommendation

### ⛔ DO NOT SHIP in current state

**Blocking issues (must fix before launch):**

1. **QA-SEC-001** — The Yoco webhook will accept forged payment events if `YOCO_WEBHOOK_SECRET` is not set in Vercel env vars. This is a 5-minute fix but has potentially unlimited financial impact. Verify immediately whether the env var is currently set in production. If not, this is already exploitable right now.

2. **QA-SEC-002** — The automations CRON endpoint can be triggered by anyone if `CRON_SECRET` is not set. Same 5-minute fix. Same urgency.

3. **QA-BRAND-001** — 27 AI language violations are a business risk, not just a code issue. The client was onboarded with explicit brand language rules.

4. **QA-DATA-001** — Showing fake uptime percentages as live data to users/investors is a credibility risk.

**Conditional (could ship if accepted as known issues):**

- Performance on homepage and login (77, 76) — functional but below target
- Accessibility violations (color contrast, duplicate main) — WCAG non-compliance is a legal risk in some jurisdictions
- Missing OG tags, page title issues — SEO/sharing quality

**Suggested ship checklist:**
- [ ] QA-SEC-001 fixed AND verified via flow4-e2e test 4.7
- [ ] QA-SEC-002 fixed
- [ ] QA-BRAND-001 resolved (AI language scrub)
- [ ] QA-DATA-001 resolved (status page either removed or connected to real data)
- [ ] QA-A11Y-001 fixed (color contrast — will also fix most Lighthouse a11y failures)
- [ ] QA-A11Y-003 fixed (unlabelled controls — critical axe violations)
- [ ] QA-COPY-001/002/003 fixed (15-minute task)
- [ ] E2E flow tests run with real test credentials
- [ ] Email deliverability verified manually

**Estimated fix time for all blocking + high priority issues: 1–2 focused days.**

---

*Report generated by automated QA agent on 2026-04-30. All screenshots in `/tmp/qwikly-qa/screenshots/`. Raw data in `/tmp/qwikly-qa/`. E2E tests in `tests/e2e/`.*
