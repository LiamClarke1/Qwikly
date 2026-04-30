# Runtime Assistant, Embed Widget & Conversation Logs — Design Spec
**Date:** 2026-04-30  
**Scope:** T2 — Runtime assistant, embed widget, embed snippet page, conversation log page  
**Out of scope:** T1 (onboarding/data ingestion), T5 (billing), T6 (settings)

---

## 1. Architecture Decision

**Approach: Clean parallel surface (B)**

New `/api/chat` endpoint and new `embed.js` widget are built alongside — not replacing — the existing `/api/web/chat` and `widget.js`. The existing qwikly.co.za own-site bot is not touched. New tenants use the new stack.

---

## 2. Knowledge Retrieval — pgvector RAG

Every tenant's KB articles are embedded using **OpenAI `text-embedding-3-small`** (1536 dims) and stored in a `vector(1536)` column on `kb_articles`. At chat time:

1. Embed the incoming user message.
2. Cosine similarity search against that tenant's active KB articles.
3. Inject the top-5 matches into the system prompt.
4. Store the matched article IDs as `retrieved_sources` on the `messages_log` row.

This gives real source attribution on the log page and avoids injecting all 25 articles every turn.

---

## 3. Database Schema Changes

```sql
-- Enable pgvector
create extension if not exists vector;

-- KB article embeddings
alter table kb_articles add column if not exists embedding vector(1536);
create index if not exists idx_kb_articles_embedding
  on kb_articles using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Retrieved sources per message
alter table messages_log add column if not exists retrieved_sources jsonb;

-- Per-conversation sentiment + lead flag (persisted)
alter table conversations add column if not exists sentiment text
  check (sentiment in ('positive', 'neutral', 'negative'));
alter table conversations add column if not exists lead_captured boolean default false;

-- Public tenant key (safe to embed in HTML, never exposes internal ID)
alter table clients add column if not exists public_key text unique;
-- Generated on row insert (migration backfills existing rows); format: 'qw_pk_' + 12 random alphanum chars

-- Training feedback per assistant message
alter table messages_log add column if not exists training_status text
  check (training_status in ('correct', 'needs_fix'));
```

---

## 4. API Endpoints

### 4.1 POST /api/chat (new)

**Request:**
```json
{ "tenantId": "qw_pk_a8f3c2...", "sessionId": "sid_xyz", "message": "Do you cover Cape Town?", "context": { "pageUrl": "..." } }
```

**Behaviour:**
- Resolve `tenantId` (public_key) → internal `client_id` + system prompt.
- Generate public_key on first access if null (lazy init).
- Embed the message → vector search top-5 KB articles for this tenant.
- Build system prompt: client's system_prompt + KB context block with the 5 matched articles.
- Stream response via SSE (`text/event-stream`). Each chunk: `data: {"delta":"..."}\n\n`. End: `data: [DONE]\n\n`.
- On completion: save assistant turn to `messages_log` with `retrieved_sources` (array of kb_article IDs + titles). Update `conversations.lead_captured` if a lead was captured.
- Refuse requests where `tenantId` does not match a verified, active client (returns 403).
- Tenant isolation enforced at every DB query — no cross-tenant data access.

