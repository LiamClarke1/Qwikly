export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin as createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureKbEmbeddings, searchKb } from "@/lib/embeddings";
import { enrollLeadInSequences } from "@/lib/email/sequences";

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

  const db = createSupabaseAdmin();

  // Resolve public_key → client
  const { data: client } = await db
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
    return new Response(err, { status: 403, headers: { "Content-Type": "text/event-stream", ...CORS } });
  }

  // Lazy embed any un-embedded KB articles for this tenant
  try {
    await ensureKbEmbeddings(db, client.id);
  } catch (err) {
    console.error("ensureKbEmbeddings error:", err);
  }

  // RAG: search KB for relevant articles
  let retrievedSources: { id: number; title: string; similarity: number }[] = [];
  let kbContext = "";
  try {
    const articles = await searchKb(db, client.id, message);
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
  } catch (err) {
    console.error("searchKb error:", err);
  }

  const systemPrompt = (client.system_prompt ?? "") + kbContext;

  const validSessionId = sessionId && sessionId.trim() ? sessionId.trim() : null;

  // Get or create conversation
  let convoId: string | null = null;
  if (validSessionId) {
    const { data: existing } = await db
      .from("conversations")
      .select("id")
      .eq("visitor_id", validSessionId)
      .eq("client_id", client.id)
      .eq("channel", "web_chat")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    convoId = existing?.id ? String(existing.id) : null;
  }

  if (!convoId) {
    const { data: newConvo } = await db
      .from("conversations")
      .insert({
        client_id: client.id,
        customer_phone: validSessionId ?? "web_visitor",
        channel: "web_chat",
        status: "active",
        visitor_id: validSessionId,
        page_url: context?.pageUrl ?? null,
      })
      .select("id")
      .single();
    convoId = newConvo?.id ? String(newConvo.id) : null;
  }

  // Load recent history BEFORE saving current message
  const { data: historyRows } = convoId
    ? await db
        .from("messages_log")
        .select("role, content")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true })
        .limit(20)
    : { data: [] };

  // Save visitor message
  if (convoId) {
    await db.from("messages_log").insert({
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
          max_tokens: 600,
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
      } finally {
        // Persist assistant reply with retrieved sources — always runs
        try {
          if (convoId && fullReply) {
            await db.from("messages_log").insert({
              conversation_id: convoId,
              role: "assistant",
              content: fullReply,
              retrieved_sources: retrievedSources.length > 0 ? retrievedSources : null,
            });
            // Detect lead capture: assistant acknowledged contact details or booking
            const leadPattern = /\b(noted your|contact you|get back to you|book you in|appointment|reach out|your details|i've saved|we'll call|your number|your email)\b/i;
            const leadUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (leadPattern.test(fullReply)) {
              leadUpdate.lead_captured = true;
              leadUpdate.status = "lead";
              // Fire-and-forget enrollment
              db.from("conversations").select("customer_email, customer_name").eq("id", convoId).maybeSingle().then(({ data: cv }) => {
                if (cv?.customer_email) {
                  enrollLeadInSequences(client.id, cv.customer_email, cv.customer_name ?? null, convoId).catch(
                    (err) => console.error("[sequences] enroll error", err)
                  );
                }
              });
            }
            await db.from("conversations").update(leadUpdate).eq("id", convoId);
          }
        } catch (persistErr) {
          console.error("Persist error:", persistErr);
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ conversation_id: convoId })}\n\n`)
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
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
