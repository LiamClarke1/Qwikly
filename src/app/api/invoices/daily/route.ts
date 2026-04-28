import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { invoiceReminderHtml } from "@/lib/invoices/email";
import { invoiceReminderWa } from "@/lib/invoices/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Daily cron — runs 08:00 SAST (06:00 UTC).
 * Does 4 things:
 *   1. Mark overdue invoices
 *   2. Send invoice reminders (pre-due, due-today, overdue)
 *   3. Process scheduled invoice sends
 *   4. Check uninvoiced completed bookings (Layer 1 anti-fraud)
 * On the 1st of month, also triggers the monthly billing run inline.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

function authCheck(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const results: Record<string, unknown> = {};

  // ── 1. Mark overdue ──────────────────────────────────────────────────────
  const { data: overdueMarked } = await db
    .from("invoices")
    .update({ status: "overdue", updated_at: now.toISOString() })
    .in("status", ["sent", "viewed", "partial_paid"])
    .lt("due_at", now.toISOString())
    .select("id");

  results.overdue_marked = overdueMarked?.length ?? 0;

  // ── 2. Send reminders ─────────────────────────────────────────────────────
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in3DaysStr = in3Days.toISOString();

  // Pre-due reminders (due in ~3 days)
  const { data: preDue } = await db
    .from("invoices")
    .select("*, clients(business_name, invoice_accent_color, whatsapp_number)")
    .in("status", ["sent", "viewed"])
    .gte("due_at", now.toISOString())
    .lte("due_at", in3DaysStr)
    .is("qwikly_ping_sent_at", null); // repurpose field as reminder-sent flag for now

  let remindersSent = 0;
  for (const inv of preDue ?? []) {
    const cl = inv.clients as Record<string, unknown>;
    const url = `${BASE_URL}/i/${inv.customer_view_token}`;
    if (inv.customer_mobile) {
      await sendWhatsAppMessage(inv.customer_mobile, invoiceReminderWa({
        customerName: inv.customer_name,
        businessName: (cl.business_name as string) ?? "",
        invoiceNumber: inv.invoice_number ?? "",
        totalZar: inv.total_zar,
        dueAt: inv.due_at,
        publicUrl: url,
      })).catch(() => {});
      remindersSent++;
    }
    if (inv.customer_email) {
      await resend.emails.send({
        from: FROM,
        to: [inv.customer_email],
        subject: `Reminder: Invoice ${inv.invoice_number} due soon`,
        html: invoiceReminderHtml({
          customerName: inv.customer_name,
          businessName: (cl.business_name as string) ?? "",
          invoiceNumber: inv.invoice_number ?? "",
          totalZar: inv.total_zar,
          dueAt: inv.due_at,
          publicUrl: url,
          accentColor: (cl.invoice_accent_color as string) ?? "#E85A2C",
        }),
      }).catch(() => {});
    }
  }

  // Overdue reminders at day 3, 7, 14
  const { data: overdueInvs } = await db
    .from("invoices")
    .select("*, clients(business_name, invoice_accent_color)")
    .eq("status", "overdue");

  for (const inv of overdueInvs ?? []) {
    if (!inv.due_at) continue;
    const cl = inv.clients as Record<string, unknown>;
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_at).getTime()) / (1000 * 60 * 60 * 24));
    if (![3, 7, 14].includes(daysOverdue)) continue;

    const url = `${BASE_URL}/i/${inv.customer_view_token}`;
    if (inv.customer_mobile) {
      await sendWhatsAppMessage(inv.customer_mobile, invoiceReminderWa({
        customerName: inv.customer_name,
        businessName: (cl.business_name as string) ?? "",
        invoiceNumber: inv.invoice_number ?? "",
        totalZar: inv.total_zar,
        dueAt: inv.due_at,
        publicUrl: url,
        daysOverdue,
      })).catch(() => {});
      remindersSent++;
    }
    if (inv.customer_email) {
      await resend.emails.send({
        from: FROM,
        to: [inv.customer_email],
        subject: `Overdue: Invoice ${inv.invoice_number} — ${daysOverdue} days`,
        html: invoiceReminderHtml({
          customerName: inv.customer_name,
          businessName: (cl.business_name as string) ?? "",
          invoiceNumber: inv.invoice_number ?? "",
          totalZar: inv.total_zar,
          dueAt: inv.due_at,
          publicUrl: url,
          daysOverdue,
          accentColor: (cl.invoice_accent_color as string) ?? "#E85A2C",
        }),
      }).catch(() => {});
    }
  }

  results.reminders_sent = remindersSent;

  // ── 3. Process scheduled sends ────────────────────────────────────────────
  const { data: scheduled } = await db
    .from("invoices")
    .select("*, clients(*), invoice_line_items(*)")
    .eq("status", "scheduled")
    .lte("scheduled_send_at", now.toISOString());

  let scheduledProcessed = 0;
  for (const inv of scheduled ?? []) {
    try {
      const res = await fetch(`${BASE_URL}/api/invoices/${inv.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-key": process.env.CRON_SECRET ?? "" },
        body: JSON.stringify({ channels: inv.delivery_channels }),
      });
      if (res.ok) scheduledProcessed++;
    } catch { /* continue */ }
  }
  results.scheduled_processed = scheduledProcessed;

  // ── 4. Layer 1 anti-fraud: uninvoiced completed bookings ──────────────────
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data: uninvoiced } = await db
    .from("bookings")
    .select("id, client_id, customer_name, customer_phone, completed_at, clients(business_name, whatsapp_number)")
    .eq("status", "completed")
    .lt("completed_at", cutoff48h)
    .is("fraud_check_sent", false)
    .not("completed_at", "is", null);

  for (const booking of uninvoiced ?? []) {
    const cl = (booking.clients as unknown) as Record<string, unknown>;
    if (cl?.whatsapp_number) {
      const newInvoiceUrl = `${BASE_URL}/dashboard/invoices/new?booking=${booking.id}`;
      await sendWhatsAppMessage(cl.whatsapp_number as string,
        `You completed a job for ${booking.customer_name} over 48 hours ago and haven't invoiced yet. Need help?\n\nCreate invoice: ${newInvoiceUrl}`
      ).catch(() => {});
    }
    await db.from("bookings").update({ fraud_check_sent: true }).eq("id", booking.id);
  }

  results.uninvoiced_nudges = uninvoiced?.length ?? 0;

  // ── 5. Flag clients with >3 uninvoiced bookings in 14 days ───────────────
  const days14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: atRisk } = await db
    .from("bookings")
    .select("client_id")
    .eq("status", "completed")
    .gte("completed_at", days14)
    .eq("fraud_check_sent", false);

  const clientCounts: Record<number, number> = {};
  for (const b of atRisk ?? []) {
    clientCounts[b.client_id] = (clientCounts[b.client_id] ?? 0) + 1;
  }

  for (const [clientId, count] of Object.entries(clientCounts)) {
    if (count >= 3) {
      try {
        await db.from("clients")
          .update({ risk_flags: db.rpc("array_append_if_not_exists" as string, { arr: "risk_flags", val: "off_platform_invoicing" }) })
          .eq("id", parseInt(clientId));
      } catch { /* ignore — risk flag update is best-effort */ }
    }
  }

  // ── On 1st of month: trigger billing run ─────────────────────────────────
  if (now.getDate() === 1) {
    const billingRes = await fetch(`${BASE_URL}/api/billing/monthly`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.CRON_SECRET}` },
    });
    results.billing_run = billingRes.ok ? "triggered" : "failed";
  }

  return NextResponse.json({ ok: true, date: today, ...results });
}
