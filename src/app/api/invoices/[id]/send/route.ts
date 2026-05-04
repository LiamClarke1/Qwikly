import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { invoiceIssuedHtml } from "@/lib/invoices/email";
import { invoiceIssuedWa, invoiceQwiklyPingWa } from "@/lib/invoices/whatsapp";
import { assertTransition } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();

  // Auth: user session OR internal cron key
  let actorId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientRow: any;

  const cronKey = req.headers.get("x-cron-key");
  if (cronKey && cronKey === process.env.CRON_SECRET) {
    const { data: invRef } = await db.from("invoices").select("client_id").eq("id", params.id).maybeSingle();
    if (!invRef) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const { data: cr } = await db.from("clients").select("*").eq("id", invRef.client_id).maybeSingle();
    if (!cr) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    clientRow = cr;
  } else {
    const cookieStore = cookies();
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    actorId = user.id;
    const { data: cr } = await db.from("clients").select("*").eq("auth_user_id", user.id).maybeSingle();
    if (!cr) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    clientRow = cr;
  }

  if (clientRow.crm_status === "suspended") {
    return NextResponse.json({ error: "Account suspended. Settle your Qwikly balance to resume sending." }, { status: 403 });
  }

  const { data: invoice } = await db
    .from("invoices")
    .select("*, invoice_line_items(*)")
    .eq("id", params.id)
    .eq("client_id", clientRow.id as number)
    .maybeSingle();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentStatus = invoice.status as InvoiceStatus;

  try {
    assertTransition(currentStatus, "sent");
  } catch {
    return NextResponse.json({ error: `Cannot send invoice with status '${currentStatus}'` }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const channels: string[] = body.channels ?? invoice.delivery_channels ?? ["whatsapp", "email"];

  // Assign invoice number if not yet set
  let invoiceNumber = invoice.invoice_number;
  if (!invoiceNumber) {
    const { data: numData } = await db.rpc("next_invoice_number", { p_client_id: clientRow.id });
    invoiceNumber = numData as string;
  }

  const now = new Date().toISOString();
  const publicUrl = `${BASE_URL}/i/${invoice.customer_view_token}`;
  const sentLog: Array<{ channel: string; ts: string; status: string; error?: string }> = [];

  // Send via selected channels
  for (const channel of channels) {
    try {
      if (channel === "whatsapp" && invoice.customer_mobile) {
        const msg = invoiceIssuedWa({
          customerName: invoice.customer_name,
          businessName: clientRow.business_name ?? "Your service provider",
          totalZar: invoice.total_zar,
          dueAt: invoice.due_at ?? now,
          publicUrl,
        });
        await sendWhatsAppMessage(invoice.customer_mobile, msg);
        sentLog.push({ channel: "whatsapp", ts: now, status: "sent" });
      } else if (channel === "email" && invoice.customer_email) {
        const lineItems = (invoice.invoice_line_items ?? []) as Array<{
          description: string;
          quantity: number;
          unit_price_zar: number;
          line_total_zar: number;
        }>;
        await resend.emails.send({
          from: FROM,
          to: [invoice.customer_email],
          subject: `Invoice ${invoiceNumber} from ${clientRow.business_name} — ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(invoice.total_zar)}`,
          html: invoiceIssuedHtml({
            customerName: invoice.customer_name,
            businessName: clientRow.business_name ?? "Your service provider",
            invoiceNumber,
            totalZar: invoice.total_zar,
            dueAt: invoice.due_at ?? now,
            publicUrl,
            lineItems,
            subtotalZar: invoice.subtotal_zar,
            vatZar: invoice.vat_zar,
            paymentTerms: invoice.payment_terms,
            accentColor: (clientRow.invoice_accent_color as string) ?? "#E85A2C",
            footerText: clientRow.invoice_footer_text as string | null,
            bankName: clientRow.bank_name as string | null,
            bankAccount: clientRow.bank_account_number as string | null,
            bankBranch: clientRow.bank_branch_code as string | null,
          }),
        });
        sentLog.push({ channel: "email", ts: now, status: "sent" });
      }
    } catch (err) {
      sentLog.push({ channel, ts: now, status: "failed", error: String(err) });
    }
  }

  // Update invoice status
  await db.from("invoices").update({
    status: "sent",
    invoice_number: invoiceNumber,
    issued_at: now,
    sent_at: now,
    delivery_sent_log: sentLog,
    delivery_channels: channels,
  }).eq("id", params.id);

  // Layer 2: schedule Qwikly confirmation ping to customer (5 min later)
  // For now we send it immediately. In production, queue for +5 min.
  if (invoice.customer_mobile && !invoice.qwikly_ping_sent_at) {
    setTimeout(async () => {
      try {
        const pingMsg = invoiceQwiklyPingWa({
          customerName: invoice.customer_name,
          businessName: clientRow.business_name ?? "your service provider",
          totalZar: invoice.total_zar,
          publicUrl,
        });
        await sendWhatsAppMessage(invoice.customer_mobile, pingMsg);
        await db.from("invoices").update({ qwikly_ping_sent_at: new Date().toISOString() }).eq("id", params.id);
      } catch { /* non-fatal */ }
    }, 5 * 60 * 1000);
  }

  await db.from("audit_events").insert({
    actor_id: actorId,
    actor_type: actorId ? "user" : "cron",
    event_type: "invoice.sent",
    entity_type: "invoice",
    entity_id: params.id,
    payload: { channels, invoice_number: invoiceNumber, sent_log: sentLog },
  });

  return NextResponse.json({ ok: true, invoice_number: invoiceNumber, sent_log: sentLog });
}
