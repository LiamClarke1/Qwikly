import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId      = searchParams.get("sessionId");
  const conversationId = searchParams.get("conversationId");
  const after          = searchParams.get("after"); // ISO timestamp

  if (!sessionId || !conversationId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400, headers: CORS });
  }

  const db = supabaseAdmin();

  // Verify sessionId owns the conversation
  const { data: convo } = await db
    .from("conversations")
    .select("id, visitor_id, client_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!convo) return NextResponse.json({ messages: [] }, { headers: CORS });
  if (convo.visitor_id && convo.visitor_id !== sessionId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403, headers: CORS });
  }

  // Same pause/trial gates the chat route uses, so a visitor on a tenant
  // whose assistant is paused or whose trial has expired stops receiving
  // owner-side replies through this poll endpoint.
  const { data: client } = await db
    .from("clients")
    .select("auth_user_id, ai_paused")
    .eq("id", convo.client_id)
    .maybeSingle();
  if (client?.ai_paused) {
    return NextResponse.json({ error: "paused" }, { status: 403, headers: CORS });
  }
  if (client?.auth_user_id) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, trial_ends_at")
      .eq("user_id", client.auth_user_id)
      .maybeSingle();
    const trialExpired =
      (sub?.plan === "trial" || !sub) &&
      sub?.trial_ends_at &&
      new Date(sub.trial_ends_at) < new Date();
    if (trialExpired) {
      return NextResponse.json({ error: "trial_expired" }, { status: 403, headers: CORS });
    }
  }

  // Fetch new owner messages since `after`
  let query = db
    .from("messages_log")
    .select("id, role, content, message_type, attachment_id, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "owner")
    .order("created_at", { ascending: true });

  if (after) {
    query = query.gt("created_at", after);
  }

  const { data: msgs } = await query;
  if (!msgs || msgs.length === 0) {
    return NextResponse.json({ messages: [] }, { headers: CORS });
  }

  // Enrich document messages with document metadata
  const enriched = await Promise.all(
    msgs.map(async (msg) => {
      if (msg.message_type === "document" && msg.attachment_id) {
        const { data: doc } = await db
          .from("conversation_documents")
          .select("id, file_name, file_size, file_type, status")
          .eq("id", msg.attachment_id)
          .maybeSingle();
        return { ...msg, document: doc ?? null };
      }
      return { ...msg, document: null };
    })
  );

  return NextResponse.json({ messages: enriched }, { headers: CORS });
}
