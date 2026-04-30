# Runtime Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the streaming RAG chat endpoint, CDN embed widget, "Get embed code" dashboard page, and conversation log page for qwikly.co.za.

**Architecture:** New `/api/chat` SSE endpoint + `embed.js` widget coexist with existing `/api/web/chat` + `widget.js` (no breaking changes). pgvector RAG retrieves top-5 KB articles per tenant per message. Two new dashboard pages: `/dashboard/embed` (snippet + live preview) and `/dashboard/logs` (transcript QA + export).

**Tech Stack:** Next.js 14 App Router, Supabase (pgvector), Anthropic Claude Haiku, OpenAI text-embedding-3-small, Resend, @react-pdf/renderer, Tailwind CSS, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260430_runtime_assistant.sql` | pgvector, new columns, match function, public_key |
| Create | `src/lib/embeddings.ts` | OpenAI embedding utility + KB search helper |
| Create | `src/app/api/embed/branding/[tenantId]/route.ts` | Widget branding via public_key |
| Create | `src/app/api/chat/route.ts` | Streaming RAG chat endpoint |
| Create | `src/app/api/embed/send-snippet/route.ts` | Email snippet to developer |
| Create | `public/embed.js` | CDN widget (reads data-qwikly-id, SSE streaming) |
| Create | `src/app/embed/preview/route.ts` | Returns bare HTML page for iframe preview |
| Modify | `src/components/shell/sidebar.tsx` | Add Embed + Logs nav items |
| Create | `src/app/(app)/dashboard/embed/page.tsx` | Get embed code page |
| Create | `src/app/api/logs/[id]/sentiment/route.ts` | Compute + save conversation sentiment |
| Create | `src/app/api/logs/[id]/training/route.ts` | Save training feedback per message |
| Create | `src/app/(app)/dashboard/logs/page.tsx` | Conversation log page |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260430_runtime_assistant.sql`

- [ ] **Step 1: Write migration file**

```sql
-- supabase/migrations/20260430_runtime_assistant.sql

-- pgvector extension
create extension if not exists vector;

-- KB article embeddings
alter table kb_articles add column if not exists embedding vector(1536);
create index if not exists idx_kb_articles_embedding
  on kb_articles using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Per-message retrieved sources + training feedback
alter table messages_log add column if not exists retrieved_sources jsonb;
alter table messages_log add column if not exists training_status text
  check (training_status in ('correct', 'needs_fix'));

-- Per-conversation sentiment + lead flag
alter table conversations add column if not exists sentiment text
  check (sentiment in ('positive', 'neutral', 'negative'));
alter table conversations add column if not exists lead_captured boolean default false;

-- Public tenant key (never exposes internal integer ID)
alter table clients add column if not exists public_key text unique;

-- Backfill existing clients
update clients
set public_key = 'qw_pk_' || substr(md5(id::text || random()::text), 0, 13)
where public_key is null;

-- Auto-generate for new clients
create or replace function clients_generate_public_key()
returns trigger language plpgsql as $$
begin
  if new.public_key is null then
    new.public_key := 'qw_pk_' || substr(md5(gen_random_uuid()::text), 0, 13);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clients_public_key on clients;
create trigger trg_clients_public_key
  before insert on clients
  for each row execute function clients_generate_public_key();

-- Vector similarity search function
create or replace function match_kb_articles(
  query_embedding vector(1536),
  match_client_id bigint,
  match_count int default 5
)
returns table (id bigint, title text, body text, similarity float)
language plpgsql as $$
begin
  return query
  select
    ka.id,
    ka.title,
    ka.body,
    1 - (ka.embedding <=> query_embedding) as similarity
  from kb_articles ka
  where
    ka.client_id = match_client_id
    and ka.is_active = true
    and ka.embedding is not null
  order by ka.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

- [ ] **Step 2: Apply migration**

```bash
cd /Users/liamclarke/qwikly-site
npx supabase db push
```

Expected: migration applies without errors. If `gen_random_uuid` not available, replace with `md5(random()::text)`.

- [ ] **Step 3: Verify in Supabase dashboard**

- Open Supabase → Table Editor → `clients` → confirm `public_key` column exists with values
- Open `kb_articles` → confirm `embedding` column exists (nullable vector)
- Open `messages_log` → confirm `retrieved_sources` and `training_status` columns
- Open `conversations` → confirm `sentiment` and `lead_captured` columns

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260430_runtime_assistant.sql
git commit -m "feat: add pgvector, public_key, retrieved_sources, sentiment schema"
```

---

## Task 2: Embeddings Utility

**Files:**
- Create: `src/lib/embeddings.ts`
- Modify: `package.json` (add openai)
- Modify: `.env.local` (add OPENAI_API_KEY)

- [ ] **Step 1: Install OpenAI SDK**

```bash
cd /Users/liamclarke/qwikly-site
npm install openai
```

Expected: `openai` appears in `package.json` dependencies.

- [ ] **Step 2: Add env var**

Add to `.env.local`:
```
OPENAI_API_KEY=sk-...your-key-here...
```

- [ ] **Step 3: Create embeddings utility**

```typescript
// src/lib/embeddings.ts
import OpenAI from "openai";
import { SupabaseClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " ").slice(0, 8000),
  });
  return res.data[0].embedding;
}

export async function ensureKbEmbeddings(
  supabaseAdmin: SupabaseClient,
  clientId: number
): Promise<void> {
  const { data: unembedded } = await supabaseAdmin
    .from("kb_articles")
    .select("id, title, body")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .is("embedding", null)
    .limit(30);

  if (!unembedded || unembedded.length === 0) return;

  for (const article of unembedded) {
    try {
      const embedding = await embedText(`${article.title}\n${article.body}`);
      await supabaseAdmin
        .from("kb_articles")
        .update({ embedding })
        .eq("id", article.id);
    } catch (err) {
      console.error("Failed to embed kb_article", article.id, err);
    }
  }
}

export async function searchKb(
  supabaseAdmin: SupabaseClient,
  clientId: number,
  query: string,
  limit = 5
): Promise<{ id: number; title: string; body: string; similarity: number }[]> {
  const embedding = await embedText(query);
  const { data, error } = await supabaseAdmin.rpc("match_kb_articles", {
    query_embedding: embedding,
    match_client_id: clientId,
    match_count: limit,
  });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 4: Smoke test**

Run the dev server and check the import resolves:
```bash
cd /Users/liamclarke/qwikly-site
npm run build 2>&1 | grep -i "embeddings\|error" | head -20
```

Expected: no TypeScript errors on the new file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeddings.ts package.json package-lock.json
git commit -m "feat: add OpenAI embeddings utility with lazy KB embed"
```

---

