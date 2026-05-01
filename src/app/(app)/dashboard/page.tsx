"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Zap, AlertTriangle, ArrowRight, TrendingUp, CheckCircle2,
  X, Users, Clock, ChevronRight, WifiOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { useUser } from "@/lib/use-user";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { resolvePlan, PLAN_CONFIG, PLAN_TOP_UP_PRICE, type PlanTier } from "@/lib/plan";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  updated_at: string;
  job_type: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-ink/[0.05] border border-ink/[0.08] animate-pulse", className)} />
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar({
  widgetLive,
  tier,
  leadsMonth,
}: {
  widgetLive: boolean;
  tier: PlanTier;
  leadsMonth: number;
}) {
  const config = PLAN_CONFIG[tier];
  const limit = config.leadLimit;
  const pct = limit ? Math.min(100, Math.round((leadsMonth / limit) * 100)) : 0;
  const nearCap = limit !== null && pct >= 80;
  const atCap = limit !== null && leadsMonth >= limit;

  return (
    <div className="space-y-2">
      {/* Widget status */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-small",
          widgetLive
            ? "bg-green-500/[0.06] border-green-500/20"
            : "bg-warning/[0.06] border-warning/20"
        )}
      >
        <div className="flex items-center gap-2">
          {widgetLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="font-semibold text-ink">Your assistant is LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-warning shrink-0" />
              <span className="font-semibold text-ink">Widget not detected</span>
            </>
          )}
        </div>
        {!widgetLive && (
          <Link
            href="/dashboard/embed"
            className="text-tiny font-semibold text-warning hover:underline cursor-pointer shrink-0"
          >
            Reinstall snippet →
          </Link>
        )}
      </div>

      {/* Lead usage bar */}
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl border",
          atCap
            ? "bg-danger/[0.06] border-danger/20"
            : nearCap
            ? "bg-warning/[0.06] border-warning/20"
            : "bg-white border-ink/[0.08]"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-small font-semibold text-ink">
              {config.name} · {leadsMonth.toLocaleString()}{limit ? ` / ${limit.toLocaleString()}` : ""} leads this month
            </span>
            {!atCap && !nearCap && limit && (
              <span className="text-tiny text-ink-400 num">{pct}%</span>
            )}
            {(atCap || nearCap) && (
              <Link
                href="/dashboard/billing"
                className="text-tiny font-semibold text-warning hover:underline cursor-pointer shrink-0"
              >
                Upgrade
              </Link>
            )}
          </div>
          {limit && (
            <div className="h-1.5 rounded-full bg-ink/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: atCap ? "#C3431C" : nearCap ? "#C8941A" : "#22C55E",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Over-cap banner */}
      {atCap && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-danger/25 bg-danger/[0.06] text-small">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
            <span className="text-ink font-medium">
              You&rsquo;ve hit your cap — top-ups billed at{" "}
              <span className="font-bold">R{PLAN_TOP_UP_PRICE}/lead</span>, or{" "}
              <Link href="/dashboard/billing" className="text-danger font-bold hover:underline cursor-pointer">
                upgrade to Premium
              </Link>{" "}
              for unlimited.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upgrade prompt ───────────────────────────────────────────────────────────

function UpgradePrompt({
  tier,
  leadsMonth,
  csvExportsUsed,
}: {
  tier: PlanTier;
  leadsMonth: number;
  csvExportsUsed: boolean;
}) {
  const dismissKey = `qwikly-upgrade-${new Date().getFullYear()}-${new Date().getMonth()}-${tier}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(dismissKey) === "1") return;
    if (tier === "starter" && leadsMonth >= 20) setVisible(true);
    if (tier === "pro" && csvExportsUsed) setVisible(true);
  }, [tier, leadsMonth, csvExportsUsed, dismissKey]);

  const dismiss = () => {
    sessionStorage.setItem(dismissKey, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const isProPrompt = tier === "starter";
  const title = isProPrompt
    ? "You're approaching your monthly lead limit"
    : "You're making good use of exports";
  const body = isProPrompt
    ? "Pro gives you 200 qualified leads/month, custom branding, and CSV exports — for R599/month. No per-lead fees."
    : "Premium gives you unlimited qualified leads, WhatsApp routing, calendar integration, and API access — from R1,299/month.";
  const ctaLabel = isProPrompt ? "See Pro plan" : "See Premium plan";

  return (
    <div className="relative rounded-2xl bg-ember/[0.06] border border-ember/[0.18] p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-ember/10 flex items-center justify-center shrink-0">
        <TrendingUp className="w-4 h-4 text-ember" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-small font-semibold text-ink">{title}</p>
        <p className="text-tiny text-ink-500 mt-0.5 leading-relaxed">{body}</p>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-1 text-tiny font-medium text-ember hover:underline mt-2 cursor-pointer"
        >
          {ctaLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-ink/[0.06] text-ink-400 hover:text-ink transition-colors duration-150 cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Status chip for lead rows ────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  new:       { label: "New",       cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  confirmed: { label: "Confirmed", cls: "bg-green-500/10 text-green-700 border-green-500/20" },
  no_show:   { label: "No-show",   cls: "bg-warning/10 text-warning border-warning/20" },
  closed:    { label: "Done",      cls: "bg-ink/[0.05] text-ink-500 border-ink/[0.08]" },
  escalated: { label: "Needs you", cls: "bg-danger/10 text-danger border-danger/20" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { client } = useClient();
  const { firstName } = useUser();
  const [loading, setLoading] = useState(true);
  const [leadsMonth, setLeadsMonth] = useState(0);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [newLeadsToday, setNewLeadsToday] = useState(0);

  const tier: PlanTier = resolvePlan(client?.plan);
  const widgetLive = !!(client?.web_widget_last_seen_at);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [monthLeads, recent, todayCount] = await Promise.all([
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startMonth),
        supabase
          .from("conversations")
          .select("id,customer_name,customer_phone,status,updated_at,job_type")
          .order("updated_at", { ascending: false })
          .limit(6),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startDay),
      ]);

      setLeadsMonth(monthLeads.count ?? 0);
      setRecentLeads((recent.data as Lead[]) ?? []);
      setNewLeadsToday(todayCount.count ?? 0);
      setLoading(false);
    })();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const name = firstName || client?.owner_name?.split(" ")[0] || "";

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-ink leading-tight tracking-tight">
            {greeting}{name ? `, ${name}` : ""}.
          </h1>
          {client?.business_name && (
            <p className="text-small text-ink-500 mt-0.5">{client.business_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-ember text-paper text-small font-medium hover:bg-ember-deep transition-colors duration-150 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            All leads
          </Link>
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────── */}
      {!loading && (
        <StatusBar widgetLive={widgetLive} tier={tier} leadsMonth={leadsMonth} />
      )}
      {loading && <SkeletonCard className="h-28" />}

      {/* ── Upgrade prompt ───────────────────────────────────────── */}
      {!loading && (
        <UpgradePrompt tier={tier} leadsMonth={leadsMonth} csvExportsUsed={false} />
      )}

      {/* ── KPI strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} className="h-24" />)
        ) : (
          <>
            <div className="rounded-2xl bg-white border border-ink/[0.08] p-4 shadow-[0_1px_4px_rgba(14,14,12,0.06)]">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2.5">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-ink num">{leadsMonth}</p>
              <p className="text-tiny text-ink-500 mt-1">Leads this month</p>
            </div>
            <div className="rounded-2xl bg-white border border-ink/[0.08] p-4 shadow-[0_1px_4px_rgba(14,14,12,0.06)]">
              <div className="w-8 h-8 rounded-xl bg-ember/10 flex items-center justify-center mb-2.5">
                <Zap className="w-4 h-4 text-ember" />
              </div>
              <p className="text-2xl font-bold text-ink num">{newLeadsToday}</p>
              <p className="text-tiny text-ink-500 mt-1">New leads today</p>
            </div>
            <div className="rounded-2xl bg-white border border-ink/[0.08] p-4 shadow-[0_1px_4px_rgba(14,14,12,0.06)] col-span-2 lg:col-span-1">
              <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-ink num">
                {recentLeads.filter((l) => l.status === "confirmed").length}
              </p>
              <p className="text-tiny text-ink-500 mt-1">Confirmed this week</p>
            </div>
          </>
        )}
      </div>

      {/* ── Recent leads ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink/[0.06]">
          <div>
            <h2 className="text-h3 text-ink font-semibold">Recent leads</h2>
            <p className="text-tiny text-ink-400 mt-0.5">Latest visitors captured by your assistant</p>
          </div>
          <Link
            href="/dashboard/leads"
            className="text-tiny font-medium text-ember hover:underline cursor-pointer"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} className="h-12" />)}
          </div>
        ) : recentLeads.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8">
            <div className="w-10 h-10 rounded-xl bg-ink/[0.05] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-ink-300" />
            </div>
            <div>
              <p className="text-small font-medium text-ink">No leads yet</p>
              <p className="text-tiny text-ink-400 mt-0.5">
                Once your widget is live and visitors interact, leads will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-ink/[0.05]">
            {recentLeads.map((lead) => {
              const s = STATUS_STYLE[lead.status] ?? STATUS_STYLE.new;
              return (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads?id=${lead.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-ink/[0.02] transition-colors duration-150 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-ink/[0.07] border border-ink/[0.08] flex items-center justify-center shrink-0 text-small font-semibold text-ink-500">
                    {(lead.customer_name ?? lead.customer_phone).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-semibold text-ink truncate">
                      {lead.customer_name ?? lead.customer_phone}
                    </p>
                    <p className="text-tiny text-ink-400">
                      {lead.job_type ? `${lead.job_type} · ` : ""}{timeAgo(lead.updated_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 px-2.5 py-1 rounded-lg text-tiny font-semibold border",
                      s.cls
                    )}
                  >
                    {s.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      {!loading && (
        <div className="rounded-2xl bg-white border border-ink/[0.08] p-5 shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
          <h2 className="text-h3 text-ink font-semibold mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { href: "/dashboard/leads",    icon: Users,   label: "All leads",         color: "#3B82F6" },
              { href: "/dashboard/embed",    icon: Zap,     label: "Widget settings",   color: "#E85A2C" },
              { href: "/dashboard/settings", icon: Clock,   label: "Assistant config",  color: "#A855F7" },
              { href: "/dashboard/billing",  icon: TrendingUp, label: "Manage billing", color: "#22C55E" },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-ink/[0.03] transition-colors duration-150 cursor-pointer text-center"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}18`, color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-tiny text-ink-500 font-medium leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
