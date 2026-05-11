# Qwikly Hardening Sprint — Status Board

**Started:** 2026-05-06
**Supervisor:** Terminal 1 (this terminal, working in main repo)
**Workers:** Terminal 2 (security), Terminal 3 (backend), Terminal 4 (design)

Each worker terminal updates its own section. Supervisor reads this board to know
what's done, in-progress, or blocked. Do NOT edit another terminal's section.

---

## Terminal 2 — Security & Wallet Protection
**Worktree:** `~/qwikly-site/.worktrees/security`
**Branch:** `fix/security-hardening`
**Brief:** `.coordination/TERMINAL-2-SECURITY.md`

### Tasks
- [x] T2.1 — Rate limiting on /api/chat (2026-05-06)
- [x] T2.2 — Rate limiting on /api/assistant/chat (2026-05-06) — 20/min IP + 200/hour tenant; per-day token budget left as TODO
- [x] T2.3 — Rate limiting on /api/web/chat (2026-05-06) — tightened to 5/min IP; Qwikly-own client_id "1" bypasses tenant cap
- [x] T2.4 — Embed.js XSS fix (2026-05-06) — DOM createElement, no innerHTML, onerror as function
- [x] T2.5 — Prompt injection guardrails (2026-05-06) — wrapUntrustedConfig + PROMPT_SAFETY_NOTE applied in /api/chat and /api/web/chat
- [x] T2.6 — /api/login: stop returning access_token in JSON body (2026-05-06) — returns { ok, redirect }
- [x] T2.7 — Security headers in next.config.mjs (2026-05-06) — CSP Report-Only, XFO DENY (except /embed.js + /api/embed/*), nosniff, Referrer-Policy, Permissions-Policy
- [x] T2.8 — Yoco webhook idempotency (2026-05-06) — explicit (provider, external_id) select; signature already verified; TODO for unique constraint migration
- [x] T2.9 — Cron auth audit (2026-05-06) — all 5 routes accept Authorization: Bearer ${CRON_SECRET} (legacy x-cron-secret kept for backward compat)

### Status: READY FOR MERGE
**Last update:** 2026-05-06 — T2.2-T2.9 shipped. See worker report for build verdict + commit list.
**Blockers:** —

---

## Terminal 3 — Backend Reliability & Build Hygiene
**Worktree:** `~/qwikly-site/.worktrees/backend`
**Branch:** `fix/backend-reliability`
**Brief:** `.coordination/TERMINAL-3-BACKEND.md`

### Tasks
- [x] T3.1 — Turn off `ignoreBuildErrors` and `ignoreDuringBuilds` in next.config.mjs (2026-05-06)
- [x] T3.2 — Fix the 8 TS errors that surface (2026-05-06) — Set iteration on setup/page.tsx, typed Supabase callbacks (Session/AuthChangeEvent) on layout/profile/use-user, typed event arg on reset-password; plus 4 unescaped-entity errors fixed
- [x] T3.3 — Fix N+1 on dashboard/conversations (2026-05-06) — single RPC `get_conversations_with_last_message` (LATERAL subquery); falls back to plain list select if RPC not deployed yet
- [x] T3.4 — Migrations: idx_messages_conversation_id, uq_webhook_provider_external (alias on existing partial unique on `webhook_events`), get_conversations_with_last_message RPC, chat_persist_dlq table (2026-05-06)
- [x] T3.5 — Reorganised 12 root-level migrations into `supabase/migrations/2026010100000{1..12}_*.sql` (2026-05-06) — used plain `mv` (git blocked in this terminal); rename detection should pick them up at commit time
- [x] T3.6 — Chat persist wrapped in 3x retry with 200ms / 800ms / 2400ms backoff; final failure writes payload + error to chat_persist_dlq (2026-05-06)
- [x] T3.7 — leads insert sets `email_status: 'pending'`; existing .then/.catch settles to 'sent'/'failed' (2026-05-06). Did NOT pull in @vercel/functions (not installed); fire-and-forget via `void` is the path
- [x] T3.8 — Zod schema on /api/web/intake (trim + length caps); client_id existence verified before insert; returns 404 `{ error: "client_not_found" }` if missing (2026-05-06)
- [x] T3.9 — Replaced `"1"` literal in src/app/book/[token]/page.tsx, src/app/api/web/branding/[clientId]/route.ts, src/lib/notify-lead.ts with `process.env.QWIKLY_OWNER_CLIENT_ID ?? "1"`; created .env.example (2026-05-06)
- [x] T3.10 — src/app/global-error.tsx added; ships own <html>/<body> (Next requires it), Try-again + Reload buttons, inline styles (2026-05-06)
- [x] T3.11 — src/lib/log.ts created; 10 sites converted: chat (3 — stream_error, persist_failed_all_retries, persist_dlq_insert_failed), leads (5), conversations/[id]/{analyze,reply} (2) (2026-05-06)

### Status: READY FOR MERGE
**Last update:** 2026-05-06 — All eleven backend tasks shipped. `npx tsc --noEmit` clean. `npm run build` green (locally needed `NODE_OPTIONS=--max-old-space-size=8192` on 16GB Mac; Vercel runners have more headroom so default heap is fine there). 83/83 pages generated.

**Lane-crossing flags for supervisor (please review before merge):**
- T3.2's unescaped-entity fix in `src/app/(landing)/pricing/page.tsx` is technically a Terminal 4 lane crossing — but the build was failing on it and the user explicitly listed it as part of T3.2 in the brief. If you want it cleaner, revert that one edit and have Terminal 4 land it on `fix/design-polish`; the build will fail again until it merges from somewhere.
- T3.9 left `client_id === "1"` literal in `src/app/api/web/chat/route.ts` (Terminal 2 lane) and `src/app/(landing)/contact/actions.ts` (Terminal 4 lane). Need a follow-up to swap those to the env var too — I documented `NEXT_PUBLIC_QWIKLY_OWNER_CLIENT_ID` in .env.example to cover the contact-widget case T4 already references.

**Operational notes:**
- The N+1 fix's RPC must be deployed to Supabase before the conversations page benefits from it. The fallback `select * from conversations` keeps the page functional if the migration hasn't run yet.
- `chat_persist_dlq` is service-role-only; build a tiny replay cron later to drain it.
- The 12 moved migration files: I had to `mv` them rather than `git mv` (git blocked in worktree shell). Git's rename heuristic should still pick them up at commit time since contents are byte-identical — please verify with `git status` showing `R` (rename) entries; if it shows them as delete + add, force rename detection at commit with `git add -A && git diff --cached -M --stat`.

**Blockers:** Cannot run git commands in this terminal — the 11 task commits and final stage of moves need to be done by supervisor. Recommended commit messages live in this section's per-task notes above.

---

## Terminal 4 — Design / UX / Live Site Polish
**Worktree:** `~/qwikly-site/.worktrees/design`
**Branch:** `fix/design-polish`
**Brief:** `.coordination/TERMINAL-4-DESIGN.md`

### Tasks
- [x] T4.1 — Footer email → hello@qwikly.co.za (and forward setup note in PR) (2026-05-06, swept landing trust line 2026-05-07)
- [x] T4.2 — Add OG image + metadata.openGraph in src/app/layout.tsx (2026-05-07)
- [x] T4.3 — Hero CTA hierarchy (one filled, one ghost) (2026-05-07)
- [x] T4.4 — Industry list: confirm marquee animated, else dedupe (2026-05-07, marquee — annotated)
- [x] T4.5 — Add social proof section (logos placeholder + testimonial slot) (2026-05-07)
- [x] T4.6 — /contact page: embed the actual chat widget as the demo (2026-05-07)
- [x] T4.7 — /status page: wire to /api/health real data (2026-05-07)
- [x] T4.8 — Pricing: surface R20/lead topup in comparison table (2026-05-07)
- [x] T4.9 — Add mobile phone mockup with widget in hero (2026-05-07)

### Status: READY FOR REVIEW
**Last update:** 2026-05-07 — All nine tasks shipped on `fix/design-polish` (haven't pushed, haven't opened a PR — waiting on you). Commits, in order: 436db49 (T4.1 footer email + MX TODO), 3736fb8 (T4.1 sweep on landing trust line), f2a6e7b (T4.2 OG image + metadata copy), 7d8b5e3 (T4.3 hero CTA hierarchy), e5a50a5 (T4.4 marquee comment), 16ae54b (T4.5 social proof section), ca24bf1 (T4.6 contact widget), 936c4eb (T4.7 status -> /api/health), 61b24b0 (T4.8 R20/lead row), 059a3a0 (T4.9 phone mockup). Plus 20fdf87 from your earlier (retracted) revert is still on the branch; up to you whether to drop it before merge.

Things you should know before you review:
- `public/og-image.png` was generated by `scripts/render-og-image.sh`. The script installs `sharp` into `~/.cache/qwikly-og-render/` on first run, intentionally NOT in `package.json`, since it only runs when the OG art changes.
- `src/components/landing/ContactDemoWidget.tsx` injects `/embed.js` with `data-qwikly-id` from `NEXT_PUBLIC_QWIKLY_OWNER_CLIENT_ID || "1"`. Once Terminal 3's T3.9 ships the env var, the "1" fallback can be dropped. There is also a TODO in that file asking you to set the contact-page greeting copy ("Got a question about Qwikly? Ask away.") on the Qwikly tenant's `branding.greeting` row — `embed.js` reads it server-side, no data-attribute override.
- `src/app/(landing)/status/page.tsx` now fetches its own `/api/health`. If Terminal 3 reshapes that response (e.g. adds Calendar Sync, adds an incident log), this page picks it up automatically. Until incidents are exposed, the page says "no formal incident log yet" instead of pretending zero incidents.
- The cookie banner in dev does land on top of the hero phone mockup at md viewports — it's a real-site overlay, not something I introduced. Flagging in case you want it lifted as part of polish.
- All visual changes verified at 375 / 768 / 1440 via headless Playwright screenshots before commit. Dev server still running on :3457 if you want to poke around.
**Blockers:** —

---

## Supervisor Log (Terminal 1 only)
- 2026-05-06: Worktrees created, briefs written, ready to dispatch.
- 2026-05-07: T4.1 verified, but design branch had out-of-scope edit to dashboard/settings/assistant/page.tsx. Reverted via 20fdf87 on fix/design-polish. Hardened scan.sh with scope-violation detection (lane manifest in .coordination/LANES.txt). T2.1 verified: checkRateLimit extension + 429 path on /api/chat. T3.1 verified: build flags off in next.config.mjs.
- 2026-05-07 evening: Design wrap-up. Reverted T4.5 (placeholder testimonial would have rendered literally on the homepage — re-add when real social proof is ready). Reverted my own bogus 20fdf87 (file is back at design branch's fork-point state; main's later floating-save-bar will three-way-merge cleanly). User confirmed Domains.co.za forwarding is live: hello@qwikly.co.za → clarkeagency1@outlook.com. Final T4.1 sweep landed in d22cf78: 27 occurrences across about, how-it-works, legal/terms, legal/privacy, contact/actions.ts swapped to hello@. **Design branch is READY FOR MERGE.**
  - **Out-of-lane stragglers still pointing at clarkeagency1@outlook.com** (need a follow-up sprint, all customer-facing):
    - src/app/(app)/forgot-password/page.tsx (lines 27, 32) — Terminal 3 lane
    - src/app/api/billing/dunning/route.ts (line 74) — unowned, billing email body
    - src/lib/crm-report-pdf.tsx (line 322) — unowned, CRM PDF footer
  - **Hold T3.1 from merging alone** — flipping the build flags without T3.2 means CI fails on the 8 pre-existing TS errors.
  - **T2.1 is safe to merge alone** if you want incremental shipping; otherwise hold until T2.2-T2.9 are done.
