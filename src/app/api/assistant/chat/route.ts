import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedQuery } from "@/lib/knowledge/embed";

export const runtime = "nodejs";
export const maxDuration = 30;

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
    .join(" & ");

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
  let body: {
    tenantId: string;
    message: string;
    history?: ChatMessage[];
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tenantId, message, history = [] } = body;
  if (!tenantId || !message?.trim()) {
    return NextResponse.json({ error: "tenantId and message required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("business_name")
    .eq("auth_user_id", tenantId)
    .maybeSingle();

  const businessName = client?.business_name ?? "";

  const queryEmbedding = await embedQuery(message);
  const chunks = await retrieveChunks(tenantId, queryEmbedding, message);

  const systemPrompt = buildSystemPrompt(businessName, chunks);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: systemPrompt,
    messages,
  });

  const replyText = (response.content[0] as { type: string; text: string }).text;

  const needsLead =
    replyText.includes("don't have that information") ||
    replyText.includes("connect you with someone");

  if (needsLead && (body.visitorEmail || body.visitorName)) {
    await db.from("lead_captures").insert({
      tenant_id: tenantId,
      visitor_name: body.visitorName ?? null,
      visitor_email: body.visitorEmail ?? null,
      visitor_phone: body.visitorPhone ?? null,
      question: message,
    });
  }

  const citations = chunks.map((c) => ({
    filename: c.metadata?.originalFilename || c.metadata?.sourceUrl || "Knowledge base",
    similarity: c.similarity,
  }));

  return NextResponse.json({
    reply: replyText,
    citations: needsLead ? [] : citations,
    needsLead,
  });
}
