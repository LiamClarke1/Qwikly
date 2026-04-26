import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const From = formData.get("From") as string;
  const Body = formData.get("Body") as string;
  const To = formData.get("To") as string;

  if (!From || !Body) return new NextResponse("OK", { status: 200 });

  try {
    const db = supabaseAdmin();

    // Look up client by whatsapp_number
    const { data: client } = await db
      .from("clients")
      .select(
        "id, business_name, trade, areas, services_offered, ai_tone, ai_greeting, ai_never_say, ai_always_do, ai_escalation_triggers"
      )
      .eq("whatsapp_number", To)
      .single();

    if (!client) return new NextResponse("OK", { status: 200 });

    // Look up or create conversation
    const { data: existing } = await db
      .from("conversations")
      .select("id, ai_paused, status")
      .eq("customer_phone", From)
      .eq("client_id", client.id)
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
      if (existing.ai_paused) return new NextResponse("OK", { status: 200 });
    } else {
      const { data: created } = await db
        .from("conversations")
        .insert({
          client_id: client.id,
          customer_phone: From,
          channel: "whatsapp",
          status: "active",
        })
        .select("id")
        .single();
      conversationId = created!.id;
    }

    // Log customer message
    await db.from("messages_log").insert({
      conversation_id: conversationId,
      role: "customer",
      content: Body,
    });

    // Update conversations.updated_at
    await db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Build conversation history (last 20 messages)
    const { data: history } = await db
      .from("messages_log")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = (history ?? []).map((m) => ({
      role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
      content: m.content as string,
    }));

    // Fetch active KB articles
    const { data: kb } = await db
      .from("kb_articles")
      .select("title, body")
      .eq("client_id", client.id)
      .eq("is_active", true);

    const kbSection =
      kb?.length
        ? `\n\n---\nKNOWLEDGE BASE:\n${kb.map((a) => `## ${a.title}\n${a.body}`).join("\n\n")}\n---`
        : "";

    // Build system prompt
    const systemPrompt = [
      `You are a WhatsApp assistant for ${client.business_name || "this business"}.`,
      client.trade ? `Trade: ${client.trade}.` : "",
      client.areas ? `Service areas: ${client.areas}.` : "",
      client.services_offered ? `Services offered: ${client.services_offered}.` : "",
      client.ai_tone ? `Tone: ${client.ai_tone}.` : "",
      client.ai_greeting ? `Greeting style: ${client.ai_greeting}.` : "",
      client.ai_never_say ? `Never say: ${client.ai_never_say}.` : "",
      client.ai_always_do ? `Always do: ${client.ai_always_do}.` : "",
      client.ai_escalation_triggers
        ? `If the conversation involves any of the following, mark it for human follow-up: ${client.ai_escalation_triggers}.`
        : "",
      "Keep responses short and conversational — this is WhatsApp, not email.",
      kbSection,
    ]
      .filter(Boolean)
      .join(" ");

    // Call Claude Haiku
    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    const reply = (
      aiResponse.content[0] as { type: string; text: string }
    ).text.trim();

    // Save assistant reply
    await db.from("messages_log").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    });

    // Send reply via WhatsApp
    await sendWhatsAppMessage(From, reply);

    // Check escalation triggers
    const triggers: string[] = client.ai_escalation_triggers
      ? client.ai_escalation_triggers
          .split(",")
          .map((t: string) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const replyLower = reply.toLowerCase();
    const bodyLower = Body.toLowerCase();
    const triggered = triggers.some(
      (t) => replyLower.includes(t) || bodyLower.includes(t)
    );

    if (triggered) {
      await db
        .from("conversations")
        .update({ status: "escalated" })
        .eq("id", conversationId);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[whatsapp] Error:", err);
    return new NextResponse("OK", { status: 200 });
  }
}
