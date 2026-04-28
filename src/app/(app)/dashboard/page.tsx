"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Plus,
  Send,
  ChevronRight,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Sparkline } from "@/components/charts/sparkline";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { OnboardingChecklist } from "@/components/shell/onboarding-checklist";
import { formatTime, formatDateTime, timeAgo, formatZAR } from "@/lib/format";
import { useClient } from "@/lib/use-client";
import { useUser } from "@/lib/use-user";

interface Booking {
  id: string;
  customer_name: string;
  job_type: string | null;
  area: string | null;
  booking_datetime: string | null;
  created_at: string;
  status: string;
}

interface Convo {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  updated_at: string;
}

export default function OverviewPage() {
  const { client } = useClient();
  const { displayName } = useUser();
  const [loading, setLoading] = useState(true);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [convoCount, setConvoCount] = useState(0);
  const [escalations, setEscalations] = useState<Convo[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [recentConvos, setRecentConvos] = useState<Convo[]>([]);
  const [bookingTrend, setBookingTrend] = useState<number[]>([]);
  const [convoTrend, setConvoTrend] = useState<number[]>([]);
  const [kbCount, setKbCount] = useState(0);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const start14 = new Date();
      start14.setDate(start14.getDate() - 13);

      const [bC, cC, esc, today, recC, trendB, trendC, kb] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", startMonth),
        supabase.from("conversations").select("*", { count: "exact", head: true }).gte("created_at", startMonth),
        supabase.from("conversations").select("*").eq("status", "escalated").order("updated_at", { ascending: false }).limit(3),
        supabase.from("bookings").select("*").gte("booking_datetime", startDay).lt("booking_datetime", endDay).order("booking_datetime"),
        supabase.from("conversations").select("*").order("updated_at", { ascending: false }).limit(6),
        supabase.from("bookings").select("created_at").gte("created_at", start14.toISOString()),
        supabase.from("conversations").select("created_at").gte("created_at", start14.toISOString()),
        supabase.from("kb_articles").select("*", { count: "exact", head: true }),
      ]);

      setBookingsCount(bC.count ?? 0);
      setConvoCount(cC.count ?? 0);
      setEscalations((esc.data as Convo[]) ?? []);
      setTodayBookings((today.data as Booking[]) ?? []);
      setRecentConvos((recC.data as Convo[]) ?? []);

      const buckets14 = Array.from({ length: 14 }, () => 0);
      const bucketsConv = Array.from({ length: 14 }, () => 0);
      const baseline = new Date(start14);
      baseline.setHours(0, 0, 0, 0);
      (trendB.data ?? []).forEach((r: { created_at: string }) => {
        const idx = Math.floor((new Date(r.created_at).getTime() - baseline.getTime()) / 86400000);
        if (idx >= 0 && idx < 14) buckets14[idx]++;
      });
      (trendC.data ?? []).forEach((r: { created_at: string }) => {
        const idx = Math.floor((new Date(r.created_at).getTime() - baseline.getTime()) / 86400000);
        if (idx >= 0 && idx < 14) bucketsConv[idx]++;
      });
      setBookingTrend(buckets14);
      setConvoTrend(bucketsConv);
      setKbCount(kb.count ?? 0);
      setLoading(false);
    })();
  }, []);

  const conversion = useMemo(() => {
    if (!convoCount) return 0;
    return Math.round((bookingsCount / convoCount) * 100);
  }, [bookingsCount, convoCount]);

  const revenue = bookingsCount * 1800;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);
  const ownerFirst = displayName.split(" ")[0];

  const stats = [
    { label: "Bookings", value: bookingsCount, sub: "this month", trend: bookingTrend, color: "#3B82F6", icon: CalendarCheck },
    { label: "Conversations", value: convoCount, sub: "this month", trend: convoTrend, color: "#38BDF8", icon: MessageSquare },
    { label: "Conversion", value: `${conversion}%`, sub: "enquiry → booked", trend: bookingTrend, color: "#8B5CF6", icon: TrendingUp },
    { label: "Est. revenue", value: formatZAR(revenue), sub: `${bookingsCount} bookings`, trend: bookingTrend, color: "#22C55E", icon: Sparkles },
  ];

  return (
    <>
      <PageHeader
        eyebrow={greeting + (ownerFirst ? `, ${ownerFirst}` : "")}
        title="Here's what's happening today."
        description={client?.business_name ? `${client.business_name} · ${client.trade ?? ""}` : "Your business at a glance"}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />}>
              New booking
            </Button>
            <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />}>
              Broadcast
            </Button>
          </>
        }
      />

      {/* Six-step onboarding checklist */}
      {!loading && <OnboardingChecklist client={client} kbCount={kbCount} />}

      {/* Activity summary banner */}
      {!loading && (bookingsCount > 0 || convoCount > 0) && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-brand/[0.06] border border-brand/20">
          <div className="w-8 h-8 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-brand" />
          </div>
          <p className="text-small text-fg flex-1">
            <span className="font-semibold text-brand">{convoCount} lead{convoCount !== 1 ? "s" : ""} handled</span>
            {bookingsCount > 0 && (
              <> · <span className="font-semibold text-fg">{bookingsCount} booking{bookingsCount !== 1 ? "s" : ""} made</span></>
            )}
            {revenue > 0 && (
              <> · <span className="font-semibold text-fg">R{revenue.toLocaleString()} booked</span></>
            )}
            <span className="text-fg-muted"> this month</span>
          </p>
        </div>
      )}

      {/* Attention banner */}
      {escalations.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-warning/[0.07] border border-warning/25 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-small text-fg flex-1">
            <span className="font-semibold">{escalations.length} conversation{escalations.length > 1 ? "s" : ""} need your attention</span>
            <span className="text-fg-muted">, your digital assistant passed these to you. Reply manually to keep momentum.</span>
          </p>
          <div className="flex gap-2">
            {escalations.slice(0, 2).map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/conversations?id=${c.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-ink-800 border border-line hover:border-warning/40 transition-colors duration-150 cursor-pointer"
              >
                <span className="text-tiny font-semibold text-fg truncate max-w-[80px]">{c.customer_name ?? c.customer_phone}</span>
                <ArrowUpRight className="w-3 h-3 text-fg-subtle" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="!p-4 hover:border-line-strong transition-colors duration-150">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-line flex items-center justify-center" style={{ color: s.color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <Sparkline data={s.trend.length ? s.trend : [0, 0]} color={s.color} fill={`${s.color}28`} width={72} height={24} />
                  </div>
                  <p className="text-h1 text-fg num leading-none">{s.value}</p>
                  <p className="text-tiny text-fg-muted mt-1.5">
                    <span className="text-fg font-medium">{s.label}</span> · {s.sub}
                  </p>
                </Card>
              );
            })}
      </div>

      {/* Bottom 2-col */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's schedule */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's schedule"
            description={todayBookings.length ? `${todayBookings.length} booking${todayBookings.length > 1 ? "s" : ""} today` : "Nothing booked today"}
            action={
              <Link href="/dashboard/bookings" className="text-tiny text-brand hover:underline font-medium">
                All bookings →
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : todayBookings.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Clear day ahead" description="That'll change once Qwikly books a lead. Follow up on open quotes in the meantime." />
          ) : (
            <div className="space-y-2">
              {todayBookings.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-line hover:border-line-strong transition-colors duration-150"
                >
                  <div className="w-12 text-center shrink-0">
                    <p className="text-small font-bold text-fg num leading-none">{formatTime(b.booking_datetime)}</p>
                  </div>
                  <div className="w-px h-8 bg-line shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-semibold text-fg truncate">{b.customer_name}</p>
                    <p className="text-tiny text-fg-muted truncate">
                      {b.job_type ?? "Service"}{b.area ? ` · ${b.area}` : ""}
                    </p>
                  </div>
                  <Badge tone={b.status === "completed" ? "success" : b.status === "no-show" ? "danger" : "brand"} dot>
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent conversations */}
        <Card>
          <CardHeader
            title="Recent chats"
            description="Latest customer activity"
            action={
              <Link href="/dashboard/conversations" className="text-tiny text-brand hover:underline font-medium">
                Inbox →
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : recentConvos.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No chats yet" description="Leads show here when they message your AI." />
          ) : (
            <div className="space-y-0.5">
              {recentConvos.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/conversations?id=${c.id}`}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] cursor-pointer group"
                >
                  <Avatar name={c.customer_name ?? c.customer_phone} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-semibold text-fg truncate">{c.customer_name ?? c.customer_phone}</p>
                    <p className="text-tiny text-fg-subtle">{timeAgo(c.updated_at)}</p>
                  </div>
                  <Badge
                    tone={c.status === "active" ? "brand" : c.status === "escalated" ? "warning" : "neutral"}
                  >
                    {c.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
