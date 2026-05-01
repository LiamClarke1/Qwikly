import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { qwiklyBillingInvoiceHtml } from "@/lib/invoices/email";
import { clientBillingReadyWa } from "@/lib/invoices/whatsapp";
import { toZar, fmt, fmtDate } from "@/lib/money";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

const PLAN_PRICES: Record<string, number> = {
  lite: 399,
  pro: 799,
  business: 1499,
};

/**
 * Monthly billing run — generates Qwikly subscription invoices.
 * Triggered automatically on the 1st of each month from /api/invoices/daily.
 * Can also be called manually for a specific client.
 *
 * Billing = flat monthly subscription fee based on client plan (lite/pro/business).
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const forceClientId: number | null = body.client_id ?? null;

  const db = supabaseAdmin();
  const now = new Date();

  // Billing period = prior calendar month in Africa/Johannesburg (UTC+2)
  const joburg = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const periodYear = joburg.getMonth() === 0 ? joburg.getFullYear() - 1 : joburg.getFullYear();
  const periodMonth = joburg.getMonth() === 0 ? 12 : joburg.getMonth(); // 1-indexed
  const periodStart = `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(periodYear, periodMonth, 0).getDate();
  const periodEnd = `${periodYear}-${String(periodMonth).padStart(2, "0")}-${lastDay}`;
  const dueDate = `${joburg.getFullYear()}-${String(joburg.getMonth() + 1).padStart(2, "0")}-14`;

  // Get all active clients
  let clientQuery = db.from("clients").select("*").eq("billing_active", true);
  if (forceClientId) clientQuery = clientQuery.eq("id", forceClientId);
  const { data: clients } = await clientQuery;

  const results: Array<{ client_id: number; result: string; subscription_zar?: number; error?: string }> = [];

  for (const client of clients ?? []) {
    try {
      // Resolve flat subscription fee from client plan
      const plan: string = client.plan ?? "pro";
      const subscriptionZar: number = toZar(PLAN_PRICES[plan] ?? PLAN_PRICES.pro);

      // Check if period already exists for this month
      const { data: existingPeriod } = await db
        .from("qwikly_billing_periods")
        .select("id")
        .eq("client_id", client.id)
        .eq("period_start", periodStart)
        .maybeSingle();

      if (existingPeriod) {
        results.push({ client_id: client.id, result: "period_already_exists" });
        continue;
      }

      // Create billing period — reuse commission_zar column to store subscription fee
      const { data: period } = await db.from("qwikly_billing_periods").insert({
        client_id: client.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_invoiced_zar: 0,
        total_paid_zar: 0,
        total_paid_ex_vat_zar: 0,
        commission_rate: 0,
        commission_zar: subscriptionZar,
        status: "locked",
        locked_at: now.toISOString(),
        due_at: dueDate,
      }).select().single();

      // Generate billing invoice number: QWK-YYYY-MM-NNNN
      const { data: seqNum } = await db.rpc("nextval", { sequence_name: "qwikly_billing_number_seq" }).maybeSingle();
      const billingInvoiceNumber = `QWK-${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(seqNum ?? Date.now()).padStart(4, "0")}`;

      const lineItemsSnapshot = [{
        description: `Qwikly ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan — ${new Date(periodStart).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`,
        amount_zar: subscriptionZar,
      }];

      const { data: billingInvoice } = await db.from("qwikly_billing_invoices").insert({
        client_id: client.id,
        period_id: period!.id,
        invoice_number: billingInvoiceNumber,
        total_zar: subscriptionZar,
        vat_zar: 0,
        status: "sent",
        due_at: dueDate,
        sent_at: now.toISOString(),
        line_items_jsonb: lineItemsSnapshot,
      }).select().single();

      // Link billing invoice back to period
      await db.from("qwikly_billing_periods").update({
        status: "invoiced",
        qwikly_billing_invoice_id: billingInvoice!.id,
      }).eq("id", period!.id);

      const billingUrl = `${BASE_URL}/dashboard/billing/${period!.id}`;
      const periodLabel = new Date(periodStart).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

      // Notify client via WhatsApp
      if (client.whatsapp_number) {
        sendWhatsAppMessage(client.whatsapp_number, clientBillingReadyWa({
          businessName: client.business_name ?? "",
          subscriptionZar,
          plan,
          periodLabel,
          dueAt: dueDate,
          billingUrl,
        })).catch(() => {});
      }

      // Notify client via email
      const emailTo = client.billing_email ?? client.notification_email;
      if (emailTo) {
        resend.emails.send({
          from: FROM,
          to: [emailTo],
          subject: `Qwikly subscription invoice ${billingInvoiceNumber} — ${fmt(subscriptionZar)} due ${fmtDate(dueDate)}`,
          html: qwiklyBillingInvoiceHtml({
            businessName: client.business_name ?? "",
            billingEmail: emailTo,
            periodStart,
            periodEnd,
            invoiceNumber: billingInvoiceNumber,
            plan,
            subscriptionZar,
            dueAt: dueDate,
            billingUrl,
          }),
        }).catch(() => {});
      }

      results.push({ client_id: client.id, result: "invoiced", subscription_zar: subscriptionZar });
    } catch (err) {
      results.push({ client_id: client.id, result: "error", error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, period_start: periodStart, period_end: periodEnd, results });
}
