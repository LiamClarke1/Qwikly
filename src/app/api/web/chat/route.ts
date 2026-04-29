import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

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

// ── Qwikly system prompt ───────────────────────────────────
const QWIKLY_SYSTEM = `You are the digital assistant for Qwikly (qwikly.co.za), a South African platform that gives trade businesses their own AI booking assistant.

ABOUT QWIKLY:
Qwikly gives plumbers, electricians, roofers, solar installers, and other trades a 24/7 digital assistant that handles WhatsApp messages, emails, and website enquiries. The assistant qualifies leads, answers questions, and books jobs directly into Google Calendar.
- Setup takes about 15 minutes, no technical skills needed
- Works across WhatsApp, email, and as a website chat widget
- The assistant handles the whole booking conversation so the business owner doesn't have to

PRICING:
- Starter: R599/month — WhatsApp + Email assistant
- Growth: R899/month — Everything + Website widget
- 14-day free trial, no setup fees, cancel anytime

YOUR JOB:
You are Qwikly's own demo assistant. Visitors are typically trade business owners who want to understand the product. Your goals:
1. Answer their questions warmly and confidently
2. Help them understand how Qwikly would work for their specific trade
3. If they want to book a call or get started, collect their name and phone number naturally through the conversation
4. Once you have their name and phone (or email), call the save_visitor_info tool

BOOKING CALLS:
We offer 30-minute discovery calls on weekdays. When someone wants a demo or call, collect their name and phone number, then confirm you'll have the team reach out to schedule it.

TONE:
- Friendly, confident, South African context
- Keep replies short — 2 to 3 sentences maximum
- Write plainly, no bullet points in chat
- Never use em dashes
- Don't oversell, let the product speak

EXAMPLES:
Visitor: "how much does it cost?"
You: "Plans start at R599/month and include a 14-day free trial, no credit card needed. The Growth plan at R899/month adds the website widget you're chatting through right now. Which channel matters most to your business?"

Visitor: "I'm a plumber in Cape Town"
You: "Perfect, Qwikly works really well for plumbers. Your assistant would handle every WhatsApp or website enquiry, qualify the job, and book it straight into your calendar while you're on site. Want me to show you what that looks like with a quick call?"`;

// ── Tool definition ────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: "save_visitor_info",
    description: "Call this as soon as you have the visitor's name AND their phone number or email address. Do not call it until you have both.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Visitor's first name or full name" },
        phone: { type: "string", description: "Phone number or WhatsApp number" },
        email: { type: "string", description: "Email address if provided instead of phone" },
      },
      required: ["name"],
    },
  },
];

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: {
    client_id?: string;
    message?: string;
    history?: { role: "user" | "assistant"; content: string }[];
    visitor_id?: string;
    page_url?: string;
    conversation_id?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { client_id, message, history = [], visitor_id, page_url, conversation_id: existingCid } = body;
  if (!client_id || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: CORS });
  }

  // Build the client-specific system prompt
  let systemPrompt = QWIKLY_SYSTEM;
  if (client_id !== "1") {
    // For other clients, load their system_prompt from DB
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("system_prompt, business_name, trade, web_widget_greeting, address, working_hours_text, services_offered, after_hours")
      .eq("id", client_id)
      .maybeSingle();
    if (clientRow?.system_prompt) {
      systemPrompt = clientRow.system_prompt;
    }
  }

  // Create conversation on first message
  let convoId: string | null = existingCid ?? null;
  if (!convoId) {
    const { data: newConvo } = await supabaseAdmin
      .from("conversations")
      .insert({
        client_id: Number(client_id),
        customer_phone: visitor_id || "web_visitor",
        customer_name: null,
        channel: "web_chat",
        status: "active",
        visitor_id,
        page_url,
      })
      .select("id")
      .single();
    convoId = newConvo?.id ? String(newConvo.id) : null;
  }

  // Build message history for Claude
  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // Call Claude
  let reply = "Thanks for your message! We'll be in touch shortly.";
  let visitorInfo: { name?: string; phone?: string; email?: string } | null = null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      tools: TOOLS,
      messages: claudeMessages,
    });

    // Extract text reply and any tool calls
    for (const block of response.content) {
      if (block.type === "text") {
        reply = block.text;
      }
      if (block.type === "tool_use" && block.name === "save_visitor_info") {
        visitorInfo = block.input as { name?: string; phone?: string; email?: string };
      }
    }

    // If Claude used the tool, we need to provide the tool result and get the final text
    if (visitorInfo && response.stop_reason === "tool_use") {
      const followUp = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          ...claudeMessages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: response.content.find((b) => b.type === "tool_use")!.id as string, content: "saved" }],
          },
        ],
      });
      const textBlock = followUp.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") reply = textBlock.text;
    }
  } catch (err) {
    console.error("Claude error:", err);
  }

  // Update conversation with real name/phone if collected
  if (visitorInfo && convoId) {
    const updates: Record<string, string> = {};
    if (visitorInfo.name) updates.customer_name = visitorInfo.name;
    if (visitorInfo.phone) updates.customer_phone = visitorInfo.phone;
    else if (visitorInfo.email) updates.customer_phone = visitorInfo.email;
    if (Object.keys(updates).length) {
      await supabaseAdmin.from("conversations").update(updates).eq("id", convoId);
    }
  }

  return NextResponse.json(
    { reply, conversation_id: convoId, lead_captured: !!visitorInfo },
    { headers: CORS }
  );
}
