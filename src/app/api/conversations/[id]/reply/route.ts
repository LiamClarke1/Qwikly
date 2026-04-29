import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // Auth
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
    const { id: conversationId } = params;

    // Load conversation
    const { data: convo } = await db
      .from("conversations")
      .select("client_id, customer_phone, customer_email, customer_name, channel")
      .eq("id", conversationId)
      .single();
    if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify ownership
    const { data: ownedClient } = await db
      .from("clients")
      .select("id, business_name")
      .eq("id", convo.client_id)
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!ownedClient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const message = content.trim();

    // Log the reply
    await db.from("messages_log").insert({
      conversation_id: conversationId,
      role: "owner",
      content: message,
    });
    await db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    const channel = convo.channel ?? "whatsapp";
    const deliveryResult: { channel: string; sent: boolean; error?: string } = {
      channel,
      sent: false,
    };

    if (channel === "whatsapp") {
      await sendWhatsAppMessage(convo.customer_phone, message);
      deliveryResult.sent = true;
    } else if (channel === "email") {
      if (!convo.customer_email) {
        deliveryResult.error = "No email address on record for this contact";
      } else {
        const bizName = ownedClient.business_name || "Qwikly";
        const { error: emailErr } = await resend.emails.send({
          from: `${bizName} <noreply@qwikly.co.za>`,
          to: convo.customer_email,
          replyTo: undefined,
          subject: `Re: Your enquiry${convo.customer_name ? ` — ${convo.customer_name}` : ""}`,
          text: message,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
<p style="white-space:pre-wrap;line-height:1.6;color:#1a1a1a">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#999">Sent via ${bizName} · Powered by Qwikly</p>
</div>`,
        });
        if (emailErr) {
          deliveryResult.error = String(emailErr);
        } else {
          deliveryResult.sent = true;
        }
      }
    } else {
      // web_chat: message saved to DB only — customer sees it on next poll/refresh
      deliveryResult.sent = true;
    }

    return NextResponse.json(deliveryResult);
  } catch (err) {
    console.error("[conversations/reply] Error:", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}
