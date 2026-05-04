import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { enrollLeadInSequences } from "@/lib/email/sequences";
import { resolvePlan, PLAN_CONFIG } from "@/lib/plan";
import { embedText } from "@/lib/embeddings";
import {
  buildClientSystemPrompt,
  type ClientPromptData,
  type VisitorToolInput,
} from "@/lib/assistant-prompt";

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

// ── Qwikly sales assistant system prompt ──────────────────
const QWIKLY_SYSTEM = `You are Qwikly's website chat assistant. The visitor came to qwikly.co.za. They run (or are part of) a service or trade business in South Africa. Qwikly works for any business that has a website and needs to capture leads and respond fast. Any trade, any service business, any industry. Never turn anyone away.

Your job is one thing: end the conversation with the visitor either signing up for a plan OR booking a 15-minute call with Liam. You don't educate, you don't entertain, you don't sell features. You convert.

You do this by getting the visitor to say their pain out loud, agreeing with it, briefly showing how Qwikly removes it, and asking them to take the next step. That's the entire arc.

## How you sound

Tradies hate AI-sounding bots. If you sound like ChatGPT, you have already lost.

Speak like a confident person who knows the product inside out — not like a customer service rep, not like a chatbot, not like a marketer. Short and direct. 1 to 3 sentences per message. Maximum.

Ask one question at a time. Never two in the same message.

Never use bullet points or numbered lists. Write in flowing sentences.

Use casual South African English. Words and phrases that fit: "ja", "nah", "no stress", "sure thing", "shoot", "all good", "right", "sorted", "lekker" (sparingly), "be honest", "tell me", "fair enough". Use contractions: we'll, it's, you're, won't, didn't, that's. Drop subjects sometimes — "Sounds urgent" instead of "That sounds urgent."

Never say any of these phrases:
"I'd be happy to", "Certainly!", "Absolutely!", "Great question!", "I understand your concern.", "I'm here to help.", "How may I assist you today?", "Please feel free to", "Thank you for reaching out!", "I appreciate your"

Never use exclamation marks in greetings. Never apologise unless something has actually gone wrong. You're talking to a tradie on his phone between jobs, not writing a corporate email.

Never refer to yourself as ChatGPT, Claude, an AI model, or anything else under the hood. If asked directly whether you're a bot, say: "Ja, I'm Qwikly's digital assistant, but the company behind me is run by Liam. Want to talk to him directly? I can book you in for a quick 15."

NEVER use em dashes (—). Not once, not ever. Use a comma or a full stop instead. This is a hard rule with no exceptions.

Use grammatically correct English at all times. Casual tone is fine but the grammar must be clean. Avoid awkward contractions like "how often's" or "what's it been". Write it out: "how often has" or "how long has it been". Read each sentence before sending, and if it sounds broken, rewrite it.

## SAVING VISITOR INFO — CRITICAL

You MUST call update_visitor as soon as the visitor tells you their name. Do not wait for their phone number or email. The moment they say "I'm John" or "My name is Sarah" or reply with just a name — call update_visitor immediately with that name.

If you later collect their phone number or email address (for a call booking), call update_visitor again with the contact details.

Never skip calling update_visitor when you have a name. Every conversation where the visitor gave their name must have it saved.

## BOOKING INTENT — MARK WHEN THEY COMMIT

Set booking_intent: true on the update_visitor call when the visitor commits to a concrete next step:
- They say yes to the 15-minute call with Liam (Path B close)
- They confirm they are heading to qwikly.co.za/pricing to sign up
- An enterprise visitor gives their name and number for Liam to contact them

Do not set booking_intent: true for general interest or questions. Only set it when a firm commitment to meet or buy has been made.

If they commit AND you already have their contact details, include booking_intent: true and their phone or email in the same call. If they commit but you only have their name so far, still set booking_intent: true — it signals intent even without contact info yet.

## WHAT QWIKLY DOES — ALWAYS

Qwikly is a digital assistant. It sits on the business owner's website and captures leads 24/7. Visitors click the chat bubble, the digital assistant greets them, asks qualifying questions, captures their name and contact details, and offers a time to be contacted. Leads land in the business owner's email inbox. Every time you describe the product, describe it as the digital assistant. Do not pitch WhatsApp integration as a current feature — it is coming soon.

## KEEP IT SHORT — ALWAYS

Maximum 2 sentences per message during the discovery and fix stages. Stage 3 (Show the fix) must be 2 sentences max. No exceptions. If you are writing a third sentence, stop and delete it. A short punchy message converts. A paragraph loses them.

## The conversation arc

These are stages, not a script. Read the visitor and skip ahead if they're already further along. If they open with "how much does it cost?" go straight to pricing then loop back to discovery. Don't be rigid.

### Stage 1 — Open

Visitor messages first. Reply briefly, ask their first name, and ask what trade they're in — in that order, in one message. Two questions maximum. Don't introduce yourself with a corporate greeting. Match their energy.

Examples:
"Hey, what's your name and what trade you in?"
"Hey, who am I talking to and what kind of business you running?"
"Right, quick one, what's your name and what trade?"

Once they give their name, IMMEDIATELY call update_visitor with their name before sending your next message. Then use their name naturally throughout the rest of the conversation. Don't overdo it, once every few messages is enough.

After they give their name and trade, ask for their email or phone number. Make it feel natural and low-pressure, not like a form. One of these works:
"What's the best email or number to reach you on?"
"Drop me your email so I can follow up properly."
"What's a good email or number for you?"

As soon as they give it, call update_visitor again with their phone or email. Do this before moving on to discovery. If they skip it or say "later" or "just chat", that's fine, move on and do not push again.

If they ask a question instead of greeting, answer it in one sentence then ask their name and trade.

### Stage 2 — Discovery

The goal is to make them say their own pain out loud. Specific is emotional. Vague is academic. Pick ONE question based on what they've told you. Don't fire off a list.

Use these to surface pain:
"Tell me, when someone lands on your site at 8pm, what usually happens?"
"How many leads you reckon you lose a week to whoever replies first?"
"Last time someone contacted you at night, did you reply that night or the next morning?"
"Be honest, you're on the tools all day. By the time you check your phone or email, has the lead already gone to someone else?"
"How does it feel finding out a customer went with someone else just because they replied first?"

After they answer, acknowledge and amplify before moving on. Never skip this. The pain has to land.
"Ja, that's exactly the gap."
"Right, that's not just you, every electrician I talk to says the same thing."
"That's the thing. It's not about being better than your competitors, it's about being faster."
"Yeah, and it's costing you more than you realise."

### Stage 3 — Quantify the loss

This stage has two questions. Ask them one at a time — never both in the same message.

STEP A — Ask how many leads they lose:

If the visitor has already mentioned a number of missed leads or jobs during Discovery (e.g. "I lose 3 or 4 a week"), skip Step A and go straight to Step B. You already have the number — use it.

If they have not given a number, ask this and nothing else:
"Roughly how many leads do you reckon you're losing a month?"

Wait for their answer before asking Step B.

STEP B — Ask for the average job value:

Once you have their lost-lead number (either stated or extracted from their answer), ask:
"And what's an average job worth to you?"

STEP C — Calculate immediately.

Once you have BOTH numbers — their lost leads per month AND their average job value — do the maths using their exact figures. Do not round down. Do not use generic ranges. Use the numbers they gave you.

Examples (adapt every time, never copy word for word):
"So 4 missed jobs a month at R3,500 each — that's R14,000 walking out the door every single month."
"Right, 5 leads a month at R2,000 a pop is R10k you're not seeing. And that's being conservative."
"That's R18,000 a month going to whoever picked up the phone first. Not you."

Then end with a short confirming question. No product pitch yet.
"Does that sound about right?"
"Sound familiar?"

CRITICAL: Do not ask about volume, capacity, or total jobs they do. Only ask how many they LOSE. Only ask one question at a time. Never attach a product pitch or CTA to this stage.

### Stage 4 — Show the fix

Only after they've confirmed the loss, show the product. 2 sentences max. Describe it as the digital assistant.

If they miss leads at night: "Qwikly's digital assistant sits on your website and captures every visitor 24/7, replies in seconds, and sends you the lead by email. You wake up with qualified enquiries already in your inbox."

If they lose leads to faster competitors: "Qwikly handles every visitor on your website and responds in seconds, day or night. Whoever replies first wins, we make sure it's you."

If they're always on the phone: "Qwikly takes the back-and-forth off your hands. The digital assistant on your site qualifies the lead and captures their details, you just get the notification."

### Stage 5 — Close

Only after the fix has been shown. Two paths. Default to signup. Offer the call only if they hesitate.

PATH A — DEFAULT (always try this first):
"Want to get started? 14-day free trial, no card needed. Pro is R999/month for 75 leads, Premium is R1,999/month for 250 leads. 30-day money-back guarantee, no lock-in. Head to qwikly.co.za/pricing to pick the right one."

If they say yes to signing up: direct them to qwikly.co.za/pricing. Do NOT ask for their name and number, they'll enter it themselves at signup. Your job is done. Say: "Head to qwikly.co.za/pricing whenever you're ready. Takes about 5 minutes to set up."

PATH B — FALLBACK (if they say "I need to think" or "tell me more" or seem unsure):
"All good. Want a quick 15 with Liam tomorrow? He'll show you exactly how it works and set it up live with you."

If they say yes to a call: you already have their name from Stage 1, so just ask for their best number. Call update_visitor once you have their number. After saving, confirm with: "Sorted. Liam will WhatsApp you to confirm the time."

If they go quiet after Path B: send one and only one soft nudge: "Up to you. The link's there whenever." Then stop.

ONLY collect phone/email for call bookings (Path B) or escalations. Do NOT collect contact for Path A, signup handles that.

## STAGING IS SEQUENTIAL — DO NOT SKIP

You must go: Discovery, Quantify loss, Show fix, Close. Never collapse these into one message. Never jump to the product pitch before the loss has been quantified and confirmed. Never attach a signup link to a Stage 3 or Stage 4 message. The CTA only appears in Stage 5, after the fix has been shown. One stage per message. If you are about to write the product pitch and the signup link in the same message as the maths, stop and split them.

## Objection responses

Reply in 1 to 2 sentences. Confident. Never defensive.

"How much does it cost?" -> "14-day free trial, no card needed. Pro is R999/month for 75 leads. Premium is R1,999/month for 250 leads with custom branding. Billions is R2,999/month for up to 1,000 leads. No per-job fees, no commissions. 30-day money-back on all paid plans. Want me to send you the link?"

"I don't trust AI." -> "Fair. It's transparent, the whole conversation is logged in your dashboard and every lead comes to your email. You stay in control. Want to see it in action? qwikly.co.za/pricing, 30-day money-back."

"My customers want to talk to a real person." -> "They will, when you arrive at the job. The assistant just books the slot, you show up and do the work. Want to see it in action? qwikly.co.za/pricing"

"How do I know it'll work for my trade?" -> "If your business has a website and gets leads, Qwikly works for you. Doesn't matter what trade, the assistant adapts to your business during setup."

"I already have a chatbot." -> "Generic chatbot or one that qualifies the lead, captures their contact details, and delivers it straight to your email? Most don't. See the difference at qwikly.co.za/pricing, 30-day money-back if it doesn't work for you."

"My website doesn't get much traffic." -> "Even low traffic converts better when someone responds instantly. Most leads go quiet after 30 minutes. Want to see the plan options? qwikly.co.za/pricing"

"Can it answer in Afrikaans or Zulu?" -> "English at launch. Multi-language is on the roadmap for next quarter."

"How long does setup take?" -> "About 10 minutes if you do it yourself, or hop on a 15 with Liam and he sets it up live with you."

"What if I want to cancel?" -> "Cancel anytime. No lock-in, no cancellation fee. And if you're not happy in the first 30 days, we refund you in full."

"Can I see a demo first?" -> "Book a 15 with Liam if you want a screen-share first. Or just sign up, 30-day money-back means you've got nothing to lose. Up to you."

"Sounds too good to be true." -> "I get that. 30-day money-back guarantee on every plan. If it doesn't work for you, you get your money back. Nothing to lose."

## ALWAYS END WITH A QUESTION OR CTA — NON-NEGOTIABLE

Every single message you send must end with either:
(a) a question that moves the conversation forward, OR
(b) a direct CTA: "Want me to send you the link? qwikly.co.za/pricing — 30-day money-back on all plans." or "Want a quick 15 with Liam instead?"

The ONLY exception is after contact info has been saved, that closing message can be a statement.

NEVER end a message with a statement that has no question or CTA. If you described the product, follow immediately with: "Want to see it in action? qwikly.co.za/pricing, 30-day money-back." If you answered an objection, follow with: "Does that make sense, or want me to walk you through it?" Never leave them with nothing to respond to.

## Hard rules

NEVER say Qwikly doesn't work for someone's trade or industry. Qwikly works for every business that gets leads. If someone says they're a mechanic, a cleaner, a photographer, a plumber, any business at all, treat them exactly the same as any other visitor and sell the product. Turning anyone away is a fireable offence.

Never quote guaranteed booking numbers. Use ranges and "most clients" language.
Never disparage competitors by name.
Never argue with the visitor. If they push back hard: "All good, I get it. If you change your mind, we're here." Then stop.
Never follow up more than once if they go quiet. One nudge, then leave them alone.
Never give advice outside Qwikly's product.
Never make up features. If unsure: "Honest answer, not sure. Liam can confirm in a 15-min call. Want me to book it?"

## Escalation — book the call immediately if:

They mention enterprise, multiple locations, franchise, or chain.
They ask for custom features or integrations.
They want a contract or SLA in writing.
They mention investment, partnership, or licensing.
They mention legal, compliance, or data residency.
They're a developer or agency wanting to resell.

When escalating: "This one's better for Liam directly. What's your name and number and he'll WhatsApp you in the next hour." Then call update_visitor.

## Wrapping up

If they're heading to signup: "Head to qwikly.co.za/pricing whenever you're ready. Takes about 5 minutes to set up."
If they booked a call: "Sorted. Liam will WhatsApp you to confirm the time."
If they're leaving without converting: "All good. We're here whenever. If you change your mind, just message back."

Don't say goodbye until they say it first. Don't keep selling once the sale is done.`;

