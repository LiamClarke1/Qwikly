import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Per-number in-memory rate limiter ────────────────────────────────────────
// Resets on cold start but provides basic DoS protection.
// Twilio signature validation (below) is the primary security control.
const rlMap = new Map<string, { count: number; resetAt: number }>();
const RL_MAX = 10;
const RL_WINDOW_MS = 60_000;

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = rlMap.get(phone);
  if (!entry || now > entry.resetAt) {
    rlMap.set(phone, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  if (entry.count >= RL_MAX) return true;
  entry.count += 1;
  return false;
}

// ── Token budget helper ───────────────────────────────────────────────────────
// Keeps the most recent messages that fit within the token estimate.
function truncateToTokenBudget(
  msgs: { role: "user" | "assistant"; content: string }[],
  maxTokens = 3000
): { role: "user" | "assistant"; content: string }[] {
  let total = 0;
  const result: typeof msgs = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const estimate = Math.ceil(msgs[i].content.length / 4);
    if (total + estimate > maxTokens) break;
    total += estimate;
    result.unshift(msgs[i]);
  }
  return result;
}

export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  // ── Twilio signature validation ──────────────────────────────────────────────
  // Must happen before any processing. Prevents fake message injection.
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL ?? "";
  const twilioSignature = req.headers.get("x-twilio-signature") ?? "";

  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = String(value); });

  const From = params["From"];
  const Body = params["Body"];
  const To = params["To"];

  if (!From || !Body) return new NextResponse("OK", { status: 200 });

  // Skip signature check in development; enforce in production.
  if (process.env.NODE_ENV === "production") {
    if (!authToken || !webhookUrl) {
      console.error("[whatsapp] TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_URL not set");
      return new NextResponse("OK", { status: 200 });
    }
    const valid = twilio.validateRequest(authToken, twilioSignature, webhookUrl, params);
    if (!valid) {
      console.error("[whatsapp] Invalid Twilio signature — possible spoofed request", { From, To });
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // ── Per-number rate limit ────────────────────────────────────────────────────
  if (isRateLimited(From)) {
    console.warn("[whatsapp] Rate limit exceeded", { From });
    return new NextResponse("OK", { status: 200 });
  }

  // Always return 200 to Twilio so it does not retry the webhook.
  // Errors are logged with full context for debugging.

  const db = supabaseAdmin();
  let conversationId: string | undefined;

  // ── Step 1: DB lookups ────────────────────────────────────────────────────────
  let client: {
    id: string;
    business_name: string | null;
    owner_name: string | null;
    trade: string | null;
    areas: string | null;
    services_offered: string | null;
    services_excluded: string | null;
    after_hours: string | null;
    emergency_response: string | null;
    charge_type: string | null;
    callout_fee: string | null;
    example_prices: string | null;
    free_quotes: string | null;
    payment_methods: string | null;
    payment_terms: string | null;
    working_hours_text: string | null;
    booking_lead_time: string | null;
    booking_preference: string | null;
    response_time: string | null;
    unique_selling_point: string | null;
    guarantees: string | null;
    common_questions: string | null;
    common_objections: string | null;
    ai_tone: string | null;
    ai_language: string | null;
    ai_response_style: string | null;
    ai_greeting: string | null;
    ai_sign_off: string | null;
    ai_escalation_triggers: string | null;
    ai_escalation_custom: string | null;
    ai_unhappy_customer: string | null;
    ai_always_do: string | null;
    ai_never_say: string | null;
    system_prompt: string | null;
  } | null = null;

  try {
    const { data, error } = await db
      .from("clients")
      .select(
        "id, business_name, owner_name, trade, areas, services_offered, services_excluded, after_hours, emergency_response, charge_type, callout_fee, example_prices, free_quotes, payment_methods, payment_terms, working_hours_text, booking_lead_time, booking_preference, response_time, unique_selling_point, guarantees, common_questions, common_objections, ai_tone, ai_language, ai_response_style, ai_greeting, ai_sign_off, ai_escalation_triggers, ai_escalation_custom, ai_unhappy_customer, ai_always_do, ai_never_say, system_prompt"
      )
      .eq("whatsapp_number", To)
      .single();

    if (error) {
      console.error("[whatsapp] DB error — client lookup", {
        message: error.message,
        code: error.code,
        From,
        To,
        Body: Body.slice(0, 200),
      });
      return new NextResponse("OK", { status: 200 });
    }

    client = data;
  } catch (err) {
    console.error("[whatsapp] Unexpected DB error — client lookup", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      From,
      To,
      Body: Body.slice(0, 200),
    });
    return new NextResponse("OK", { status: 200 });
  }

  if (!client) return new NextResponse("OK", { status: 200 });

  try {
    // Look up or create conversation
    const { data: existing, error: convErr } = await db
      .from("conversations")
      .select("id, ai_paused, status")
      .eq("customer_phone", From)
      .eq("client_id", client.id)
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convErr) {
      console.error("[whatsapp] DB error — conversation lookup", {
        message: convErr.message,
        code: convErr.code,
        From,
        clientId: client.id,
        Body: Body.slice(0, 200),
      });
      return new NextResponse("OK", { status: 200 });
    }

    if (existing) {
      conversationId = existing.id;
      if (existing.ai_paused) return new NextResponse("OK", { status: 200 });
    } else {
      const { data: created, error: createErr } = await db
        .from("conversations")
        .insert({
          client_id: client.id,
          customer_phone: From,
          channel: "whatsapp",
          status: "active",
        })
        .select("id")
        .single();

      if (createErr || !created) {
        console.error("[whatsapp] DB error — create conversation", {
          message: createErr?.message,
          code: createErr?.code,
          From,
          clientId: client.id,
          Body: Body.slice(0, 200),
        });
        return new NextResponse("OK", { status: 200 });
      }

      conversationId = created.id;
    }

    // Log customer message
    const { error: logErr } = await db.from("messages_log").insert({
      conversation_id: conversationId,
      role: "customer",
      content: Body,
    });

    if (logErr) {
      console.error("[whatsapp] DB error — insert customer message", {
        message: logErr.message,
        code: logErr.code,
        conversationId,
        From,
      });
      // Non-fatal — continue to AI reply
    }

    // Update conversations.updated_at
    await db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Build conversation history — fetch newest 20, then reverse to chronological order.
    // ascending:true + limit(20) was returning the OLDEST 20 messages, giving Claude
    // stale context in long conversations.
    const { data: historyRaw, error: historyErr } = await db
      .from("messages_log")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (historyErr) {
      console.error("[whatsapp] DB error — fetch history", {
        message: historyErr.message,
        code: historyErr.code,
        conversationId,
      });
    }

    const allMessages = (historyRaw ?? [])
      .reverse() // restore chronological order for Claude
      .map((m) => ({
        role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
        content: m.content as string,
      }));

    // Trim to token budget so long conversations don't blow up the context window.
    const messages = truncateToTokenBudget(allMessages);

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
    const businessName = client.business_name || "this business";
    const ownerName = client.owner_name || "the owner";
    const signOff = client.ai_sign_off || ownerName;

    const toneMap: Record<string, string> = {
      friendly_casual: "Warm, approachable, everyday language. Speak like a friendly local tradesperson — natural, not stiff.",
      professional_formal: "Precise and respectful. No small talk. Efficient and trustworthy.",
      warm_empathetic: "Caring and reassuring. Acknowledge the customer's situation with genuine warmth before moving to logistics.",
      direct_efficient: "No fluff. Short answers. Move quickly to the solution and booking.",
    };
    const toneInstruction = client.ai_tone ? (toneMap[client.ai_tone] || client.ai_tone) : "Natural and professional.";

    const styleMap: Record<string, string> = {
      brief: "Keep every reply to 1-3 sentences maximum.",
      balanced: "Be helpful with enough detail, but don't overload. 2-4 sentences.",
      detailed: "Give full explanations when helpful. Cover the important details.",
    };
    const styleInstruction = client.ai_response_style ? (styleMap[client.ai_response_style] || "") : "2-4 sentences per reply.";

    const systemPrompt = `You are the WhatsApp assistant for ${businessName}${client.trade ? `, a ${client.trade} business` : ""} in South Africa.

ROLE
You qualify incoming leads, answer questions, and book appointments — all on WhatsApp. You are the first point of contact. Your job is to move every genuine enquiry toward a confirmed booking efficiently and professionally.

TONE
${toneInstruction}
${styleInstruction}
This is WhatsApp — keep replies short, human, and easy to read on a phone screen. No long paragraphs. No lists unless absolutely necessary. Write the way a sharp, trusted tradesperson would text.
${client.ai_language && client.ai_language !== "English only" ? `Language: ${client.ai_language}. Match the language the customer uses if possible.` : ""}

BOOKING FLOW — follow this sequence:
1. Acknowledge the enquiry warmly (one line).
2. Identify the job — if unclear, ask ONE targeted question (not two).
3. Confirm the service area — check it's within your coverage before committing.
4. Assess urgency — emergency jobs get priority handling.
5. Offer availability — give 1-2 concrete time options, not open-ended "when works for you."
6. Collect name and confirm the booking with a clear summary.
7. Set expectations — tell the customer what happens next.

INTENT DETECTION
You receive raw, unpolished messages. Interpret generously.
"my sink is messed up" → plumbing enquiry, probe: blocked, leaking, or low pressure?
"something's wrong with the lights" → electrical enquiry, probe: tripping, flickering, or outage?
"need someone asap" → urgent job, probe: what's the issue and where?
"geyser leaking" → high priority plumbing — geyser leaks escalate fast. Treat as urgent.
When in doubt, ask ONE clarifying question about the job type or location.

URGENCY RULES
If the message contains words like: burst, leaking badly, flooding, no power, emergency, asap, now, tonight, dangerous — treat it as urgent. Acknowledge urgency explicitly and fast-track to booking.
Non-urgent enquiries: offer next available slots normally.

MEMORY & CONTEXT
You have the full conversation history. Never ask for information the customer already gave. Reference earlier details naturally ("So the geyser in Randburg — are mornings better or afternoons?").

BUSINESS PROFILE
${client.services_offered ? `Services: ${client.services_offered}` : ""}
${client.services_excluded ? `We do NOT do: ${client.services_excluded}` : ""}
${client.areas ? `Service areas: ${client.areas}. Politely decline jobs clearly outside these areas.` : ""}
${client.working_hours_text ? `Working hours: ${client.working_hours_text}` : ""}
${client.booking_lead_time ? `Booking lead time: ${client.booking_lead_time}` : ""}
${client.booking_preference ? `Customers confirm bookings via: ${client.booking_preference}` : ""}
${client.response_time ? `Response commitment: ${client.response_time}` : ""}
${client.after_hours ? `After-hours callouts: ${client.after_hours}` : ""}
${client.emergency_response ? `Emergency response: ${client.emergency_response}` : ""}

PRICING
${client.charge_type ? `How we charge: ${client.charge_type}` : ""}
${client.callout_fee ? `Call-out fee: ${client.callout_fee}` : ""}
${client.free_quotes ? `Free quotes: ${client.free_quotes}` : ""}
${client.example_prices ? `Price examples (use these to give accurate estimates):\n${client.example_prices}` : ""}
${client.payment_methods ? `Payment methods: ${client.payment_methods}` : ""}
${client.payment_terms ? `Payment terms: ${client.payment_terms}` : ""}

TRUST & CLOSE
${client.unique_selling_point ? `When a customer hesitates or says they'll think about it:\n${client.unique_selling_point}` : ""}
${client.guarantees ? `Guarantees to mention: ${client.guarantees}` : ""}
${client.common_questions ? `Common questions and answers:\n${client.common_questions}` : ""}
${client.common_objections ? `Common objections and how to handle them:\n${client.common_objections}` : ""}

RULES
${client.ai_greeting ? `Opening style: ${client.ai_greeting}` : ""}
${client.ai_always_do ? `Always: ${client.ai_always_do}` : ""}
${client.ai_never_say ? `Never say or do: ${client.ai_never_say}` : ""}
${client.ai_unhappy_customer ? `Unhappy customers: ${client.ai_unhappy_customer}` : "Acknowledge their frustration. Apologise once. Offer a concrete solution or say the owner will call back within the hour."}
Sign off as: ${signOff}

ESCALATION
${client.ai_escalation_triggers ? `Hand off to a human when: ${client.ai_escalation_triggers}` : ""}
${client.ai_escalation_custom ? client.ai_escalation_custom : ""}
When escalating, say: "I want to make sure this gets the right attention — I'm flagging this for ${ownerName} to follow up with you directly. You'll hear from us shortly."

OUT-OF-SCOPE
If a job is clearly outside the service area, say so kindly and don't keep them hanging: "Unfortunately we don't cover that area, but I don't want to waste your time — you're welcome to try [leave blank]."
If a service isn't offered, be honest immediately. Don't string them along.
${kbSection}`;


    // ── Step 2: Claude call ───────────────────────────────────────────────────
    let reply: string;
    try {
      const aiResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages,
      });

      reply = (
        aiResponse.content[0] as { type: string; text: string }
      ).text.trim();
    } catch (err) {
      console.error("[whatsapp] Claude error — AI call failed", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        conversationId,
        From,
        clientId: client.id,
        incomingBody: Body.slice(0, 200),
      });

      // Don't leave the customer on read — send a fallback and escalate
      const fallback =
        "Thanks for your message! We're experiencing a brief technical issue. Someone from the team will be in touch with you shortly.";
      try {
        await sendWhatsAppMessage(From, fallback);
        await db.from("messages_log").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fallback,
        });
        await db
          .from("conversations")
          .update({ status: "escalated" })
          .eq("id", conversationId);
      } catch {
        // Best-effort — Twilio still needs a 200
      }
      return new NextResponse("OK", { status: 200 });
    }

    // Save assistant reply
    const { error: replyLogErr } = await db.from("messages_log").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    });

    if (replyLogErr) {
      console.error("[whatsapp] DB error — insert assistant message", {
        message: replyLogErr.message,
        code: replyLogErr.code,
        conversationId,
      });
      // Non-fatal — still attempt to send the reply
    }

    // ── Step 3: Twilio send ───────────────────────────────────────────────────
    try {
      await sendWhatsAppMessage(From, reply);
    } catch (err) {
      console.error("[whatsapp] Twilio error — sendWhatsAppMessage failed", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        conversationId,
        From,
        replyPreview: reply.slice(0, 200),
      });
      return new NextResponse("OK", { status: 200 });
    }

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
    console.error("[whatsapp] Unhandled error", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      From,
      To,
      conversationId,
      incomingBody: Body.slice(0, 200),
    });
    return new NextResponse("OK", { status: 200 });
  }
}