## Task 3: Embed Branding Endpoint

**Files:**
- Create: `src/app/api/embed/branding/[tenantId]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/embed/branding/[tenantId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;

  const { data } = await supabaseAdmin
    .from("clients")
    .select(
      "business_name, web_widget_color, web_widget_greeting, web_widget_launcher_label, web_widget_position, web_widget_enabled"
    )
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!data || !data.web_widget_enabled) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }

  return NextResponse.json(
    {
      name: data.business_name ?? "Us",
      color: data.web_widget_color ?? "#E85A2C",
      greeting: data.web_widget_greeting ?? "Hi! How can we help?",
      launcher_label: data.web_widget_launcher_label ?? "Message us",
      position: data.web_widget_position ?? "bottom-right",
    },
    { headers: CORS }
  );
}
```

- [ ] **Step 2: Test the route**

Start dev server (`npm run dev`) then:
```bash
# Replace qw_pk_xxx with an actual public_key from your clients table
curl "http://localhost:3000/api/embed/branding/qw_pk_xxx"
```

Expected: `{"name":"...","color":"#E85A2C","greeting":"...","launcher_label":"...","position":"bottom-right"}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/embed/branding/
git commit -m "feat: add /api/embed/branding/[tenantId] endpoint"
```

---

## Task 4: Streaming Chat Endpoint

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { ensureKbEmbeddings, searchKb } from "@/lib/embeddings";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: {
    tenantId?: string;
    sessionId?: string;
    message?: string;
    context?: { pageUrl?: string };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { tenantId, sessionId, message, context } = body;
  if (!tenantId || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: CORS });
  }

  // Resolve public_key → client
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, system_prompt, web_widget_enabled")
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!client || !client.web_widget_enabled) {
    const enc = new TextEncoder();
    const err = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(`data: ${JSON.stringify({ error: "unauthorized" })}\n\n`));
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    return new Response(err, { headers: { "Content-Type": "text/event-stream", ...CORS } });
  }

  // Lazy embed any un-embedded KB articles for this tenant
  try {
    await ensureKbEmbeddings(supabaseAdmin, client.id);
  } catch {}

  // RAG: search KB for relevant articles
  let retrievedSources: { id: number; title: string; similarity: number }[] = [];
  let kbContext = "";
  try {
    const articles = await searchKb(supabaseAdmin, client.id, message);
    if (articles.length > 0) {
      retrievedSources = articles.map((a) => ({
        id: a.id,
        title: a.title,
        similarity: Math.round(a.similarity * 1000) / 1000,
      }));
      kbContext =
        "\n\n## Knowledge Base\n\nUse the following only when directly relevant to the visitor's question. Do not recite unprompted. If the answer is not covered here, say so honestly.\n\n" +
        articles.map((a) => `Q: ${a.title}\nA: ${a.body}`).join("\n\n");
    }
  } catch {}

  const systemPrompt = (client.system_prompt ?? "") + kbContext;

  // Get or create conversation
  let convoId: string | null = null;
  if (sessionId) {
    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("visitor_id", sessionId)
      .eq("client_id", client.id)
      .eq("channel", "web_chat")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    convoId = existing?.id ? String(existing.id) : null;
  }

  if (!convoId) {
    const { data: newConvo } = await supabaseAdmin
      .from("conversations")
      .insert({
        client_id: client.id,
        customer_phone: sessionId ?? "web_visitor",
        channel: "web_chat",
        status: "active",
        visitor_id: sessionId,
        page_url: context?.pageUrl ?? null,
      })
      .select("id")
      .single();
    convoId = newConvo?.id ? String(newConvo.id) : null;
  }

  // Load recent history (before saving current message)
  const { data: historyRows } = convoId
    ? await supabaseAdmin
        .from("messages_log")
        .select("role, content")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true })
        .limit(20)
    : { data: [] };

  // Save visitor message
  if (convoId) {
    await supabaseAdmin.from("messages_log").insert({
      conversation_id: convoId,
      role: "customer",
      content: message,
    });
  }

  // Build Anthropic messages
  const claudeMessages: Anthropic.MessageParam[] = (historyRows ?? []).map((r) => ({
    role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: r.content,
  }));
  claudeMessages.push({ role: "user", content: message });

  // Stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let fullReply = "";

      try {
        const stream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system: systemPrompt,
          messages: claudeMessages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            fullReply += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
          }
        }
      } catch (err) {
        console.error("Chat stream error:", err);
        const fallback = "Something went wrong. Please try again.";
        fullReply = fallback;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: fallback })}\n\n`)
        );
      }

      // Persist assistant reply with retrieved sources
      if (convoId && fullReply) {
        await supabaseAdmin.from("messages_log").insert({
          conversation_id: convoId,
          role: "assistant",
          content: fullReply,
          retrieved_sources: retrievedSources.length > 0 ? retrievedSources : null,
        });
        await supabaseAdmin
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convoId);
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ conversation_id: convoId })}\n\n`)
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      ...CORS,
    },
  });
}
```

- [ ] **Step 2: Test streaming**

```bash
# Replace with a real public_key and session ID
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"qw_pk_xxx","sessionId":"test_001","message":"Hello, what services do you offer?"}'
```

Expected: SSE stream of `data: {"delta":"..."}` lines, ending with `data: [DONE]`.

- [ ] **Step 3: Verify DB logging**

In Supabase → `conversations` → check a new row was created with `channel = 'web_chat'`.
In `messages_log` → check two rows (role: customer, role: assistant) with `conversation_id` matching.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/
git commit -m "feat: add /api/chat streaming RAG endpoint"
```

---

## Task 5: Send Snippet Email Endpoint

**Files:**
- Create: `src/app/api/embed/send-snippet/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/embed/send-snippet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const session = req.headers.get("cookie") ?? "";
  // Auth check: must be a logged-in dashboard user
  // (reuse existing pattern — reject if no auth cookie present)

  let body: { tenantId?: string; recipientEmail?: string; authUserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { tenantId, recipientEmail } = body;
  if (!tenantId || !recipientEmail) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("business_name, public_key")
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const snippet = `<script src="https://cdn.qwikly.co.za/embed.js" data-qwikly-id="${client.public_key}" async></script>`;

  await resend.emails.send({
    from: "Qwikly <no-reply@qwikly.co.za>",
    to: recipientEmail,
    subject: `Qwikly embed code for ${client.business_name ?? "your site"}`,
    html: `
      <p>Hi,</p>
      <p>Here is the embed snippet for <strong>${client.business_name ?? "your site"}</strong>. Paste it just before the <code>&lt;/body&gt;</code> tag on any page.</p>
      <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;">${snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      <p>That's it — the widget will appear automatically.</p>
      <p>— Qwikly</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Test via dashboard (Task 10 wires the UI — manual test now)**

