# Widget — Adaptive Starter Prompts

**Date:** 2026-05-08
**Status:** Draft, awaiting user review
**Surface:** Embed widget (`public/embed.js`) on every tenant site, plus a new public API.

## Goal

When a visitor opens the chat widget and doesn't know what to ask, give them a one-tap way to surface 4 starter prompts derived from the tenant's own knowledge base. The starter prompts are not hard-coded templates: they are generated from each tenant's KB once and cached, so a dental practice gets dental-flavoured prompts and Qwikly gets Qwikly-flavoured prompts. Clicking a prompt sends it as if the visitor typed it, the existing assistant replies normally, and the conversation continues.

## Non-goals

- No always-visible chips above the welcome message.
- No tenant dashboard UI for editing/overriding prompts in V1.
- No analytics dashboard for prompt-click counts in V1.
- No "AI" / "bot" wording anywhere visible to visitors.
- No changes to the chat backend, the lead-capture pipeline, or the assistant's reply generation.
- No changes to the file-attach "+" button or the existing input bar layout.

## Behaviour

### Discovery (when the widget opens)

The widget renders the existing welcome message ("Hi! How can we help you today?") exactly as today. **Below** the welcome bubble, a small ghost button appears reading **"Not sure what to ask?"** in muted ink-400, the same colour as the message timestamp. No icon. The button is a normal button, not a link.

### When the visitor taps "Not sure what to ask?"

1. The button collapses (height animates to 0).
2. **Above** the welcome message, a panel slides in (height + opacity transition, 200ms).
3. The panel contains 4 pill buttons stacked vertically, one per prompt, full-width inside the chat area.
4. The panel has no header. A small `✕ hide` text link sits in the top-right corner of the panel.

If the prompts haven't loaded yet (cold cache), the panel shows 4 skeleton pills (grey rounded rectangles) for up to 1.5s, then fills in. If the API fails entirely, the panel quietly does not appear and the "Not sure what to ask?" button reverts to its previous state — no error toast, the visitor just types normally.

### When the visitor taps a prompt pill

1. Prompt panel collapses.
2. The prompt text is inserted into the input field and **immediately sent** via the existing send-message path (same code path as if the visitor typed and pressed Enter).
3. The "Not sure what to ask?" button is gone for the rest of the session — the visitor has now started a conversation.
4. From here on, everything is normal chat. The assistant replies. Lead capture, notifications, conversation persistence — all unchanged.

### When the visitor taps "✕ hide" or sends any message manually

The panel disappears. The "Not sure what to ask?" button does not return for this session.

### Re-surface rule (passive)

If the visitor has the widget open, has typed nothing, and has been idle for **60 seconds** since the welcome message rendered, the "Not sure what to ask?" button gets a one-time gentle highlight (ember outline ring, 1.5s pulse, then back to ghost). The button itself was already visible — this is just a quiet nudge. The pulse fires at most once per session.

## Where the prompts come from

### Endpoint

`GET /api/web/starter-prompts?tenant_id={public_key}`

- Public, called from the widget on open.
- Same permissive CORS headers as `/api/web/bookings`.
- Per-IP rate limit: 30/minute (cheap to call, but should not be hammerable).

### Response shape

```json
{ "ok": true, "prompts": ["What do you charge?", "How does Qwikly work?", "Will it fit my site?", "Book a setup call"] }
```

On failure:

```json
{ "ok": false, "reason": "no_kb" | "generation_failed" | "client_not_found" }
```

The widget treats any `ok: false` as "do not render the panel" and silently does not show prompts. The "Not sure what to ask?" button is also hidden in that case.

### How prompts are generated

1. Look up the client by `public_key`.
2. Read `clients.starter_prompts_json` and `clients.starter_prompts_generated_at`. If the cache is fresh (less than 24h old), return cached prompts and stop.
3. If stale or missing, pull the tenant's KB summary + business profile (existing tables: `knowledge_chunks`, `businesses`).
4. Call Anthropic Claude Haiku 4.5 with a tight prompt:

   > Generate exactly 4 short questions a first-time visitor to {business_name} ({business_type}) would naturally ask. Each question max 6 words. Cover four angles in this order:
   >
   > 1. Pricing or cost
   > 2. How the service works
   > 3. Fit for the visitor's situation
   > 4. A direct call-to-action (book / start / try)
   >
   > Use the visitor's voice (first person where natural). Avoid jargon. Avoid the words "AI", "bot", "assistant". Output a JSON array of exactly 4 strings, nothing else.

5. Validate: must parse to a JSON array of exactly 4 strings, each ≤ 60 chars, none containing the words "AI", "bot", or "assistant" (case-insensitive). If validation fails, retry once. If it fails again, return `{ ok: false, reason: "generation_failed" }` and do not write the cache.
6. On success, write `clients.starter_prompts_json` and `clients.starter_prompts_generated_at = now()`.

