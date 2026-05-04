import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = supabaseAdmin();
    const { id } = params;

    const [{ data: messages }, { data: convo }] = await Promise.all([
      db
        .from("messages_log")
        .select("role, content")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(60),
      db
        .from("conversations")
        .select("customer_name, channel")
        .eq("id", id)
        .maybeSingle(),
    ]);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "no_messages" }, { status: 404 });
    }

    const transcript = messages
      .map((m) => {
        const label =
          m.role === "customer" ? "CUSTOMER"
          : m.role === "assistant" ? "AI ASSISTANT"
          : "OWNER";
        return `${label}: ${m.content}`;
      })
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: "You extract structured CRM data from customer conversation transcripts. Return ONLY valid JSON with no markdown, no explanation, no code fences.",
      messages: [
        {
          role: "user",
          content: `Analyse this conversation and return a JSON object.

TRANSCRIPT:
${transcript}

Return exactly this structure (all fields required):
{
  "customer_name": "first name if clearly mentioned, otherwise null",
  "intent": "1–2 sentences describing what the customer wants",
  "requirements": ["specific ask or constraint 1", "..."],
  "concerns": ["objection or worry 1", "..."],
  "lead_status": "new" | "qualified" | "follow_up" | "closed",
  "next_action": "one sentence: the most useful next step for the business owner"
}

lead_status rules:
- new = just enquired, no clear buying intent yet
- qualified = clearly interested, fits the service, likely to book
- follow_up = quote given, or customer is thinking, or needs a nudge
- closed = explicitly booked, paid, or clearly declined

Use empty arrays [] for requirements/concerns if none exist.`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try extracting JSON from any surrounding text
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return NextResponse.json({ error: "parse_failed" }, { status: 500 });
      parsed = JSON.parse(match[0]);
    }

    // Back-fill name into conversations if not already set
    if (
      parsed.customer_name &&
      parsed.customer_name !== "null" &&
      !convo?.customer_name
    ) {
      await db
        .from("conversations")
        .update({ customer_name: parsed.customer_name })
        .eq("id", id);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[conversations/analyze] Error:", err);
    return NextResponse.json({ error: "analysis_failed" }, { status: 500 });
  }
}
