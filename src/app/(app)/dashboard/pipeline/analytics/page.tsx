"use client";

export const dynamic = "force-dynamic";

// Analytics page. Renders KPI cards, by industry table, status breakdown and recent activity.
// Reads from pipeline_prospects and pipeline_meetings. Soft-fails on missing tables.
// Kept as a client component to match the rest of the pipeline pages and the
// supabase reader pattern, with soft-fail empty states everywhere.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { KpiCard } from "@/components/pipeline-dash/KpiCard";
import {
  AnalyticsByIndustry,
  type ProspectRow as IndustryProspectRow,
  type MeetingRow,
} from "@/components/pipeline-dash/AnalyticsByIndustry";
import { AnalyticsStatusBreakdown } from "@/components/pipeline-dash/AnalyticsStatusBreakdown";
import {
  AnalyticsRecentActivity,
  type ActivityRow,
} from "@/components/pipeline-dash/AnalyticsRecentActivity";

interface FullProspectRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  industry: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
}

async function safeQuery<T>(
  build: () => Promise<{ data: T[] | null; error: { message?: string } | null }>
): Promise<T[]> {
  try {
    const { data, error } = await build();
    if (error) return [];
    return (data || []) as T[];
  } catch {
    return [];
  }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AnalyticsPage() {
  const [prospects, setProspects] = useState<FullProspectRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [p, m] = await Promise.all([
        safeQuery<FullProspectRow>(() =>
          supabase
            .from("pipeline_prospects")
            .select(
              "id, first_name, last_name, company, industry, status, updated_at, created_at",
            )
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(2000)
        ),
        safeQuery<MeetingRow>(() =>
          supabase
            .from("pipeline_meetings")
            .select("id, prospect_id")
            .limit(2000)
        ),
      ]);
      if (cancelled) return;
      setProspects(p);
      setMeetings(m);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = useMemo(() => {
    const total = prospects.length;
    const sent = prospects.filter(
      (p) => (p.status || "").toLowerCase() !== "new" && (p.status || "").toLowerCase() !== ""
    ).length;
    const replied = prospects.filter((p) => {
      const s = (p.status || "").toLowerCase();
      return ["replied", "qualified", "booked"].includes(s);
    }).length;
    const booked = meetings.length;
    const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
    const bookRate = sent > 0 ? Math.round((booked / sent) * 100) : 0;
    const sevenDayCutoff = Date.now() - SEVEN_DAYS_MS;
    const actionsLast7 = prospects.filter((p) => {
      if (!p.updated_at) return false;
      const t = new Date(p.updated_at).getTime();
      return Number.isFinite(t) && t >= sevenDayCutoff;
    }).length;
    return { total, sent, replied, booked, replyRate, bookRate, actionsLast7 };
  }, [prospects, meetings]);

  const industryRows = useMemo<IndustryProspectRow[]>(
    () =>
      prospects.map((p) => ({
        id: p.id,
        industry: p.industry,
        status: p.status,
      })),
    [prospects]
  );

  const activity = useMemo<ActivityRow[]>(() => {
    // Schema has no status_history column. We render the current status keyed
    // off updated_at as the latest known activity.
    const items: ActivityRow[] = [];
    for (const p of prospects) {
      const personName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const business = p.company || personName || "Unknown";
      if (p.updated_at && p.status) {
        items.push({
          id: `u-${p.id}`,
          business,
          description: `Status is ${p.status.replace(/_/g, " ")}`,
          at: p.updated_at,
        });
      }
    }
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, 5);
  }, [prospects]);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 pb-6 border-b border-ink/[0.08]">
        <Link
          href="/dashboard/pipeline"
          className="eyebrow text-ink-500 hover:text-ember"
        >
          Pipeline
        </Link>
        <h1 className="font-display text-[36px] md:text-[42px] leading-[1.05] tracking-tight text-ink">
          Analytics
        </h1>
        <p className="text-ink-500 text-[14px] max-w-[620px]">
          Where the leverage is. Refresh after every send block.
        </p>
      </header>

      <section
        aria-label="Headline metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Total prospects"
          value={loading ? "," : kpis.total}
          hint="In your pool"
        />
        <KpiCard
          label="Sent (all-time)"
          value={loading ? "," : kpis.sent}
          hint={loading ? undefined : `${kpis.replyRate}% reply rate`}
        />
        <KpiCard
          label="Booked"
          value={loading ? "," : kpis.booked}
          hint={loading ? undefined : `${kpis.bookRate}% of sent`}
        />
        <KpiCard
          label="Actions last 7d"
          value={loading ? "," : kpis.actionsLast7}
          hint="Across all prospects"
        />
      </section>

      <section aria-label="By industry" className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
          By industry
        </h2>
        <AnalyticsByIndustry prospects={industryRows} meetings={meetings} />
      </section>

      <section aria-label="Status and activity" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <AnalyticsStatusBreakdown prospects={prospects} />
        </div>
        <div className="lg:col-span-6">
          <AnalyticsRecentActivity activity={activity} />
        </div>
      </section>
    </div>
  );
}
