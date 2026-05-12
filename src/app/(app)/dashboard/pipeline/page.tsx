"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Settings2, Sparkles, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { KpiCard } from "@/components/pipeline-dash/KpiCard";
import { QueueRow, type QueueRowData } from "@/components/pipeline-dash/QueueRow";

// ---------------------------------------------------------------------------
// Pipeline dashboard hub — Mission Control.
//
// Sections in render order:
//   1. Header: title, plan badge, Edit ICP + View all CTAs.
//   2. Today's batch hero (prospects with delivery_batch_date == today).
//   3. Four real KPIs: Delivered Today, This Week, Total in Pool, Email Found.
//   4. Two-column: ICP summary card (left) + delivery history log (right).
//
// Removed (all were permanently zero and we cannot track them):
//   - Sent today / Reply rate / Booked / Streak
//   - Has phone (column does not exist)
//   - Site verified
//   - Recent replies panel (pipeline_replies is not populated)
//   - Upcoming calls panel (pipeline_meetings is not populated)
// ---------------------------------------------------------------------------

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
  founders: "Founders",
  business: "Business",
  enterprise: "Enterprise",
  premium: "Premium",
  pipeline_lite: "Pro",
  pipeline_pro: "Business",
};

interface ProspectRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  industry: string | null;
  city: string | null;
  email: string | null;
  email_verified: boolean | null;
  enrichment_score: number | null;
  status: string | null;
  delivery_batch_date: string | null;
}

interface QuotaData {
  plan: string;
  daily_quota: number;
}

