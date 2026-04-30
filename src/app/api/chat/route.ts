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

  // Load recent history BEFORE saving current message
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
