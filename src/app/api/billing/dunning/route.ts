import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { resend, FROM } from "@/lib/resend";
import { clientBillingOverdueWa } from "@/lib/invoices/whatsapp";
import { fmt, fmtDate } from "@/lib/money";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

/**
 * Billing dunning — runs daily at 09:00 SAST.
 * Enforces account restrictions based on overdue Qwikly commission invoices.
 *
 * Day +1, +3, +5 after due_at: reminders
 * Day +7:  account → read_only (clients.status = 'paused')
 * Day +14: AI also paused (clients.ai_paused = true)
 * Day +30: account suspended (clients.status = 'churned')
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: overdueBilling } = await db
    .from("qwikly_billing_invoices")
    .select("*, qwikly_billing_periods(client_id, period_start, period_end), clients(id, business_name, whatsapp_number, billing_email, notification_email, status, ai_paused)")
    .eq("status", "sent") // not yet paid
    .lt("due_at", today);

  const results: Array<{ billing_invoice_id: string; days_overdue: number; action: string }> = [];

  for (const bill of overdueBilling ?? []) {
    if (!bill.due_at) continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(bill.due_at).getTime()) / (1000 * 60 * 60 * 24));
    const clientRow = bill.clients as Record<string, unknown>;
    const clientId = (bill.qwikly_billing_periods as Record<string, unknown>)?.client_id as number;
    const billingUrl = `${BASE_URL}/dashboard/billing/${(bill.qwikly_billing_periods as Record<string, unknown>)?.id}`;

    // Mark invoice overdue
    if (daysOverdue >= 1 && bill.status === "sent") {
      await db.from("qwikly_billing_invoices").update({ status: "overdue" }).eq("id", bill.id);
      await db.from("qwikly_billing_periods").update({ status: "overdue" }).eq("id", (bill.qwikly_billing_periods as Record<string, unknown>)?.id);
    }

    // Dunning reminders
    if ([1, 3, 5].includes(daysOverdue) && clientRow.whatsapp_number) {
      await sendWhatsAppMessage(clientRow.whatsapp_number as string, clientBillingOverdueWa({
        businessName: (clientRow.business_name as string) ?? "",
        subscriptionZar: bill.total_zar,
        daysOverdue,
        billingUrl,
      })).catch(() => {});
    }

    // Day 7: read-only mode
    if (daysOverdue >= 7 && clientRow.status !== "paused" && clientRow.status !== "churned") {
      await db.from("clients").update({ status: "paused" }).eq("id", clientId);
      const emailTo = (clientRow.billing_email ?? clientRow.notification_email) as string | null;
      if (emailTo) {
        resend.emails.send({
          from: FROM,
          to: [emailTo],
          subject: `ACTION REQUIRED: Your Qwikly account has been restricted`,
          html: `<p>Hi ${clientRow.business_name},</p>
          <p>Your Qwikly subscription invoice of <strong>${fmt(bill.total_zar)}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
          <p>Your account is now in read-only mode — you cannot send new invoices until this is settled.</p>
          <p><a href="${billingUrl}">View and pay your invoice</a></p>
          <p>Questions? Reply to this email or WhatsApp us at hello@qwikly.co.za.</p>`,
        }).catch(() => {});
      }
      results.push({ billing_invoice_id: bill.id, days_overdue: daysOverdue, action: "account_paused" });
    }

    // Day 14: AI also paused
    if (daysOverdue >= 14 && !clientRow.ai_paused) {
      await db.from("clients").update({ ai_paused: true }).eq("id", clientId);
      if (clientRow.whatsapp_number) {
        sendWhatsAppMessage(clientRow.whatsapp_number as string,
          `URGENT: Your Qwikly subscription is ${daysOverdue} days overdue. Your digital assistant has also been paused. Pay now to restore: ${billingUrl}`
        ).catch(() => {});
      }
      results.push({ billing_invoice_id: bill.id, days_overdue: daysOverdue, action: "ai_paused" });
    }

    // Day 30: account suspended
    if (daysOverdue >= 30 && clientRow.status !== "churned") {
      await db.from("clients").update({ status: "churned", ai_paused: true }).eq("id", clientId);
      const emailTo = (clientRow.billing_email ?? clientRow.notification_email) as string | null;
      if (emailTo) {
        resend.emails.send({
          from: FROM,
          to: [emailTo],
          subject: `Your Qwikly account has been suspended`,
          html: `<p>Hi ${clientRow.business_name},</p>
          <p>Your Qwikly subscription invoice of ${fmt(bill.total_zar)} remains unpaid after 30 days. Your account has been suspended.</p>
          <p>To reinstate your account, please settle the outstanding balance: <a href="${billingUrl}">${billingUrl}</a></p>
          <p>A full data export of your invoices and customer contacts will be emailed within 48 hours.</p>`,
        }).catch(() => {});
      }
      results.push({ billing_invoice_id: bill.id, days_overdue: daysOverdue, action: "account_suspended" });
    }

    if (results.findIndex(r => r.billing_invoice_id === bill.id) === -1) {
      results.push({ billing_invoice_id: bill.id, days_overdue: daysOverdue, action: "reminder_sent" });
    }
  }

  // Re-activate accounts that have paid since last run
  const { data: recentlyPaid } = await db
    .from("qwikly_billing_invoices")
    .select("qwikly_billing_periods(client_id)")
    .eq("status", "paid")
    .gte("paid_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  for (const paid of recentlyPaid ?? []) {
    const cid = ((paid.qwikly_billing_periods as unknown) as Record<string, unknown>)?.client_id;
    if (cid) {
      await db.from("clients").update({ status: "active", ai_paused: false }).eq("id", cid).eq("status", "paused");
    }
  }

  return NextResponse.json({ ok: true, date: today, overdue_checked: overdueBilling?.length ?? 0, actions: results });
}
