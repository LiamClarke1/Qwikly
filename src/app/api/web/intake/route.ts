import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { enrollLeadInSequences } from "@/lib/email/sequences";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

// T3.8 — request body schema. client_id is a numeric string (clients.id is bigint).
// Strings are trimmed and capped to defensive lengths so we don't ingest pathological
// payloads from a misconfigured embed.
const IntakeBody = z.object({
  client_id: z.string().regex(/^\d+$/, "client_id must be a numeric string"),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  first_message: z.string().max(4000).optional(),
  visitor_id: z.string().max(120).optional(),
  page_url: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const parsed = IntakeBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400, headers: CORS }
    );
  }
  const {
    client_id,
    name,
    phone,
    email,
    visitor_id,
    page_url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
  } = parsed.data;

  // T3.8 — verify client_id refers to a real client before we insert a conversation.
  // This prevents orphan conversations and gives the embed a clear 404 when the
  // host site is misconfigured.
  const clientIdNum = Number(client_id);
  const { data: clientCheck, error: clientCheckError } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", clientIdNum)
    .limit(1)
    .maybeSingle();

  if (clientCheckError) {
    return NextResponse.json(
      { error: "client_lookup_failed" },
      { status: 500, headers: CORS }
    );
  }
  if (!clientCheck) {
    return NextResponse.json(
      { error: "client_not_found", client_id },
      { status: 404, headers: CORS }
    );
  }

  // Create the conversation
  const { data: convo, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      client_id: clientIdNum,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      channel: "web_chat",
      status: "active",
      visitor_id,
      page_url,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
    })
    .select("id")
    .single();

  if (error || !convo) {
    return NextResponse.json({ error: error?.message ?? "create_failed" }, { status: 500, headers: CORS });
  }

  // Auto-enroll lead if email was provided
  if (email) {
    try {
      await enrollLeadInSequences(clientIdNum, email, name, String(convo.id));
    } catch (err) {
      console.error("[sequences] enroll error", { client_id, email, conversationId: convo.id, err });
    }
  }

  // Generate a simple ws_token (in production this would be a signed JWT)
  const wsToken = Buffer.from(`${convo.id}:${Date.now()}`).toString("base64");

  // Fetch branding to return alongside
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("business_name, web_widget_color, web_widget_greeting, web_widget_launcher_label, web_widget_position")
    .eq("id", clientIdNum)
    .maybeSingle();

  return NextResponse.json({
    conversation_id: String(convo.id),
    ws_token: wsToken,
    client_branding: client ? {
      name: client.business_name,
      color: client.web_widget_color,
      greeting: client.web_widget_greeting,
      launcher_label: client.web_widget_launcher_label,
      position: client.web_widget_position,
    } : null,
  }, { headers: CORS });
}
