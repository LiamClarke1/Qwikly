import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getEntitlement } from "@/lib/billing/entitlement";
import { PLAN_CONFIG, resolvePlan, annualPrice } from "@/lib/plan";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { fmt, fmtDateLong } from "@/lib/money";
import {
  UpgradeButton,
  DowngradeButton,
  CancelButton,
  UpdateCardButton,
  UndoPendingButton,
} from "./_components/billing-actions";

export const dynamic = "force-dynamic";

/**
 * Server-rendered billing settings page. Reads the single-source-of-truth
 * `getEntitlement(clientId)` snapshot and renders four core surfaces:
 *
 *   1. Current plan card (name, monthly price, period end)
 *   2. Pending changes card — only when `pendingPlan` is set or
 *      `cancelAtPeriodEnd` is true. Shows the scheduled change and an
 *      "Undo" button wired to /api/payfast/undo-pending.
 *   3. Action buttons — Upgrade / Downgrade / Cancel / Update payment
 *      method. Each routes through a PayFast adhoc endpoint that returns
 *      a hosted-checkout `url` and we redirect the browser there.
 *   4. Plain explanatory text for cancellation policy.
 *
 * The page itself stays a server component so the entitlement snapshot is
 * resolved with zero client-side round-trips; the buttons are tiny client
 * components colocated in `./_components/billing-actions.tsx`.
 */
export default async function BillingSettingsPage() {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!client) redirect("/dashboard/setup");

  const clientId = (client as { id: number }).id;
  const ent = await getEntitlement(clientId);

  const tier = resolvePlan(ent.plan);
  const cfg = PLAN_CONFIG[tier];
  const monthlyPrice = cfg.priceMonthly;
  const yearlyPrice = annualPrice(monthlyPrice);

  // Only show pending banner if there's actually something scheduled.
  const hasPendingPlan = !!ent.pendingPlan && ent.pendingPlan !== ent.plan;
  const hasPendingCancel = ent.cancelAtPeriodEnd;
  const showPending = hasPendingPlan || hasPendingCancel;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="Manage your subscription, payment method, and pending changes."
      />

      {/* Pending changes banner */}
      {showPending && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader
            title={
              hasPendingCancel ? "Subscription scheduled to cancel" : "Plan change scheduled"
            }
            description={
              hasPendingCancel
                ? `Your subscription cancels at the end of the current period${ent.periodEnd ? ` on ${fmtDateLong(ent.periodEnd)}` : ""}. You keep access until then.`
                : `Your plan switches to ${planLabel(ent.pendingPlan)} at the end of the current period${ent.periodEnd ? ` on ${fmtDateLong(ent.periodEnd)}` : ""}.`
            }
            action={<UndoPendingButton />}
          />
        </Card>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader
          title={cfg.name}
          description={`Subscription status: ${ent.status}`}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-display-2 font-display text-fg leading-none">
              {fmt(monthlyPrice)}
              <span className="text-small text-fg-muted font-normal">/mo</span>
            </p>
            <p className="text-tiny text-fg-muted mt-1.5">
              Annual: {fmt(yearlyPrice)}/yr (save 15%)
            </p>
          </div>
          {ent.periodEnd && (
            <div className="text-right">
              <p className="text-tiny text-fg-subtle uppercase tracking-wider font-semibold mb-0.5">
                Period ends
              </p>
              <p className="text-small text-fg font-medium">
                {fmtDateLong(ent.periodEnd)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Action buttons */}
      <Card>
        <CardHeader title="Manage subscription" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UpgradeButton />
          <DowngradeButton />
          <UpdateCardButton />
          <CancelButton periodEnd={ent.periodEnd?.toISOString() ?? null} />
        </div>
        <p className="text-tiny text-fg-muted mt-4 leading-relaxed">
          Upgrades take effect immediately with a prorated charge for the rest
          of the cycle. Downgrades and cancellations apply at the end of the
          current period — you keep your features until then.
        </p>
      </Card>

      <p className="text-tiny text-fg-subtle pb-2">
        Questions about your bill?{" "}
        <a href="mailto:billing@qwikly.co.za" className="text-brand hover:underline">
          Contact billing support
        </a>
      </p>
    </div>
  );
}

function planLabel(plan: string | null): string {
  if (!plan) return "another plan";
  try {
    return PLAN_CONFIG[resolvePlan(plan)].name;
  } catch {
    return plan;
  }
}
