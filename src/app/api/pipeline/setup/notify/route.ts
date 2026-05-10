import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSetupState } from "@/lib/pipeline/setup-state";
import { getResend, FROM } from "@/lib/resend";

export const dynamic = "force-dynamic";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
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

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, business_name, contact_email, notification_email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const tenant = client as
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

  const state = await getSetupState(tenant.id);
  const tenantName = tenant.business_name || "a Pipeline tenant";

  const ownerEmail = process.env.QWIKLY_OWNER_EMAIL || "hello@qwikly.co.za";

  const sizeLabel =
    state.icp.company_size_min || state.icp.company_size_max
      ? `${state.icp.company_size_min ?? "?"} to ${state.icp.company_size_max ?? "?"}`
      : "not set";

  const seedSourceLabel =
    state.seed_list.source === "qwikly_generator"
      ? "Generated with Qwikly"
      : state.seed_list.source === "csv_upload"
        ? `CSV upload, ${state.seed_list.valid_rows} valid of ${state.seed_list.total_rows} total`
        : "not set";

  const subject = `New Pipeline campaign ready, ${tenantName}`;

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
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Pipeline, ready for launch</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;">${escHtml(tenantName)} marked their campaign ready.</h1>
          <p style="margin:0 0 18px;font-size:13px;color:#9CA3AF;">Tenant ID, ${escHtml(String(tenant.id))} · Status, ${escHtml(state.status)} · Marked ready, ${escHtml(state.ready_at ?? new Date().toISOString())}</p>

          <h2 style="margin:18px 0 8px;font-size:14px;color:#F4F4F5;">ICP</h2>
          <ul style="margin:0;padding:0 0 0 18px;color:#9CA3AF;font-size:13px;line-height:1.7;">
            <li>Name, ${escHtml(state.icp.name || "not set")}</li>
            <li>Industries, ${escHtml(state.icp.industries.join(", ") || "not set")}</li>
            <li>Job titles, ${escHtml(state.icp.job_titles.join(", ") || "not set")}</li>
            <li>Company size, ${escHtml(sizeLabel)}</li>
            <li>Locations, ${escHtml(state.icp.locations.join(", ") || "not set")}</li>
            <li>Pain point, ${escHtml(state.icp.pain_point || "not set")}</li>
            <li>Value prop, ${escHtml(state.icp.value_prop || "not set")}</li>
          </ul>

          <h2 style="margin:18px 0 8px;font-size:14px;color:#F4F4F5;">Seed list</h2>
          <ul style="margin:0;padding:0 0 0 18px;color:#9CA3AF;font-size:13px;line-height:1.7;">
            <li>Source, ${escHtml(seedSourceLabel)}</li>
            ${state.seed_list.warnings.length ? `<li>Warnings, ${escHtml(state.seed_list.warnings.join(" · "))}</li>` : ""}
          </ul>

          <h2 style="margin:18px 0 8px;font-size:14px;color:#F4F4F5;">Sending domains</h2>
          <ul style="margin:0;padding:0 0 0 18px;color:#9CA3AF;font-size:13px;line-height:1.7;">
            <li>Number of domains, ${escHtml(String(state.domains.count))}</li>
            <li>Pattern, ${escHtml(state.domains.pattern || "not set")}</li>
            ${state.domains.notes ? `<li>Notes, ${escHtml(state.domains.notes)}</li>` : ""}
          </ul>

          <h2 style="margin:18px 0 8px;font-size:14px;color:#F4F4F5;">Copy approval</h2>
          <ul style="margin:0;padding:0 0 0 18px;color:#9CA3AF;font-size:13px;line-height:1.7;">
            <li>Email 1 icebreaker, ${state.copy.approve_email_1 ? "approved" : "pending"}</li>
            <li>Email 2 TL;DR, ${state.copy.approve_email_2 ? "approved" : "pending"}</li>
            <li>Email 3 breakup, ${state.copy.approve_email_3 ? "approved" : "pending"}</li>
            ${state.copy.customisations ? `<li>Customisations, ${escHtml(state.copy.customisations)}</li>` : ""}
          </ul>

          <p style="margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">
            Manual gate, this campaign will not send until you approve and trigger it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `New Pipeline campaign ready, ${tenantName}`,
    `Tenant ID: ${tenant.id}`,
    `Status: ${state.status}`,
    `Marked ready: ${state.ready_at ?? new Date().toISOString()}`,
    "",
    "ICP",
    `  Name: ${state.icp.name || "not set"}`,
    `  Industries: ${state.icp.industries.join(", ") || "not set"}`,
    `  Job titles: ${state.icp.job_titles.join(", ") || "not set"}`,
    `  Company size: ${sizeLabel}`,
    `  Locations: ${state.icp.locations.join(", ") || "not set"}`,
    `  Pain point: ${state.icp.pain_point || "not set"}`,
    `  Value prop: ${state.icp.value_prop || "not set"}`,
    "",
    "Seed list",
    `  Source: ${seedSourceLabel}`,
    state.seed_list.warnings.length ? `  Warnings: ${state.seed_list.warnings.join(" · ")}` : "",
    "",
    "Sending domains",
    `  Count: ${state.domains.count}`,
    `  Pattern: ${state.domains.pattern || "not set"}`,
    state.domains.notes ? `  Notes: ${state.domains.notes}` : "",
    "",
    "Copy approval",
    `  Email 1 icebreaker: ${state.copy.approve_email_1 ? "approved" : "pending"}`,
    `  Email 2 TL;DR: ${state.copy.approve_email_2 ? "approved" : "pending"}`,
    `  Email 3 breakup: ${state.copy.approve_email_3 ? "approved" : "pending"}`,
    state.copy.customisations ? `  Customisations: ${state.copy.customisations}` : "",
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
