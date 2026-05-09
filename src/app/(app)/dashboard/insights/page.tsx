"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  HelpCircle,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

type Range = 7 | 30 | 90;

const RANGES: { id: Range; label: string }[] = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_TICKS = [0, 6, 12, 18];

type SummaryBlock = {
  conversations: number;
  qualifiedLeads: number;
  captureRate: number;
};

type FunnelData = {
  visitorsStarted: number;
  engaged: number;
  nameCaptured: number;
  contactCaptured: number;
  bookingIntent: number;
};

type StalledRow = {
  id: string;
  messageCount: number;
  lastQuestion: string;
  customerName: string | null;
  updatedAt: string;
  createdAt: string;
};

type LowQualityRow = {
  question: string;
  count: number;
  sampleAnswer: string;
};

type InsightsPayload = {
  range: Range;
  thisPeriod: SummaryBlock;
  prevPeriod: SummaryBlock;
  funnel: FunnelData;
  stalled: StalledRow[];
  lowQuality: LowQualityRow[];
  heatmap: number[][];
};

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function timeAgoShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function deltaLabel(current: number, prev: number, kind: "count" | "rate") {
  if (prev === 0 && current === 0) return { text: "No prior data", tone: "flat" as const };
  if (prev === 0) return { text: "New", tone: "up" as const };
  if (kind === "rate") {
    const diff = current - prev;
    const pts = Math.round(diff * 100);
    if (pts === 0) return { text: "No change", tone: "flat" as const };
    return {
      text: `${pts > 0 ? "+" : ""}${pts} pts`,
      tone: pts > 0 ? ("up" as const) : ("down" as const),
    };
  }
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return { text: "No change", tone: "flat" as const };
  return {
    text: `${pct > 0 ? "+" : ""}${pct}%`,
    tone: pct > 0 ? ("up" as const) : ("down" as const),
  };
}

export default function InsightsPage() {
  const [range, setRange] = useState<Range>(7);
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/insights?range=${range}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Could not load insights");
        return r.json();
      })
      .then((json: InsightsPayload) => {
        if (!cancelled) setData(json);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "conversations",
        label: "Conversations",
        icon: MessageSquare,
        color: "#E85A2C",
        value: data.thisPeriod.conversations.toLocaleString(),
        prevValue: data.prevPeriod.conversations.toLocaleString(),
        delta: deltaLabel(data.thisPeriod.conversations, data.prevPeriod.conversations, "count"),
        sub: `vs previous ${range} days`,
      },
      {
        key: "leads",
        label: "Qualified leads",
        icon: Zap,
        color: "#3B82F6",
        value: data.thisPeriod.qualifiedLeads.toLocaleString(),
        prevValue: data.prevPeriod.qualifiedLeads.toLocaleString(),
        delta: deltaLabel(data.thisPeriod.qualifiedLeads, data.prevPeriod.qualifiedLeads, "count"),
        sub: `vs previous ${range} days`,
      },
      {
        key: "rate",
        label: "Lead capture rate",
        icon: TrendingUp,
        color: "#22C55E",
        value: formatPct(data.thisPeriod.captureRate),
        prevValue: formatPct(data.prevPeriod.captureRate),
        delta: deltaLabel(data.thisPeriod.captureRate, data.prevPeriod.captureRate, "rate"),
        sub: `vs previous ${range} days`,
      },
    ];
  }, [data, range]);

  return (
    <>
      <PageHeader
        title="Insights"
        description="See what your assistant is doing well, and what it could improve."
      />

      {/* Range tabs */}
      <div className="flex gap-1 mb-6">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "px-3 h-8 rounded-lg text-small font-medium cursor-pointer transition-colors duration-150",
              range === r.id
                ? "bg-white/[0.08] text-fg"
                : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="!p-5 mb-6 border-red-500/40">
          <p className="text-small text-red-500">We couldn&apos;t load insights, {error}</p>
        </Card>
      )}

      {/* Comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {loading || !data
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          : cards.map((k) => {
              const Icon = k.icon;
              const tone = k.delta.tone;
              return (
                <Card key={k.key} className="!p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${k.color}18`, color: k.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 h-6 rounded-full text-tiny font-semibold",
                        tone === "up" && "bg-green-500/12 text-green-500",
                        tone === "down" && "bg-red-500/12 text-red-500",
                        tone === "flat" && "bg-white/[0.06] text-fg-muted"
                      )}
                    >
                      {tone === "up" && <ArrowUpRight className="w-3 h-3" />}
                      {tone === "down" && <ArrowDownRight className="w-3 h-3" />}
                      {k.delta.text}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-fg num leading-none">{k.value}</p>
                  <p className="text-tiny text-fg font-medium mt-1.5">{k.label}</p>
                  <p className="text-tiny text-fg-muted mt-0.5">
                    Previous, {k.prevValue}, {k.sub}
                  </p>
                </Card>
              );
            })}
      </div>

      {/* Funnel */}
      <Card className="mb-6">
        <CardHeader
          title="Conversion funnel"
          description="Where visitors drop off between starting a chat and committing to a booking."
        />
        {loading || !data ? (
          <Skeleton className="h-48" />
        ) : data.funnel.visitorsStarted === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet in this period"
            description="As your assistant chats with visitors, you'll see drop-off at every step."
          />
        ) : (
          <FunnelChart funnel={data.funnel} />
        )}
      </Card>

      {/* Heatmap */}
      <Card className="mb-6">
        <CardHeader
          title="When are conversations happening"
          description="Time of day visitors reach out, by day of week. Times shown in SAST."
        />
        {loading || !data ? (
          <Skeleton className="h-56" />
        ) : data.heatmap.flat().every((n) => n === 0) ? (
          <EmptyState
            icon={Clock}
            title="No conversations in this period"
            description="The heatmap fills in once visitors start chatting."
          />
        ) : (
          <Heatmap matrix={data.heatmap} />
        )}
      </Card>

      {/* Stalled + Low quality */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Stalled conversations"
            description="Visitors who chatted but didn't share contact details. Worth a manual reach-out."
          />
          {loading || !data ? (
            <Skeleton className="h-48" />
          ) : data.stalled.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nothing stalled"
              description="Every active conversation has a name or contact captured."
            />
          ) : (
            <StalledList rows={data.stalled} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Questions your assistant struggled with"
            description="Replies where it deflected to your team instead of answering. Add these to your knowledge base."
          />
          {loading || !data ? (
            <Skeleton className="h-48" />
          ) : data.lowQuality.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No weak answers found"
              description="Your assistant answered every question directly in this period."
            />
          ) : (
            <LowQualityList rows={data.lowQuality} />
          )}
        </Card>
      </div>
    </>
  );
}

