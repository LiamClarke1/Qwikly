"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Clock, TrendingUp, UserCheck, CalendarRange,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Donut } from "@/components/charts/donut";
import { cn } from "@/lib/cn";

type Range = 7 | 30 | 90;
const RANGES: { id: Range; label: string }[] = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<{ label: string; values: number[] }[]>([]);
  const [hourly, setHourly] = useState<{ label: string; value: number }[]>([]);
  const [jobs, setJobs] = useState<{ name: string; count: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ label: string; value: number; color: string }[]>([]);
  const [stats, setStats] = useState({
    uniqueCustomers: 0,
    avgResponse: "< 5s",
    peakHour: "—",
    topJob: "—",
    bookings: 0,
    leads: 0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - range);

      const [convRes, leadsRes, bookRes] = await Promise.all([
        supabase.from("conversations").select("created_at, customer_phone").gte("created_at", since.toISOString()),
        supabase.from("leads").select("created_at, job_type, status").gte("created_at", since.toISOString()),
        supabase.from("bookings").select("status").gte("created_at", since.toISOString()),
      ]);

      const conversations = convRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const bookings = bookRes.data ?? [];

      // Daily series
      const buckets: Record<string, { c: number; l: number }> = {};
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        buckets[d.toISOString().split("T")[0]] = { c: 0, l: 0 };
      }
      conversations.forEach((c: { created_at: string }) => {
        const k = new Date(c.created_at).toISOString().split("T")[0];
        if (buckets[k]) buckets[k].c++;
      });
      leads.forEach((l: { created_at: string }) => {
        const k = new Date(l.created_at).toISOString().split("T")[0];
        if (buckets[k]) buckets[k].l++;
      });
      const dailyData = Object.entries(buckets).map(([k, v]) => ({
        label: new Date(k).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
        values: [v.c, v.l],
      }));

      // Hourly
      const hourCounts: Record<number, number> = {};
      conversations.forEach((c: { created_at: string }) => {
        const h = new Date(c.created_at).getHours();
        hourCounts[h] = (hourCounts[h] ?? 0) + 1;
      });
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        label: `${i}h`,
        value: hourCounts[i] ?? 0,
      }));

      // Jobs
      const jobCount: Record<string, number> = {};
      leads.forEach((l: { job_type: string | null }) => {
        if (l.job_type) jobCount[l.job_type] = (jobCount[l.job_type] ?? 0) + 1;
      });
      const jobsData = Object.entries(jobCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));

      // Status breakdown
      const statusCount: Record<string, number> = {};
      bookings.forEach((b: { status: string }) => {
        statusCount[b.status] = (statusCount[b.status] ?? 0) + 1;
      });
      const statusColors: Record<string, string> = {
        booked: "#F59E0B",
        completed: "#22C55E",
        cancelled: "#F87171",
        "no-show": "#FBBF24",
      };
      const statusData = Object.entries(statusCount).map(([label, value]) => ({
        label, value, color: statusColors[label] ?? "#6B7280",
      }));

      const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const uniquePhones = new Set(conversations.map((c: { customer_phone: string }) => c.customer_phone)).size;

      setDaily(dailyData);
      setHourly(hourlyData);
      setJobs(jobsData);
      setStatusBreakdown(statusData);
      setStats({
        uniqueCustomers: uniquePhones,
        avgResponse: "< 5s",
        peakHour: peakHour ? `${peakHour[0]}:00` : "—",
        topJob: jobsData[0]?.name ?? "—",
        bookings: bookings.length,
        leads: leads.length,
      });
      setLoading(false);
    })();
  }, [range]);

  const totalConv = useMemo(() => daily.reduce((s, d) => s + d.values[0], 0), [daily]);
  const totalLeads = useMemo(() => daily.reduce((s, d) => s + d.values[1], 0), [daily]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="A clear picture of what's working, who's reaching out, and how jobs are getting booked."
        actions={
          <div className="flex h-10 rounded-xl border border-line bg-white/[0.03] overflow-hidden">
            {RANGES.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "px-3.5 flex items-center gap-1.5 text-small font-medium cursor-pointer",
                  i > 0 && "border-l border-line",
                  range === r.id ? "bg-white/[0.06] text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {i === 0 && <CalendarRange className="w-4 h-4" />}
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: MessageSquare, label: "People you helped", value: stats.uniqueCustomers, color: "#38BDF8" },
          { icon: Clock, label: "Reply speed", value: stats.avgResponse, color: "#F59E0B" },
          { icon: TrendingUp, label: "Busiest time", value: stats.peakHour, color: "#FBBF24" },
          { icon: UserCheck, label: "Most requested job", value: stats.topJob, color: "#8B5CF6" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center" style={{ color: s.color }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-h2 text-fg num truncate">{s.value}</p>
                  <p className="text-tiny text-fg-muted mt-0.5">{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Activity over time"
          description={`Last ${range} days · ${totalConv} chats, ${totalLeads} leads`}
          action={
            <div className="flex items-center gap-4">
              <Legend color="#38BDF8" label="Conversations" />
              <Legend color="#F59E0B" label="Leads" />
            </div>
          }
        />
        {loading ? <Skeleton className="h-60" /> :
          daily.every((d) => d.values[0] === 0 && d.values[1] === 0) ? (
            <EmptyState title="No activity yet" description="Once your AI starts chatting, the trend will show here." />
          ) : (
            <div className="h-64">
              <AreaChart data={daily} series={[{ name: "Conversations", color: "#38BDF8" }, { name: "Leads", color: "#F59E0B" }]} />
            </div>
          )
        }
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="When customers reach out" description="The hours your phone is busiest" />
          {loading ? <Skeleton className="h-48" /> :
            hourly.every((h) => h.value === 0) ? (
              <EmptyState title="No data yet" />
            ) : (
              <div className="h-52"><BarChart data={hourly} color="#8B5CF6" /></div>
            )
          }
        </Card>

        <Card>
          <CardHeader title="How jobs ended up" />
          {loading ? <Skeleton className="h-48" /> :
            statusBreakdown.length === 0 ? (
              <EmptyState title="No bookings yet" />
            ) : (
              <div className="flex flex-col items-center">
                <Donut
                  data={statusBreakdown}
                  centerValue={String(stats.bookings)}
                  centerLabel="Bookings"
                />
                <div className="mt-5 w-full space-y-2">
                  {statusBreakdown.map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                        <span className="text-small text-fg-muted capitalize">{s.label}</span>
                      </div>
                      <span className="text-small text-fg num">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="What people needed most" description="The jobs customers keep asking about" />
        {loading ? <Skeleton className="h-32" /> :
          jobs.length === 0 ? (
            <EmptyState title="No job data yet" description="Job types fill in as your AI categorises customer enquiries." />
          ) : (
            <div className="space-y-3">
              {jobs.map((j, i) => {
                const max = jobs[0].count;
                const pct = Math.round((j.count / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-small mb-1.5">
                      <span className="text-fg font-medium capitalize">{j.name}</span>
                      <span className="text-fg-muted num">{j.count}</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-grad-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-tiny text-fg-muted">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
