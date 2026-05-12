import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { applySubscriptionToClient } from "@/lib/billing/apply-subscription";
import { sendInvoiceEmail } from "@/lib/notifications/email";
import { sendInvoiceWhatsApp } from "@/lib/notifications/whatsapp";
import { signInvoicePayToken } from "@/lib/invoiceLinks";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

const Body = z.object({
  action: z.enum(["verify", "revert", "mark_paid", "send", "remind"]),
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

  // Load invoice with client contact info for send/remind actions
  const inv = await sb
    .from("qwikly_billing_invoices")
    .select(`
      id, status, client_id, total_zar, period_id, invoice_number, due_at,
      clients (business_name, client_email, whatsapp_number)
    `)
    .eq("id", params.id)
    .single();
  if (inv.error || !inv.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // ── send / remind ───────────────────────────────────────────────────────────
  // "send"   = first delivery of a draft invoice
  // "remind" = re-delivery of a sent/overdue invoice as a payment reminder
  if (action === "send" || action === "remind") {
    const allowedStatuses = action === "send"
      ? ["draft"]
      : ["sent", "overdue", "awaiting_verification"];

    if (!allowedStatuses.includes(inv.data.status)) {
      return NextResponse.json({
        error: "invalid_status_for_action",
        from: inv.data.status,
        allowed: allowedStatuses,
      }, { status: 409 });
    }

    const client = inv.data.clients as unknown as { business_name: string | null; client_email: string | null; whatsapp_number: string | null } | null;
    const businessName = client?.business_name ?? "Customer";
    const email        = client?.client_email ?? null;
    const whatsapp     = client?.whatsapp_number ?? null;

    if (!email && !whatsapp) {
      return NextResponse.json({ error: "no_contact_on_file" }, { status: 422 });
    }

    const nowIso = new Date().toISOString();
    const payUrl = `${BASE_URL}/pay/${signInvoicePayToken(inv.data.id)}`;
    const dueDate = inv.data.due_at ?? nowIso;

    let emailResult: { ok: boolean; error?: string } | null = null;
    let waResult:    { ok: boolean; error?: string } | null = null;

    if (email) {
      const r = await sendInvoiceEmail({
        to: email,
        invoiceId: inv.data.id,
        clientName: businessName,
        invoiceNumber: inv.data.invoice_number ?? "Draft",
        amountZAR: inv.data.total_zar,
        dueDate,
        pdfUrl: payUrl,
      });
      emailResult = { ok: r.ok, error: r.error };
    }

    if (whatsapp) {
      const r = await sendInvoiceWhatsApp({
        toPhone: whatsapp,
        invoiceId: inv.data.id,
        clientName: businessName,
        invoiceNumber: inv.data.invoice_number ?? "Draft",
        amountZAR: inv.data.total_zar,
        dueDate,
        pdfUrl: payUrl,
      });
      waResult = { ok: r.ok, error: r.error };
    }

    const anySuccess = (emailResult?.ok ?? false) || (waResult?.ok ?? false);

    if (anySuccess) {
      await sb.from("qwikly_billing_invoices")
        .update({ status: "sent", sent_at: nowIso })
        .eq("id", inv.data.id);

      // Sync period status to "invoiced" if still open/locked
      if (inv.data.period_id) {
        const { data: period } = await sb
          .from("qwikly_billing_periods")
          .select("status")
          .eq("id", inv.data.period_id)
          .maybeSingle();
        if (period && ["open", "locked"].includes(period.status)) {
          await sb.from("qwikly_billing_periods")
            .update({ status: "invoiced" })
            .eq("id", inv.data.period_id);
        }
      }

      return NextResponse.json({
        ok: true,
        status: "sent",
        email: emailResult,
        whatsapp: waResult,
      });
    }

    return NextResponse.json({
      ok: false,
      error: "all_channels_failed",
      email: emailResult,
      whatsapp: waResult,
    }, { status: 502 });
  }

  // ── mark_paid / verify ──────────────────────────────────────────────────────
  if (action === "verify" || action === "mark_paid") {
    if (action === "verify" && inv.data.status !== "awaiting_verification") {
      return NextResponse.json({ error: "not_awaiting_verification" }, { status: 409 });
    }
    if (action === "mark_paid" && !["draft", "sent", "overdue", "awaiting_verification"].includes(inv.data.status)) {
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

    // Sync parent billing period → paid
    if (inv.data.period_id) {
      await sb.from("qwikly_billing_periods")
        .update({ status: "paid", paid_at: nowIso, total_paid_zar: inv.data.total_zar })
        .eq("id", inv.data.period_id);
    }

    // Extend subscription and re-activate client
    if (inv.data.client_id) {
      const { data: sub } = await sb
        .from("subscriptions")
        .select("id, billing_cycle, current_period_end")
        .eq("client_id", inv.data.client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        const base   = new Date(sub.current_period_end);
        const newEnd = sub.billing_cycle === "annual"
          ? new Date(base.getFullYear() + 1, base.getMonth(), base.getDate())
          : new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());

        await sb.from("subscriptions").update({
          status:               "active",
          current_period_start: sub.current_period_end,
          current_period_end:   newEnd.toISOString(),
        }).eq("id", sub.id);

        try { await applySubscriptionToClient(sub.id); }
        catch (err) { console.warn("[admin mark_paid] applySubscriptionToClient failed:", err); }
      }
    }

    return NextResponse.json({ ok: true, status: "paid" });
  }

  // ── revert ──────────────────────────────────────────────────────────────────
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