function prospectDisplayName(p: {
  company: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  if (p.company?.trim()) return p.company.trim();
  const parts = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return parts || "Untitled prospect";
}

async function safeQuery<T = unknown>(
  build: () => Promise<{
    data: T[] | null;
    error: { message?: string; code?: string } | null;
  }>,
): Promise<{ data: T[]; ok: boolean }> {
  try {
    const { data, error } = await build();
    if (error) return { data: [], ok: false };
    return { data: (data || []) as T[], ok: true };
  } catch {
    return { data: [], ok: false };
  }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekDate(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonthDate(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function daysUntilMonthEnd(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

function formatBatchDate(dateStr: string): string {
  const today = todayDate();
  if (dateStr === today) return "Today";
  const d = new Date();
  d.setDate(d.getDate() - 1);
  if (dateStr === d.toISOString().slice(0, 10)) return "Yesterday";
  const parsed = new Date(dateStr + "T00:00:00");
  return parsed.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function PipelineHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstBatch = searchParams.get("firstBatch") === "1";

  const [setupChecked, setSetupChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [dayLabel, setDayLabel] = useState("");

  useEffect(() => {
    setDayLabel(
      new Date().toLocaleDateString("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  // Task 22 setup gate: if outbound is enrolled but ICP is not generated,
  // redirect to the wizard before rendering anything.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline/setup-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json && json.hasOutbound && json.status !== "generated") {
          router.replace("/dashboard/pipeline/setup");
          return;
        }
        setSetupChecked(true);
      })
      .catch(() => {
        if (!cancelled) setSetupChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [pRes, qRes] = await Promise.all([
        safeQuery<ProspectRow>(() =>
          supabase
            .from("pipeline_prospects")
            .select(
              "id, first_name, last_name, company, industry, city, email, email_verified, enrichment_score, status, delivery_batch_date",
            )
            .order("enrichment_score", { ascending: false, nullsFirst: false })
            .limit(500),
        ),
        fetch("/api/pipeline/quota", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (cancelled) return;
      setProspects(pRes.data);
      setQuota(qRes);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const today = todayDate();
  const weekStart = startOfWeekDate();
  const monthStart = startOfMonthDate();

  const todaysProspects = useMemo(
    () => prospects.filter((p) => p.delivery_batch_date === today),
    [prospects, today],
  );

  const thisWeekCount = useMemo(
    () =>
      prospects.filter(
        (p) => p.delivery_batch_date && p.delivery_batch_date >= weekStart,
      ).length,
    [prospects, weekStart],
  );

  const emailCount = useMemo(
    () => prospects.filter((p) => !!p.email).length,
    [prospects],
  );

  const total = prospects.length;

  // Group all prospects by delivery_batch_date for the history panel.
  // Prospects with no batch date (generated before the column existed) go
  // into a catch-all "Earlier" bucket at the bottom.
  const historyGroups = useMemo(() => {
    const byDate = new Map<string, ProspectRow[]>();
    for (const p of prospects) {
      const key = p.delivery_batch_date ?? "_earlier";
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(p);
    }
    const dates = Array.from(byDate.keys()).sort((a, b) => {
      if (a === "_earlier") return 1;
      if (b === "_earlier") return -1;
      return b.localeCompare(a);
    });
    return dates.map((d) => ({ date: d, count: byDate.get(d)!.length }));
  }, [prospects]);

  const todaysQueue: QueueRowData[] = useMemo(
    () =>
      todaysProspects.map((p) => ({
        id: p.id,
        name: prospectDisplayName(p),
        industry: p.industry,
        city: p.city,
        enrichment_score: p.enrichment_score,
        email_verified: p.email_verified,
        status: p.status,
      })),
    [todaysProspects],
  );

  // -------------------------------------------------------------------------
  // Setup gate: show nothing until the redirect check resolves.
  // -------------------------------------------------------------------------
  if (!setupChecked) {
    return <div className="p-8 text-ink-500">Loading...</div>;
  }

  // -------------------------------------------------------------------------
  // Empty state: no prospects in the table at all.
  // -------------------------------------------------------------------------
  if (!loading && total === 0) {
    return (
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-3 pb-2">
          <div className="eyebrow text-ink-500">Pipeline</div>
          <h1 className="font-display text-[40px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
            Mission Control
          </h1>
        </header>
        <div className="ed-card !p-8 md:!p-10 flex flex-col items-start gap-4 max-w-[640px]">
          <Sparkles className="w-6 h-6 text-ember" />
          <h2 className="font-display text-[26px] md:text-[30px] leading-tight tracking-tight text-ink">
            No prospects yet
          </h2>
          <p className="text-[14.5px] text-ink-500 leading-relaxed max-w-[48ch]">
            Define your target profile and Qwikly will start delivering
            best-fit prospects every morning.
          </p>
          <Link
            href="/dashboard/pipeline/setup"
            className="inline-flex items-center gap-2 rounded-full bg-ember text-cream px-5 py-2.5 text-[13.5px] font-medium hover:bg-ember-deep transition-colors"
          >
            Set up my target profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const planLabel = PLAN_LABELS[quota?.plan ?? ""] ?? quota?.plan ?? "Pro";
  const dailyQuota = quota?.daily_quota ?? 5;
  const daysLeft = daysUntilMonthEnd();

  return (
    <div className="flex flex-col gap-8">
      {/* 1. HEADER */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-ink/[0.08]">
        <div className="flex flex-col gap-2">
          <div className="eyebrow text-ink-500">Pipeline</div>
          <h1 className="font-display text-[40px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
            Mission Control
          </h1>
          <p className="text-ink-500 text-[14px] flex items-center gap-2 flex-wrap">
            {dayLabel || "Today"}
            {quota && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ember/10 text-ember text-[12px] font-medium font-mono">
                {planLabel} · {dailyQuota}/day
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/pipeline/prospects"
            className="inline-flex items-center gap-2 rounded-full bg-[#F1EADD] text-ink px-4 py-2 text-[13px] font-medium ring-1 ring-[#E8DFD0] hover:bg-[#EBE3D2] transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            All prospects
          </Link>
          <Link
            href="/dashboard/pipeline/setup"
            className="inline-flex items-center gap-2 rounded-full bg-ember text-cream px-4 py-2 text-[13px] font-medium hover:bg-ember-deep transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit target profile
          </Link>
        </div>
      </header>

      {/* 2. TODAY'S BATCH HERO */}
      {todaysQueue.length > 0 ? (
        <section className="rounded-lg border border-ember/30 bg-ember/5 p-6">
          <h2 className="font-display text-[24px] md:text-[28px] leading-tight tracking-tight text-ink">
            {isFirstBatch ? "Your first" : "Today's"} {todaysQueue.length}{" "}
            best-fit{" "}
            {todaysQueue.length === 1 ? "prospect" : "prospects"}
          </h2>
          <p className="text-ink-500 mt-1 text-[13px]">
            {isFirstBatch
              ? "Welcome, here's what we built for you."
              : "Delivered this morning, scored by best fit to your target profile."}
          </p>
          <div className="mt-4 ed-card !p-0 overflow-hidden">
            <div className="flex flex-col">
              {todaysQueue.map((q) => (
                <QueueRow key={q.id} prospect={q} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-ink/10 bg-[#F9F7F4] p-6">
          <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
            Today&apos;s prospects
          </h2>
          <p className="text-ink-500 text-[14px] mt-1.5">
            {loading
              ? "Loading..."
              : "No prospects delivered yet today. Your next batch arrives tomorrow morning."}
          </p>
        </section>
      )}

      {/* 3. KPI ROW — only metrics we can actually measure */}
      <section
        aria-label="Prospect metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="DELIVERED TODAY"
          value={loading ? "·" : todaysProspects.length}
          hint={!loading ? `${dailyQuota} on your plan` : undefined}
        />
        <KpiCard
          label="THIS WEEK"
          value={loading ? "·" : thisWeekCount}
          hint={!loading ? "Mon to today" : undefined}
        />
        <KpiCard
          label="TOTAL IN POOL"
          value={loading ? "·" : total}
          hint={
            !loading
              ? daysLeft <= 3
                ? `Resets in ${daysLeft}d`
                : `${daysLeft}d until month resets`
              : undefined
          }
        />
        <KpiCard
          label="EMAIL FOUND"
          value={loading ? "·" : emailCount}
          hint={
            !loading && total > 0
              ? `${Math.round((emailCount / total) * 100)}% of pool`
              : undefined
          }
        />
      </section>

      {/* 4. ICP CARD + DELIVERY HISTORY */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* LEFT: Target profile summary */}
        <div className="md:col-span-4 ed-card !p-6 flex flex-col gap-5">
          <div>
            <h2 className="font-display text-[20px] leading-tight tracking-tight text-ink">
              Your target profile
            </h2>
            <p className="text-[12.5px] text-ink-500 mt-1 leading-relaxed">
              Qwikly uses this to select and score every prospect. Changes you
              make take effect the following morning.
            </p>
          </div>
          <Link
            href="/dashboard/pipeline/setup"
            className="inline-flex items-center gap-2 rounded-full bg-ember text-cream px-4 py-2.5 text-[13px] font-medium hover:bg-ember-deep transition-colors self-start"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit target profile
          </Link>
        </div>

        {/* RIGHT: Delivery history log */}
        <div className="md:col-span-8 ed-card !p-0 overflow-hidden flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-ink/[0.06] flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[20px] leading-tight tracking-tight text-ink">
                Prospect history
              </h2>
              <p className="text-[12.5px] text-ink-500 mt-0.5">
                All deliveries this account has received. Archived at month end.
              </p>
            </div>
            <Link
              href="/dashboard/pipeline/prospects"
              className="text-[12.5px] font-medium text-ember inline-flex items-center gap-1.5 hover:text-ember-deep shrink-0 mt-0.5"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-[13px] text-ink-500">
              Loading...
            </div>
          ) : historyGroups.length === 0 ? (
            <div className="px-5 py-6 text-[13px] text-ink-500">
              No delivery history yet.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-ink/[0.06]">
              {historyGroups.slice(0, 20).map(({ date, count }) => {
                const isCurrentMonth =
                  date !== "_earlier" && date >= monthStart;
                const label =
                  date === "_earlier" ? "Earlier" : formatBatchDate(date);
                return (
                  <div
                    key={date}
                    className={`px-5 py-3 flex items-center justify-between gap-3 ${
                      !isCurrentMonth ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-ink">
                        {label}
                      </span>
                      {!isCurrentMonth && (
                        <span className="text-[11px] text-ink-400 font-mono">
                          archived
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[12px] text-ink-500 tabular-nums">
                      {count} {count === 1 ? "prospect" : "prospects"}
                    </span>
                  </div>
                );
              })}
              {historyGroups.length > 20 && (
                <div className="px-5 py-3 text-[12.5px] text-ink-400">
                  + {historyGroups.length - 20} older batches
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
