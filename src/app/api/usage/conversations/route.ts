import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { PLAN_CONFIG, resolvePlan } from "@/lib/plan";
import { wholesaleCapForPlan } from "@/lib/pipeline/billing/cap-check";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Per-tenant conversation + API spend summary for the current calendar month.
 * Drives the /dashboard/usage widget. Owner-scoped, never returns another
 * tenant's data.
 *
 * Source tables:
 *   api_usage              - one row per Anthropic call this client made
 *   conversation_credits   - prepaid wallet balance for this client
 *
 * Note: the table that the older /api/usage route (lead-cap) reads is a
 * different concern; this route is purely conversation/API spend.
 */

export async function GET() {
  // Resolve the authenticated user and their client_id from the cookie session.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: clientRow } = await db
    .from("clients")
    .select("id, plan, products")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!clientRow) {
    return NextResponse.json({ error: "no_client" }, { status: 404 });
  }

  const clientId = clientRow.id as number;
  const tier = resolvePlan(clientRow.plan as string | null);
  const planConfig = PLAN_CONFIG[tier];
  const products = (clientRow.products as string[] | null) ?? [];
  const planRaw = (clientRow.plan as string | null) ?? "";

  // First day of the current month, UTC. api_usage rows pre-bucket their
  // billing_period to date_trunc('month', occurred_at), so a simple equality
  // check is enough.
  const now = new Date();
  const billingPeriod = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);

  // Aggregate the current month's billable usage. Internal rows
  // (qwikly own-site = client_id 1) are excluded from the rollup so the
  // owner's view never includes Liam's marketing-site traffic.
  const { data: rows, error: usageErr } = await db
    .from("api_usage")
    .select("conversation_id, retail_cost_zar_cents, wholesale_cost_zar_cents")
    .eq("client_id", clientId)
    .eq("billing_period", billingPeriod)
    .eq("is_internal", false);

  if (usageErr) {
    console.error("[usage/conversations] query failed:", usageErr.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const usageRows = rows ?? [];
  const totalCalls = usageRows.length;
  const totalRetailCents = usageRows.reduce(
    (s, r) => s + (r.retail_cost_zar_cents ?? 0),
    0,
  );
  const totalWholesaleCents = usageRows.reduce(
    (s, r) => s + (r.wholesale_cost_zar_cents ?? 0),
    0,
  );
  // A "conversation" is a unique conversation_id within the month. A single
  // visitor session may produce many api_usage rows (every visitor message
  // = a new call) but counts as one conversation.
  const distinctConversations = new Set(
    usageRows.map((r) => r.conversation_id).filter((id) => id != null),
  ).size;

  // Pull the credit wallet. The auto-provision trigger means every client
  // has a row from signup, so this should always succeed.
  const { data: creditsRow } = await db
    .from("conversation_credits")
    .select(
      "balance_zar_cents, total_topped_up_zar_cents, total_spent_zar_cents, zero_balance_behaviour",
    )
    .eq("client_id", clientId)
    .maybeSingle();

  const credits = creditsRow ?? {
    balance_zar_cents: 0,
    total_topped_up_zar_cents: 0,
    total_spent_zar_cents: 0,
    zero_balance_behaviour: "pause" as const,
  };

  // Compute overage projection. If the tenant has used more conversations
  // than their plan includes AND they have no credits, the next conversation
  // hits the overage rate. This is what the dashboard widget surfaces as
  // "estimated overage at month-end".
  const includedConversations = planConfig.conversationsIncluded;
  const overageConversations = Math.max(
    0,
    distinctConversations - includedConversations,
  );
  const overageCents = overageConversations * planConfig.overageCentsPerConversation;
  const projectedOverageCents = Math.max(0, overageCents - credits.balance_zar_cents);

  // Days remaining in the period for end-of-month calculations.
  const lastDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  );
  const daysRemaining = Math.max(0, lastDay.getUTCDate() - now.getUTCDate());

  // Pipeline (Google Places + Hunter) wholesale spend for the current month.
  // Only relevant for tenants whose products include "outbound" - we still
  // return zeros for everyone so the client can decide whether to render.
  const { data: pipelineRows } = await db
    .from("pipeline_api_usage")
    .select("provider, wholesale_cost_zar_cents")
    .eq("client_id", clientId)
    .eq("billing_period", billingPeriod);

  const byProvider = (pipelineRows ?? []).reduce<Record<string, number>>(
    (acc, r) => {
      const row = r as { provider: string; wholesale_cost_zar_cents: number };
      acc[row.provider] = (acc[row.provider] || 0) + row.wholesale_cost_zar_cents;
      return acc;
    },
    {},
  );
  const pipelineTotalCents = Object.values(byProvider).reduce((a, b) => a + b, 0);
  const pipelineCapCents = wholesaleCapForPlan(planRaw);
  const hasOutbound = products.includes("outbound");

  return NextResponse.json({
    plan: {
      tier,
      name: planConfig.name,
      conversations_included: includedConversations,
      overage_cents_per_conversation: planConfig.overageCentsPerConversation,
    },
    period: {
      billing_period: billingPeriod,
      days_remaining: daysRemaining,
    },
    usage: {
      api_calls: totalCalls,
      conversations: distinctConversations,
      conversations_remaining: Math.max(0, includedConversations - distinctConversations),
      percent_used: includedConversations > 0
        ? Math.min(100, Math.round((distinctConversations / includedConversations) * 100))
        : 0,
      retail_cents: totalRetailCents,
      // Wholesale only included so an admin viewing this can sanity-check
      // margins; we don't show this to the owner directly in the UI.
      wholesale_cents: totalWholesaleCents,
    },
    credits: {
      balance_zar_cents: credits.balance_zar_cents,
      total_topped_up_zar_cents: credits.total_topped_up_zar_cents,
      total_spent_zar_cents: credits.total_spent_zar_cents,
      zero_balance_behaviour: credits.zero_balance_behaviour,
    },
    overage: {
      conversations_over_plan: overageConversations,
      raw_overage_cents: overageCents,
      projected_overage_cents_after_credits: projectedOverageCents,
    },
    pipeline: {
      // Only render the row when the tenant has the outbound product.
      // `cap_cents` is 0 for inbound plans, in which case the UI also hides it.
      enabled: hasOutbound && pipelineCapCents > 0,
      total_wholesale_cents: pipelineTotalCents,
      cap_cents: pipelineCapCents,
      by_provider: {
        google_places: byProvider.google_places ?? 0,
        hunter: byProvider.hunter ?? 0,
      },
    },
  });
}
