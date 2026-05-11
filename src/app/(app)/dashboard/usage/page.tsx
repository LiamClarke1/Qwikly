import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getEntitlement } from "@/lib/billing/entitlement";
import { resolvePlan } from "@/lib/plan";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { startingAiGrantZarCents } from "@/lib/billing/grants";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

/**
 * Two-meter usage page driven by `getEntitlement(clientId)`.
 *
 *  - Card 1: leads this month / monthly cap. Includes top-up packs as
 *    headroom and surfaces a "Running low — top up?" CTA at 80% usage.
 *  - Card 2: AI conversation credit wallet (granted + purchased). Surfaces
 *    a "Top up" CTA when the wallet drops below 20% of the plan's starting
 *    grant.
 *
 * Both cards link into the corresponding top-up landing pages
 * (`/dashboard/billing/topup-leads`, `/dashboard/billing/topup-ai`).
 */
export default async function UsagePage() {
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

  // ── Lead meter math ────────────────────────────────────────────────────
  const isUnlimited = ent.leadLimit >= Number.MAX_SAFE_INTEGER;
  const leadPct = isUnlimited
    ? 0
    : Math.min(100, Math.round((ent.leadsThisMonth / Math.max(1, ent.leadLimit)) * 100));
  const leadsRunningLow = !isUnlimited && ent.leadsThisMonth >= 0.8 * ent.leadLimit;

  // ── AI credit meter math ───────────────────────────────────────────────
  const tier = resolvePlan(ent.plan);
  const startingGrantCents = startingAiGrantZarCents(tier);
  const aiTotalRands = ent.aiCreditTotalZarCents / 100;
  const aiGrantedRands = ent.aiCreditGrantedZarCents / 100;
  const aiPurchasedRands = ent.aiCreditPurchasedZarCents / 100;
  const aiPct =
    startingGrantCents > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((ent.aiCreditTotalZarCents / startingGrantCents) * 100)),
        )
      : 0;
  const aiRunningLow =
    startingGrantCents > 0 && ent.aiCreditTotalZarCents < 0.2 * startingGrantCents;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Account"
        title="Usage & credits"
        description="Lead capacity and AI conversation credit for the current period."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Card 1: Leads this month ──────────────────────────────────── */}
        <Card>
          <CardHeader title="Leads this month" />

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-h1 num text-fg leading-none">
              {ent.leadsThisMonth.toLocaleString()}
            </span>
            <span className="text-fg-muted text-small">
              of {isUnlimited ? "Unlimited" : ent.leadLimit.toLocaleString()}
            </span>
          </div>

          {!isUnlimited && (
            <>
              <div
                className="w-full h-2.5 rounded-full bg-surface-input overflow-hidden mb-2"
                role="progressbar"
                aria-valuenow={leadPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    leadPct >= 100
                      ? "bg-danger"
                      : leadPct >= 80
                        ? "bg-warning"
                        : "bg-[var(--accent)]",
                  )}
                  style={{ width: `${leadPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-tiny text-fg-muted">
                <span>{leadPct}% used</span>
                <span>
                  {Math.max(0, ent.leadLimit - ent.leadsThisMonth).toLocaleString()} included left
                </span>
              </div>
            </>
          )}

          {ent.topupLeadsRemaining > 0 && (
            <p className="text-tiny text-fg-muted mt-3">
              <span className="font-medium text-fg">
                {ent.topupLeadsRemaining.toLocaleString()}
              </span>{" "}
              extra lead{ent.topupLeadsRemaining === 1 ? "" : "s"} available from top-up packs.
            </p>
          )}

          {leadsRunningLow && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <p className="text-small text-fg">
                <span className="font-semibold">Running low</span> — top up?
              </p>
              <Link href="/dashboard/billing/topup-leads">
                <Button size="sm">Buy leads</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* ── Card 2: AI conversation credit ────────────────────────────── */}
        <Card>
          <CardHeader title="AI conversation credit" />

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-h1 num text-fg leading-none">
              R
              {aiTotalRands.toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-fg-muted text-small">remaining</span>
          </div>

          {startingGrantCents > 0 && (
            <>
              <div
                className="w-full h-2.5 rounded-full bg-surface-input overflow-hidden mb-2"
                role="progressbar"
                aria-valuenow={aiPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    aiPct < 20
                      ? "bg-danger"
                      : aiPct < 50
                        ? "bg-warning"
                        : "bg-[var(--accent)]",
                  )}
                  style={{ width: `${aiPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-tiny text-fg-muted">
                <span>
                  {aiPct}% of starting grant (R
                  {(startingGrantCents / 100).toLocaleString("en-ZA")})
                </span>
              </div>
            </>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 text-tiny">
            <div>
              <p className="text-fg-subtle font-medium mb-0.5">Granted</p>
              <p className="text-small font-medium text-fg num">
                R
                {aiGrantedRands.toLocaleString("en-ZA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-fg-subtle font-medium mb-0.5">Purchased</p>
              <p className="text-small font-medium text-fg num">
                R
                {aiPurchasedRands.toLocaleString("en-ZA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {aiRunningLow && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <p className="text-small text-fg">
                <span className="font-semibold">Running low</span> — top up?
              </p>
              <Link href="/dashboard/billing/topup-ai">
                <Button size="sm">Top up</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
