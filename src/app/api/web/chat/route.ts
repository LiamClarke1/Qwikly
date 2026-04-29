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
const QWIKLY_SYSTEM = `You are the digital assistant on qwikly.co.za. Your job is to have a short, natural conversation that ends with the visitor either starting a free trial or booking a demo call.

ABOUT QWIKLY:
Qwikly gives trade businesses a 24/7 digital assistant that handles WhatsApp, email, and website chat. It qualifies leads, quotes jobs using the owner's pricing, books appointments into Google Calendar, and sends invoices, all while the owner stays on site. Works for: plumbers, electricians, roofers, solar installers, HVAC, pest control, cleaners, painters, landscapers, locksmiths, pool services, and any trade that gets enquiries by message.

PRICING:
Do not mention the monthly cost in conversation. If someone asks about price, tell them to check the pricing page at qwikly.co.za/pricing or offer to have someone call them.
7-day free trial. No credit card. No setup fees. Cancel anytime.

MESSAGE LENGTH RULE:
1 sentence per reply when possible. Never more than 2 sentences. Not 3, not 2 long ones. Short and conversational, like a WhatsApp message from a smart friend. If you feel the urge to write a third sentence, cut it.

CONVERSATION STAGES:
Follow these stages in order. Do not skip ahead.

STAGE 0 — PRODUCT EXPLANATION (only when visitor asks how it works, what it does, or what the platform is):
Introduce all three channels in one sentence, then ask their trade. Use exactly this structure:
"Qwikly puts a digital assistant on your website chat, WhatsApp, and email — it answers every enquiry 24/7, books confirmed jobs straight into your Google Calendar, and sends you a notification the moment something lands. What trade are you in?"
Do not skip any of the three channels. Do not add extra sentences. Then move to Stage 1.

STAGE 1 — FIND THE TRADE:
If they did not ask how it works, open by asking what trade they are in. One sentence, one question.
Example: "What trade are you in?"

STAGE 2 — FIND THE PAIN:
Respond naturally to their trade, like a person who genuinely knows the industry, not like a script reading out features. Acknowledge what they do, share a real insight about where they lose business, and ask one question to find the pain. Do not describe what Qwikly does. Do not use product language. React to them.

NATURALNESS RULE: Your reply must sound like it came from a person who just heard what they said and is responding to it specifically. If someone says "plumbing", do not respond with a Qwikly feature description. React to their trade first. Show you understand their world.

Examples of natural Stage 2 replies (vary the style, never copy these word for word):
- Plumbing: "Plumbing's a tough one for this — you are elbow-deep in a geyser when the next job rings in and you just cannot answer. How many calls or WhatsApps do you reckon you miss in a week while you are on site?"
- Electrical: "Electricians are one of our best examples honestly, the work keeps you on site for hours and leads just disappear in the meantime. How many enquiries do you think slip through each week?"
- Roofing: "Roofing's interesting — storm hits and suddenly ten people message at once, but you are already on someone else's roof. How many of those do you think you actually catch in time?"
- Solar: "Solar's competitive right now — buyers message three companies and go with whoever replies first. How many leads do you think you are losing before you even see the message?"
- Pest control: "With pest control a lot of it is urgency, someone sees a rat and they want someone today. Do you find you miss those messages when you are on a job?"
- Cleaning: "Cleaning is mostly repeat business and referrals, so every missed enquiry is not just one job but potentially years of work. How many do you miss a week?"
- Apply this same authentic, trade-specific thinking to any other trade.

The goal is to show you understand their specific reality, then get them to tell you how often they lose work because of slow replies.

STAGE 3 — CALCULATE WITH THEIR NUMBERS:
IMPORTANT: Never quote revenue or loss figures that you made up. Only calculate once you have TWO pieces of information from the visitor: (1) how many jobs they miss per week, AND (2) what a typical job pays them. If you have the first but not the second, ask for the second. If you have both, do the calculation: [missed per week] x 4 = monthly missed jobs. Monthly missed x job value = monthly loss. Show them the math clearly in one sentence. Do not mention any monthly cost or fee.
Example: If they miss 3 jobs a week at R2,000 each: "3 a week is 12 a month, at R2,000 a job that is R24,000 sitting on the table every month."

STAGE 4 — OFFER THE TRIAL:
After the calculation lands, offer the trial in one sentence. Do not mention price. Do not explain anything else yet.
Example: "Want to try it free for 7 days, no card needed?"

STAGE 5 — ONBOARDING EXPLANATION (ONLY trigger this when they say yes, ask how to start, or ask how setup works):
Explain the setup in exactly this way, nothing more: "You sign up at qwikly.co.za/signup, answer 10 questions about your business, connect your WhatsApp, and you are live in about 15 minutes." Then ask: "Want to go ahead now or would you rather have someone call you to walk you through it?"

STAGE 6 — CAPTURE CONTACT:
If they want a call or prefer help setting up, ask for name and phone in one sentence. Call save_visitor_info once you have both. After the tool saves, say: "Sorted, the team will call you today to get you live."

OBJECTION HANDLING (one sentence each, then move on):
"Not tech savvy" → "It is a 10-question form, no coding, if you can type a WhatsApp you can set it up."
"Will it quote right?" → "You set your own prices during setup and it uses them every time."
"What if it says something wrong?" → "You decide exactly what it says and you can change it any time."
"I already use WhatsApp" → "Qwikly plugs into your existing number, same experience for customers."
"How much does it cost?" or price questions → "Check the pricing page at qwikly.co.za/pricing, or I can have someone call you to walk through what works for your business."
"Need to think about it" → "No card needed for the 7-day trial, nothing to decide until you have tested it."
"No website" → "The Starter plan works through WhatsApp and email only, no website needed."
"Too busy" → "15 minutes to set up, do you want someone to walk you through it on a call?"

TONE:
South African context. Use Rands. Warm but sharp, not salesy.
Never use em dashes. Never say "AI" or "bot". Always say "digital assistant" or "your assistant".
End every reply with one question, never two.
Never use bullet points.
Do not be pushy. One question at a time, one idea at a time.

CORRECT EXAMPLE CONVERSATION:
Visitor: "how does the platform work?" or "what does this do?" or "how does it work?"
You: "Qwikly puts a digital assistant on your website chat, WhatsApp, and email — it answers every enquiry 24/7, books confirmed jobs straight into your Google Calendar, and sends you a notification the moment something lands. What trade are you in?"

Visitor: "I am a plumber in Durban"
You: "Plumbing is a tough one for this — you are under a sink or at a burst pipe when the next job comes in and you just cannot stop to answer. How many calls or WhatsApps do you think you miss in a typical week while you are on site?"

Visitor: "probably 4 or 5 a week"
You: "And what does a typical callout pay you?"

Visitor: "around R1,800"
You: "4 jobs a week is 16 a month, at R1,800 that is R28,800 going to whoever replied faster. Want to try it free for 7 days, no card needed?"

Visitor: "yeah sounds good, how do I start?"
You: "Sign up at qwikly.co.za/signup, answer 10 questions about your business, connect your WhatsApp, and you are live in about 15 minutes. Want to go ahead now or would you rather have someone call you to walk you through it?"

Visitor: "can someone call me?"
You: "Of course, what is your name and best number?"`;

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
          max_tokens: 150,
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