**Response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Access-Control-Allow-Origin: *
```

### 4.2 GET /api/embed/branding/[tenantId] (new)

Returns widget colour, greeting, launcher label for a given `public_key`. The embed.js widget calls this on load. Server resolves `public_key` → `client_id` and returns the same fields as the existing `/api/web/branding/[clientId]`. The existing branding endpoint is unchanged.

### 4.3 POST /api/embed/send-snippet (new)

Sends the embed snippet to a developer's email via Resend.

**Request:** `{ "tenantId": "qw_pk_...", "recipientEmail": "dev@example.com" }`

### 4.4 POST /api/kb/embed (new — internal)

Computes and stores embeddings for all un-embedded KB articles for a given client. Called after KB article create/update and available as a manual trigger.

---

## 5. embed.js Widget

**Served at:** `embed.qwikly.co.za/embed.js` (existing Vercel routing, `public/embed.js`)  
**DNS note:** Add `cdn.qwikly.co.za` as a Vercel domain alias to honour the spec URL.

**Embed snippet:**
```html
<script src="https://cdn.qwikly.co.za/embed.js" data-qwikly-id="qw_pk_..." async></script>
```

**Key changes from widget.js:**
- Reads `data-qwikly-id` (not `data-client`).
- Calls `/api/chat` with SSE streaming — renders assistant reply token-by-token.
- Sends `{ tenantId, sessionId, message, context: { pageUrl } }`.
- All other behaviour (Shadow DOM, branding fetch, mobile keyboard handling, accessibility, dark-mode, session storage) is preserved from widget.js.
- Resolves `tenantId` → `/api/web/branding/{clientId}` lookup handled server-side; widget never calls branding directly.

**Compatibility:** Works in plain HTML, WordPress (via header injection), Next.js, React, Vue, any CMS. Shadow DOM prevents style leakage.

---

## 6. Dashboard — Embed Code Page (`/dashboard/embed`)

**Route:** `src/app/(app)/dashboard/embed/page.tsx`  
**Sidebar entry:** "Embed" with `<Code2>` icon, between Chats and Logs.

**Layout — two columns:**

Left card — snippet:
- Dark code block showing the one-liner with `data-qwikly-id` pre-filled from the tenant's `public_key`.
- "Copy snippet" button (copies to clipboard).
- "Email to developer" button → modal asking for recipient email → calls `/api/embed/send-snippet`.
- Platform tags: WordPress, HTML, React/Next.js, Wix/Squarespace.

Right card — live preview:
- `<iframe>` loading `/embed/preview?key={public_key}`.
- The preview route renders a bare HTML page with the embed script included — the real widget loads inside the iframe.
- Shows verified domain badge if `web_widget_status = 'verified'`.

---

## 7. Dashboard — Conversation Log Page (`/dashboard/logs`)

**Route:** `src/app/(app)/dashboard/logs/page.tsx`  
**Sidebar entry:** "Logs" with `<ScrollText>` icon, after Embed.

This is a read-only QA/analytics view — separate from `/dashboard/conversations` (the live inbox for replying).

**List view columns:** checkbox, visitor name + page URL, timestamp, channel, message count, lead captured badge, sentiment badge, training status badge.

**Filter bar:** date range, leads only, sentiment filter, needs-fix filter, search.

**Export:** Selected rows → CSV (client-side) or PDF (via `@react-pdf/renderer`). Branded PDF with conversation transcript, retrieved sources, timestamps.

**Expanded transcript (inline):**  
Click a row → row expands in-place to show the full message thread. Each assistant turn shows:
- Bubble with message text.
- Source tag(s) showing which KB article was retrieved (title + match score).
- "Trained correctly" / "Needs fix" buttons — persisted to a new `training_feedback` column on `messages_log`.

**Sentiment computation:**  
On first expansion of a conversation that has no sentiment, trigger a lightweight Claude call (Haiku, 50 tokens) to classify positive/neutral/negative and persist to `conversations.sentiment`.

---

## 8. Preview Route (`/embed/preview`)

**Route:** `src/app/embed/preview/page.tsx` (public, no auth)

Renders a bare mock customer website page with the embed script injected. Used as the `src` for the preview iframe on the embed code page. Takes `?key=qw_pk_...` query param.

---

## 9. Sidebar Updates

Add to `src/components/shell/sidebar.tsx` NAV array:
- `{ href: "/dashboard/embed", label: "Embed", icon: Code2 }`
- `{ href: "/dashboard/logs", label: "Logs", icon: ScrollText }`

Also add to mobile bottom nav if space permits.

---

## 10. Acceptance Tests

1. Drop `embed.js` snippet on bare HTML, WordPress sandbox, Next.js sandbox — widget loads and chats on all three.
2. 50 messages across 2 tenants — confirm streaming, no cross-tenant data in logs.
3. Assistant refuses questions outside KB (system prompt includes explicit refusal instruction).
4. Open logs page → see all 50 messages, retrieved sources visible on each assistant turn.
5. Export 5 conversations to PDF → file opens, branded, readable.

---

## 11. Environment Variables Required

- `OPENAI_API_KEY` — for `text-embedding-3-small` embeddings (new)
- All existing vars unchanged.
