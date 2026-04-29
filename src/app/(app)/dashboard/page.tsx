"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, MessageSquare, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { useUser } from "@/lib/use-user";
import { formatTime, formatZAR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

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

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-white/[0.04] animate-pulse", className)} />;
}

export default function HomePage() {
  const { client } = useClient();
  const { firstName } = useUser();
  const [loading, setLoading] = useState(true);
  const [bookingsWeek, setBookingsWeek] = useState(0);
  const [revenueWeek, setRevenueWeek] = useState(0);
  const [escalations, setEscalations] = useState<Convo[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startWeek = new Date(now);
      startWeek.setDate(now.getDate() - now.getDay());
      startWeek.setHours(0, 0, 0, 0);
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const [bWeek, esc, today] = await Promise.all([
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: false })
          .gte("created_at", startWeek.toISOString()),
        supabase
          .from("conversations")
          .select("id,customer_name,customer_phone,status,updated_at")
          .eq("status", "escalated")
          .order("updated_at", { ascending: false })
          .limit(3),
        supabase
          .from("bookings")
          .select("id,customer_name,job_type,area,booking_datetime,status")
          .gte("booking_datetime", startDay)
          .lt("booking_datetime", endDay)
          .order("booking_datetime"),
      ]);

      const weekCount = bWeek.count ?? (bWeek.data?.length ?? 0);
      setBookingsWeek(weekCount);
      setRevenueWeek(weekCount * 1800);
      setEscalations((esc.data as Convo[]) ?? []);
      setTodayBookings((today.data as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  }, []);

  const name = firstName || client?.owner_name?.split(" ")[0] || "";

  // "Needs you" items — only real escalations + setup nudges, max 3
  const needsYou = useMemo(() => {
    return escalations.slice(0, 3).map((c) => ({
      id: c.id,
      text: `Review Qwikly's reply to ${c.customer_name ?? c.customer_phone}`,
      href: `/dashboard/conversations?id=${c.id}`,
      age: timeAgo(c.updated_at),
    }));
  }, [escalations]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Greeting */}
      <div>
        <p className="text-fg text-2xl font-semibold leading-snug">
          {greeting}{name ? `, ${name}` : ""}.
        </p>
        {client?.business_name && (
          <p className="text-fg-muted text-small mt-0.5">{client.business_name}</p>
        )}
      </div>

      {/* Hero number */}
      {loading ? (
        <Skeleton className="h-24" />
      ) : (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-6 py-5">
          {bookingsWeek === 0 ? (
            <div className="flex items-start gap-3">
              <span className="mt-1 w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />
              <div>
                <p className="text-fg text-small font-medium">Quiet so far this week.</p>
                <p className="text-fg-muted text-small mt-0.5">Qwikly is on and watching your messages.</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-fg text-3xl font-bold num leading-none">
                {bookingsWeek} appointment{bookingsWeek !== 1 ? "s" : ""} booked this week
              </p>
              <p className="text-fg-muted text-small mt-2">
                {formatZAR(revenueWeek)} in estimated work
              </p>
            </div>
          )}
        </div>
      )}

      {/* Needs you */}
      {!loading && needsYou.length > 0 && (
        <div>
          <p className="text-tiny uppercase tracking-wider font-semibold text-fg-subtle mb-3">
            Needs you
          </p>
          <div className="space-y-2">
            {needsYou.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-warning/[0.06] border border-warning/20 hover:border-warning/40 transition-colors duration-150 cursor-pointer group"
              >
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-small text-fg font-medium truncate">{item.text}</p>
                  <p className="text-tiny text-fg-muted">{item.age}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-fg-subtle group-hover:text-fg transition-colors duration-150 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-tiny uppercase tracking-wider font-semibold text-fg-subtle">
            Today
          </p>
          <Link href="/dashboard/bookings" className="text-tiny text-brand hover:underline font-medium">
            All appointments
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : todayBookings.length === 0 ? (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <CalendarCheck className="w-4 h-4 text-fg-subtle mt-0.5 shrink-0" />
            <p className="text-small text-fg-muted">Nothing on for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.slice(0, 5).map((b) => (
              <Link
                key={b.id}
                href="/dashboard/bookings"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.10] transition-colors duration-150 cursor-pointer"
              >
                <div className="w-14 shrink-0 text-right">
                  <p className="text-small font-bold text-fg num">{formatTime(b.booking_datetime)}</p>
                </div>
                <div className="w-px h-8 bg-white/[0.08] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-semibold text-fg truncate">{b.customer_name}</p>
                  <p className="text-tiny text-fg-muted truncate">
                    {b.job_type ?? "Service"}{b.area ? ` · ${b.area}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent chats preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-tiny uppercase tracking-wider font-semibold text-fg-subtle">
            Recent chats
          </p>
          <Link href="/dashboard/conversations" className="text-tiny text-brand hover:underline font-medium">
            All chats
          </Link>
        </div>
        <RecentChats />
      </div>

      {/* See this month link */}
      <div className="pb-4 text-center">
        <Link
          href="/dashboard/analytics"
          className="text-tiny text-fg-subtle hover:text-fg-muted transition-colors duration-150"
        >
          See this month&apos;s numbers
        </Link>
      </div>
    </div>
  );
}

function RecentChats() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id,customer_name,customer_phone,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(4);
      setConvos((data as Convo[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />)}
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <MessageSquare className="w-4 h-4 text-fg-subtle mt-0.5 shrink-0" />
        <p className="text-small text-fg-muted">
          No customer chats yet. As soon as someone messages your business, they&apos;ll show up here.
        </p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    active: "Replied",
    new: "New",
    escalated: "Needs you",
    booked: "Booked",
    closed: "Done",
  };

  const statusColor: Record<string, string> = {
    active: "text-brand",
    new: "text-sky-400",
    escalated: "text-warning",
    booked: "text-green-400",
    closed: "text-fg-subtle",
  };

  return (
    <div className="space-y-1">
      {convos.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/conversations?id=${c.id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 text-small font-semibold text-fg-muted">
            {(c.customer_name ?? c.customer_phone).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-small font-semibold text-fg truncate">
              {c.customer_name ?? c.customer_phone}
            </p>
            <p className="text-tiny text-fg-muted">{timeAgo(c.updated_at)}</p>
          </div>
          <span className={cn("text-tiny font-semibold shrink-0", statusColor[c.status] ?? "text-fg-subtle")}>
            {statusLabel[c.status] ?? c.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