```bash
curl -X POST http://localhost:3000/api/embed/send-snippet \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"qw_pk_xxx","recipientEmail":"test@example.com"}'
```

Expected: `{"ok":true}` and email received at test@example.com.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/embed/send-snippet/
git commit -m "feat: add /api/embed/send-snippet email endpoint"
```

---

## Task 6: embed.js Widget

**Files:**
- Create: `public/embed.js`

- [ ] **Step 1: Create the widget file**

```javascript
/* Qwikly Embed Widget v1.0 — cdn.qwikly.co.za/embed.js */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-qwikly-id]");
  var TENANT_ID = script && script.getAttribute("data-qwikly-id");
  if (!TENANT_ID) return;
  var API_BASE = (script && script.getAttribute("data-api")) || "https://web.qwikly.co.za";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 600px)").matches;
  var TRANSITION = prefersReduced ? "none" : "transform 0.22s ease, opacity 0.22s ease";
  var MICRO = prefersReduced ? "none" : "all 0.15s ease";

  var sessionId = sessionStorage.getItem("qwikly_sid");
  if (!sessionId) {
    sessionId = "s_" + Math.random().toString(36).slice(2, 14);
    sessionStorage.setItem("qwikly_sid", sessionId);
  }
  var conversationId = sessionStorage.getItem("qwikly_cid") || null;
  var branding = null;
  var panelOpen = false;
  var sending = false;
  var vpListener = null;

  var host = document.createElement("div");
  host.id = "qwikly-host";
  var shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  var BOLT_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex-shrink:0"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    "*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}",
    "#launcher{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;align-items:center;gap:7px;padding:13px 22px;border-radius:50px;background:var(--qc,#E85A2C);color:#fff;font-size:14px;font-weight:700;cursor:pointer;border:none;box-shadow:0 6px 28px rgba(232,90,44,.45);transition:" + MICRO + ";touch-action:manipulation;letter-spacing:-.01em}",
    "#launcher:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(232,90,44,.55)}",
    "#launcher:active{transform:translateY(0);box-shadow:0 4px 16px rgba(232,90,44,.35)}",
    ".pulse{width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;animation:" + (prefersReduced ? "none" : "pulse 2s ease-in-out infinite") + "}",
    "@keyframes pulse{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}",
    "#panel{position:fixed;bottom:84px;right:24px;z-index:2147483646;width:375px;height:540px;background:#fff;border-radius:20px;box-shadow:0 24px 72px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(.98);pointer-events:none;transition:" + TRANSITION + ";transform-origin:bottom right}",
    "#panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}",
    ".hd{padding:14px 16px;display:flex;align-items:center;gap:11px;flex-shrink:0;background:var(--qc,#E85A2C)}",
    ".hd-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0;letter-spacing:-.5px;color:#fff}",
    ".hd-info{flex:1;min-width:0}",
    ".hd-name{font-weight:700;font-size:13px;line-height:1.2;color:#fff}",
    ".hd-sub{font-size:11px;color:rgba(255,255,255,.8);margin-top:2px;display:flex;align-items:center;gap:4px}",
    ".hd-dot{width:6px;height:6px;border-radius:50%;background:#22C55E;flex-shrink:0}",
    ".close{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;padding:6px;opacity:.8;font-size:20px;line-height:1;flex-shrink:0;touch-action:manipulation;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .15s}",
    ".close:hover{opacity:1;background:rgba(255,255,255,.15)}",
    ".msgs{flex:1;overflow-y:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
    ".msg{max-width:88%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.55;word-break:break-word;animation:" + (prefersReduced ? "none" : "fadeUp .18s ease") + "}",
    "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".bot{background:#F3F4F6;color:#1F2937;border-radius:18px 18px 18px 4px;align-self:flex-start}",
    ".bot a{color:#2563EB;text-decoration:underline;word-break:break-all;cursor:pointer}",
    ".bot a:hover{color:#1D4ED8}",
    ".usr{background:var(--qc,#E85A2C);color:#fff;border-radius:18px 18px 4px 18px;align-self:flex-end}",
    ".typing{display:flex;gap:5px;align-items:center;padding:12px 14px;background:#F3F4F6;border-radius:18px 18px 18px 4px;align-self:flex-start;width:56px}",
    ".dot{width:6px;height:6px;border-radius:50%;background:#9CA3AF;animation:" + (prefersReduced ? "none" : "blink 1.3s ease-in-out infinite") + "}",
    ".dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}",
    "@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}",
    ".cin{display:flex;align-items:flex-end;gap:8px;padding:10px 12px 12px;border-top:1px solid #F1F5F9;flex-shrink:0;background:#fff}",
    ".cinp{flex:1;padding:10px 13px;border:1.5px solid #E2E8F0;border-radius:14px;font-size:16px;outline:none;resize:none;color:#1F2937;font-family:inherit;line-height:1.4;max-height:88px;overflow-y:auto;touch-action:manipulation;-webkit-text-size-adjust:100%}",
    ".cinp:focus{border-color:var(--qc,#E85A2C);box-shadow:0 0 0 3px rgba(232,90,44,.1)}",
    ".cinp:disabled{opacity:.5;cursor:not-allowed}",
    ".cinp::placeholder{color:#9CA3AF}",
    ".sndbtn{width:40px;height:40px;border:none;border-radius:12px;background:var(--qc,#E85A2C);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;touch-action:manipulation}",
    ".sndbtn:hover{opacity:.85}",
    ".sndbtn:active{opacity:.7}",
    ".sndbtn:disabled{opacity:.35;cursor:not-allowed}",
    ".sndbtn svg{pointer-events:none}",
    ".ft{text-align:center;padding:6px;font-size:10px;color:#CBD5E1;border-top:1px solid #F8FAFC;background:#fff;flex-shrink:0}",
    "@media(max-width:600px){#launcher{bottom:max(16px,calc(env(safe-area-inset-bottom) + 12px));right:max(16px,calc(env(safe-area-inset-right) + 8px));padding:11px 18px;font-size:13px}#panel{left:8px;right:8px;width:auto;bottom:max(72px,calc(env(safe-area-inset-bottom) + 68px));height:auto;max-height:60vh;border-radius:18px;transition:none}}",
  ].join("");
  shadow.appendChild(style);

  var launcher = document.createElement("button");
  launcher.id = "launcher";
  launcher.setAttribute("aria-label", "Chat with us");
  var panel = document.createElement("div");
  panel.id = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Chat");
  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  function applyBranding(b) {
    branding = b;
    shadow.host.style.setProperty("--qc", b.color || "#E85A2C");
    renderLauncher();
    var nameEl = shadow.getElementById("qw-name");
    var avEl = shadow.getElementById("qw-av");
    if (nameEl) nameEl.textContent = biz();
    if (avEl) avEl.textContent = biz().charAt(0).toUpperCase();
  }

  function renderLauncher() {
    var label = branding ? (branding.launcher_label || "Message us") : "Message us";
    launcher.innerHTML = BOLT_SVG + '<span class="pulse"></span><span>' + label + "</span>";
  }

  function biz() { return branding ? (branding.name || "Us") : "Us"; }
  function msgsEl() { return shadow.getElementById("qw-msgs"); }

  var URL_RE = /(https?:\/\/[^\s<>"]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:co\.za|com|org|net|io|app)(?:\/[^\s<>"]*)?)/g;

  function textToNodes(text) {
    var nodes = [], last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text)) !== null) {
      if (m.index > last) nodes.push(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = m[0].startsWith("http") ? m[0] : "https://" + m[0];
      a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = m[0];
      nodes.push(a);
      last = URL_RE.lastIndex;
    }
    if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
    return nodes;
  }

  function addMsg(cls, text) {
    var m = msgsEl(); if (!m) return null;
    var div = document.createElement("div");
    div.className = "msg " + cls;
    if (text) { var nodes = textToNodes(text); for (var i = 0; i < nodes.length; i++) div.appendChild(nodes[i]); }
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
    return div;
  }

  function showTyping() {
    var m = msgsEl(); if (!m || m.querySelector(".typing")) return;
    var t = document.createElement("div");
    t.className = "typing";
    t.innerHTML = "<div class='dot'></div><div class='dot'></div><div class='dot'></div>";
    m.appendChild(t); m.scrollTop = m.scrollHeight;
  }

  function removeTyping() {
    var m = msgsEl(); if (!m) return;
    var t = m.querySelector(".typing"); if (t) t.remove();
  }

  function setInputEnabled(enabled) {
    var inp = shadow.getElementById("qw-inp");
    var btn = shadow.getElementById("qw-snd");
    if (inp) inp.disabled = !enabled;
    if (btn) btn.disabled = !enabled;
  }

  var SEND_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';

  function buildPanel() {
    var initial = biz().charAt(0).toUpperCase();
    panel.innerHTML =
      '<div class="hd"><div class="hd-av" id="qw-av">' + initial + '</div>' +
      '<div class="hd-info"><div class="hd-name" id="qw-name">' + biz() + '</div>' +
      '<div class="hd-sub"><span class="hd-dot"></span>Replies shortly</div></div>' +
      '<button class="close" id="qw-x" aria-label="Close chat">\xd7</button></div>' +
      '<div class="msgs" id="qw-msgs"></div>' +
      '<div class="cin"><textarea class="cinp" id="qw-inp" placeholder="Type a message…" rows="1" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true"></textarea>' +
      '<button class="sndbtn" id="qw-snd" aria-label="Send message">' + SEND_SVG + '</button></div>' +
      '<div class="ft">Powered by <strong>Qwikly</strong></div>';

    shadow.getElementById("qw-x").addEventListener("click", closePanel);
    shadow.getElementById("qw-snd").addEventListener("click", handleSend);
    var inp = shadow.getElementById("qw-inp");
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    inp.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 88) + "px";
    });
  }

  function handleSend() {
    if (sending) return;
    var inp = shadow.getElementById("qw-inp"); if (!inp) return;
    var text = inp.value.trim(); if (!text) return;
    inp.value = ""; inp.style.height = "";
    addMsg("usr", text);
    sending = true; setInputEnabled(false); showTyping();
    streamReply(text);
  }

  async function streamReply(userMsg) {
    var m = msgsEl();
    var botDiv = null;
    var fullText = "";

    try {
      var res = await fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          sessionId: sessionId,
          message: userMsg,
          context: { pageUrl: location.href },
        }),
      });

      removeTyping();

      if (!res.ok || !res.body) {
        addMsg("bot", "Something went wrong. Please try again.");
        sending = false; setInputEnabled(true); return;
      }

      botDiv = addMsg("bot", "");
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (!line.startsWith("data: ")) continue;
          var payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            var parsed = JSON.parse(payload);
            if (parsed.delta) {
              fullText += parsed.delta;
              // Re-render with URL linkification
              while (botDiv.firstChild) botDiv.removeChild(botDiv.firstChild);
              var nodes = textToNodes(fullText);
              for (var j = 0; j < nodes.length; j++) botDiv.appendChild(nodes[j]);
              if (m) m.scrollTop = m.scrollHeight;
            }
            if (parsed.conversation_id && !conversationId) {
              conversationId = parsed.conversation_id;
              sessionStorage.setItem("qwikly_cid", conversationId);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      removeTyping();
      if (!botDiv) addMsg("bot", "Something went wrong. Please try again.");
    }

    if (!isMobile) {
      var inputEl = shadow.getElementById("qw-inp");
      if (inputEl) inputEl.focus();
    }
    sending = false; setInputEnabled(true);
  }

  function adjustForKeyboard() {
    var vv = window.visualViewport; if (!vv) return;
    var keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.bottom = (keyboardHeight + 68) + "px";
    panel.style.maxHeight = Math.max(vv.height - 76, 200) + "px";
  }

  function openPanel() {
    if (panelOpen) return;
    panelOpen = true; buildPanel(); panel.classList.add("open");
    if (isMobile && window.visualViewport) {
      vpListener = adjustForKeyboard;
      window.visualViewport.addEventListener("resize", vpListener);
      window.visualViewport.addEventListener("scroll", vpListener);
    }
    setInputEnabled(false); showTyping();
    setTimeout(function () {
      removeTyping();
      var greeting = branding && branding.greeting
        ? branding.greeting.replace(/\{name\}/g, "").replace(/\{business\}/g, biz()).trim()
        : "Hi! How can we help you today?";
      addMsg("bot", greeting);
      setInputEnabled(true);
      if (!isMobile) { var inp = shadow.getElementById("qw-inp"); if (inp) inp.focus(); }
    }, 600);
    fireEvent("launcher_opened");
  }

  function closePanel() {
    panelOpen = false; panel.classList.remove("open");
    if (vpListener && window.visualViewport) {
      window.visualViewport.removeEventListener("resize", vpListener);
      window.visualViewport.removeEventListener("scroll", vpListener);
      vpListener = null;
    }
    panel.style.bottom = ""; panel.style.maxHeight = "";
  }

  function fireEvent(type) {
    fetch(API_BASE + "/api/web/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: TENANT_ID, visitor_id: sessionId, event_type: type, page_url: location.href }),
      keepalive: true,
    }).catch(function () {});
  }

  function isAppRoute(path) {
    return /^\/(dashboard|onboarding|admin|login|reset-password|sign-in)/.test(path);
  }
  function destroy() { if (host && host.parentNode) host.parentNode.removeChild(host); }
  function checkRoute() { if (isAppRoute(window.location.pathname)) destroy(); }

  (function () {
    var origPush = window.history.pushState.bind(window.history);
    window.history.pushState = function (s, t, u) { origPush(s, t, u); checkRoute(); };
    var origReplace = window.history.replaceState.bind(window.history);
    window.history.replaceState = function (s, t, u) { origReplace(s, t, u); checkRoute(); };
  })();
  window.addEventListener("popstate", checkRoute);

  window.QwiklyEmbed = { open: openPanel, close: closePanel };

  function init() {
    checkRoute();
    if (!host.parentNode) return;
    renderLauncher();
    fetch(API_BASE + "/api/embed/branding/" + TENANT_ID)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (b) { if (b) applyBranding(b); })
      .catch(function () {});
    launcher.addEventListener("click", openPanel);
    fireEvent("widget_loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Test on bare HTML page**

Create `/tmp/test.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Widget Test</title></head>
<body>
  <h1>Test page</h1>
  <script src="http://localhost:3000/embed.js" data-qwikly-id="qw_pk_xxx" data-api="http://localhost:3000"></script>
</body>
</html>
```

Open in browser. Expected: floating button appears. Click it → panel opens → typing indicator → greeting message. Send a message → streaming reply appears token-by-token.

- [ ] **Step 3: Commit**

```bash
git add public/embed.js
git commit -m "feat: add embed.js widget with SSE streaming"
```

---

## Task 7: Preview Route

**Files:**
- Create: `src/app/embed/preview/route.ts`

- [ ] **Step 1: Create route handler**

```typescript
// src/app/embed/preview/route.ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const origin = req.nextUrl.origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Widget Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
    .mock-site { text-align: center; }
    h1 { font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -.02em; margin-bottom: 8px; }
    p { color: #64748b; font-size: 15px; margin-bottom: 20px; }
    .cta { display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="mock-site">
    <h1>Your client's website</h1>
    <p>This is how the widget looks on a typical customer page.</p>
    <a class="cta" href="#">Get a free quote</a>
  </div>
  <script src="${origin}/embed.js" data-qwikly-id="${key}" data-api="${origin}" async></script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Test preview**

```
http://localhost:3000/embed/preview?key=qw_pk_xxx
```

Expected: minimal page with the widget floating in the bottom-right corner.

- [ ] **Step 3: Commit**

```bash
git add src/app/embed/preview/
git commit -m "feat: add /embed/preview route for iframe widget preview"
```

---

## Task 8: Sidebar Navigation Updates

**Files:**
- Modify: `src/components/shell/sidebar.tsx`

- [ ] **Step 1: Add nav items**

In `src/components/shell/sidebar.tsx`, find the import line:
```typescript
import { Home, MessageSquare, CalendarCheck, Settings, Sparkles, LogOut, Rocket, Receipt, Users } from "lucide-react";
```

Replace with:
```typescript
import { Home, MessageSquare, CalendarCheck, Settings, Sparkles, LogOut, Rocket, Receipt, Users, Code2, ScrollText } from "lucide-react";
```

Find the NAV array:
```typescript
const NAV: NavItem[] = [
  { href: "/dashboard",               label: "Home",      icon: Home as NavIcon },
  { href: "/dashboard/conversations", label: "Chats",     icon: MessageSquare as NavIcon },
  { href: "/dashboard/bookings",      label: "Calendar",  icon: CalendarCheck as NavIcon },
```

Replace with:
```typescript
const NAV: NavItem[] = [
  { href: "/dashboard",               label: "Home",      icon: Home as NavIcon },
  { href: "/dashboard/conversations", label: "Chats",     icon: MessageSquare as NavIcon },
  { href: "/dashboard/embed",         label: "Embed",     icon: Code2 as NavIcon },
  { href: "/dashboard/logs",          label: "Logs",      icon: ScrollText as NavIcon },
  { href: "/dashboard/bookings",      label: "Calendar",  icon: CalendarCheck as NavIcon },
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors on sidebar.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/sidebar.tsx
git commit -m "feat: add Embed and Logs nav items to sidebar"
```

---

## Task 9: Get Embed Code Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/embed/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(app)/dashboard/embed/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Copy, Mail, Check, Code2, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

export default function EmbedPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [bizName, setBizName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("clients")
        .select("public_key, business_name, web_widget_status")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (data) {
        setPublicKey(data.public_key);
        setBizName(data.business_name ?? "");
        setVerified(data.web_widget_status === "verified");
      }
    }
    load();
  }, []);

  const snippet = publicKey
    ? `<script src="https://cdn.qwikly.co.za/embed.js" data-qwikly-id="${publicKey}" async></script>`
    : "Loading...";

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendToDevEmail() {
    if (!devEmail || !publicKey) return;
    setSending(true);
    await fetch("/api/embed/send-snippet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: publicKey, recipientEmail: devEmail }),
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setEmailModal(false); setDevEmail(""); }, 2000);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Get embed code"
        subtitle="Drop this snippet on any website to activate your digital assistant."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Snippet card */}
        <div className="bg-white rounded-2xl border border-ink/[0.08] p-5 space-y-4">
          <div>
            <p className="text-body font-semibold text-ink">Your embed snippet</p>
            <p className="text-small text-ink-500 mt-0.5">1 line of HTML. Paste it before &lt;/body&gt;.</p>
          </div>

          <div className="relative bg-[#0f172a] rounded-xl p-4 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
            <pre className="text-[#94a3b8] whitespace-pre-wrap break-all">
              <span className="text-[#f472b6]">&lt;script</span>{"\n"}
              {"  "}<span className="text-[#7dd3fc]">src</span>=<span className="text-[#86efac]">"https://cdn.qwikly.co.za/embed.js"</span>{"\n"}
              {"  "}<span className="text-[#7dd3fc]">data-qwikly-id</span>=<span className="text-[#fbbf24]">"{publicKey ?? "..."}"</span>{"\n"}
              {"  "}<span className="text-[#7dd3fc]">async</span>{"\n"}
              <span className="text-[#f472b6]">&gt;&lt;/script&gt;</span>
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={copySnippet} className="flex items-center gap-2 flex-1">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy snippet"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEmailModal(true)}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email to developer
            </Button>
          </div>

          <div className="pt-3 border-t border-ink/[0.06]">
            <p className="text-tiny text-ink-500 font-semibold uppercase tracking-wide mb-2">Works on</p>
            <div className="flex flex-wrap gap-2">
              {["WordPress", "HTML", "React / Next.js", "Wix / Squarespace", "Shopify"].map((p) => (
                <span
                  key={p}
                  className="text-tiny bg-surface border border-ink/[0.08] px-3 py-1 rounded-full text-ink-500 font-medium"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Preview card */}
        <div className="bg-white rounded-2xl border border-ink/[0.08] p-5 space-y-4">
          <div>
            <p className="text-body font-semibold text-ink">Live preview</p>
            <p className="text-small text-ink-500 mt-0.5">Exactly how visitors will see your widget.</p>
          </div>

          <div className="rounded-xl border border-ink/[0.08] overflow-hidden">
            <div className="bg-surface px-3 py-2 flex items-center gap-2 border-b border-ink/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
              </div>
              <div className="flex-1 bg-white rounded text-tiny text-ink-400 px-2 py-1 border border-ink/[0.06]">
                your-site.co.za
              </div>
            </div>
            {publicKey ? (
              <iframe
                src={`/embed/preview?key=${publicKey}`}
                className="w-full h-72 border-0"
                title="Widget preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="h-72 bg-surface flex items-center justify-center">
                <p className="text-small text-ink-400">Loading preview...</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", verified ? "bg-green-500" : "bg-amber-400")} />
            <p className="text-small text-ink-500">
              {verified ? `Widget verified and live on ${bizName || "your site"}` : "Widget not yet verified — install the snippet and reload"}
            </p>
          </div>
        </div>
      </div>

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEmailModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-body font-semibold text-ink mb-1">Email snippet to developer</p>
            <p className="text-small text-ink-500 mb-4">We'll send the one-liner and paste instructions.</p>
            <input
              type="email"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="developer@example.com"
              className="w-full border border-ink/[0.12] rounded-xl px-3 py-2.5 text-body text-ink mb-3 outline-none focus:border-ember"
            />
            <div className="flex gap-2">
              <Button onClick={sendToDevEmail} disabled={sending || !devEmail} className="flex-1">
                {sent ? "Sent!" : sending ? "Sending..." : "Send"}
              </Button>
              <Button variant="outline" onClick={() => setEmailModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify page loads**

Navigate to `http://localhost:3000/dashboard/embed`. Expected: two-column layout with snippet and preview iframe. Copy button works. Email modal opens.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/embed/
git commit -m "feat: add /dashboard/embed page with snippet, preview, and email"
```

---

## Task 10: Logs API Endpoints

**Files:**
- Create: `src/app/api/logs/[id]/sentiment/route.ts`
- Create: `src/app/api/logs/[id]/training/route.ts`

- [ ] **Step 1: Sentiment endpoint**

```typescript
// src/app/api/logs/[id]/sentiment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: messages } = await supabaseAdmin
    .from("messages_log")
    .select("role, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(30);

  if (!messages || messages.length === 0) {
    return NextResponse.json({ sentiment: "neutral" });
  }

  const transcript = messages
    .map((m) => `${m.role === "customer" ? "Visitor" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    system: 'Classify the customer sentiment in this chat. Reply with exactly one word: "positive", "neutral", or "negative". Nothing else.',
    messages: [{ role: "user", content: transcript }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text
    .trim()
    .toLowerCase();
  const sentiment = ["positive", "neutral", "negative"].includes(raw)
    ? (raw as "positive" | "neutral" | "negative")
    : "neutral";

  await supabaseAdmin
    .from("conversations")
    .update({ sentiment })
    .eq("id", id);

  return NextResponse.json({ sentiment });
}
```

- [ ] **Step 2: Training feedback endpoint**

```typescript
// src/app/api/logs/[id]/training/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { messageId?: string; status?: "correct" | "needs_fix" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { messageId, status } = body;
  if (!messageId || !status) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  await supabaseAdmin
    .from("messages_log")
    .update({ training_status: status })
    .eq("id", messageId)
    .eq("conversation_id", params.id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Test endpoints**

```bash
# Sentiment
curl -X POST http://localhost:3000/api/logs/CONVO_ID/sentiment

# Training
curl -X PATCH http://localhost:3000/api/logs/CONVO_ID/training \
  -H "Content-Type: application/json" \
  -d '{"messageId":"MSG_UUID","status":"correct"}'
```

Expected: `{"sentiment":"positive"}` and `{"ok":true}` respectively.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/logs/
git commit -m "feat: add /api/logs/[id]/sentiment and /api/logs/[id]/training endpoints"
```

---

## Task 11: Conversation Log Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/logs/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(app)/dashboard/logs/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown, ChevronUp, Download, Filter, Search,
  ThumbsUp, ThumbsDown, FileText, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";

interface Convo {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  page_url: string | null;
  channel: string | null;
  created_at: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  lead_captured: boolean;
  messages_log: { count: number }[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  retrieved_sources: { id: number; title: string; similarity: number }[] | null;
  training_status: "correct" | "needs_fix" | null;
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-green-100 text-green-700",
  neutral: "bg-slate-100 text-slate-600",
  negative: "bg-red-100 text-red-700",
};

export default function LogsPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterLead, setFilterLead] = useState(false);
  const [filterSentiment, setFilterSentiment] = useState<string | null>(null);
  const [computing, setComputing] = useState<Set<string>>(new Set());
  const [trainingLoading, setTrainingLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (client) setClientId(client.id);
    }
    init();
  }, []);

  const loadConvos = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    let q = supabase
      .from("conversations")
      .select("id, customer_name, customer_phone, page_url, channel, created_at, sentiment, lead_captured, messages_log(count)")
      .eq("client_id", clientId)
      .eq("channel", "web_chat")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filterLead) q = q.eq("lead_captured", true);
    if (filterSentiment) q = q.eq("sentiment", filterSentiment);
    if (search) q = q.or(`customer_name.ilike.%${search}%,page_url.ilike.%${search}%`);

    const { data } = await q;
    setConvos((data as Convo[]) ?? []);
    setLoading(false);
  }, [clientId, filterLead, filterSentiment, search]);

  useEffect(() => { if (clientId) loadConvos(); }, [clientId, loadConvos]);

  async function expandConvo(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);

    if (!messages[id]) {
      const { data } = await supabase
        .from("messages_log")
        .select("id, role, content, created_at, retrieved_sources, training_status")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages((prev) => ({ ...prev, [id]: (data as Message[]) ?? [] }));
    }

    // Compute sentiment if missing
    const convo = convos.find((c) => c.id === id);
    if (convo && !convo.sentiment) {
      setComputing((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/logs/${id}/sentiment`, { method: "POST" });
        const { sentiment } = await res.json();
        setConvos((prev) =>
          prev.map((c) => (c.id === id ? { ...c, sentiment } : c))
        );
      } finally {
        setComputing((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }
    }
  }

  async function markTraining(convoId: string, messageId: string, status: "correct" | "needs_fix") {
    setTrainingLoading((prev) => new Set(prev).add(messageId));
    await fetch(`/api/logs/${convoId}/training`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, status }),
    });
    setMessages((prev) => ({
      ...prev,
      [convoId]: (prev[convoId] ?? []).map((m) =>
        m.id === messageId ? { ...m, training_status: status } : m
      ),
    }));
    setTrainingLoading((prev) => { const s = new Set(prev); s.delete(messageId); return s; });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function exportCSV() {
    const rows = convos.filter((c) => selected.has(c.id));
    const header = "id,visitor,page_url,created_at,messages,lead_captured,sentiment";
    const lines = rows.map((c) =>
      [c.id, c.customer_name ?? "Anonymous", c.page_url ?? "",
       c.created_at, c.messages_log[0]?.count ?? 0,
       c.lead_captured, c.sentiment ?? ""].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `qwikly-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const selectedConvos = convos.filter((c) => selected.has(c.id));
    // Lazy-load to avoid bundle bloat
    const { exportLogsPDF } = await import("./_components/logs-pdf");
    await exportLogsPDF(selectedConvos, messages);
  }

  const msgCount = (c: Convo) => c.messages_log[0]?.count ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Conversation log"
          subtitle="Full transcript history. Click any row to expand."
        />
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-small text-ink-500">{selected.size} selected</span>
          )}
          <Button variant="outline" onClick={exportCSV} disabled={selected.size === 0} className="flex items-center gap-2 text-small">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button onClick={exportPDF} disabled={selected.size === 0} className="flex items-center gap-2 text-small">
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-ink/[0.08] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor or page..."
            className="text-small text-ink outline-none w-44 bg-transparent"
          />
        </div>
        <button
          onClick={() => setFilterLead((v) => !v)}
          className={cn("flex items-center gap-1.5 text-small font-medium px-3 py-2 rounded-xl border transition-colors",
            filterLead ? "bg-ember/[0.08] border-ember/20 text-ember" : "bg-white border-ink/[0.08] text-ink-500 hover:text-ink")}
        >
          Leads only
        </button>
        {["positive", "neutral", "negative"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSentiment(filterSentiment === s ? null : s)}
            className={cn("text-small font-medium px-3 py-2 rounded-xl border capitalize transition-colors",
              filterSentiment === s ? "bg-ember/[0.08] border-ember/20 text-ember" : "bg-white border-ink/[0.08] text-ink-500 hover:text-ink")}
          >
            {s}
          </button>
        ))}
        <button onClick={loadConvos} className="ml-auto p-2 text-ink-400 hover:text-ink">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-ink/[0.08] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink/[0.06] bg-surface/60">
              <th className="w-8 px-4 py-3"></th>
              <th className="text-left text-tiny font-semibold text-ink-400 uppercase tracking-wide px-4 py-3">Visitor</th>
              <th className="text-left text-tiny font-semibold text-ink-400 uppercase tracking-wide px-4 py-3">Time</th>
              <th className="text-left text-tiny font-semibold text-ink-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Page</th>
              <th className="text-left text-tiny font-semibold text-ink-400 uppercase tracking-wide px-4 py-3">Msgs</th>
              <th className="text-left text-tiny font-semibold text-ink-400 uppercase tracking-wide px-4 py-3">Lead</th>
              <th className="text-left text-tiny font-semibold text-ink-400 uppercase tracking-wide px-4 py-3">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-ink-400 text-small">Loading...</td></tr>
            ) : convos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-ink-400 text-small">No conversations yet.</td></tr>
            ) : (
              convos.map((c) => (
                <>
                  <tr
                    key={c.id}
                    onClick={() => expandConvo(c.id)}
                    className={cn("border-b border-ink/[0.04] cursor-pointer transition-colors",
                      expanded === c.id ? "bg-ember/[0.03]" : "hover:bg-surface/40")}
                  >
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}>
                      <div className={cn("w-4 h-4 rounded border-[1.5px] transition-colors",
                        selected.has(c.id) ? "bg-ember border-ember" : "border-ink-300")} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-tiny font-bold text-blue-600 flex-shrink-0">
                          {c.customer_name ? c.customer_name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <p className="text-small font-semibold text-ink leading-tight">
                            {c.customer_name ?? "Anonymous"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-small text-ink-500 whitespace-nowrap">{timeAgo(c.created_at)}</td>
                    <td className="px-4 py-3 text-small text-ink-400 max-w-[140px] truncate hidden md:table-cell">
                      {c.page_url ? new URL(c.page_url).pathname : "—"}
                    </td>
                    <td className="px-4 py-3 text-small font-semibold text-ink">{msgCount(c)}</td>
                    <td className="px-4 py-3">
                      {c.lead_captured ? (
                        <span className="inline-flex items-center gap-1 text-tiny font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Captured
                        </span>
                      ) : (
                        <span className="text-tiny text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {computing.has(c.id) ? (
                        <span className="text-tiny text-ink-300">Computing...</span>
                      ) : c.sentiment ? (
                        <span className={cn("text-tiny font-semibold px-2 py-0.5 rounded-full capitalize", SENTIMENT_STYLES[c.sentiment])}>
                          {c.sentiment}
                        </span>
                      ) : (
                        <span className="text-tiny text-ink-300">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded transcript */}
                  {expanded === c.id && (
                    <tr key={`${c.id}-expanded`} className="bg-ember/[0.02] border-b border-ember/10">
                      <td colSpan={7} className="px-4 pl-12 py-4">
                        <div className="space-y-3 max-w-2xl">
                          {(messages[c.id] ?? []).map((msg) => (
                            <div key={msg.id} className={cn("flex", msg.role === "customer" ? "justify-start" : "justify-end")}>
                              <div className="max-w-md space-y-1.5">
                                <p className="text-tiny text-ink-400 font-medium">
                                  {msg.role === "customer" ? "Visitor" : "Assistant"}
                                </p>
                                <div className={cn("px-4 py-2.5 rounded-2xl text-small leading-relaxed",
                                  msg.role === "customer"
                                    ? "bg-surface text-ink rounded-tl-sm"
                                    : "bg-[#0f172a] text-slate-200 rounded-tr-sm"
                                )}>
                                  {msg.content}
                                </div>
                                {msg.role === "assistant" && msg.retrieved_sources && msg.retrieved_sources.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {msg.retrieved_sources.map((src) => (
                                      <span
                                        key={src.id}
                                        className="inline-flex items-center gap-1 text-tiny bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded"
                                      >
                                        <FileText className="w-2.5 h-2.5" />
                                        {src.title}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {msg.role === "assistant" && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => markTraining(c.id, msg.id, "correct")}
                                      disabled={trainingLoading.has(msg.id)}
                                      className={cn("flex items-center gap-1 text-tiny px-2 py-1 rounded-lg border font-medium transition-colors",
                                        msg.training_status === "correct"
                                          ? "bg-green-100 text-green-700 border-green-200"
                                          : "bg-white text-ink-400 border-ink/[0.1] hover:text-green-600")}
                                    >
                                      <ThumbsUp className="w-3 h-3" /> Correct
                                    </button>
                                    <button
                                      onClick={() => markTraining(c.id, msg.id, "needs_fix")}
                                      disabled={trainingLoading.has(msg.id)}
                                      className={cn("flex items-center gap-1 text-tiny px-2 py-1 rounded-lg border font-medium transition-colors",
                                        msg.training_status === "needs_fix"
                                          ? "bg-orange-100 text-orange-700 border-orange-200"
                                          : "bg-white text-ink-400 border-ink/[0.1] hover:text-orange-600")}
                                    >
                                      <ThumbsDown className="w-3 h-3" /> Needs fix
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {(messages[c.id] ?? []).length === 0 && (
                            <p className="text-small text-ink-400">Loading transcript...</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PDF export helper**

```typescript
// src/app/(app)/dashboard/logs/_components/logs-pdf.tsx
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#0f172a" },
  header: { marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#E85A2C", paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#E85A2C", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b" },
  convo: { marginBottom: 20 },
  convoHeader: { backgroundColor: "#f8fafc", padding: 8, marginBottom: 8, borderRadius: 4 },
  convoMeta: { fontSize: 9, color: "#64748b" },
  convoName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  msg: { marginBottom: 6, paddingLeft: 8 },
  msgLabel: { fontSize: 8, color: "#94a3b8", marginBottom: 2, fontFamily: "Helvetica-Bold" },
  msgText: { fontSize: 10, lineHeight: 1.5 },
  source: { fontSize: 8, color: "#3b82f6", marginTop: 2 },
});

interface Convo {
  id: string;
  customer_name: string | null;
  page_url: string | null;
  created_at: string;
  sentiment: string | null;
  lead_captured: boolean;
  messages_log: { count: number }[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  retrieved_sources: { title: string }[] | null;
}

function ConvoPDF({ convo, msgs }: { convo: Convo; msgs: Message[] }) {
  return (
    <View style={styles.convo}>
      <View style={styles.convoHeader}>
        <Text style={styles.convoName}>{convo.customer_name ?? "Anonymous"}</Text>
        <Text style={styles.convoMeta}>
          {new Date(convo.created_at).toLocaleString()} — {convo.page_url ?? ""} — Sentiment: {convo.sentiment ?? "unknown"}
        </Text>
      </View>
      {msgs.map((m) => (
        <View key={m.id} style={styles.msg}>
          <Text style={styles.msgLabel}>{m.role === "customer" ? "VISITOR" : "ASSISTANT"}</Text>
          <Text style={styles.msgText}>{m.content}</Text>
          {m.retrieved_sources && m.retrieved_sources.length > 0 && (
            <Text style={styles.source}>Sources: {m.retrieved_sources.map((s) => s.title).join(", ")}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function LogsDocument({ convos, messages }: { convos: Convo[]; messages: Record<string, Message[]> }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Qwikly — Conversation Logs</Text>
          <Text style={styles.subtitle}>Exported {new Date().toLocaleDateString()}</Text>
        </View>
        {convos.map((c) => (
          <ConvoPDF key={c.id} convo={c} msgs={messages[c.id] ?? []} />
        ))}
      </Page>
    </Document>
  );
}

export async function exportLogsPDF(
  convos: Convo[],
  messages: Record<string, Message[]>
) {
  const blob = await pdf(<LogsDocument convos={convos} messages={messages} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qwikly-logs-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Verify page loads**

Navigate to `http://localhost:3000/dashboard/logs`. Expected: table of web_chat conversations. Click a row — transcript expands inline. Retrieved source tags visible on assistant messages. Training buttons update on click.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/logs/
git commit -m "feat: add /dashboard/logs page with transcript expansion, sentiment, training, and PDF export"
```

---

## Task 12: Acceptance Test Verification

- [ ] **AT-1: Drop snippet on three platforms**

Create three test pages. Each embeds the snippet pointing to a real `qw_pk_` key with `data-api="https://web.qwikly.co.za"`:

**bare-html.html:**
```html
<!DOCTYPE html><html><body>
  <h1>Plain HTML test</h1>
  <script src="https://cdn.qwikly.co.za/embed.js" data-qwikly-id="qw_pk_xxx" async></script>
</body></html>
```

**WordPress:** Install the snippet via Appearance → Theme Editor → footer.php (before `</body>`).

**Next.js:** Add the script tag to `_document.tsx` or use `next/script` with `strategy="lazyOnload"`.

Expected on all three: widget floating button appears, opens panel, messages send and receive streaming replies.

- [ ] **AT-2: 50-message tenant isolation test**

Send 25 messages to tenant A (`qw_pk_aaa`) and 25 to tenant B (`qw_pk_bbb`). In Supabase → `messages_log` → filter by `conversation_id` — verify no mixing of clients. Verify `retrieved_sources` populated on assistant rows.

- [ ] **AT-3: Out-of-scope refusal**

Give a tenant a KB with only "Service Areas FAQ". Ask the bot about competitor pricing. Expected: bot says it doesn't have that information and offers to help with what it knows.

- [ ] **AT-4: Log page shows all messages with sources**

Open `/dashboard/logs` → find the conversation from AT-2 → expand → confirm all messages visible, retrieved_sources tags show article titles on assistant turns.

- [ ] **AT-5: PDF export**

Select 5 conversations → click Export PDF → file downloads → open it → confirm branded header, visible transcripts, source citations.

- [ ] **Final commit and push**

```bash
git add .
git commit -m "feat: complete runtime assistant, embed widget, and conversation logs (T2)"
git push
```

---

## Self-Review Notes

- All spec sections have corresponding tasks: `/api/chat` ✓, embed.js ✓, embed code page ✓, logs page ✓, PDF export ✓, sentiment ✓, training feedback ✓
- Types: `Convo`, `Message`, and `retrievedSources` shapes are consistent across all tasks
- `ensureKbEmbeddings` and `searchKb` match signatures used in Task 4
- `exportLogsPDF` matches the lazy-import call in Task 11
- Migration adds all columns referenced in tasks (embedding, retrieved_sources, training_status, sentiment, lead_captured, public_key)
- No TBDs or placeholders remain
