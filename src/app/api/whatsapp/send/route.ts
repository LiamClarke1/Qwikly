import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

    // Verify session
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = supabaseAdmin();

    // Verify the conversation belongs to a client owned by this user
    const { data: convo } = await db
      .from("conversations")
      .select("client_id, customer_phone")
      .eq("id", conversation_id)
      .single();
    if (!convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const { data: ownedClient } = await db
      .from("clients")
      .select("id")
      .eq("id", convo.client_id)
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!ownedClient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
