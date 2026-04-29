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
    visitor_id?: string;
    event_type?: string;
    page_url?: string;
    conversation_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({}, { headers: CORS });
  }

  const { client_id, visitor_id, event_type, page_url, conversation_id } = body;
  if (!client_id || !event_type) return NextResponse.json({}, { headers: CORS });

  await supabaseAdmin.from("web_widget_events").insert({
    client_id: Number(client_id),
    visitor_id,
    event_type,
    page_url,
    conversation_id: conversation_id ? Number(conversation_id) : null,
  }).then(() => {});

  // Update client last_seen_at
  await supabaseAdmin
    .from("clients")
    .update({ web_widget_last_seen_at: new Date().toISOString() })
    .eq("id", client_id);

  return NextResponse.json({ ok: true }, { headers: CORS });
}
