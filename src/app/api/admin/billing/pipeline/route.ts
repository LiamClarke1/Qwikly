import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { todaySast, nextAnchorDate, daysUntilNextAnchor } from "@/lib/billing/anchor";
import { getPlanPricesZarCents } from "@/lib/billing/plan-prices";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = supabaseAdmin();
  const today = todaySast();

  // Active clients with anchor day set
  const clientsRes = await sb
    .from("clients")
    .select("id, business_name, billing_anchor_day, mrr_zar, plan, crm_status")
    .not("billing_anchor_day", "is", null)
    .not("crm_status", "in", "(churned,paused,pending_deletion)");

  if (clientsRes.error) {
    return NextResponse.json({ error: clientsRes.error.message }, { status: 500 });
  }

  // Fetch the plan-price map once, the rest of the loop is sync.
  const planPriceMap = await getPlanPricesZarCents();

  const allUpcoming = (clientsRes.data ?? [])
    .map(c => {
      const anchor = c.billing_anchor_day as number;
      const days = daysUntilNextAnchor(anchor, today);
      // Effective MRR: real mrr_zar wins, otherwise fall back to plan_prices.
      // Trials always resolve to 0 (correct, they don't pay).
      const effectiveCents =
        c.mrr_zar && c.mrr_zar > 0
          ? c.mrr_zar
          : (c.plan ? (planPriceMap[c.plan] ?? 0) : 0);
      return {
        client_id: c.id,
        business_name: c.business_name,
        days_until: days,
        next_anchor: nextAnchorDate(anchor, today).toISOString().slice(0, 10),
        estimated_amount_zar: effectiveCents / 100,
        plan: c.plan,
        // Flag so the UI can mark estimates that came from plan_prices,
        // not from a real mrr_zar value, as approximate.
        amount_is_estimated: !c.mrr_zar || c.mrr_zar <= 0,
      };
    })
    .sort((a, b) => a.days_until - b.days_until);

  const upcoming = allUpcoming.filter(c => c.days_until <= 14);

  // Awaiting verification
  const awaitingRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, client_marked_paid_at, client_payment_note, client_id, clients(business_name), proof_storage_path, proof_uploaded_at, proof_mime_type, proof_validation_status, proof_validation_extracted, proof_validation_notes, proof_validated_at")
    .eq("status", "awaiting_verification")
    .order("client_marked_paid_at", { ascending: true });

  // Overdue
  const overdueRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, due_at, sent_at, client_id, clients(business_name)")
    .eq("status", "overdue")
    .order("due_at", { ascending: true });

  // Paid this calendar month (UTC month, good enough for grouping)
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString();
  const paidRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, paid_at, client_id, clients(business_name)")
    .eq("status", "paid")
    .gte("paid_at", monthStart)
    .order("paid_at", { ascending: false });

  // Drafts (Task 6 cron creates these; admin sends from /admin/invoicing)
  const draftsRes = await sb
    .from("qwikly_billing_invoices")
    .select("id, invoice_number, total_zar, created_at, client_id, clients(business_name)")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  // Generate 1-hour signed URLs for proof attachments on awaiting rows
  const awaitingRows = awaitingRes.data ?? [];
  const awaitingWithProof = await Promise.all(
    awaitingRows.map(async (row) => {
      if (!row.proof_storage_path) {
        return { ...row, proof_signed_url: null };
      }
      const { data: signed } = await sb.storage
        .from("payment-proofs")
        .createSignedUrl(row.proof_storage_path, 3600);
      return { ...row, proof_signed_url: signed?.signedUrl ?? null };
    })
  );

  const forecast7 = allUpcoming.filter(u => u.days_until <= 7).reduce((s, u) => s + u.estimated_amount_zar, 0);
  const forecast30 = allUpcoming.filter(u => u.days_until <= 30).reduce((s, u) => s + u.estimated_amount_zar, 0);

  return NextResponse.json({
    today: today.toISOString().slice(0, 10),
    summary: {
      forecast_7d_zar: forecast7,
      forecast_30d_zar: forecast30,
      awaiting_count: (awaitingRes.data ?? []).length,
      overdue_count: (overdueRes.data ?? []).length,
      drafts_count: (draftsRes.data ?? []).length,
    },
    upcoming,
    awaiting_verification: awaitingWithProof,
    overdue: overdueRes.data ?? [],
    paid_this_month: paidRes.data ?? [],
    drafts: draftsRes.data ?? [],
  });
}
