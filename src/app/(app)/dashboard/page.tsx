"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck, MessageSquare, AlertTriangle, ArrowRight,
  TrendingUp, Plus, Receipt, Clock, CheckCircle2, Zap,
  Lock, X, CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { useUser } from "@/lib/use-user";
import { formatTime, formatZAR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { resolvePlan, nextRenewalDate, PLAN_CONFIG, type PlanTier } from "@/lib/plan";

interface Booking {
  id: string;
  customer_name: string;
  job_type: string | null;
  area: string | null;
  booking_datetime: string | null;
  status: string;
}

interface Convo {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  updated_at: string;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-ink/[0.05] border border-ink/[0.08] animate-pulse",
        className
      )}
    />
  );
}

function KpiCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  if (loading) return <SkeletonCard className="h-28" />;
  return (
    <div className="relative rounded-2xl bg-white border border-ink/[0.08] p-4 overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.06)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/[0.06] to-transparent" />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}18`, color }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-ink num leading-none">{value}</p>
      <p className="text-tiny font-medium text-ink-600 mt-1.5">{label}</p>
      <p className="text-tiny text-ink-400 mt-0.5">{sub}</p>
    </div>
  );
}

function PlanCard({
  tier,
  bookingsMonth,
  loading,
}: {
  tier: PlanTier;
  bookingsMonth: number;
  loading: boolean;
}) {
  const config = PLAN_CONFIG[tier];
  const renewal = nextRenewalDate();
  const renewalStr = renewal.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const usagePct = config.bookingLimit ? Math.min(100, Math.round((bookingsMonth / config.bookingLimit) * 100)) : 0;
  const nearLimit = config.bookingLimit !== null && bookingsMonth >= 20;

  if (loading) return <SkeletonCard className="h-36" />;

  return (
    <div className="rounded-2xl bg-white border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
      <div className="px-5 pt-4 pb-3.5 border-b border-ink/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-ember/10 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-ember" />
            </div>
            <h2 className="text-h3 text-ink font-semibold">Your plan</h2>
          </div>
          <Link
            href="/dashboard/billing"
            className="text-tiny font-medium text-ember hover:underline cursor-pointer"
          >
            Manage plan
          </Link>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-small font-bold text-ink">{config.name}</span>
          <span className="text-small font-bold text-ink num">R{config.priceMonthly}/mo</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-tiny text-ink-400">Renews</span>
          <span className="text-tiny text-ink-500 num">{renewalStr}</span>
        </div>

        {config.bookingLimit !== null && (
          <div className="pt-0.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-tiny text-ink-400">Bookings used</p>
              <p className={cn("text-tiny font-semibold num", nearLimit ? "text-ember" : "text-ink")}>
                {bookingsMonth} of {config.bookingLimit}
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-ink/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${usagePct}%`,
                  background: usagePct >= 80 ? "#E85A2C" : "#22C55E",
                }}
              />
            </div>
            {nearLimit && (
              <p className="text-tiny text-ember font-medium leading-snug">
                Approaching your monthly limit — upgrade to Pro for unlimited bookings.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradePrompt({
  tier,
  bookingsMonth,
  webWidgetActive,
}: {
  tier: PlanTier;
  bookingsMonth: number;
  webWidgetActive: boolean;
}) {
  const dismissKey = `qwikly-upgrade-dismissed-${new Date().getFullYear()}-${new Date().getMonth()}-${tier}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem(dismissKey) === "1";
    if (isDismissed) return;
    if (tier === "lite" && bookingsMonth >= 20) setVisible(true);
    if (tier === "pro" && webWidgetActive) setVisible(true);
  }, [tier, bookingsMonth, webWidgetActive, dismissKey]);

  const dismiss = () => {
    sessionStorage.setItem(dismissKey, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const isProPrompt = tier === "lite";
  const title = isProPrompt
    ? "You're almost at your monthly booking limit"
    : "Your team is using the web widget heavily";
  const body = isProPrompt
    ? "Pro gives you unlimited bookings, no-show recovery, and calendar sync — for R799/month. No per-job fees. Ever."
    : "Upgrade to Business for custom branding, team accounts, and integrations — from R1,499/month.";
  const ctaLabel = isProPrompt ? "See Pro plan" : "See Business plan";

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

export default function HomePage() {
  const { client } = useClient();
  const { firstName } = useUser();
  const [loading, setLoading] = useState(true);
  const [bookingsMonth, setBookingsMonth] = useState(0);
  const [bookingsConfirmed, setBookingsConfirmed] = useState(0);
  const [bookingsPending, setBookingsPending] = useState(0);
  const [bookingsRecovered, setBookingsRecovered] = useState(0);
  const [chatsToday, setChatsToday] = useState(0);
  const [invoicedMonth, setInvoicedMonth] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [paidMonth, setPaidMonth] = useState(0);
  const [escalations, setEscalations] = useState<Convo[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [recentConvos, setRecentConvos] = useState<Convo[]>([]);

  const tier: PlanTier = resolvePlan(client?.plan);
  const config = PLAN_CONFIG[tier];
  const webWidgetActive = !!(client?.web_widget_last_seen_at);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const [monthBookings, esc, today, invoicesMonth, recentChats, todayConvos] = await Promise.all([
        supabase.from("bookings").select("id,status").gte("created_at", startMonth),
        supabase.from("conversations").select("id,customer_name,customer_phone,status,updated_at").eq("status", "escalated").order("updated_at", { ascending: false }).limit(3),
        supabase.from("bookings").select("id,customer_name,job_type,area,booking_datetime,status").gte("booking_datetime", startDay).lt("booking_datetime", endDay).order("booking_datetime"),
        supabase.from("invoices").select("total_amount,status").gte("created_at", startMonth),
        supabase.from("conversations").select("id,customer_name,customer_phone,status,updated_at").order("updated_at", { ascending: false }).limit(5),
        supabase.from("conversations").select("id", { count: "exact", head: true }).gte("created_at", startDay),
      ]);

      const allMonthBookings = (monthBookings.data ?? []) as { id: string; status: string }[];
      const confirmed = allMonthBookings.filter(b => b.status === "confirmed").length;
      const recovered = allMonthBookings.filter(b => b.status === "no_show_recovered").length;
      const pending = allMonthBookings.filter(b =>
        !["confirmed", "cancelled", "completed", "no_show_recovered"].includes(b.status)
      ).length;
      setBookingsMonth(allMonthBookings.length);
      setBookingsConfirmed(confirmed);
      setBookingsPending(pending);
      setBookingsRecovered(recovered);

      setEscalations((esc.data as Convo[]) ?? []);
      setTodayBookings((today.data as Booking[]) ?? []);
      setRecentConvos((recentChats.data as Convo[]) ?? []);
      setChatsToday(todayConvos.count ?? 0);

      const invRows = (invoicesMonth.data ?? []) as { total_amount: number; status: string }[];
      const invoiced = invRows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const paid = invRows.filter((r) => r.status === "paid").reduce((s, r) => s + (r.total_amount ?? 0), 0);
      setInvoicedMonth(invoiced);
      setPaidMonth(paid);

      const { data: overdueRows } = await supabase.from("invoices").select("total_amount").eq("status", "overdue");
      setOverdueAmount(((overdueRows ?? []) as { total_amount: number }[]).reduce((s, r) => s + (r.total_amount ?? 0), 0));

      setLoading(false);
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const name = firstName || client?.owner_name?.split(" ")[0] || "";

  const statusColor: Record<string, string> = {
    active: "text-ember",
    new: "text-blue-600",
    escalated: "text-warning",
    booked: "text-green-700",
    closed: "text-ink-400",
    completed: "text-ink-400",
  };
  const statusLabel: Record<string, string> = {
    active: "Replied",
    new: "New",
    escalated: "Needs you",
    booked: "Booked",
    closed: "Done",
    completed: "Done",
  };

  const bookingSubLine = loading
    ? "loading…"
    : `${bookingsConfirmed} confirmed · ${bookingsPending} pending`;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/[0.10] border border-green-500/20 text-tiny font-semibold text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Qwikly is live
            </span>
            {escalations.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/[0.10] border border-warning/20 text-tiny font-semibold text-warning">
                <AlertTriangle className="w-3 h-3" />
                {escalations.length} need{escalations.length === 1 ? "s" : ""} you
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-ink leading-tight tracking-tight">
            {greeting}{name ? `, ${name}` : ""}.
          </h1>
          {client?.business_name && (
            <p className="text-small text-ink-500 mt-0.5">{client.business_name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white border border-ink/[0.12] text-small font-medium text-ink-600 hover:text-ink hover:border-ink/[0.22] transition-all duration-150 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            New invoice
          </Link>
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-ember text-paper text-small font-medium hover:bg-ember-deep transition-colors duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New booking
          </Link>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Bookings this month" value={bookingsMonth} sub={bookingSubLine}
          icon={CalendarCheck} color="#3B82F6" loading={loading}
        />
        <KpiCard
          label="Chats today" value={chatsToday} sub="handled by Qwikly"
          icon={MessageSquare} color="#E85A2C" loading={loading}
        />
        <KpiCard
          label="Invoiced this month" value={formatZAR(invoicedMonth)} sub={`${formatZAR(paidMonth)} collected`}
          icon={TrendingUp} color="#A855F7" loading={loading}
        />
        <KpiCard
          label="Overdue" value={formatZAR(overdueAmount)} sub={overdueAmount > 0 ? "needs follow-up" : "all clear"}
          icon={Receipt} color={overdueAmount > 0 ? "#C8941A" : "#22C55E"} loading={loading}
        />
      </div>

      {/* ── Upgrade prompt (contextual, dismissible) ────────────── */}
      {!loading && (
        <UpgradePrompt
          tier={tier}
          bookingsMonth={bookingsMonth}
          webWidgetActive={webWidgetActive}
        />
      )}

      {/* ── Main grid ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Bookings this month breakdown */}
          {!loading && (
            <div className="rounded-2xl bg-white border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink/[0.06]">
                <div>
                  <h2 className="text-h3 text-ink font-semibold">Bookings this month</h2>
                  <p className="text-tiny text-ink-400 mt-0.5">
                    {new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <span className="text-2xl font-bold text-ink num">{bookingsMonth}</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-ink/[0.06] p-5 gap-0">
                <div className="text-center px-3">
                  <p className="text-xl font-bold text-green-700 num">{bookingsConfirmed}</p>
                  <p className="text-tiny text-ink-400 mt-1">Confirmed</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-xl font-bold text-ink num">{bookingsPending}</p>
                  <p className="text-tiny text-ink-400 mt-1">Pending</p>
                </div>
                {config.noShowRecovery ? (
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-blue-600 num">{bookingsRecovered}</p>
                    <p className="text-tiny text-ink-400 mt-1">Recovered</p>
                  </div>
                ) : (
                  <div className="text-center px-3 flex flex-col items-center justify-center">
                    <Lock className="w-4 h-4 text-ink-300 mb-1" />
                    <p className="text-tiny text-ink-400 leading-tight">No-show recovery</p>
                    <Link
                      href="/dashboard/billing"
                      className="text-[10px] font-semibold text-ember hover:underline cursor-pointer mt-0.5"
                    >
                      Pro+
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Today's schedule */}
          <div className="rounded-2xl bg-white border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink/[0.06]">
              <div>
                <h2 className="text-h3 text-ink font-semibold">Today&apos;s schedule</h2>
                <p className="text-tiny text-ink-400 mt-0.5">
                  {new Date().toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <Link
                href="/dashboard/bookings"
                className="text-tiny font-medium text-ember hover:underline cursor-pointer"
              >
                All appointments
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2].map((i) => <SkeletonCard key={i} className="h-14" />)}
              </div>
            ) : todayBookings.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-xl bg-ink/[0.05] flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4 text-ink-400" />
                </div>
                <div>
                  <p className="text-small font-medium text-ink">Nothing booked for today</p>
                  <p className="text-tiny text-ink-400 mt-0.5">Qwikly is watching for new enquiries</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-ink/[0.05]">
                {todayBookings.slice(0, 6).map((b) => (
                  <Link
                    key={b.id}
                    href="/dashboard/bookings"
                    className="flex items-center gap-4 px-5 py-4 hover:bg-ink/[0.02] transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="shrink-0 text-center w-12">
                      <p className="text-small font-bold text-ink num leading-none">
                        {formatTime(b.booking_datetime)}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-ink/[0.10] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-semibold text-ink truncate">{b.customer_name}</p>
                      <p className="text-tiny text-ink-400 truncate">
                        {b.job_type ?? "Service"}{b.area ? ` · ${b.area}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 px-2.5 py-1 rounded-lg text-tiny font-semibold",
                        b.status === "confirmed"
                          ? "bg-green-500/10 text-green-700 border border-green-500/20"
                          : "bg-ink/[0.05] text-ink-500 border border-ink/[0.08]"
                      )}
                    >
                      {b.status === "confirmed" ? "Confirmed" : b.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-300 group-hover:text-ink-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent chats */}
          <div className="rounded-2xl bg-white border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink/[0.06]">
              <div>
                <h2 className="text-h3 text-ink font-semibold">Recent chats</h2>
                <p className="text-tiny text-ink-400 mt-0.5">Latest customer conversations</p>
              </div>
              <Link
                href="/dashboard/conversations"
                className="text-tiny font-medium text-ember hover:underline cursor-pointer"
              >
                All chats
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} className="h-12" />)}
              </div>
            ) : recentConvos.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-xl bg-ink/[0.05] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-ink-400" />
                </div>
                <div>
                  <p className="text-small font-medium text-ink">No chats yet</p>
                  <p className="text-tiny text-ink-400 mt-0.5">
                    As soon as someone messages your business, they&apos;ll appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-ink/[0.05]">
                {recentConvos.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/conversations?id=${c.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-ink/[0.02] transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-ink/[0.07] border border-ink/[0.08] flex items-center justify-center shrink-0 text-small font-semibold text-ink-500">
                      {(c.customer_name ?? c.customer_phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-semibold text-ink truncate">
                        {c.customer_name ?? c.customer_phone}
                      </p>
                      <p className="text-tiny text-ink-400">{timeAgo(c.updated_at)}</p>
                    </div>
                    <span className={cn("text-tiny font-semibold shrink-0", statusColor[c.status] ?? "text-ink-400")}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Plan card */}
          <PlanCard tier={tier} bookingsMonth={bookingsMonth} loading={loading} />

          {/* Needs attention */}
          {!loading && escalations.length > 0 && (
            <div className="rounded-2xl bg-white border border-warning/25 overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
              <div className="px-5 pt-5 pb-4 border-b border-warning/[0.14]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <h2 className="text-h3 text-ink font-semibold">Needs your attention</h2>
                </div>
                <p className="text-tiny text-ink-400">
                  {escalations.length} conversation{escalations.length !== 1 ? "s" : ""} waiting for you
                </p>
              </div>
              <div className="divide-y divide-ink/[0.05]">
                {escalations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/conversations?id=${c.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-warning/[0.04] transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0 text-small font-semibold text-warning">
                      {(c.customer_name ?? c.customer_phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-semibold text-ink truncate">
                        {c.customer_name ?? c.customer_phone}
                      </p>
                      <p className="text-tiny text-ink-400">{timeAgo(c.updated_at)}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-warning/60 group-hover:text-warning transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Money snapshot */}
          {!loading && (
            <div className="rounded-2xl bg-white border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
              <div className="px-5 pt-5 pb-4 border-b border-ink/[0.06]">
                <div className="flex items-center justify-between">
                  <h2 className="text-h3 text-ink font-semibold">Money this month</h2>
                  <Link
                    href="/dashboard/invoices"
                    className="text-tiny font-medium text-ember hover:underline cursor-pointer"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-ink/[0.06] flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-ink-400" />
                    </div>
                    <p className="text-small text-ink-500">Invoiced</p>
                  </div>
                  <p className="text-small font-bold text-ink num">{formatZAR(invoicedMonth)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <p className="text-small text-ink-500">Collected</p>
                  </div>
                  <p className="text-small font-bold text-green-700 num">{formatZAR(paidMonth)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className={cn("flex items-center gap-2.5")}>
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", overdueAmount > 0 ? "bg-warning/10" : "bg-ink/[0.04]")}>
                      <Clock className={cn("w-3.5 h-3.5", overdueAmount > 0 ? "text-warning" : "text-ink-300")} />
                    </div>
                    <p className="text-small text-ink-500">Overdue</p>
                  </div>
                  <p className={cn("text-small font-bold num", overdueAmount > 0 ? "text-warning" : "text-ink-400")}>
                    {formatZAR(overdueAmount)}
                  </p>
                </div>

                {invoicedMonth > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-tiny text-ink-400">Collected vs invoiced</p>
                      <p className="text-tiny font-semibold text-ink num">
                        {Math.round((paidMonth / invoicedMonth) * 100)}%
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.round((paidMonth / invoicedMonth) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick shortcuts */}
          {!loading && (
            <div className="rounded-2xl bg-white border border-ink/[0.08] p-5 shadow-[0_1px_4px_rgba(14,14,12,0.05)]">
              <h2 className="text-h3 text-ink font-semibold mb-4">Quick actions</h2>
              <div className="space-y-2">
                {[
                  { href: "/dashboard/conversations", icon: MessageSquare, label: "View all chats",   color: "#E85A2C" },
                  { href: "/dashboard/bookings",      icon: CalendarCheck,  label: "Manage bookings", color: "#3B82F6" },
                  { href: "/dashboard/invoices/new",  icon: Receipt,        label: "Create invoice",  color: "#A855F7" },
                  { href: "/dashboard/settings",      icon: Zap,            label: "Configure Qwikly", color: "#22C55E" },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink/[0.03] transition-colors duration-150 cursor-pointer group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}18`, color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-small text-ink-500 group-hover:text-ink transition-colors flex-1">{label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
