import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

// Fallback system prompt if no client is found
const DEFAULT_SYSTEM = `You are a friendly WhatsApp assistant for a South African service business.
Answer customer questions helpfully and professionally.
If asked to book an appointment, collect their name, address, and preferred time.
Keep responses short and conversational — this is WhatsApp, not email.`;

async function getSystemPrompt(phoneNumber: string): Promise<string> {
  // Look up client by their WhatsApp number
  const { data } = await supabase
    .from("clients")
    .select("system_prompt")
    .eq("whatsapp_number", phoneNumber)
    .single();

  return data?.system_prompt || DEFAULT_SYSTEM;
}

async function getConversationHistory(from: string): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const { data } = await supabase
    .from("conversations")
    .select("role, content")
    .eq("phone_number", from)
    .order("created_at", { ascending: true })
    .limit(20);

  return (data || []) as { role: "user" | "assistant"; content: string }[];
}

async function saveMessage(from: string, role: "user" | "assistant", content: string) {
  await supabase.from("conversations").insert({ phone_number: from, role, content });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get("From") as string;
  const body = formData.get("Body") as string;
  const to = formData.get("To") as string;

  if (!from || !body) {
    return new NextResponse("OK", { status: 200 });
  }

  console.log(`[whatsapp] Message from ${from}: ${body}`);

  try {
    // Get the business's system prompt (based on which number they're messaging)
    const systemPrompt = await getSystemPrompt(to);

    // Get conversation history
    const history = await getConversationHistory(from);

    // Save incoming message
    await saveMessage(from, "user", body);

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...history,
        { role: "user", content: body },
      ],
    });

    const reply = (response.content[0] as { type: string; text: string }).text.trim();

    // Save AI reply
    await saveMessage(from, "assistant", reply);

    // Send reply via Twilio
    await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: reply,
    });

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[whatsapp] Error:", err);
    return new NextResponse("OK", { status: 200 });
  }
}
