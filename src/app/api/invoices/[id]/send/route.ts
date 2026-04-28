import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(s) { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  const { data: invoice } = await db
    .from("invoices")
    .select("*, clients(id, business_name, billing_email), invoice_lines(*)")
    .eq("id", params.id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = invoice.clients as { id: number; business_name: string; billing_email: string } | null;
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const fmtZar = (n: number) =>
    "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  await resend.emails.send({
    from: "Qwikly Billing <billing@qwikly.co.za>",
    to: [client.billing_email ?? "hello@qwikly.co.za"],
    bcc: ["liamclarke21@outlook.com"],
    subject: `Qwikly invoice ${invoice.invoice_number ?? invoice.id.slice(0, 8)} — ${fmtZar(invoice.total_zar)}`,
    html: `<p>Invoice ${invoice.invoice_number} for ${fmtZar(invoice.total_zar)}.</p>
           <p>View at: <a href="https://www.qwikly.co.za/dashboard/invoices/${invoice.id}">qwikly.co.za/dashboard/invoices</a></p>`,
  });

  await db.from("invoices").update({ sent_at: new Date().toISOString(), status: "sent" }).eq("id", params.id);

  await db.from("audit_events").insert({
    actor_id: user.id,
    actor_type: "staff",
    event_type: "invoice.resent",
    entity_type: "invoice",
    entity_id: params.id,
    payload: { client_id: client.id },
  });

  return NextResponse.json({ ok: true });
}
