"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo, formatDateTime } from "@/lib/format";
import { KpiCard } from "@/components/pipeline-dash/KpiCard";
import {
  ContactFilterPills,
  type ContactFilter,
  type ContactFilterCounts,
} from "@/components/pipeline-dash/ContactFilterPills";
import { QueueRow, type QueueRowData } from "@/components/pipeline-dash/QueueRow";
import {
  StatusPill,
  replyClassTone,
} from "@/components/pipeline-dash/StatusPill";

// ---------------------------------------------------------------------------
// Pipeline dashboard hub, Mission Control overview.
//
// Sections in render order:
//   1. Header with title, day, prospect count, streak, plus Open queue / Start
//      sprint CTAs.
//   2. Sprint KPI row (SENT TODAY, REPLY RATE, BOOKED, STREAK).
//   3. Coverage KPI row (TOTAL PROSPECTS, SITE VERIFIED, HAS EMAIL, HAS PHONE).
//   4. Contact info filter pills, filters the queue list below.
//   5. Two column body: Top of queue (left), Recent replies + Upcoming calls.
//   6. Empty state when there are no pipeline_prospects rows at all.
// All Supabase queries soft-fail, the UI never throws.
// ---------------------------------------------------------------------------

// Minimal row shape we read from pipeline_prospects.
interface ProspectRow {
  id: string;
  name: string | null;
  industry: string | null;
  city: string | null;
  email: string | null;
  email_verified: boolean | null;
  linkedin_url: string | null;
  enrichment_score: number | null;
  status: string | null;
  created_at: string;
  last_activity_at: string | null;
}

interface ReplyRow {
  id: string;
  prospect_name: string | null;
  classification: string | null;
  snippet: string | null;
  received_at: string | null;
}

interface MeetingRow {
  id: string;
  prospect_name: string | null;
  scheduled_at: string | null;
  created_at: string;
}

