import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { qwiklyBillingInvoiceHtml } from "@/lib/invoices/email";
import { clientBillingReadyWa } from "@/lib/invoices/whatsapp";
import { commission, exVat, toZar, fmt, fmtDate } from "@/lib/money";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

/**
 * Monthly billing run — generates Qwikly commission invoices.
 * Triggered automatically on the 1st of each month from /api/invoices/daily.
 * Can also be called manually for a specific client.
 *
 * Commission = 8% of ex-VAT total of all PAID invoices in the prior calendar month.
 * Partial_paid invoices: commission on the paid portion only.
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
  const dueDate = `${joburg.getFullYear()}-${String(joburg.getMonth() + 1).padStart(2, "0")}-07`;

  // Get all active clients
  let clientQuery = db.from("clients").select("*").eq("billing_active", true);
  if (forceClientId) clientQuery = clientQuery.eq("id", forceClientId);
  const { data: clients } = await clientQuery;

  const results: Array<{ client_id: number; result: string; commission_zar?: number; error?: string }> = [];

  for (const client of clients ?? []) {
    try {
      // Get all paid invoices for the period
      const { data: paidInvoices } = await db
        .from("invoices")
        .select("id, total_zar, amount_paid_zar, vat_zar, status, invoice_number, customer_name")
        .eq("client_id", client.id)
        .in("status", ["paid", "partial_paid"])
        .gte("paid_at", `${periodStart}T00:00:00+02:00`)
        .lte("paid_at", `${periodEnd}T23:59:59+02:00`)
        .eq("qwikly_commission_locked", false);

      if (!paidInvoices?.length) {
        results.push({ client_id: client.id, result: "no_commissionable_invoices" });
        continue;
      }

      // Compute totals
      let totalPaidZar = 0;
      let totalPaidExVat = 0;

      for (const inv of paidInvoices) {
        const paid = inv.amount_paid_zar;
        totalPaidZar = toZar(totalPaidZar + paid);
        // Compute ex-VAT portion of the paid amount
        const vatRate = inv.vat_zar > 0 ? 0.15 : 0;
        const paidExVat = vatRate > 0 ? exVat(paid, vatRate) : paid;
        totalPaidExVat = toZar(totalPaidExVat + paidExVat);
      }

      const commissionRate: number = client.commission_rate ?? 0.08;
      const commissionZar = commission(totalPaidExVat, commissionRate);

      if (commissionZar <= 0) {
        results.push({ client_id: client.id, result: "zero_commission" });
        continue;
      }

      // Check if period already exists
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

      // Create billing period
      const { data: period } = await db.from("qwikly_billing_periods").insert({
        client_id: client.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_invoiced_zar: paidInvoices.reduce((s, i) => toZar(s + i.total_zar), 0),
        total_paid_zar: totalPaidZar,
        total_paid_ex_vat_zar: totalPaidExVat,
        commission_rate: commissionRate,
        commission_zar: commissionZar,
        status: "locked",
        locked_at: now.toISOString(),
        due_at: dueDate,
      }).select().single();

      // Lock invoices so they can't be retro-edited
      await db.from("invoices")
        .update({ qwikly_commission_locked: true, qwikly_billing_invoice_id: null })
        .in("id", paidInvoices.map(i => i.id));

      // Generate billing invoice number: QWK-YYYY-MM-NNNN
      const { data: seqNum } = await db.rpc("nextval", { sequence_name: "qwikly_billing_number_seq" }).maybeSingle();
      const billingInvoiceNumber = `QWK-${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(seqNum ?? Date.now()).padStart(4, "0")}`;

      // Line items snapshot
      const lineItemsSnapshot = paidInvoices.map(inv => ({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        amount_paid_zar: inv.amount_paid_zar,
        commission_zar: commission(inv.vat_zar > 0 ? exVat(inv.amount_paid_zar) : inv.amount_paid_zar, commissionRate),
      }));

      const { data: billingInvoice } = await db.from("qwikly_billing_invoices").insert({
        client_id: client.id,
        period_id: period!.id,
        invoice_number: billingInvoiceNumber,
        total_zar: commissionZar,
        vat_zar: 0, // Qwikly not yet VAT registered
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

      // Update invoices with billing invoice reference
      await db.from("invoices").update({ qwikly_billing_invoice_id: billingInvoice!.id }).in("id", paidInvoices.map(i => i.id));

      const billingUrl = `${BASE_URL}/dashboard/billing/${period!.id}`;
      const periodLabel = new Date(periodStart).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

      // Notify client
      if (client.whatsapp_number) {
        sendWhatsAppMessage(client.whatsapp_number, clientBillingReadyWa({
          businessName: client.business_name ?? "",
          commissionZar,
          periodLabel,
          dueAt: dueDate,
          billingUrl,
        })).catch(() => {});
      }

      const emailTo = client.billing_email ?? client.notification_email;
      if (emailTo) {
        resend.emails.send({
          from: FROM,
          to: [emailTo],
          subject: `Qwikly commission invoice ${billingInvoiceNumber} — ${fmt(commissionZar)} due ${fmtDate(dueDate)}`,
          html: qwiklyBillingInvoiceHtml({
            businessName: client.business_name ?? "",
            billingEmail: emailTo,
            periodStart,
            periodEnd,
            invoiceNumber: billingInvoiceNumber,
            totalPaidZar,
            commissionZar,
            commissionRate,
            dueAt: dueDate,
            billingUrl,
          }),
        }).catch(() => {});
      }

      results.push({ client_id: client.id, result: "invoiced", commission_zar: commissionZar });
    } catch (err) {
      results.push({ client_id: client.id, result: "error", error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, period_start: periodStart, period_end: periodEnd, results });
}
