import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getEntitlement } from "@/lib/billing/entitlement";
import { resolvePlan, PLAN_CONFIG, startingGrantZarCents } from "@/lib/plan";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

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

  // ── Lead meter ─────────────────────────────────────────────────────────
  const isUnlimited = ent.leadLimit >= Number.MAX_SAFE_INTEGER;
  const leadPct = isUnlimited
    ? 0
    : Math.min(100, Math.round((ent.leadsThisMonth / Math.max(1, ent.leadLimit)) * 100));
  const leadsRunningLow = !isUnlimited && ent.leadsThisMonth >= 0.8 * ent.leadLimit;

  // ── Conversation meter ─────────────────────────────────────────────────
  const now = new Date();
  const billingPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const { data: convRows } = await db
    .from("api_usage")
    .select("conversation_id")
    .eq("client_id", clientId)
    .eq("billing_period", billingPeriod)
    .eq("is_internal", false)
    // exclude the zero-cost dedup marker rows inserted by the pause notifier
    .neq("source", "convo_cap_notification");

  const conversationsThisMonth = new Set(
    (convRows ?? []).map((r) => (r as { conversation_id: string | number | null }).conversation_id).filter((id) => id != null),
  ).size;

  const tier = resolvePlan(ent.plan);
  const planCfg = PLAN_CONFIG[tier];
  const conversationsIncluded = planCfg.conversationsIncluded;
  const isConvUnlimited = conversationsIncluded >= Number.MAX_SAFE_INTEGER;

  const convPct = isConvUnlimited
    ? 0
    : Math.min(100, Math.round((conversationsThisMonth / Math.max(1, conversationsIncluded)) * 100));
  const convRemaining = Math.max(0, conversationsIncluded - conversationsThisMonth);

  // Paused = at or over the conversation cap AND no AI credit balance left
  const isPaused =
    !isConvUnlimited &&
    conversationsThisMonth >= conversationsIncluded &&
    ent.aiCreditTotalZarCents <= 0;

  // Running low = 80%+ of conversations used (but not yet fully paused)
  const convRunningLow = !isConvUnlimited && !isPaused && convPct >= 80;

  // First day of next month for the reset date label
  const resetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resetLabel = resetDate.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Johannesburg",
  });

  // Legacy AI credit meter math (kept for the detail breakdown)
  const startingGrantCents = startingGrantZarCents(tier);
  const aiGrantedRands = ent.aiCreditGrantedZarCents / 100;
  const aiPurchasedRands = ent.aiCreditPurchasedZarCents / 100;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Account"
        title="Usage & capacity"
        description="Lead and conversation capacity for the current billing period."
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

        {/* ── Card 2: Conversations this month ──────────────────────────── */}
        <Card className={isPaused ? "border-danger/40 bg-danger/5" : undefined}>
          <CardHeader title="Conversations this month" />

          {/* Paused state banner */}
          {isPaused && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/25">
              <p className="text-small font-semibold text-danger mb-0.5">
                Your assistant is paused
              </p>
              <p className="text-tiny text-fg-muted leading-relaxed">
                Your plan&apos;s conversation limit is reached and your extra credit is spent.
                Add conversation credit or upgrade to reactivate.
              </p>
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-h1 num text-fg leading-none">
              {conversationsThisMonth.toLocaleString()}
            </span>
            <span className="text-fg-muted text-small">
              of {isConvUnlimited ? "Unlimited" : conversationsIncluded.toLocaleString()}
            </span>
          </div>

          {!isConvUnlimited && (
            <>
              <div
                className="w-full h-2.5 rounded-full bg-surface-input overflow-hidden mb-2"
                role="progressbar"
                aria-valuenow={convPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isPaused || convPct >= 100
                      ? "bg-danger"
                      : convPct >= 80
                        ? "bg-warning"
                        : "bg-[var(--accent)]",
                  )}
                  style={{ width: `${Math.min(convPct, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-tiny text-fg-muted">
                <span>{convPct}% used</span>
                <span>
                  {isPaused ? "Limit reached" : `${convRemaining.toLocaleString()} remaining`}
                </span>
              </div>
            </>
          )}

          {/* Extra credit balance (only show when there is purchased credit) */}
          {ent.aiCreditPurchasedZarCents > 0 && (
            <p className="text-tiny text-fg-muted mt-3">
              <span className="font-medium text-fg">
                R{aiPurchasedRands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>{" "}
              extra conversation credit available.
            </p>
          )}

          {/* Monthly reset note */}
          <p className="text-tiny text-fg-subtle mt-3">
            Resets {resetLabel}
          </p>

          {/* Paused: show upgrade + top-up options */}
          {isPaused && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
              <Link href="/dashboard/settings/billing">
                <Button size="sm" variant="primary">Upgrade plan</Button>
              </Link>
              <Link href="/dashboard/billing/topup-ai">
                <Button size="sm" variant="outline">Add conversations</Button>
              </Link>
            </div>
          )}

          {/* Running low: nudge to top up */}
          {convRunningLow && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <p className="text-small text-fg">
                <span className="font-semibold">Running low</span> — add more?
              </p>
              <Link href="/dashboard/billing/topup-ai">
                <Button size="sm">Add conversations</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