### Cache lifetime

- 24 hours since `starter_prompts_generated_at`.
- Manual bust: a column update setting `starter_prompts_generated_at = null` will force regeneration on next call. Used by the eventual dashboard override UI (out of scope for V1) and by manual ops.

## Architecture

### New files

- `src/app/api/web/starter-prompts/route.ts` — GET route, OPTIONS for CORS, handles generation + caching.
- `src/lib/starter-prompts.ts` — `getOrGenerateStarterPrompts(clientId)` helper. Single source of truth for the cache + generation logic. Keeps the route thin.

### Changed files

- `public/embed.js` — adds the "Not sure what to ask?" button, the prompt panel, the fetch call, the click-to-send wiring, and the 60s passive-pulse logic.
- Supabase migration: add `starter_prompts_json jsonb` and `starter_prompts_generated_at timestamptz` to `clients`. Both nullable, no default.

### Data flow

```
widget opens
  └─ render welcome bubble + "Not sure what to ask?" button
  └─ in background: fetch /api/web/starter-prompts?tenant_id=PK
       └─ cache hit (≤24h) → return prompts
       └─ cache miss → pull KB → Claude Haiku 4.5 → validate → cache → return
  └─ if button clicked → render panel with prompts (or skeletons if still loading)
  └─ if prompt clicked → insert into input → existing sendMessage() → conversation continues
```

## Error handling

| Failure | Visitor sees | Behind the scenes |
|---|---|---|
| API returns `client_not_found` | Button hidden entirely | Logged once per session |
| API returns `no_kb` (tenant has no KB content) | Button hidden entirely | No log noise — common state for new tenants |
| API returns `generation_failed` | Button hidden entirely | `console.warn` with reason |
| Anthropic call times out (>5s) | Same as `generation_failed` | Logged |
| Cached value is malformed JSON | Treat as cache miss, regenerate | Logged with the bad payload |
| Visitor clicks a prompt but `sendMessage` fails | Existing chat-error handling kicks in (no new path) | n/a |

## Lead-notification verification

Per the project rule that every chat-pipeline change must verify the tenant still gets a real-time lead notification end-to-end:

- Clicking a starter prompt routes through the **existing** `sendMessage` function in `embed.js` and the **existing** `/api/web/chat` endpoint. No new conversation row, no new notification path.
- Smoke-test step in the plan: click a starter prompt on the live qwikly.co.za widget, then verify the host email lands in `clarkeagency1@outlook.com` (current notification target).

## Testing

No vitest in this repo, so verification is manual + lint + build.

- **Lint:** `npm run lint` clean on new files.
- **Build:** `npm run build` passes typecheck.
- **Manual smoke (qwikly.co.za):**
  1. Open the widget. Welcome message renders. "Not sure what to ask?" button is visible below it.
  2. Wait 5s. Inspect network tab — `/api/web/starter-prompts?tenant_id=…` returns 200 with 4 prompts.
  3. Tap the button. Panel slides in above the welcome with 4 pills.
  4. Tap a pill (e.g. "What do you charge?"). The input briefly shows the text, the message sends, the assistant replies.
  5. Verify the host notification email arrives in `clarkeagency1@outlook.com`.
  6. Reopen the widget in a fresh session. Confirm the cache hit (<100ms response from the API).
  7. Tap "Not sure what to ask?", then tap "✕ hide". Panel collapses, button stays visible.
  8. Tap "Not sure what to ask?" → tap a pill → after the conversation starts, the button does not reappear.
  9. Open widget, type nothing for 60s. Confirm the button gets a single ember pulse.
- **Manual smoke (other tenant):** repeat steps 1–4 on at least one non-Qwikly tenant to confirm the prompts are tenant-specific (different wording, different CTA).

## Risks / decisions to flag

- **Anthropic spend:** Haiku 4.5 is cheap, but cache TTL is 24h on purpose so we don't generate per-visitor. With ~hundreds of tenants, this is well under a dollar a day.
- **Brand language guard rails:** the validator strips "AI / bot / assistant" outputs. If Claude consistently fights this, we widen the prompt rather than weakening the guard rail — Qwikly's no-AI-language rule is hard.
- **Empty KB tenants:** new tenants without KB content get no prompts and no button. That's fine — they'd get nonsense suggestions otherwise. The button quietly hides; no broken UX.
- **Migration rollout:** new columns are nullable, no default. Backfill is not needed — first-call generation populates them per tenant on demand. Old widgets that haven't been updated continue to work, they just don't show the new button.
- **Override UI:** explicitly out of scope. Tenants can ask the dashboard to clear the cache (later) but cannot edit the prompt strings in V1. If multiple tenants ask for this, build a simple `prompts: string[]` field on the dashboard settings page in a follow-up.
