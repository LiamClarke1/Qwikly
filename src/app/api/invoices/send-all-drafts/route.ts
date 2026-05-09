import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendInvoiceEmail } from "@/lib/notifications/email";
import { sendInvoiceWhatsApp } from "@/lib/notifications/whatsapp";
import { signInvoicePayToken } from "@/lib/invoiceLinks";

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

interface QwiklyDraft {
  id: string;
  client_id: number;
  invoice_number: string | null;
  status: string;
  total_zar: number;
  due_at: string | null;
  clients: {
    business_name: string | null;
    client_email: string | null;
    whatsapp_number: string | null;
  } | null;
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

  // Read drafts from the Qwikly subscription billing table, joining clients for
  // contact info. The legacy `invoices` table is for client-to-customer billing
  // and is intentionally not part of this route.
  const { data: drafts, error: draftsErr } = await db
    .from("qwikly_billing_invoices")
    .select("id, client_id, invoice_number, status, total_zar, due_at, clients(business_name, client_email, whatsapp_number)")
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  if (draftsErr) {
    return NextResponse.json({ error: draftsErr.message }, { status: 500 });
  }

  const list = (drafts ?? []) as unknown as QwiklyDraft[];
  const total = list.length;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const outcomes: SendOutcome[] = [];

  for (const inv of list) {
    const businessName = inv.clients?.business_name ?? "Customer";
    const email = inv.clients?.client_email ?? null;
    const whatsapp = inv.clients?.whatsapp_number ?? null;

    if (!email && !whatsapp) {
      skippedCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: businessName,
        email: null,
        whatsapp: null,
        status: "skipped",
        reason: "No email or whatsapp on file for this client",
      });
      continue;
    }

    const invoiceNumber = inv.invoice_number;
    const now = new Date().toISOString();
    const dueDate = inv.due_at ?? now;

    // Generate the signed pay link once. Both email and WhatsApp templates use
    // it so the customer has a single click-to-confirm path either way.
    const payUrl = `${BASE_URL}/pay/${signInvoicePayToken(inv.id)}`;

    let emailResult: { ok: boolean; error?: string } | null = null;
    let waResult: { ok: boolean; error?: string } | null = null;

    if (email) {
      const r = await sendInvoiceEmail({
        to: email,
        invoiceId: inv.id,
        clientName: businessName,
        invoiceNumber: invoiceNumber ?? "Draft",
        amountZAR: inv.total_zar,
        dueDate,
        pdfUrl: payUrl,
      });
      emailResult = { ok: r.ok, error: r.error };
    }

    if (whatsapp) {
      const r = await sendInvoiceWhatsApp({
        toPhone: whatsapp,
        invoiceId: inv.id,
        clientName: businessName,
        invoiceNumber: invoiceNumber ?? "Draft",
        amountZAR: inv.total_zar,
        dueDate,
        pdfUrl: payUrl,
      });
      waResult = { ok: r.ok, error: r.error };
    }

    const anySuccess = (emailResult?.ok ?? false) || (waResult?.ok ?? false);

    if (anySuccess) {
      await db.from("qwikly_billing_invoices")
        .update({ status: "sent", sent_at: now })
        .eq("id", inv.id);

      sentCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: invoiceNumber,
        customer_name: businessName,
        email: emailResult,
        whatsapp: waResult,
        status: "sent",
      });
    } else {
      // Every attempted channel failed; leave status as draft so admin can retry.
      failedCount += 1;
      outcomes.push({
        invoice_id: inv.id,
        invoice_number: invoiceNumber,
        customer_name: businessName,
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
