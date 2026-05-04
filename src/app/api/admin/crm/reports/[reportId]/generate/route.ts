import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { format } from "date-fns";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CrmReportPDF } from "@/lib/crm-report-pdf";

export const dynamic  = "force-dynamic";
export const maxDuration = 60; // Vercel max for hobby — increase in Pro plan

export async function POST(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  // Accept either admin session or internal cron-secret header
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  let actorId: string | null = null;

  if (!isCron) {
    const auth = await assertAdmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    actorId = auth.userId;
  }

  const db = supabaseAdmin();

  // Load the report record
  const { data: report } = await db
    .from("crm_reports")
    .select("*, clients(*)")
    .eq("id", params.reportId)
    .maybeSingle();

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (report.status === "generating") return NextResponse.json({ error: "Already generating" }, { status: 409 });

  // Mark as generating
  await db.from("crm_reports").update({ status: "generating" }).eq("id", params.reportId);

  const client = report.clients as Record<string, unknown> | null;
  if (!client) {
    await db.from("crm_reports").update({ status: "failed" }).eq("id", params.reportId);
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const clientId = report.client_id;
  const fromISO  = `${report.period_start}T00:00:00Z`;
  const toISO    = `${report.period_end}T23:59:59Z`;

  try {
    // Fetch fresh stats
    const [convosRes, bookingsRes, aiMsgsRes] = await Promise.all([
      db.from("conversations").select("channel, status").eq("client_id", clientId)
        .gte("created_at", fromISO).lte("created_at", toISO),
      db.from("bookings").select("id").eq("client_id", clientId)
        .gte("created_at", fromISO).lte("created_at", toISO),
      db.from("messages_log").select("id").eq("client_id", clientId).eq("role", "assistant")
        .gte("created_at", fromISO).lte("created_at", toISO).limit(100000),
    ]);

    const convos = convosRes.data ?? [];
    const metrics = {
      conversations_total:    convos.length,
      conversations_whatsapp: convos.filter(c => c.channel === "whatsapp").length,
      conversations_email:    convos.filter(c => c.channel === "email").length,
      conversations_web:      convos.filter(c => c.channel === "web_chat").length,
      leads_captured:         convos.filter(c => c.status === "lead" || c.status === "converted").length,
      leads_converted:        convos.filter(c => c.status === "converted").length,
      bookings_created:       bookingsRes.data?.length ?? 0,
      messages_handled_by_ai: aiMsgsRes.data?.length ?? 0,
      avg_response_time_s:    0,
    };

    // Get daily data (last 30 days of the period)
    const { data: dailyData } = await db
      .from("crm_stats_daily")
      .select("date, conversations_total, leads_captured, bookings_created")
      .eq("client_id", clientId)
      .gte("date", report.period_start)
      .lte("date", report.period_end)
      .order("date");

    const periodLabel = new Date(report.period_start).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

    const reportData = {
      client: {
        business_name: (client.business_name as string) ?? "Client",
        owner_name:    client.owner_name as string | null,
        logo_url:      client.logo_url as string | null,
        plan:          (client.plan as string) ?? "starter",
        mrr_zar:       (client.mrr_zar as number) ?? 0,
        client_email:  client.client_email as string | null,
        industry:      client.industry as string | null,
      },
      period: {
        start: report.period_start,
        end:   report.period_end,
        label: periodLabel,
      },
      metrics,
      daily: dailyData ?? [],
    };

    // Render PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(React.createElement(CrmReportPDF, { data: reportData }) as any);

    // Upload to Supabase Storage
    const filename   = `reports/${clientId}/${report.period_start}.pdf`;
    const { error: uploadError } = await db.storage
      .from("crm-files")
      .upload(filename, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    // Mark ready
    await db.from("crm_reports").update({
      status:           "ready",
      storage_path:     filename,
      generated_at:     new Date().toISOString(),
      metrics_snapshot: metrics,
    }).eq("id", params.reportId);

    await db.from("crm_events").insert({
      client_id:  clientId,
      actor_id:   actorId,
      event_type: "report_generated",
      payload:    { report_id: params.reportId, period: periodLabel },
    });

    // Auto-email if client has email
    if (client.client_email) {
      const { data: signedUrl } = await db.storage
        .from("crm-files")
        .createSignedUrl(filename, 604800); // 7 days

      if (signedUrl?.signedUrl) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY!);
        await resend.emails.send({
          from:    process.env.RESEND_FROM!,
          to:      client.client_email as string,
          subject: `Your Qwikly Report — ${periodLabel}`,
          html: `
            <p>Hi ${client.owner_name ?? "there"},</p>
            <p>Your monthly Qwikly performance report for <strong>${periodLabel}</strong> is ready.</p>
            <p>
              <a href="${signedUrl.signedUrl}" style="background:#E85A2C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
                Download Report
              </a>
            </p>
            <p style="color:#666;font-size:13px;">The link expires in 7 days.</p>
            <p>— The Qwikly Team</p>
          `,
        });
        await db.from("crm_reports").update({ email_sent_at: new Date().toISOString() }).eq("id", params.reportId);
      }
    }

    return NextResponse.json({ ok: true, report_id: params.reportId });
  } catch (err) {
    await db.from("crm_reports").update({ status: "failed" }).eq("id", params.reportId);
    console.error("[CRM Report] generation failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
