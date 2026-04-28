import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend } from "@/lib/resend";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  client_id: z.number().int().positive().optional(),
  period_end: z.string().optional(),
}).optional();

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 0);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 6);

  // Get all billing_active clients (or specific one)
  let query = db
    .from("clients")
    .select("id, business_name, billing_email, billing_active")
    .eq("billing_active", true);

  const rawBody = await req.text();
  if (rawBody) {
    const body = bodySchema.safeParse(JSON.parse(rawBody));
    if (body.success && body.data?.client_id) {
      query = query.eq("id", body.data.client_id);
    }
  }

  const { data: clients, error: clientErr } = await query;
  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 500 });
  }

  const results: Array<{ client_id: number; invoice_id: string | null; error?: string }> = [];

  for (const client of clients ?? []) {
    const { data: pendingCommissions, error: commErr } = await db
      .from("commissions")
      .select("id, amount_zar, booking_id, effective_price_zar")
      .eq("client_id", client.id)
      .eq("status", "pending");

    if (commErr || !pendingCommissions?.length) {
      results.push({ client_id: client.id, invoice_id: null, error: commErr?.message ?? "no_pending" });
      continue;
    }

    const subtotal = pendingCommissions.reduce((s, c) => s + (c.amount_zar ?? 0), 0);
    const total = subtotal;

    // Create invoice
    const { data: invoice, error: invErr } = await db
      .from("invoices")
      .insert({
        client_id: client.id,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        subtotal_zar: subtotal,
        vat_zar: 0,
        total_zar: total,
        status: "draft",
        due_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, invoice_number")
      .single();

    if (invErr || !invoice) {
      results.push({ client_id: client.id, invoice_id: null, error: invErr?.message });
      continue;
    }

    // Create invoice lines
    const lines = pendingCommissions.map((c) => ({
      invoice_id: invoice.id,
      commission_id: c.id,
      booking_id: c.booking_id,
      amount_zar: c.amount_zar,
      description: `8% commission — booking #${c.booking_id ?? "n/a"} (effective price R${c.effective_price_zar})`,
    }));

    await db.from("invoice_lines").insert(lines);

    // Link commissions to invoice and mark as invoiced
    await db
      .from("commissions")
      .update({ status: "invoiced", invoice_id: invoice.id })
      .in("id", pendingCommissions.map((c) => c.id));

    // Mark as sent
    await db
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoice.id);

    // Log audit event
    await db.from("audit_events").insert({
      actor_type: "cron",
      actor_id: "system",
      event_type: "invoice.generated",
      entity_type: "invoice",
      entity_id: invoice.id,
      payload: { client_id: client.id, total_zar: total, lines: lines.length },
    });

    // Send email
    const billingEmail = client.billing_email ?? "hello@qwikly.co.za";
    await resend.emails.send({
      from: "Qwikly Billing <billing@qwikly.co.za>",
      to: [billingEmail],
      bcc: ["liamclarke21@outlook.com"],
      subject: `Your Qwikly invoice ${invoice.invoice_number} — R${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
      html: buildInvoiceEmailHtml({
        businessName: client.business_name ?? "your business",
        invoiceNumber: invoice.invoice_number,
        total,
        subtotal,
        periodStart: periodStart.toLocaleDateString("en-ZA"),
        periodEnd: periodEnd.toLocaleDateString("en-ZA"),
        lines: pendingCommissions.length,
      }),
    });

    results.push({ client_id: client.id, invoice_id: invoice.id });
  }

  return NextResponse.json({ ok: true, generated: results.length, results });
}

function buildInvoiceEmailHtml(d: {
  businessName: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  periodStart: string;
  periodEnd: string;
  lines: number;
}) {
  const fmtZar = (n: number) =>
    "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#F4EEE4;margin:0;padding:40px 20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0d8cd">
    <div style="background:#1C1917;padding:32px 40px">
      <p style="font-size:28px;font-weight:700;color:#fff;margin:0;letter-spacing:-0.03em">
        Qwikly<span style="color:#E85A2C">.</span>
      </p>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:4px 0 0">Billing</p>
    </div>
    <div style="padding:40px">
      <p style="color:#3C3028;font-size:15px;margin:0 0 24px">Hi ${d.businessName},</p>
      <p style="color:#3C3028;font-size:15px;margin:0 0 24px">
        Your weekly Qwikly invoice is ready. Here's the summary for
        ${d.periodStart} – ${d.periodEnd}.
      </p>
      <div style="background:#F4EEE4;border-radius:12px;padding:24px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#7A6E64;font-size:13px">Invoice number</span>
          <span style="color:#1C1917;font-size:13px;font-weight:600">${d.invoiceNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#7A6E64;font-size:13px">Bookings</span>
          <span style="color:#1C1917;font-size:13px">${d.lines}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#7A6E64;font-size:13px">Subtotal</span>
          <span style="color:#1C1917;font-size:13px">${fmtZar(d.subtotal)}</span>
        </div>
        <div style="border-top:1px solid #D4C9BA;margin:16px 0"></div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#1C1917;font-size:15px;font-weight:700">Total due</span>
          <span style="color:#E85A2C;font-size:20px;font-weight:700">${fmtZar(d.total)}</span>
        </div>
      </div>
      <p style="color:#7A6E64;font-size:13px;line-height:1.6;margin:0 0 24px">
        Payment will be debited automatically on Wednesday at 10:00 SAST.
        View the full invoice in your dashboard at
        <a href="https://www.qwikly.co.za/dashboard/invoices" style="color:#E85A2C">qwikly.co.za/dashboard/invoices</a>.
      </p>
      <p style="color:#7A6E64;font-size:13px">Questions? Reply to this email or WhatsApp us.</p>
    </div>
    <div style="background:#F4EEE4;padding:20px 40px;text-align:center">
      <p style="color:#A89E94;font-size:11px;margin:0">
        © ${new Date().getFullYear()} Qwikly (Clarke Agency) · Johannesburg, South Africa ·
        <a href="https://www.qwikly.co.za/legal/privacy" style="color:#A89E94">Privacy</a>
      </p>
    </div>
  </div>
</body></html>`;
}
