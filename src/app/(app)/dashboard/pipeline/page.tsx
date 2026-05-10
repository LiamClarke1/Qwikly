"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Megaphone,
  MessageSquare,
  CalendarCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/format";
import { KpiCard } from "@/components/pipeline-dash/KpiCard";
import { ActionTile } from "@/components/pipeline-dash/ActionTile";

interface Kpis {
  prospects: number;
  campaigns: number;
  replies_week: number;
  meetings_month: number;
  awaiting: boolean;
}

interface ActivityItem {
  id: string;
  kind: "prospect" | "campaign" | "reply" | "meeting";
  label: string;
  detail: string;
  at: string;
}

// Soft fetch helper. Returns [] when the table does not exist or env is missing.
// We never throw, the empty states render instead.
async function safeQuery<T = unknown>(
  build: () => Promise<{ data: T[] | null; error: { message?: string; code?: string } | null }>
): Promise<{ data: T[]; ok: boolean }> {
  try {
    const { data, error } = await build();
    if (error) {
      // 42P01 = relation does not exist, treat as not yet provisioned
      return { data: [], ok: false };
    }
    return { data: (data || []) as T[], ok: true };
  } catch {
    return { data: [], ok: false };
  }
}

export default function PipelineHubPage() {
  const [kpis, setKpis] = useState<Kpis>({
    prospects: 0,
    campaigns: 0,
    replies_week: 0,
    meetings_month: 0,
    awaiting: true,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [prospects, campaigns, replies, meetings] = await Promise.all([
        safeQuery<{ id: string; name: string | null; created_at: string }>(() =>
          supabase
            .from("pipeline_prospects")
            .select("id, name, created_at")
            .order("created_at", { ascending: false })
            .limit(50)
        ),
        safeQuery<{
          id: string;
          name: string | null;
          status: string | null;
          created_at: string;
          last_activity_at: string | null;
        }>(() =>
          supabase
            .from("pipeline_campaigns")
            .select("id, name, status, created_at, last_activity_at")
            .order("last_activity_at", { ascending: false, nullsFirst: false })
            .limit(50)
        ),
        safeQuery<{
          id: string;
          prospect_name: string | null;
          received_at: string | null;
          classification: string | null;
        }>(() =>
          supabase
            .from("pipeline_replies")
            .select("id, prospect_name, received_at, classification")
            .gte("received_at", weekAgo)
            .order("received_at", { ascending: false })
            .limit(50)
        ),
        safeQuery<{
          id: string;
          prospect_name: string | null;
          scheduled_at: string | null;
          created_at: string;
        }>(() =>
          supabase
            .from("pipeline_meetings")
            .select("id, prospect_name, scheduled_at, created_at")
            .gte("created_at", monthStart.toISOString())
            .order("created_at", { ascending: false })
            .limit(50)
        ),
      ]);

      if (cancelled) return;

      const anyTablePresent =
        prospects.ok || campaigns.ok || replies.ok || meetings.ok;

      const activeCampaigns = campaigns.data.filter((c) =>
        ["sending", "warming"].includes((c.status || "").toLowerCase())
      ).length;

      setKpis({
        prospects: prospects.data.length,
        campaigns: activeCampaigns,
        replies_week: replies.data.length,
        meetings_month: meetings.data.length,
        awaiting: !anyTablePresent ||
          (prospects.data.length === 0 &&
            activeCampaigns === 0 &&
            replies.data.length === 0 &&
            meetings.data.length === 0),
      });

      // Build a unified activity stream, sorted by timestamp desc, top 5.
      const stream: ActivityItem[] = [];
      for (const p of prospects.data.slice(0, 5)) {
        stream.push({
          id: `p-${p.id}`,
          kind: "prospect",
          label: "New prospect added",
          detail: p.name || "Unnamed",
          at: p.created_at,
        });
      }
      for (const c of campaigns.data.slice(0, 5)) {
        stream.push({
          id: `c-${c.id}`,
          kind: "campaign",
          label: `Campaign ${(c.status || "updated").toLowerCase()}`,
          detail: c.name || "Untitled",
          at: c.last_activity_at || c.created_at,
        });
      }
      for (const r of replies.data.slice(0, 5)) {
        stream.push({
          id: `r-${r.id}`,
          kind: "reply",
          label: "Reply received",
          detail: `${r.prospect_name || "Unknown"} (${(r.classification || "unclassified").replace(/_/g, " ")})`,
          at: r.received_at || new Date().toISOString(),
        });
      }
      for (const m of meetings.data.slice(0, 5)) {
        stream.push({
          id: `m-${m.id}`,
          kind: "meeting",
          label: "Meeting booked",
          detail: m.prospect_name || "Unknown",
          at: m.created_at,
        });
      }
      stream.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setActivity(stream.slice(0, 5));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 pb-6 border-b border-ink/[0.08]">
        <div className="eyebrow text-ink-500">Pipeline</div>
        <h1 className="font-display text-[40px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
          Pipeline
        </h1>
        <p className="text-ink-500 text-[15px] max-w-[620px]">
          Your outbound sales engine. Prospects in, meetings out.
        </p>
      </header>

      <section
        aria-label="Headline metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Prospects in pool"
          value={loading ? "," : kpis.prospects}
          awaiting={!loading && kpis.awaiting}
          hint={!kpis.awaiting ? "Total enriched contacts" : undefined}
        />
        <KpiCard
          label="Active campaigns"
          value={loading ? "," : kpis.campaigns}
          awaiting={!loading && kpis.awaiting}
          hint={!kpis.awaiting ? "Sending or warming" : undefined}
        />
        <KpiCard
          label="Replies this week"
          value={loading ? "," : kpis.replies_week}
          awaiting={!loading && kpis.awaiting}
          hint={!kpis.awaiting ? "Inbound, last 7 days" : undefined}
        />
        <KpiCard
          label="Meetings booked this month"
          value={loading ? "," : kpis.meetings_month}
          awaiting={!loading && kpis.awaiting}
          hint={!kpis.awaiting ? "Calendar confirmed" : undefined}
        />
      </section>

      <section aria-label="Quick actions" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
            Move it forward
          </h2>
          <Link
            href="/dashboard/pipeline/prospects"
            className="text-[13px] font-medium text-ember inline-flex items-center gap-1.5 hover:text-ember-deep"
          >
            View all prospects <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionTile
            href="/dashboard/pipeline/generate"
            title="Generate prospects"
            body="Pull a fresh list of fitting decision makers from your ICP. Verified emails, ready to enrol."
            cta="Start generating"
          />
          <ActionTile
            href="/dashboard/pipeline/setup"
            title="Set up a campaign"
            body="Define the offer, the cadence, and the target list. Qwikly handles the sequencing."
            cta="Open setup"
          />
          <ActionTile
            href="/dashboard/pipeline/replies"
            title="Review replies"
            body="Read inbound responses and decide who gets a booking link, a snooze, or a hand off."
            cta="Open inbox"
          />
        </div>
      </section>

      <section aria-label="Recent activity" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
            Recent activity
          </h2>
        </div>
        <div className="ed-card !p-0 overflow-hidden">
          {loading ? (
            <div className="px-5 py-6 text-[13px] text-ink-500">Loading,</div>
          ) : activity.length === 0 ? (
            <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
              <Sparkles className="w-5 h-5 text-ink-400" />
              <p className="text-[14px] text-ink-500 max-w-[44ch]">
                Activity will appear here once your first campaign launches.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/[0.06]">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="px-5 py-4 flex items-center gap-4 text-[13.5px]"
                >
                  <ActivityIcon kind={a.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="text-ink font-medium truncate">
                      {a.label}
                    </div>
                    <div className="text-ink-500 text-[12.5px] truncate">
                      {a.detail}
                    </div>
                  </div>
                  <span className="font-mono text-[11.5px] text-ink-500 shrink-0">
                    {timeAgo(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const map = {
    prospect: { icon: Users, bg: "bg-[#E2EAF3]", fg: "text-[#2C5784]" },
    campaign: { icon: Megaphone, bg: "bg-[#FBE8DD]", fg: "text-[#8A3B2A]" },
    reply: { icon: MessageSquare, bg: "bg-[#FAEFD8]", fg: "text-[#B8770E]" },
    meeting: { icon: CalendarCheck, bg: "bg-[#E5F1E9]", fg: "text-[#1F7A3A]" },
  } as const;
  const Cfg = map[kind];
  const Ico = Cfg.icon;
  return (
    <span
      className={`w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 ${Cfg.bg}`}
    >
      <Ico className={`w-4 h-4 ${Cfg.fg}`} />
    </span>
  );
}
