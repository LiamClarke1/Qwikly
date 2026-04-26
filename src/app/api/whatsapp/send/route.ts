import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content?.trim()) {
      return NextResponse.json(
        { error: "Missing conversation_id or content" },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const { data: convo, error: convoError } = await db
      .from("conversations")
      .select("customer_phone")
      .eq("id", conversation_id)
      .single();

    if (convoError || !convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const message = content.trim();

    await db.from("messages_log").insert({
      conversation_id,
      role: "owner",
      content: message,
    });

    await db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    await sendWhatsAppMessage(convo.customer_phone, message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp/send] Error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