// ─── Funnel chart ──────────────────────────────────────────────────────────────

function FunnelChart({ funnel }: { funnel: FunnelData }) {
  const steps: { label: string; value: number; color: string }[] = [
    { label: "Visitors started",   value: funnel.visitorsStarted, color: "#E85A2C" },
    { label: "Engaged (3+ msgs)",  value: funnel.engaged,         color: "#F59E0B" },
    { label: "Name captured",      value: funnel.nameCaptured,    color: "#EAB308" },
    { label: "Contact captured",   value: funnel.contactCaptured, color: "#22C55E" },
    { label: "Booking intent",     value: funnel.bookingIntent,   color: "#3B82F6" },
  ];
  const top = Math.max(steps[0].value, 1);

  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const widthPct = Math.max((s.value / top) * 100, 2);
        const prev = i === 0 ? null : steps[i - 1].value;
        const dropPct = prev != null && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-small mb-1.5">
              <span className="text-fg font-medium">{s.label}</span>
              <span className="text-fg-muted">
                <span className="text-fg font-semibold num">{s.value.toLocaleString()}</span>
                {prev != null && (
                  <span className="text-fg-subtle ml-2">
                    {dropPct === 0
                      ? "no drop-off"
                      : (dropPct ?? 0) > 0
                      ? `${dropPct}% drop-off`
                      : `${Math.abs(dropPct ?? 0)}% gain`}
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-surface-input overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: `${widthPct}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Heatmap ───────────────────────────────────────────────────────────────────

function Heatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[560px]">
        {/* Hour ticks */}
        <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1 mb-1.5">
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-[10px] text-fg-subtle text-center leading-none">
              {HOUR_TICKS.includes(h) ? `${h.toString().padStart(2, "0")}` : ""}
            </div>
          ))}
        </div>

        {matrix.map((row, dayIdx) => (
          <div
            key={dayIdx}
            className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1 mb-1"
          >
            <div className="text-tiny text-fg-muted self-center">{DAY_LABELS[dayIdx]}</div>
            {row.map((count, hour) => {
              const intensity = count === 0 ? 0 : 0.15 + 0.85 * (count / max);
              return (
                <div
                  key={hour}
                  className="h-5 rounded-[3px] border border-[var(--border)]"
                  style={{
                    backgroundColor:
                      count === 0 ? "transparent" : `rgba(232, 90, 44, ${intensity.toFixed(3)})`,
                  }}
                  title={`${DAY_LABELS[dayIdx]} ${hour.toString().padStart(2, "0")}:00, ${count} conversation${count === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 ml-10">
          <span className="text-tiny text-fg-subtle">Less</span>
          {[0.15, 0.4, 0.65, 0.9].map((a) => (
            <div
              key={a}
              className="w-4 h-4 rounded-[3px] border border-[var(--border)]"
              style={{ backgroundColor: `rgba(232, 90, 44, ${a})` }}
            />
          ))}
          <span className="text-tiny text-fg-subtle">More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stalled list ──────────────────────────────────────────────────────────────

function StalledList({ rows }: { rows: StalledRow[] }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/dashboard/leads?id=${row.id}`}
            className="block py-3 px-1 -mx-1 rounded-lg hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-small font-medium text-fg truncate">
                {row.customerName?.trim() || "Unknown visitor"}
              </span>
              <span className="text-tiny text-fg-muted shrink-0">
                {row.messageCount} msgs, {timeAgoShort(row.updatedAt)}
              </span>
            </div>
            <p className="text-small text-fg-muted line-clamp-2">
              {row.lastQuestion || "No visitor message captured yet."}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── Low quality answers list ──────────────────────────────────────────────────

function LowQualityList({ rows }: { rows: LowQualityRow[] }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((row, i) => (
        <li key={i} className="py-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-small font-medium text-fg flex-1">
              {row.question.endsWith("?") ? row.question : `${row.question}`}
            </p>
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-full bg-white/[0.06] text-tiny font-semibold text-fg-muted shrink-0">
              {row.count}
            </span>
          </div>
          <p className="text-tiny text-fg-subtle line-clamp-2 italic">
            Reply, &ldquo;{row.sampleAnswer}&rdquo;
          </p>
        </li>
      ))}
    </ul>
  );
}
