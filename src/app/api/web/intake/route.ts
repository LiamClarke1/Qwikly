import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: {
    client_id?: string;
    name?: string;
    phone?: string;
    email?: string;
    first_message?: string;
    visitor_id?: string;
    page_url?: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { client_id, name, phone, visitor_id, page_url, referrer, utm_source, utm_medium, utm_campaign } = body;
  // email and first_message accepted but not yet stored in a dedicated column

  if (!client_id || !name || !phone) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: CORS });
  }

  // Create the conversation
  const { data: convo, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      client_id: Number(client_id),
      customer_name: name,
      customer_phone: phone,
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

  // Generate a simple ws_token (in production this would be a signed JWT)
  const wsToken = Buffer.from(`${convo.id}:${Date.now()}`).toString("base64");

  // Fetch branding to return alongside
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("business_name, web_widget_color, web_widget_greeting, web_widget_launcher_label, web_widget_position")
    .eq("id", client_id)
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
