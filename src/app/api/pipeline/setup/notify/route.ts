import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSetupState } from "@/lib/pipeline/setup-state";
import { getResend, FROM } from "@/lib/resend";
import { requireOutboundAccess } from "@/lib/auth/require-outbound";

export const dynamic = "force-dynamic";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(_req: NextRequest) {
  // Session-auth gated. Resolve the tenant from the user cookie.
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const access = await requireOutboundAccess(user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: "outbound_access_required", plan: access.plan },
      { status: 403 },
    );
  }

  const db = supabaseAdmin();
  const [clientRes, businessRes] = await Promise.all([
    db
      .from("clients")
      .select("id, business_name, contact_email, notification_email")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    db
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const tenant = clientRes.data as
    | {
        id: number | string;
        business_name?: string | null;
        contact_email?: string | null;
        notification_email?: string | null;
      }
    | null;

  if (!tenant?.id) {
    return NextResponse.json({ ok: false, error: "No tenant" }, { status: 404 });
  }

  // getSetupState is keyed on businesses.id (UUID), not clients.id (BIGINT).
  // Using the wrong key returns an empty default state — the ICP email would
  // always show "not set" for every field.
  const businessId = (businessRes.data as { id?: string } | null)?.id;
  const state = await getSetupState(businessId ?? tenant.id);
  const tenantName = tenant.business_name || "a Pipeline tenant";

  const sizeLabel = `${state.icp.sizeMin} to ${state.icp.sizeMax}`;
  const dealLabel = `R${state.icp.dealValueZar.toLocaleString("en-ZA")}`;

  const ownerEmail = process.env.QWIKLY_OWNER_EMAIL || "hello@qwikly.co.za";

  const subject = `New Pipeline ICP submitted, ${tenantName}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F4F4F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span>
        </td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Pipeline, new ICP submitted</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;">${escHtml(tenantName)} submitted their ICP.</h1>
          <p style="margin:0 0 18px;font-size:13px;color:#9CA3AF;">Tenant ID, ${escHtml(String(tenant.id))} · Status, ${escHtml(state.status)} · Last generated, ${escHtml(state.last_generated_at ?? "never")}</p>

          <h2 style="margin:18px 0 8px;font-size:14px;color:#F4F4F5;">ICP</h2>
          <ul style="margin:0;padding:0 0 0 18px;color:#9CA3AF;font-size:13px;line-height:1.7;">
            <li>Offer, ${escHtml(state.icp.offer || "not set")}</li>
            <li>Industries, ${escHtml(state.icp.industries.join(", ") || "not set")}</li>
            <li>Job titles, ${escHtml(state.icp.titles.join(", ") || "not set")}</li>
            <li>Company size, ${escHtml(sizeLabel)}</li>
            <li>Locations, ${escHtml(state.icp.locations.join(", ") || "not set")}</li>
            <li>Intent signals, ${escHtml(state.icp.intentSignals.join(", ") || "none")}</li>
            <li>Average deal value, ${escHtml(dealLabel)}</li>
          </ul>

          <p style="margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">
            Prospects have been generated for this tenant. Sending domains, copy, and launch sequencing remain on the internal side.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `New Pipeline ICP submitted, ${tenantName}`,
    `Tenant ID: ${tenant.id}`,
    `Status: ${state.status}`,
    `Last generated: ${state.last_generated_at ?? "never"}`,
    "",
    "ICP",
    `  Offer: ${state.icp.offer || "not set"}`,
    `  Industries: ${state.icp.industries.join(", ") || "not set"}`,
    `  Job titles: ${state.icp.titles.join(", ") || "not set"}`,
    `  Company size: ${sizeLabel}`,
    `  Locations: ${state.icp.locations.join(", ") || "not set"}`,
    `  Intent signals: ${state.icp.intentSignals.join(", ") || "none"}`,
    `  Average deal value: ${dealLabel}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!process.env.RESEND_API_KEY) {
    console.log("[pipeline/notify] RESEND_API_KEY missing, logging summary instead");
    console.log(text);
    return NextResponse.json({ ok: true, sent: false, note: "logged-only" });
  }

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to: ownerEmail,
      replyTo: tenant.contact_email || tenant.notification_email || undefined,
      subject,
      html,
      text,
    });
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[pipeline/notify] resend send failed:", err);
    console.log(text);
    return NextResponse.json({ ok: true, sent: false, note: "resend-failed" });
  }
}
