import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendInvoiceEmail } from "@/lib/notifications/email";
import { sendInvoiceWhatsApp } from "@/lib/notifications/whatsapp";
import { canTransition } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

async function assertAdmin(): Promise<boolean> {
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
  if (!user) return false;
  const db = supabaseAdmin();
  const { data } = await db.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

interface DraftInvoice {
  id: string;
  client_id: number;
  invoice_number: string | null;
  status: InvoiceStatus;
  customer_name: string;
  customer_email: string | null;
  customer_mobile: string | null;
  customer_view_token: string;
  total_zar: number;
  due_at: string | null;
  delivery_channels: string[] | null;
}

interface SendOutcome {
  invoice_id: string;
  invoice_number: string | null;
  customer_name: string;
  email: { ok: boolean; error?: string } | null;
  whatsapp: { ok: boolean; error?: string } | null;
  status: "sent" | "skipped" | "failed";
  reason?: string;
}

export async function POST() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();

  const { data: drafts, error: draftsErr } = await db
    .from("invoices")
    .select("id, client_id, invoice_number, status, customer_name, customer_email, customer_mobile, customer_view_token, total_zar, due_at, delivery_channels")
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  if (draftsErr) {
    return NextResponse.json({ error: draftsErr.message }, { status: 500 });
  }

  const list = (drafts ?? []) as DraftInvoice[];
  const total = list.length;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const outcomes: SendOutcome[] = [];

  for (const inv of list) {
    if (!canTransition(inv.status, "sent")) {
      skippedCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        email: null,
        whatsapp: null,
        status: "skipped",
        reason: `Cannot transition from ${inv.status}`,
      });
      continue;
    }

    let invoiceNumber = inv.invoice_number;
    if (!invoiceNumber) {
      const { data: numData } = await db.rpc("next_invoice_number", { p_client_id: inv.client_id });
      invoiceNumber = (numData as string | null) ?? null;
    }

    const publicUrl = `${BASE_URL}/i/${inv.customer_view_token}`;
    const now = new Date().toISOString();
    const dueDate = inv.due_at ?? now;
    const channels = inv.delivery_channels ?? ["whatsapp", "email"];

    let emailResult: { ok: boolean; error?: string } | null = null;
    let waResult: { ok: boolean; error?: string } | null = null;
    const sentLog: Array<{ channel: string; ts: string; status: string; error?: string }> = [];

    if (channels.includes("email") && inv.customer_email) {
      const r = await sendInvoiceEmail({
        to: inv.customer_email,
        clientName: inv.customer_name,
        invoiceNumber: invoiceNumber ?? "Draft",
        amountZAR: inv.total_zar,
        dueDate,
        pdfUrl: publicUrl,
      });
      emailResult = { ok: r.ok, error: r.error };
      sentLog.push({ channel: "email", ts: now, status: r.ok ? "sent" : "failed", error: r.error });
    }

    if (channels.includes("whatsapp") && inv.customer_mobile) {
      const r = await sendInvoiceWhatsApp({
        toPhone: inv.customer_mobile,
        clientName: inv.customer_name,
        invoiceNumber: invoiceNumber ?? "Draft",
        amountZAR: inv.total_zar,
        dueDate,
        pdfUrl: publicUrl,
      });
      waResult = { ok: r.ok, error: r.error };
      sentLog.push({ channel: "whatsapp", ts: now, status: r.ok ? "sent" : "failed", error: r.error });
    }

    const anySuccess = (emailResult?.ok ?? false) || (waResult?.ok ?? false);
    const attempted = !!emailResult || !!waResult;

    if (!attempted) {
      skippedCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: invoiceNumber,
        customer_name: inv.customer_name,
        email: emailResult,
        whatsapp: waResult,
        status: "skipped",
        reason: "No email or phone on file",
      });
      continue;
    }

    if (anySuccess) {
      await db.from("invoices").update({
        status: "sent",
        invoice_number: invoiceNumber,
        issued_at: now,
        sent_at: now,
        delivery_sent_log: sentLog,
        delivery_channels: channels,
      }).eq("id", inv.id);

      await db.from("audit_events").insert({
        actor_type: "user",
        event_type: "invoice.sent",
        entity_type: "invoice",
        entity_id: inv.id,
        payload: { source: "bulk_send_all_drafts", invoice_number: invoiceNumber, sent_log: sentLog },
      });

      sentCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: invoiceNumber,
        customer_name: inv.customer_name,
        email: emailResult,
        whatsapp: waResult,
        status: "sent",
      });
    } else {
      // Why: every attempted channel failed, leave status untouched so the admin can retry.
      await db.from("invoices").update({
        delivery_sent_log: sentLog,
      }).eq("id", inv.id);

      failedCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: invoiceNumber,
        customer_name: inv.customer_name,
        email: emailResult,
        whatsapp: waResult,
        status: "failed",
        reason: emailResult?.error ?? waResult?.error ?? "All send channels failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    total,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    outcomes,
  });
}
