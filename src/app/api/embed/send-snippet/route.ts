import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  let body: { tenantId?: string; recipientEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { tenantId, recipientEmail } = body;
  if (!tenantId || !recipientEmail) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(recipientEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: client, error: dbErr } = await db
    .from("clients")
    .select("business_name, public_key")
    .eq("public_key", tenantId)
    .maybeSingle();

  if (dbErr) {
    console.error("DB error in send-snippet:", dbErr);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!client) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const snippet = `<script src="https://cdn.qwikly.co.za/embed.js" data-qwikly-id="${client.public_key}" async></script>`;
  const escapedSnippet = snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeName = (client.business_name ?? "your site")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  try {
    const { error: sendErr } = await resend.emails.send({
      from: "Qwikly <no-reply@qwikly.co.za>",
      to: recipientEmail,
      subject: `Qwikly embed code for ${client.business_name ?? "your site"}`,
      html: `
        <p style="font-family:sans-serif;color:#0f172a;">Hi,</p>
        <p style="font-family:sans-serif;color:#0f172a;">Here is the embed snippet for <strong>${safeName}</strong>. Paste it just before the <code>&lt;/body&gt;</code> tag on any page.</p>
        <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;font-family:monospace;">${escapedSnippet}</pre>
        <p style="font-family:sans-serif;color:#0f172a;">That's it — the widget will appear automatically.</p>
        <p style="font-family:sans-serif;color:#64748b;">— Qwikly</p>
      `,
    });

    if (sendErr) {
      console.error("Resend error:", sendErr);
      return NextResponse.json({ error: "send_failed" }, { status: 500 });
    }
  } catch (sendEx) {
    console.error("Resend exception:", sendEx);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
