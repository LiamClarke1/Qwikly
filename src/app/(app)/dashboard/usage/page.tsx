"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Activity, Wallet, AlertTriangle, Pause, Zap, RefreshCw, Info, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

type UsageResponse = {
  plan: {
    tier: string;
    name: string;
    conversations_included: number;
    overage_cents_per_conversation: number;
  };
  period: {
    billing_period: string;
    days_remaining: number;
  };
  usage: {
    api_calls: number;
    conversations: number;
    conversations_remaining: number;
    percent_used: number;
    retail_cents: number;
    wholesale_cents: number;
  };
  credits: {
    balance_zar_cents: number;
    total_topped_up_zar_cents: number;
    total_spent_zar_cents: number;
    zero_balance_behaviour: "pause" | "overage";
  };
  overage: {
    conversations_over_plan: number;
    raw_overage_cents: number;
    projected_overage_cents_after_credits: number;
  };
  pipeline?: {
    enabled: boolean;
    total_wholesale_cents: number;
    cap_cents: number;
    by_provider: {
      google_places: number;
      hunter: number;
    };
  };
};

function fmtRand(cents: number): string {
  if (cents === 0) return "R0";
  return `R${(cents / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtMonth(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

export default function UsagePage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage/conversations", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Could not load usage");
        setData(null);
      } else {
        setData(json as UsageResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl">
        <PageHeader title="Usage & credits" description="Loading..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-5xl">
        <PageHeader title="Usage & credits" description="Conversation usage and credit balance for the current month." />
        <Card className="p-6 mt-4 border-danger/30 bg-danger/5">
          <p className="text-small text-danger">{error || "No data"}</p>
        </Card>
      </div>
    );
  }

  const pct = data.usage.percent_used;
  const overCap = data.usage.conversations > data.plan.conversations_included;
  const balanceColor = data.credits.balance_zar_cents > 0 ? "text-success" : "text-fg-muted";

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Usage & credits"
        description={`Conversation usage for ${fmtMonth(data.period.billing_period)} on the ${data.plan.name} plan. Resets on the 1st.`}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversations used this month */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[var(--accent)]" />
              <span className="text-tiny font-semibold text-fg-subtle uppercase tracking-wider">Conversations this month</span>
            </div>
            <Button variant="ghost" size="sm" onClick={load}>
              <RefreshCw className="size-3.5 mr-1.5" /> Refresh
            </Button>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-h1 num text-fg leading-none">{data.usage.conversations.toLocaleString()}</span>
            <span className="text-fg-muted text-small">of {data.plan.conversations_included.toLocaleString()} included</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-surface-input overflow-hidden mb-2">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overCap ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-[var(--accent)]",
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-tiny text-fg-muted">
            <span>{pct}% used</span>
            <span>
              {data.usage.conversations_remaining > 0
                ? `${data.usage.conversations_remaining.toLocaleString()} included left`
                : `${data.overage.conversations_over_plan.toLocaleString()} over plan`}
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-tiny text-fg-subtle font-medium mb-0.5">Resets in</p>
              <p className="text-small font-medium text-fg">{data.period.days_remaining} days</p>
            </div>
            <div>
              <p className="text-tiny text-fg-subtle font-medium mb-0.5">API calls (total)</p>
              <p className="text-small font-medium text-fg">{data.usage.api_calls.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-tiny text-fg-subtle font-medium mb-0.5">Overage rate</p>
              <p className="text-small font-medium text-fg">{fmtRand(data.plan.overage_cents_per_conversation)} / convo</p>
            </div>
          </div>
        </Card>

        {/* Credit wallet */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="size-4 text-[var(--accent)]" />
            <span className="text-tiny font-semibold text-fg-subtle uppercase tracking-wider">Top-up credits</span>
          </div>

          <p className={cn("text-h1 num leading-none mb-2", balanceColor)}>
            {fmtRand(data.credits.balance_zar_cents)}
          </p>
          <p className="text-tiny text-fg-muted mb-5">Current balance</p>

          <a
            href="/contact?subject=topup"
            className="block w-full h-10 rounded-xl bg-ember text-paper text-small font-semibold flex items-center justify-center hover:brightness-95 cursor-pointer transition-all"
          >
            Top up via EFT
          </a>
          <p className="text-tiny text-fg-muted mt-2 leading-relaxed">
            Self-serve via card coming soon. For now: email us, pay by EFT, credits land on your account same day.
          </p>

          <div className="mt-5 pt-4 border-t border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-tiny">
              <span className="text-fg-subtle">Lifetime topped up</span>
              <span className="font-medium text-fg num">{fmtRand(data.credits.total_topped_up_zar_cents)}</span>
            </div>
            <div className="flex items-center justify-between text-tiny">
              <span className="text-fg-subtle">Lifetime spent</span>
              <span className="font-medium text-fg num">{fmtRand(data.credits.total_spent_zar_cents)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline data spend - outbound-only tenants */}
      {data.pipeline?.enabled && (
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-[var(--accent)]" />
              <span className="text-tiny font-semibold text-fg-subtle uppercase tracking-wider">
                Pipeline data (Google Places + Hunter)
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-h1 num text-fg leading-none">
              {fmtRand(data.pipeline.total_wholesale_cents)}
            </span>
            <span className="text-fg-muted text-small">
              of {fmtRand(data.pipeline.cap_cents)} monthly cap
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-surface-input overflow-hidden mb-2">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                (() => {
                  const cap = data.pipeline.cap_cents;
                  const used = data.pipeline.total_wholesale_cents;
                  const pctPipeline = cap > 0 ? (used / cap) * 100 : 0;
                  if (pctPipeline >= 100) return "bg-danger";
                  if (pctPipeline > 80) return "bg-warning";
                  return "bg-[var(--accent)]";
                })(),
              )}
              style={{
                width: `${Math.min(
                  100,
                  data.pipeline.cap_cents > 0
                    ? (data.pipeline.total_wholesale_cents / data.pipeline.cap_cents) * 100
                    : 0,
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-tiny text-fg-muted mb-4">
            <span>
              {data.pipeline.cap_cents > 0
                ? `${Math.min(
                    100,
                    Math.round(
                      (data.pipeline.total_wholesale_cents / data.pipeline.cap_cents) * 100,
                    ),
                  )}% of cap used`
                : "No cap set"}
            </span>
            <span>
              {Math.max(0, data.pipeline.cap_cents - data.pipeline.total_wholesale_cents) > 0
                ? `${fmtRand(
                    data.pipeline.cap_cents - data.pipeline.total_wholesale_cents,
                  )} left`
                : `Cap reached`}
            </span>
          </div>

          <div className="pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4">
            <div>
              <p className="text-tiny text-fg-subtle font-medium mb-0.5">Google Places</p>
              <p className="text-small font-medium text-fg num">
                {fmtRand(data.pipeline.by_provider.google_places)}
              </p>
            </div>
            <div>
              <p className="text-tiny text-fg-subtle font-medium mb-0.5">Hunter</p>
              <p className="text-small font-medium text-fg num">
                {fmtRand(data.pipeline.by_provider.hunter)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Overage / pause callout */}
      {overCap && (
        <Card
          className={cn(
            "p-5 mt-4 flex items-start gap-3",
            data.overage.projected_overage_cents_after_credits > 0
              ? "border-danger/30 bg-danger/5"
              : "border-warning/30 bg-warning/5",
          )}
        >
          {data.overage.projected_overage_cents_after_credits > 0 ? (
            <AlertTriangle className="size-5 text-danger shrink-0 mt-0.5" />
          ) : (
            <Pause className="size-5 text-warning shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-small font-semibold text-fg mb-1">
              {data.overage.projected_overage_cents_after_credits > 0
                ? `Estimated overage at month-end: ${fmtRand(data.overage.projected_overage_cents_after_credits)}`
                : `Credits covering your overage`}
            </p>
            <p className="text-tiny text-fg-muted leading-relaxed">
              You&apos;re {data.overage.conversations_over_plan} conversation{data.overage.conversations_over_plan === 1 ? "" : "s"} over your plan&apos;s included quota.{" "}
              {data.credits.zero_balance_behaviour === "pause"
                ? `Your default at zero credits is to pause the assistant. Top up to keep it running, or upgrade your plan.`
                : `You're on the overage option, so the assistant keeps running and the extra goes on your next invoice.`}
            </p>
          </div>
        </Card>
      )}

      {/* Behaviour at zero credits */}
      <Card className="p-5 mt-4">
        <div className="flex items-start gap-3">
          {data.credits.zero_balance_behaviour === "pause" ? (
            <Pause className="size-5 text-fg-muted shrink-0 mt-0.5" />
          ) : (
            <Zap className="size-5 text-[var(--accent)] shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-small font-semibold text-fg mb-1">
              When you run out of credits and exceed your plan
            </p>
            <p className="text-tiny text-fg-muted leading-relaxed">
              {data.credits.zero_balance_behaviour === "pause" ? (
                <>
                  Your assistant <strong>pauses</strong> until next month&apos;s plan reset, you top up,
                  or you upgrade. No surprise charges. Switch to <em>overage</em> if you&apos;d rather
                  the assistant keep running and pay at month-end.
                </>
              ) : (
                <>
                  The assistant <strong>keeps running</strong> and overage at{" "}
                  {fmtRand(data.plan.overage_cents_per_conversation)}/conversation accrues to your
                  next invoice. Switch to <em>pause</em> if you&apos;d rather a hard cap.
                </>
              )}
            </p>
          </div>
          <Badge tone="neutral">{data.credits.zero_balance_behaviour}</Badge>
        </div>
      </Card>

      {/* Explainer */}
      <Card className="p-5 mt-4 border-dashed">
        <div className="flex items-start gap-3">
          <Info className="size-4 text-fg-muted shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-small font-semibold text-fg mb-1">How conversations are counted</p>
            <p className="text-tiny text-fg-muted leading-relaxed">
              One <strong>conversation</strong> = one unique visitor session in the month, regardless
              of how many messages they send. A visitor who chats for 30 messages still counts as 1.
              Test-mode previews from your dashboard never count. Conversations from the Qwikly
              marketing site (if you ever embed your widget there) are not on your bill.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
