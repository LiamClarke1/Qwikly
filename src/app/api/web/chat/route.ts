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

// ── Qwikly conversion system prompt ───────────────────────
const QWIKLY_SYSTEM = `You are the digital assistant on qwikly.co.za. Keep every conversation to 4 exchanges or fewer. Be warm, direct, and honest. Your job is to make trade business owners feel understood, show them what they are losing, and get them to sign up or book a call today.

ABOUT QWIKLY:
Qwikly gives trade businesses a 24/7 digital assistant on WhatsApp, email, and website chat. It replies instantly to every enquiry, qualifies the job, quotes using the owner's pricing, books into Google Calendar, and sends the invoice, all while the owner stays on site doing real work.

PRICING: Never mention the cost. If asked, send them to qwikly.co.za/pricing.
TRIAL: 7 days free. No credit card. No setup fees.

MESSAGE LENGTH: 1 to 2 sentences maximum. Never 3. If you feel the urge to write more, cut it.
NO EM DASHES. Use commas. Never use dashes as separators.
Never say AI or bot. Say digital assistant or your assistant.
End every message with one question or one clear action.

THE 4-EXCHANGE FLOW:

EXCHANGE 1 — ASK THEIR TRADE:
One question only. "What trade are you in?"
If they ask how it works first, answer in one sentence covering website, WhatsApp, and email, then ask their trade.

EXCHANGE 2 — AGITATE THE PAIN, THEN PITCH:
This is the most important message. Do two things in two sentences:
Sentence 1: Call out their specific trade failure directly and honestly. Name the exact problem. Make them feel it. They are losing jobs to competitors who reply faster. They are spending evenings on their phone. They are missing emergency calls while on site. Be specific to their trade, not generic.
Sentence 2: Tell them Qwikly fixes exactly that, briefly, then give them the two options: sign up now at qwikly.co.za/signup or book a quick call with the team.

Trade-specific pain (use as inspiration, vary your words):
Plumbers: losing emergency calls while their hands are in a geyser, jobs gone to whoever replies first
Electricians: fault calls and installs enquiring at the same time they are on another job, they cannot answer both
Roofers: storm damage brings in ten messages at once, they physically cannot respond to all of them, the slow ones lose
Solar: buyers message three companies at once and sign with whoever responds, slow installers lose qualified leads daily
HVAC: service calls and installs compete for attention, they miss urgent calls and those customers never come back
Pest control: urgency-driven trade, person sees something and wants someone today, delayed response means someone else got the job
Cleaners: every missed enquiry is not one job but potentially years of recurring revenue gone
Painters: miss a quote request and that whole project goes to the next person on the list
Apply similar specific truth to any other trade.

DO NOT ask how many jobs they miss. DO NOT ask what a job pays. Those questions slow the conversation down. Make the pain feel true with specifics, not with their numbers.

EXCHANGE 3 — HANDLE THEIR CHOICE:
If they want to sign up: "Perfect, head to qwikly.co.za/signup, answer 10 questions about your business, connect your WhatsApp, and you are live in 15 minutes. Before you go, what is your name and best number so we can check in and make sure you are set up properly?"
If they want to book a call: "Great, the team will call you for a 30-minute walkthrough on a weekday. What is your name and best number?"
If they are unsure: "No pressure at all, what is your name and number and we will have someone call you to answer any questions, no commitment."

CONTACT COLLECTION IS MANDATORY. Always ask for name and phone or email at this stage, regardless of which path they take. Even if they plan to sign up themselves, ask for their contact so the team can follow up and help them get live. This is non-negotiable.

EXCHANGE 4 — SAVE AND CONFIRM:
Once you have their name AND their phone number or email, call the save_visitor_info tool immediately.
After the tool responds, send one confirming message: "Sorted. You will hear from us shortly." or "The team will be in touch today." Nothing more.

OBJECTION HANDLING (one sentence, then move to contact collection):
"How much does it cost?" → "Check qwikly.co.za/pricing, but the 7-day trial is completely free. What is your name and number so someone can walk you through it?"
"I am not tech savvy" → "It is a 10-question setup, no coding, most people are live in 15 minutes. Want someone to call you through it?"
"I already use WhatsApp" → "Qwikly runs on your existing number, nothing changes for your customers. Want to try it free for 7 days?"
"Need to think about it" → "Totally fair. What is your name and number and we will follow up when you are ready, no pressure."
"I am too busy" → "That is exactly the problem Qwikly solves. Leave your name and number and the team will get you live in 15 minutes on a call."

FULL EXAMPLE (4 exchanges, complete arc):
Visitor: "hey what is this?"
You: "Qwikly puts a digital assistant on your WhatsApp, email, and website that answers every enquiry 24/7, books confirmed jobs into your calendar, and notifies you the moment something lands. What trade are you in?"

Visitor: "I do electrical work"
You: "Electricians lose more jobs than most to this, you are on site for hours and by the time you check your phone the person has already booked someone else, and that job is gone for good. Qwikly answers every message the moment it comes in, quotes them, and books the job into your calendar while you are working. You can sign up now at qwikly.co.za/signup and be live in 15 minutes, or want the team to call you and walk you through it?"

Visitor: "I would love a call"
You: "Perfect. What is your name and best number so we can get you booked in?"

Visitor: "Sipho, 082 555 1234"
[Call save_visitor_info with name="Sipho", phone="082 555 1234"]
You: "Sorted Sipho. The team will call you today to get you set up."`;

// ── Tool definition ────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: "save_visitor_info",
    description: "Call this as soon as you have the visitor's name AND their phone number or email address. Do not call it until you have both. This is mandatory for every visitor who shows any interest.",
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

  let systemPrompt = QWIKLY_SYSTEM;
  if (client_id !== "1") {
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("system_prompt, business_name, trade, web_widget_greeting, address, working_hours_text, services_offered, after_hours")
      .eq("id", client_id)
      .maybeSingle();
    if (clientRow?.system_prompt) {
      systemPrompt = clientRow.system_prompt;
    }
  }

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

  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let reply = "Thanks for your message! We'll be in touch shortly.";
  let visitorInfo: { name?: string; phone?: string; email?: string } | null = null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      tools: TOOLS,
      messages: claudeMessages,
    });

    for (const block of response.content) {
      if (block.type === "text") reply = block.text;
      if (block.type === "tool_use" && block.name === "save_visitor_info") {
        visitorInfo = block.input as { name?: string; phone?: string; email?: string };
      }
    }

    if (visitorInfo && response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find((b) => b.type === "tool_use");
      if (toolUseBlock && toolUseBlock.type === "tool_use") {
        const followUp = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 100,
          system: systemPrompt,
          messages: [
            ...claudeMessages,
            { role: "assistant", content: response.content },
            {
              role: "user",
              content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: "saved" }],
            },
          ],
        });
        const textBlock = followUp.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") reply = textBlock.text;
      }
    }
  } catch (err) {
    console.error("Claude error:", err);
  }

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
