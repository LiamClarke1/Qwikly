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

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("business_name, public_key")
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const snippet = `<script src="https://cdn.qwikly.co.za/embed.js" data-qwikly-id="${client.public_key}" async></script>`;
  const escaped = snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  await resend.emails.send({
    from: "Qwikly <no-reply@qwikly.co.za>",
    to: recipientEmail,
    subject: `Qwikly embed code for ${client.business_name ?? "your site"}`,
    html: `
      <p style="font-family:sans-serif;color:#0f172a;">Hi,</p>
      <p style="font-family:sans-serif;color:#0f172a;">Here is the embed snippet for <strong>${client.business_name ?? "your site"}</strong>. Paste it just before the <code>&lt;/body&gt;</code> tag on any page.</p>
      <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;font-family:monospace;">${escaped}</pre>
      <p style="font-family:sans-serif;color:#0f172a;">That's it — the widget will appear automatically.</p>
      <p style="font-family:sans-serif;color:#64748b;">— Qwikly</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
