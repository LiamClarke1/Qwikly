import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { period_id: string } }
) {
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

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, business_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const note: string | null = body.note ?? null;

  // Load the billing period (verify it belongs to this client)
  const { data: period } = await db
    .from("qwikly_billing_periods")
    .select("id, status, qwikly_billing_invoices (id, invoice_number, total_zar, status)")
    .eq("id", params.period_id)
    .eq("client_id", client.id)
    .maybeSingle();

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inv = Array.isArray(period.qwikly_billing_invoices)
    ? period.qwikly_billing_invoices[0]
    : period.qwikly_billing_invoices;

  if (!inv) return NextResponse.json({ error: "No invoice found for this period" }, { status: 404 });
  if (!["sent", "overdue"].includes(inv.status)) {
    return NextResponse.json({ error: "Invoice is not in a payable state" }, { status: 409 });
  }

  const now = new Date().toISOString();

  // Mark as awaiting_verification
  await db
    .from("qwikly_billing_invoices")
    .update({
      status: "awaiting_verification",
      client_marked_paid_at: now,
      client_payment_note: note,
    })
    .eq("id", inv.id);

  // Notify Liam
  const adminEmail = process.env.ADMIN_EMAIL ?? "liamclarke21@outlook.com";
  if (process.env.RESEND_API_KEY) {
    resend.emails.send({
      from: FROM,
      to: [adminEmail],
      subject: `Payment notification: ${client.business_name} — ${inv.invoice_number ?? period.id}`,
      html: `<p><strong>${client.business_name}</strong> has notified you that they have paid invoice <strong>${inv.invoice_number ?? "(no number)"}</strong>.</p>${note ? `<p>Their note: ${note}</p>` : ""}<p>Log in to the admin panel to verify and mark as paid.</p>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
