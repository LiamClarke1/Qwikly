import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["verify", "revert", "mark_paid"]),
  payment_method: z.string().optional(),
  external_ref: z.string().optional(),
  admin_note: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.flatten() }, { status: 400 });
  }
  const { action, payment_method, external_ref, admin_note } = parsed.data;

  const sb = supabaseAdmin();

  // Load invoice (include period_id so we can sync the parent period on payment)
  const inv = await sb
    .from("qwikly_billing_invoices")
    .select("id, status, client_id, total_zar, period_id")
    .eq("id", params.id)
    .single();
  if (inv.error || !inv.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "verify" || action === "mark_paid") {
    // verify: only from awaiting_verification (the post-self-confirm path, not used in v1 but ready)
    // mark_paid: from sent / overdue / awaiting_verification (admin saw deposit directly)
    if (action === "verify" && inv.data.status !== "awaiting_verification") {
      return NextResponse.json({ error: "not_awaiting_verification" }, { status: 409 });
    }
    if (action === "mark_paid" && !["sent", "overdue", "awaiting_verification"].includes(inv.data.status)) {
      return NextResponse.json({ error: "invalid_status_transition", from: inv.data.status }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const upd = await sb
      .from("qwikly_billing_invoices")
      .update({
        status: "paid",
        paid_at: nowIso,
        payment_method: payment_method ?? "eft",
        external_ref: external_ref ?? null,
      })
      .eq("id", inv.data.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    // Sync the parent period so /admin/billing (Revenue) reflects the payment.
    // Best-effort: if period_id is missing or update fails, the invoice is still
    // correctly marked paid; revenue summaries will lag until a manual reconcile.
    if (inv.data.period_id) {
      const pUpd = await sb
        .from("qwikly_billing_periods")
        .update({
          status: "paid",
          paid_at: nowIso,
          total_paid_zar: inv.data.total_zar,
        })
        .eq("id", inv.data.period_id);
      if (pUpd.error) console.warn("[admin verify] period sync failed:", pUpd.error.message);
    }

    return NextResponse.json({ ok: true, status: "paid" });
  }

  if (action === "revert") {
    if (inv.data.status !== "awaiting_verification") {
      return NextResponse.json({ error: "not_awaiting_verification" }, { status: 409 });
    }
    const upd = await sb
      .from("qwikly_billing_invoices")
      .update({
        status: "sent",
        client_marked_paid_at: null,
        client_payment_note: admin_note ?? null,
      })
      .eq("id", inv.data.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "sent" });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
