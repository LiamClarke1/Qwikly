import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
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

  // The embed sends client_id = public_key (qw_pk_...). Resolve to the numeric id.
  const { data: clientRow } = await db
    .from("clients")
    .select("id")
    .eq("public_key", client_id)
    .maybeSingle();
  if (!clientRow) return NextResponse.json({}, { status: 404, headers: CORS });

  await db.from("web_widget_events").insert({
    client_id: clientRow.id,
    visitor_id,
    event_type,
    page_url,
    conversation_id: conversation_id ? Number(conversation_id) : null,
  }).then(() => {});

  await db
    .from("clients")
    .update({ web_widget_last_seen_at: new Date().toISOString() })
    .eq("id", clientRow.id);

  return NextResponse.json({ ok: true }, { headers: CORS });
}
