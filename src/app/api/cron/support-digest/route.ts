import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RECIPIENT = process.env.SUPPORT_DIGEST_TO ?? "clarkeagency1@outlook.com";
const SPAM_DOMAIN_FRAGMENTS = ["search-qwikly"];

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function digestHtml(rows: Array<{ created_at: string; name: string; email: string; subject: string; message: string }>) {
  if (rows.length === 0) {
    return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;padding:24px;color:#1C1A18;">
  <h2 style="margin:0 0 12px;font-weight:600;">Qwikly support digest</h2>
  <p style="color:#6B6764;margin:0 0 16px;">Last 24 hours: <strong>0 new messages</strong>.</p>
  <p style="color:#6B6764;font-size:13px;margin:0;">If you expected something, the contact form may be broken. Check Vercel logs and the support_messages table directly.</p>
</body></html>`;
  }

  const items = rows
    .map((r) => {
      const when = new Date(r.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });
      return `
        <li style="border:1px solid #E6E2DC;border-radius:10px;padding:14px 16px;margin:0 0 12px;">
          <div style="font-weight:600;color:#1C1A18;font-size:14px;">${esc(r.subject)}</div>
          <div style="color:#6B6764;font-size:12px;margin:2px 0 8px;">${esc(r.name)} &lt;${esc(r.email)}&gt; · ${when}</div>
          <div style="white-space:pre-wrap;color:#3A3633;font-size:13px;line-height:1.5;">${esc(r.message)}</div>
        </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;padding:24px;color:#1C1A18;background:#F5F2EE;">
  <h2 style="margin:0 0 4px;font-weight:600;">Qwikly support digest</h2>
  <p style="color:#6B6764;margin:0 0 18px;font-size:13px;">Last 24 hours · <strong>${rows.length}</strong> new message${rows.length === 1 ? "" : "s"}</p>
  <ul style="list-style:none;padding:0;margin:0;">${items}</ul>
  <p style="color:#9A9591;font-size:11px;margin:24px 0 0;">Sent automatically every morning. If this stops arriving, the contact form pipeline is broken.</p>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("support_messages")
    .select("created_at, name, email, subject, message")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    log("error", "support-digest query failed", { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter(
    (r) => !SPAM_DOMAIN_FRAGMENTS.some((frag) => (r.email ?? "").toLowerCase().includes(frag))
  );

  const subject =
    rows.length === 0
      ? "Qwikly digest: no messages in last 24h"
      : `Qwikly digest: ${rows.length} message${rows.length === 1 ? "" : "s"} in last 24h`;

  const result = await sendEmail({ to: RECIPIENT, subject, html: digestHtml(rows) });

  if (result.error) {
    log("error", "support-digest send failed", { error: result.error, count: rows.length });
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  log("info", "support-digest sent", { count: rows.length, id: result.id });
  return NextResponse.json({ ok: true, count: rows.length, id: result.id });
}

export const GET = POST;
