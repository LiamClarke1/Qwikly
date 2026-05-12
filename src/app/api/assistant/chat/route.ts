import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedQuery } from "@/lib/knowledge/embed";
import { checkRateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { recordApiUsage, type AnthropicUsageBlock } from "@/lib/billing/api-usage";

export const runtime = "nodejs";
export const maxDuration = 30;

// TODO: per-account-per-day token budget for KB-backed assistant — would
// require summing Anthropic input+output tokens per tenantId per day in a new
// `assistant_token_usage` table. Punted to a follow-up to keep this hardening
// sprint scoped to per-IP / per-tenant request rate limits.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MatchedChunk {
  id: string;
  content: string;
  metadata: Record<string, string>;
  similarity: number;
}

async function retrieveChunks(
  tenantId: string,
  queryEmbedding: number[] | null,
  fallbackQuery: string
): Promise<MatchedChunk[]> {
  const db = supabaseAdmin();

  if (queryEmbedding) {
    const { data, error } = await db.rpc("match_chunks", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_tenant_id: tenantId,
      match_count: 5,
      similarity_threshold: 0.3,
    });
    if (!error && data && data.length > 0) return data as MatchedChunk[];
  }

  // FTS fallback when no embeddings or no vector matches
  const terms = fallbackQuery
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .join(" | ");

  if (terms) {
    const { data } = await db
      .from("knowledge_chunks")
      .select("id, content, metadata")
      .eq("tenant_id", tenantId)
      .textSearch("content", terms, { type: "plain" })
      .limit(5);
    if (data && data.length > 0) return data.map((r) => ({ ...r, similarity: 0 }));
  }

  return [];
}

function buildSystemPrompt(businessName: string, chunks: MatchedChunk[]): string {
  const knowledge = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

  return `You are the digital assistant for ${businessName || "this business"}.

STRICT RULES — follow these exactly:
1. You may ONLY use the information in the KNOWLEDGE BASE below to answer questions.
2. If the answer is not covered in the KNOWLEDGE BASE, respond with exactly this message:
   "I don't have that information — let me connect you with someone who can help. Could you share your name and email so we can get back to you?"
3. Never invent, guess, or extrapolate facts not explicitly in the KNOWLEDGE BASE.
4. When answering, cite the source number like [1] or [2].
5. Keep answers concise and helpful.

KNOWLEDGE BASE:
${knowledge || "(No knowledge base content available yet. Ask the business owner to add sources.)"}`;
}

export async function POST(req: NextRequest) {
  // Resolve the authenticated user — this route is dashboard-only and requires a session.
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipOk = await checkRateLimit(`assistant:ip:${ip}`, 20);
  if (!ipOk) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds("minute")) } }
    );
  }

  // Accept the component's shape: { messages: ChatMessage[] }
  // where the last message is the current user turn and the rest are history.
  let body: { messages?: ChatMessage[]; message?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let message: string;
  let history: ChatMessage[];
  if (body.messages && Array.isArray(body.messages)) {
    const all = body.messages;
    const last = all[all.length - 1];
    if (!last || last.role !== "user") {
      return NextResponse.json({ error: "last message must be a user turn" }, { status: 400 });
    }
    message = last.content;
    history = all.slice(0, -1);
  } else {
    message = body.message ?? "";
    history = body.history ?? [];
  }

  if (!message.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const tenantId = user.id;
  const tenantOk = await checkRateLimit(`assistant:tenant:${tenantId}`, 100, "hour");
  if (!tenantOk) {
    return NextResponse.json(
      { error: "Hourly limit reached." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds("hour")) } }
    );
  }

  const db = supabaseAdmin();

  const { data: clientRow } = await db
    .from("clients")
    .select("id, business_name")
    .eq("auth_user_id", tenantId)
    .maybeSingle();

  const businessName = clientRow?.business_name ?? "";
  const clientId = clientRow?.id as number | undefined;

  const queryEmbedding = await embedQuery(message);
  const chunks = await retrieveChunks(tenantId, queryEmbedding, message);
  const systemPrompt = buildSystemPrompt(businessName, chunks);

  const anthropicMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: anthropicMessages,
  });

  if (clientId) {
    void recordApiUsage({
      clientId,
      conversationId: null,
      usage: response.usage as unknown as AnthropicUsageBlock,
      source: "assistant_chat",
    });
  }

  const replyText = (response.content[0] as { type: string; text: string }).text;

  const citations = chunks.map((c) => ({
    filename: c.metadata?.originalFilename || c.metadata?.sourceUrl || "Knowledge base",
    similarity: c.similarity,
  }));

  return NextResponse.json({ reply: replyText, citations });
}
