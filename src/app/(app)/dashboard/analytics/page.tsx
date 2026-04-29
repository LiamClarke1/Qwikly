"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Clock, CalendarCheck, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { AreaChart, type SeriesPoint } from "@/components/charts/area-chart";
import { Donut } from "@/components/charts/donut";
import { cn } from "@/lib/cn";
import { formatZAR } from "@/lib/format";

type Range = 7 | 30 | 90;
const RANGES: { id: Range; label: string }[] = [
  { id: 7,  label: "7 days"  },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<{ label: string; values: number[] }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ label: string; value: number; color: string }[]>([]);
  const [stats, setStats] = useState({
    totalChats: 0,
    bookings: 0,
    avgResponse: "< 5s",
    invoicedTotal: 0,
    paidTotal: 0,
    overdueTotal: 0,
  });

  useEffect(() => {
    setLoading(true);
    (async () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - range + 1);
      start.setHours(0, 0, 0, 0);
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [convos, bookings, invoicesMonth] = await Promise.all([
        supabase
          .from("conversations")
          .select("created_at, status")
          .gte("created_at", start.toISOString()),
        supabase
          .from("bookings")
          .select("created_at")
          .gte("created_at", start.toISOString()),
        supabase
          .from("invoices")
          .select("total_amount, status")
          .gte("created_at", startMonth),
      ]);

      const convRows = convos.data ?? [];
      const bookRows = bookings.data ?? [];
      const invRows = (invoicesMonth.data ?? []) as { total_amount: number; status: string }[];

      // Build daily buckets
      const buckets: { label: string; chats: number; bookings: number }[] = [];
      for (let i = 0; i < range; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        buckets.push({
          label: d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" }),
          chats: 0,
          bookings: 0,
        });
      }
      convRows.forEach((r: { created_at: string }) => {
        const idx = Math.floor((new Date(r.created_at).getTime() - start.getTime()) / 86400000);
        if (idx >= 0 && idx < range) buckets[idx].chats++;
      });
      bookRows.forEach((r: { created_at: string }) => {
        const idx = Math.floor((new Date(r.created_at).getTime() - start.getTime()) / 86400000);
        if (idx >= 0 && idx < range) buckets[idx].bookings++;
      });

      setDaily([
        { label: "Customer enquiries", values: buckets.map((b) => b.chats) },
        { label: "Appointments booked", values: buckets.map((b) => b.bookings) },
      ]);

      // Status breakdown
      const statusMap: Record<string, number> = {};
      convRows.forEach((r: { status: string }) => {
        const label =
          r.status === "active" ? "Replied"
          : r.status === "escalated" ? "Needs me"
          : r.status === "completed" ? "Done"
          : "Other";
        statusMap[label] = (statusMap[label] ?? 0) + 1;
      });
      setStatusBreakdown([
        { label: "Replied",  value: statusMap["Replied"]  ?? 0, color: "#E85A2C" },
        { label: "Needs me", value: statusMap["Needs me"] ?? 0, color: "#F59E0B" },
        { label: "Done",     value: statusMap["Done"]     ?? 0, color: "#22C55E" },
      ]);

      const invoicedTotal = invRows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const paidTotal     = invRows.filter((r) => r.status === "paid").reduce((s, r) => s + (r.total_amount ?? 0), 0);

      const { data: overdueRows } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("status", "overdue");
      const overdueTotal = ((overdueRows ?? []) as { total_amount: number }[])
        .reduce((s, r) => s + (r.total_amount ?? 0), 0);

      setStats({
        totalChats:    convRows.length,
        bookings:      bookRows.length,
        avgResponse:   "< 5s",
        invoicedTotal,
        paidTotal,
        overdueTotal,
      });
      setLoading(false);
    })();
  }, [range]);

  const labels = useMemo(
    () => daily[0]?.values.map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - range + 1 + i);
      return d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    }) ?? [],
    [daily, range]
  );

  const chartData = useMemo<SeriesPoint[]>(
    () => labels.map((lbl, i) => ({
      label: lbl,
      values: daily.map((s) => s.values[i] ?? 0),
    })),
    [labels, daily]
  );

  const chartSeries = [
    { name: "Customer enquiries", color: "#E85A2C" },
    { name: "Appointments booked", color: "#3B82F6" },
  ];

  const kpis = [
    { label: "Customer enquiries", value: stats.totalChats, icon: MessageSquare, color: "#E85A2C", sub: `last ${range} days` },
    { label: "Appointments booked", value: stats.bookings, icon: CalendarCheck, color: "#3B82F6", sub: `last ${range} days` },
    { label: "Avg. response time", value: stats.avgResponse, icon: Clock, color: "#22C55E", sub: "by your assistant" },
    { label: "Invoiced this month", value: formatZAR(stats.invoicedTotal), icon: TrendingUp, color: "#A855F7", sub: `${formatZAR(stats.paidTotal)} paid` },
  ];

  return (
    <>
      <PageHeader
        title="This month"
        description="A quick look at how your business is performing."
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : kpis.map((k) => {
              const Icon = k.icon;
              return (
                <Card key={k.label} className="!p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${k.color}18`, color: k.color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-fg num leading-none">{k.value}</p>
                  <p className="text-tiny text-fg font-medium mt-1.5">{k.label}</p>
                  <p className="text-tiny text-fg-muted mt-0.5">{k.sub}</p>
                </Card>
              );
            })}
      </div>

      {/* Money row */}
      {!loading && (
        <Card className="!p-5 mb-6">
          <p className="text-tiny uppercase tracking-wider font-semibold text-fg-subtle mb-4">Money this month</p>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-tiny text-fg-subtle mb-1">Invoiced</p>
              <p className="text-xl font-bold text-fg num">{formatZAR(stats.invoicedTotal)}</p>
            </div>
            <div>
              <p className="text-tiny text-fg-subtle mb-1">Collected</p>
              <p className="text-xl font-bold text-green-400 num">{formatZAR(stats.paidTotal)}</p>
            </div>
            <div>
              <p className="text-tiny text-fg-subtle mb-1">Overdue</p>
              <p className={cn("text-xl font-bold num", stats.overdueTotal > 0 ? "text-warning" : "text-fg-muted")}>
                {formatZAR(stats.overdueTotal)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily activity" description="Customer enquiries and bookings over time" />
          {loading ? (
            <Skeleton className="h-48" />
          ) : daily[0]?.values.every((v) => v === 0) && daily[1]?.values.every((v) => v === 0) ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-small text-fg-muted">We need a week of data before this fills in. Check back soon.</p>
            </div>
          ) : (
            <AreaChart
              data={chartData}
              series={chartSeries}
              height={180}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Chat status" description="Breakdown for this period" />
          {loading ? (
            <Skeleton className="h-48" />
          ) : statusBreakdown.every((s) => s.value === 0) ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-small text-fg-muted">No chats in this period yet.</p>
            </div>
          ) : (
            <Donut
              data={statusBreakdown}
              size={160}
              thickness={28}
            />
          )}
        </Card>
      </div>
    </>
  );
}