// Soft fetch helper, never throws.
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

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay(); // Sun, 0
  const diff = day === 0 ? 6 : day - 1; // Mon, start of week
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Compute the current consecutive-day streak based on prospects whose
// last_activity_at falls on each day. We accept any activity timestamp as a
// "send" because the pipeline has no dedicated events table here.
function computeStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;
  const days = new Set<string>();
  for (const iso of activityDates) {
    if (!iso) continue;
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    days.add(d.toISOString().slice(0, 10));
  }
  if (days.size === 0) return 0;
  let count = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // If today has no activity, start the streak check from yesterday so a
  // morning visit before today's first send still reflects yesterday's run.
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export default function PipelineHubPage() {
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [dayLabel, setDayLabel] = useState("");

  // Client-side day label, avoids hydration mismatches.
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const todayISO = startOfTodayISO();
      const weekISO = startOfWeekISO();

      const [pRes, rRes, mRes] = await Promise.all([
        safeQuery<ProspectRow>(() =>
          supabase
            .from("pipeline_prospects")
            .select(
              "id, name, industry, city, email, email_verified, linkedin_url, enrichment_score, status, created_at, last_activity_at",
            )
            .order("enrichment_score", { ascending: false, nullsFirst: false })
            .limit(500),
        ),
        safeQuery<ReplyRow>(() =>
          supabase
            .from("pipeline_replies")
            .select("id, prospect_name, classification, snippet, received_at")
            .order("received_at", { ascending: false, nullsFirst: false })
            .limit(10),
        ),
        safeQuery<MeetingRow>(() =>
          supabase
            .from("pipeline_meetings")
            .select("id, prospect_name, scheduled_at, created_at")
            .gte("scheduled_at", weekISO)
            .order("scheduled_at", { ascending: true, nullsFirst: false })
            .limit(20),
        ),
      ]);
      if (cancelled) return;
      setProspects(pRes.data);
      setReplies(rRes.data);
      setMeetings(mRes.data);
      setLoading(false);
      // Suppress "unused" warning on todayISO when KPIs derive it via filters.
      void todayISO;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Derived KPIs
  // -------------------------------------------------------------------------
  const total = prospects.length;

  const sentAll = useMemo(
    () =>
      prospects.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return ["contacted", "replied", "qualified", "booked"].includes(s);
      }).length,
    [prospects],
  );

  const sentToday = useMemo(() => {
    const startMs = new Date(startOfTodayISO()).getTime();
    return prospects.filter((p) => {
      const s = (p.status || "").toLowerCase();
      if (!["contacted", "replied", "qualified", "booked"].includes(s)) {
        return false;
      }
      const t = p.last_activity_at ? new Date(p.last_activity_at).getTime() : 0;
      return t >= startMs;
    }).length;
  }, [prospects]);

  const repliedCount = useMemo(
    () =>
      prospects.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return ["replied", "qualified", "booked"].includes(s);
      }).length,
    [prospects],
  );
  const replyRate = sentAll > 0 ? Math.round((repliedCount / sentAll) * 100) : 0;

  const bookedThisWeek = useMemo(() => {
    const weekMs = new Date(startOfWeekISO()).getTime();
    return meetings.filter((m) => {
      const t = m.scheduled_at ? new Date(m.scheduled_at).getTime() : 0;
      return t >= weekMs;
    }).length;
  }, [meetings]);
  const bookedPctOfSent = sentAll > 0
    ? Math.round((bookedThisWeek / sentAll) * 100)
    : 0;

  const streak = useMemo(
    () =>
      computeStreak(
        prospects
          .map((p) => p.last_activity_at)
          .filter((x): x is string => !!x),
      ),
    [prospects],
  );

  const lastSentHoursAgo = useMemo(() => {
    const stamps = prospects
      .map((p) =>
        p.last_activity_at ? new Date(p.last_activity_at).getTime() : 0,
      )
      .filter((n) => n > 0);
    if (stamps.length === 0) return null;
    const newest = Math.max(...stamps);
    return Math.max(0, Math.floor((Date.now() - newest) / (1000 * 60 * 60)));
  }, [prospects]);

  // Coverage row
  const siteVerified = useMemo(
    () =>
      prospects.filter(
        (p) => p.email_verified === true || !!p.linkedin_url,
      ).length,
    [prospects],
  );
  const coveragePct = total > 0 ? Math.round((siteVerified / total) * 100) : 0;

  const hasEmail = useMemo(
    () =>
      prospects.filter((p) => !!p.email && p.email_verified === true).length,
    [prospects],
  );
  // Phone column does not exist yet, treat as zero per spec.
  const hasPhone = 0;
  const hasBoth = 0; // Cannot have both without a phone column.
  const phoneOnly = 0;

  // Contact filter counts and filtered queue (top of queue list).
  const counts: ContactFilterCounts = useMemo(() => {
    return {
      all: total,
      has_email: hasEmail,
      has_phone: hasPhone,
      email_and_phone: hasBoth,
      email_only: hasEmail,
      phone_only: phoneOnly,
    };
  }, [total, hasEmail]);

  // Eligible cold queue, filterable by contact-info pill, scored DESC.
  const queue: QueueRowData[] = useMemo(() => {
    const cold = prospects.filter(
      (p) => (p.status || "new").toLowerCase() === "new",
    );
    const filtered = cold.filter((p) => {
      const e = !!p.email && p.email_verified === true;
      switch (contactFilter) {
        case "all":
          return true;
        case "has_email":
          return e;
        case "email_only":
          return e;
        case "has_phone":
        case "email_and_phone":
        case "phone_only":
          // No phone column yet, nothing matches phone-related filters.
          return false;
        default:
          return true;
      }
    });
    return filtered.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      industry: p.industry,
      city: p.city,
      enrichment_score: p.enrichment_score,
      email_verified: p.email_verified,
      status: p.status,
    }));
  }, [prospects, contactFilter]);

  const totalColdEligible = useMemo(
    () =>
      prospects.filter((p) => (p.status || "new").toLowerCase() === "new")
        .length,
    [prospects],
  );

  const recentReplies = replies.slice(0, 3);
  const upcomingCalls = meetings.slice(0, 3);

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
            Define your ICP and Qwikly will generate the hottest matching
            prospects.
          </p>
          <Link
            href="/dashboard/pipeline/setup"
            className="inline-flex items-center gap-2 rounded-full bg-ember text-cream px-5 py-2.5 text-[13.5px] font-medium hover:bg-ember-deep transition-colors"
          >
            Set up my ICP
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. HEADER ROW */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-ink/[0.08]">
        <div className="flex flex-col gap-2">
          <div className="eyebrow text-ink-500">Pipeline</div>
          <h1 className="font-display text-[40px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
            Mission Control
          </h1>
          <p className="text-ink-500 text-[14px]">
            {dayLabel || "Today"}
            {" · "}
            <span className="font-mono tabular-nums">{total}</span> prospects
            loaded
            {" · streak "}
            <span className="font-mono tabular-nums">{streak}</span>d
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/pipeline/board"
            className="inline-flex items-center gap-2 rounded-full bg-[#F1EADD] text-ink px-4 py-2 text-[13px] font-medium ring-1 ring-[#E8DFD0] hover:bg-[#EBE3D2] transition-colors"
          >
            Open queue
          </Link>
          <Link
            href="/dashboard/pipeline/board?sprint=10x25"
            className="inline-flex items-center gap-2 rounded-full bg-ember text-cream px-4 py-2 text-[13px] font-medium hover:bg-ember-deep transition-colors"
          >
            Start sprint, 10 in 25 mins
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. SPRINT KPI ROW */}
      <section
        aria-label="Sprint metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="SENT TODAY"
          value={loading ? "," : sentToday}
          hint={!loading ? `${sentAll} all-time` : undefined}
        />
        <KpiCard
          label="REPLY RATE"
          value={loading ? "," : `${replyRate}%`}
          hint={!loading ? `${repliedCount} of ${sentAll} sent` : undefined}
        />
        <KpiCard
          label="BOOKED"
          value={loading ? "," : bookedThisWeek}
          hint={!loading ? `${bookedPctOfSent}% of sent` : undefined}
        />
        <KpiCard
          label="STREAK"
          value={loading ? "," : `${streak}d`}
          hint={
            !loading
              ? lastSentHoursAgo === null
                ? "No sends yet"
                : `last sent ${lastSentHoursAgo}h ago`
              : undefined
          }
        />
      </section>

      {/* 3. COVERAGE KPI ROW */}
      <section
        aria-label="Prospect coverage"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="TOTAL PROSPECTS"
          value={loading ? "," : total}
          hint={!loading ? "all working sites + contact" : undefined}
        />
        <KpiCard
          label="SITE VERIFIED"
          value={loading ? "," : siteVerified}
          hint={!loading ? `${coveragePct}% scrape coverage` : undefined}
        />
        <KpiCard
          label="HAS EMAIL"
          value={loading ? "," : hasEmail}
          hint={!loading ? `${hasBoth} have both` : undefined}
        />
        <KpiCard
          label="HAS PHONE"
          value={loading ? "," : hasPhone}
          hint={!loading ? `${phoneOnly} phone-only` : undefined}
          estimate
        />
      </section>

      {/* 4. CONTACT INFO FILTER PILLS */}
      <ContactFilterPills
        active={contactFilter}
        counts={counts}
        onChange={setContactFilter}
      />

      {/* 5. TWO-COLUMN BODY */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* LEFT: Top of queue */}
        <div className="md:col-span-7 ed-card !p-0 overflow-hidden flex flex-col">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-ink/[0.06]">
            <div>
              <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
                Top of queue
              </h2>
              <p className="text-[12.5px] text-ink-500 mt-0.5">
                Score-ranked, not yet contacted
              </p>
            </div>
            <Link
              href="/dashboard/pipeline/prospects"
              className="text-[12.5px] font-medium text-ember inline-flex items-center gap-1.5 hover:text-ember-deep shrink-0"
            >
              See all (
              <span className="font-mono tabular-nums">{totalColdEligible}</span>
              )
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-[13px] text-ink-500">Loading,</div>
          ) : queue.length === 0 ? (
            <div className="px-6 py-10 flex flex-col items-center text-center gap-2">
              <ShieldCheck className="w-5 h-5 text-ink-400" />
              <p className="text-[13.5px] text-ink-500 max-w-[44ch]">
                No cold prospects match this filter. Try widening it, or
                generate more.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {queue.map((q) => (
                <QueueRow key={q.id} prospect={q} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Recent replies + Upcoming calls */}
        <div className="md:col-span-5 flex flex-col gap-5">
          {/* Recent replies */}
          <div className="ed-card !p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-ink/[0.06]">
              <h2 className="font-display text-[20px] leading-tight tracking-tight text-ink">
                Recent replies
              </h2>
              <p className="text-[12.5px] text-ink-500 mt-0.5">
                Drop into Replies view to draft responses
              </p>
            </div>
            {loading ? (
              <div className="px-5 py-6 text-[13px] text-ink-500">Loading,</div>
            ) : recentReplies.length === 0 ? (
              <div className="px-5 py-6 text-[13px] text-ink-500">
                No replies yet. Keep sending.
              </div>
            ) : (
              <ul className="divide-y divide-ink/[0.06]">
                {recentReplies.map((r) => (
                  <li
                    key={r.id}
                    className="px-5 py-3.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ink truncate">
                        {r.prospect_name || "Unknown sender"}
                      </span>
                      <span className="font-mono text-[11px] text-ink-500 shrink-0">
                        {r.received_at ? timeAgo(r.received_at) : ""}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="text-[12.5px] text-ink-500 leading-relaxed line-clamp-1 flex-1">
                        {(r.snippet || "(no preview)").slice(0, 100)}
                      </p>
                      {r.classification ? (
                        <StatusPill tone={replyClassTone(r.classification)}>
                          {r.classification.replace(/_/g, " ").toLowerCase()}
                        </StatusPill>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upcoming calls */}
          <div className="ed-card !p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-ink/[0.06]">
              <h2 className="font-display text-[20px] leading-tight tracking-tight text-ink">
                Upcoming calls
              </h2>
              <p className="text-[12.5px] text-ink-500 mt-0.5">
                Discovery + demo bookings
              </p>
            </div>
            {loading ? (
              <div className="px-5 py-6 text-[13px] text-ink-500">Loading,</div>
            ) : upcomingCalls.length === 0 ? (
              <div className="px-5 py-6 text-[13px] text-ink-500">
                No bookings yet. Aim for 3 this week.
              </div>
            ) : (
              <ul className="divide-y divide-ink/[0.06]">
                {upcomingCalls.map((m) => (
                  <li
                    key={m.id}
                    className="px-5 py-3.5 flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-[#FBE8DD] text-[#8A3B2A] inline-flex items-center justify-center shrink-0">
                      <CalendarClock className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-ink truncate">
                        {m.prospect_name || "Booking"}
                      </div>
                      <div className="font-mono text-[11.5px] text-ink-500">
                        {m.scheduled_at
                          ? formatDateTime(m.scheduled_at)
                          : "Time pending"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
