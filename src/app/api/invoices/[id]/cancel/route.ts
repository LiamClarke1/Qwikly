import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { assertTransition } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { data: clientRow } = await db.from("clients").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (!clientRow) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoice } = await db
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", clientRow.id)
    .maybeSingle();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reason: string = body.reason ?? "Cancelled by client";

  try {
    assertTransition(invoice.status as InvoiceStatus, "cancelled");
  } catch {
    return NextResponse.json({ error: `Cannot cancel invoice with status '${invoice.status}'` }, { status: 400 });
  }

  const now = new Date().toISOString();
  await db.from("invoices").update({
    status: "cancelled",
    cancelled_at: now,
    internal_notes: invoice.internal_notes ? `${invoice.internal_notes}\n\nCANCELLED: ${reason}` : `CANCELLED: ${reason}`,
    updated_at: now,
    updated_by: user.id,
  }).eq("id", params.id);

  // Notify customer if invoice was sent
  if (["sent", "viewed", "partial_paid", "overdue"].includes(invoice.status) && invoice.customer_mobile) {
    sendWhatsAppMessage(invoice.customer_mobile,
      `Hi ${invoice.customer_name}, invoice ${invoice.invoice_number ?? "INV"} from ${clientRow.business_name} for R${invoice.total_zar.toFixed(2)} has been cancelled. ${reason ? `Reason: ${reason}` : ""} Please contact us if you have questions.`
    ).catch(() => {});
  }

  await db.from("audit_events").insert({
    actor_id: user.id,
    actor_type: "user",
    event_type: "invoice.cancelled",
    entity_type: "invoice",
    entity_id: params.id,
    payload: { reason, previous_status: invoice.status },
  });

  return NextResponse.json({ ok: true });
}
