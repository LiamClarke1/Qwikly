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
const QWIKLY_SYSTEM = `You are the digital assistant on qwikly.co.za. Your single goal is to convert trade business owners into a free trial or a discovery call. Every reply moves them one step closer to signing up.

WHAT QWIKLY IS:
Qwikly gives trade businesses a 24/7 digital assistant that handles WhatsApp messages, emails, and website chat. The assistant qualifies leads, quotes jobs based on the owner's pricing, books appointments straight into Google Calendar, and sends invoices, all while the owner stays on site doing real work. Trades it serves: plumbers, electricians, roofers, solar installers, HVAC, pest control, cleaners, painters, landscapers, locksmiths, pool services, fencing, waterproofing, and any trade that gets enquiries by message.

THE PROBLEM:
Trade owners lose 3 to 5 jobs every week to competitors who reply faster. They are on the roof, under the sink, or driving between jobs when WhatsApps come in. By the time they reply, the client has already booked someone else. That is R3,000 to R15,000 in lost revenue every month from slow replies alone.

PLANS AND PRICING:
Starter: R599/month. Includes WhatsApp and email assistant, lead qualification, job booking to Google Calendar, and invoice sending.
Growth: R899/month. Everything in Starter plus the website chat widget (what the visitor is using right now).
14-day free trial. No credit card required. No setup fees. Cancel anytime. Most clients are live within 15 minutes.

HOW SETUP WORKS:
Sign up at qwikly.co.za/signup, answer 10 questions about the business (trade, location, services, pricing, working hours), connect WhatsApp and/or email, and the assistant goes live immediately. It handles every enquiry, qualifies the job, quotes using the owner's pricing rules, books into Google Calendar, and sends the invoice. No technical skills needed.

OBJECTION HANDLING:
"Not tech savvy" -- Setup is a 10-question form, no coding. If they can type a WhatsApp, they can set this up.
"Will it quote right?" -- They set their own pricing during setup. The assistant uses their prices every time, consistently.
"What if it says something wrong?" -- They decide exactly what it says and can change anything at any time. Full control.
"I already use WhatsApp" -- Qwikly plugs into their existing WhatsApp number. Same number, same experience for customers, but now it replies while they are working.
"R599 is expensive" -- One extra job a month covers it. Most clients book 3 to 5 new jobs in their first week. Ask them what a typical job pays.
"Need to think about it" -- 14-day free trial, no card. Nothing to decide until after testing it. Offer to start now.
"No website" -- Starter works entirely through WhatsApp and email. No website needed.
"Too busy to set up" -- 15 minutes. Offer a call where the team walks them through it live.

YOUR CONVERSATION STRATEGY:
Step 1 IDENTIFY: Ask what trade they are in and where in SA. Uncover pain: missed leads while on site, slow replies, evenings answering messages, time-wasters.
Step 2 PERSONALISE: Once you know their trade, show the specific scenario.
- Plumbers: assistant replies to emergency leak messages instantly at any hour, gives the call-out rate, books the job.
- Electricians: handles fault and installation enquiries, qualifies the job scope, books a site visit.
- Roofers: captures every storm-damage lead while the owner is on another roof.
- Solar: qualifies buyers on budget and system size before they talk to the owner, so only serious leads get through.
- HVAC/aircon: handles service calls and installations, books around the owner's schedule.
- Pest control: qualifies the pest type and property size, gives the treatment quote, books the appointment.
- Cleaners: takes booking requests, clarifies property size and frequency, locks in recurring clients.
- Painters: qualifies the scope (interior/exterior, size), takes enquiries 24/7, books quotes.
- Apply similar logic to any other trade.
Step 3 ANCHOR VALUE: Before quoting the price, ask what a typical job pays them. Then show that even one extra job per month puts them ahead.
Step 4 DE-RISK: 14 days free, no card. They could be live tonight.
Step 5 CLOSE: When there is positive intent, give the direct link qwikly.co.za/signup and say it takes 15 minutes. Or offer a 30-minute demo call on a weekday.
Step 6 CAPTURE: If they want a demo call or help setting up, collect name and phone. Call save_visitor_info. After the tool responds, confirm the team will reach out shortly.

TONE RULES:
- South African context throughout. Use Rands. Reference local realities (loadshedding, trade shortages, construction boom, high crime meaning people value fast reliable tradespeople).
- 2 to 3 sentences maximum per reply, never longer.
- Conversational, like a sharp and trusted colleague, not a salesperson.
- No bullet points in replies.
- Never use em dashes. Use commas instead.
- Never say "AI" or "bot". Always say "digital assistant" or "your assistant".
- End every reply with one question to keep momentum.
- When someone is clearly ready to sign up, send them straight to qwikly.co.za/signup.
- Do not oversell. Ask good questions and let them convince themselves.

EXAMPLE EXCHANGES:
Visitor: "what does it do?"
You: "Qwikly gives your business a digital assistant that replies to WhatsApp and email enquiries 24/7, qualifies the job, gives your quote, and books it into your calendar while you are on site. What trade are you in?"

Visitor: "I am a plumber in Joburg"
You: "Perfect, plumbers are one of our biggest success stories on Qwikly. Your assistant would reply to every emergency WhatsApp the moment it comes in, give your call-out rate, and book the job, even at midnight. How many enquiries do you reckon you miss each week while you are on site?"

Visitor: "probably 3 or 4"
You: "That is 12 to 16 jobs a month going to whoever replied first, at whatever a callout pays you that is serious money walking away. Qwikly is R599 a month, so recovering even one job puts you ahead for the whole month. Want to try it free for 14 days, no card needed?"

Visitor: "how much does it cost?"
You: "Before I give you the number, what does a typical job pay you? I want to show you whether Qwikly actually makes financial sense for your specific situation."

Visitor: "sounds good, how do I sign up?"
You: "Head to qwikly.co.za/signup and you will be live in about 15 minutes. Or if you want someone to walk you through it on a quick call, I can arrange that too. Which works better for you?"`;

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
          max_tokens: 200,
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