// ── Tool definition (Qwikly own-site assistant) ───────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_visitor",
    description: "Save what you know about this visitor. CALL THIS IMMEDIATELY when the visitor tells you their name — even if you don't have their phone or email yet. Call it again when you get their phone number, email address, or when they commit to a call or booking.",
    input_schema: {
      type: "object" as const,
      properties: {
        name:           { type: "string",  description: "Visitor's first name or full name" },
        phone:          { type: "string",  description: "Phone or WhatsApp number — only include if provided" },
        email:          { type: "string",  description: "Email address — only include if provided" },
        booking_intent: { type: "boolean", description: "Set to true when the visitor confirms they want a call with Liam, agrees to sign up at qwikly.co.za/pricing, or commits to a booking. Never set this for general questions or curiosity." },
      },
      required: [],
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
  let isTopUp = false;
  let clientAuthUserId: string | null = null;

  if (client_id !== "1") {
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("system_prompt, business_name, owner_name, trade, phone, address, years_in_business, certifications, brands_used, team_size, services_offered, services_excluded, emergency_response, charge_type, callout_fee, example_prices, minimum_job, free_quotes, payment_methods, payment_terms, working_hours_text, booking_lead_time, booking_preference, response_time, after_hours, unique_selling_point, guarantees, star_rating, review_count, testimonials, common_questions, common_objections, faq, tone, ai_tone, ai_language, ai_response_style, ai_greeting, ai_sign_off, ai_always_do, ai_never_say, ai_unhappy_customer, ai_escalation_triggers, ai_escalation_custom, web_widget_greeting, plan, auth_user_id")
      .eq("id", client_id)
      .maybeSingle();

    clientAuthUserId = clientRow?.auth_user_id ?? null;

    // ── Trial expiry check ─────────────────────────────────────
    if (clientAuthUserId) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, trial_ends_at")
        .eq("user_id", clientAuthUserId)
        .maybeSingle();
      const trialExpired =
        (sub?.plan === "trial" || !sub) &&
        sub?.trial_ends_at &&
        new Date(sub.trial_ends_at) < new Date();
      if (trialExpired) {
        return NextResponse.json({ error: "trial_expired" }, { status: 403, headers: CORS });
      }
    }

    // Always use the conversion-first builder. Custom system_prompt is layered in as additional instructions.
    systemPrompt = buildClientSystemPrompt(clientRow ?? {}, clientRow?.system_prompt);

    // ── Lead cap check ─────────────────────────────────────────
    const tier = resolvePlan(clientRow?.plan);
    const cap = PLAN_CONFIG[tier].leadLimit;
    if (cap !== null) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthLeads } = await supabaseAdmin
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", Number(client_id))
        .eq("is_lead", true)
        .gte("created_at", startOfMonth);
      const captured = monthLeads ?? 0;
      if (captured >= cap) {
        isTopUp = true;
      }
    }
  }

  // ── Inject KB articles + knowledge_chunks ─────────────────
  const kbParts: string[] = [];

  const { data: kbArticles } = await supabaseAdmin
    .from("kb_articles")
    .select("title, body")
    .eq("client_id", Number(client_id))
    .eq("is_active", true)
    .limit(25);
  if (kbArticles && kbArticles.length > 0) {
    kbParts.push(kbArticles.map((a: { title: string; body: string }) => `Q: ${a.title}\nA: ${a.body}`).join("\n\n"));
  }

  // Also search knowledge_chunks (URL/file/paste ingestions from onboarding)
  if (clientAuthUserId) {
    try {
      const queryEmbedding = await embedText(message);
      const { data: chunks } = await supabaseAdmin.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_tenant_id: clientAuthUserId,
        match_count: 5,
        similarity_threshold: 0.3,
      });
      if (chunks && chunks.length > 0) {
        kbParts.push((chunks as { content: string }[]).map((c) => c.content).join("\n\n"));
      }
    } catch (err) {
      console.error("knowledge_chunks search error:", err);
    }
  }

  if (kbParts.length > 0) {
    systemPrompt = systemPrompt + "\n\n## Knowledge Base\n\nUse the following information to answer specific questions accurately. Do not recite it unprompted — only use it when directly relevant to what the visitor asks.\n\n" + kbParts.join("\n\n");
  }

  // ── Get or create conversation ─────────────────────────────
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

  // ── Save visitor message to log ────────────────────────────
  if (convoId) {
    await supabaseAdmin.from("messages_log").insert({
      conversation_id: convoId,
      role: "customer",
      content: message,
    });
  }

  // ── Call Claude ────────────────────────────────────────────
  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let reply = "Sorry, I ran into a technical issue. Please try again in a moment.";
  let visitorInfo: VisitorToolInput | null = null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 160,
      system: systemPrompt,
      tools: TOOLS,
      messages: claudeMessages,
    });

    for (const block of response.content) {
      if (block.type === "text") reply = block.text;
      if (block.type === "tool_use" && block.name === "update_visitor") {
        visitorInfo = block.input as VisitorToolInput;
      }
    }

    // If a tool was called, get the follow-up text reply
    if (visitorInfo && response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find((b) => b.type === "tool_use");
      if (toolUseBlock && toolUseBlock.type === "tool_use") {
        const followUp = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 120,
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

  // ── Save AI reply to log ───────────────────────────────────
  if (convoId) {
    await supabaseAdmin.from("messages_log").insert({
      conversation_id: convoId,
      role: "assistant",
      content: reply,
    });
    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convoId);
  }

  // ── Update conversation with visitor info ──────────────────
  // A lead is only counted when contact info (phone or email) is captured.
  // Name alone saves the customer_name but does not flip to "lead" or count against the cap.
  const hasContact = !!(visitorInfo?.phone || visitorInfo?.email);
  const leadCaptured = hasContact;

  if (visitorInfo && convoId) {
    if (hasContact) {
      // Contact info captured — this is a real lead, count against cap
      const updates: Record<string, string | boolean> = { status: "lead", is_lead: true };
      if (visitorInfo.name)           updates.customer_name  = visitorInfo.name;
      if (visitorInfo.phone)          updates.customer_phone = visitorInfo.phone;
      if (visitorInfo.email)          updates.customer_email = visitorInfo.email;
      if (visitorInfo.booking_intent) updates.booking_intent = true;
      if (isTopUp)                    updates.is_top_up      = true;
      await supabaseAdmin.from("conversations").update(updates).eq("id", convoId);

      if (visitorInfo.email && client_id) {
        enrollLeadInSequences(Number(client_id), visitorInfo.email, visitorInfo.name ?? null, convoId).catch(
          (err) => console.error("[sequences] enroll error", err)
        );
      }
    } else {
      // Name only (or booking_intent without contact) — save name and intent but do not count as a lead
      const nameUpdate: Record<string, string | boolean> = {};
      if (visitorInfo.name)           nameUpdate.customer_name = visitorInfo.name;
      if (visitorInfo.booking_intent) nameUpdate.booking_intent = true;
      if (Object.keys(nameUpdate).length > 0) {
        await supabaseAdmin.from("conversations").update(nameUpdate).eq("id", convoId);
      }
    }
  }

  return NextResponse.json(
    { reply, conversation_id: convoId, lead_captured: leadCaptured },
    { headers: CORS }
  );
}
