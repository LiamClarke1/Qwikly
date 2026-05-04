"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Rows3, LayoutGrid,
  Phone, MessageSquare, MapPin, Search, X, Check, Clock, Link2,
  Trash2, Calendar, Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatPhone, formatTime } from "@/lib/format";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  job_type: string | null;
  area: string | null;
  booking_datetime: string | null;
  status: string;
  service_price: number | null;
  price_display: string | null;
  notes: string | null;
}

const FILTERS = ["All", "Booked", "Completed", "Cancelled", "No-show"] as const;
type Filter = (typeof FILTERS)[number];

const TONE: Record<string, "brand" | "success" | "danger" | "warning" | "neutral"> = {
  booked: "brand",
  completed: "success",
  cancelled: "danger",
  "no-show": "warning",
};

const SLOT_COLOR: Record<string, string> = {
  completed: "bg-success/15 text-success border border-success/20",
  cancelled: "bg-danger/15 text-danger border border-danger/20",
  "no-show": "bg-warning/15 text-warning border border-warning/20",
  gcal: "bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/25",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  booked:    { label: "Booked",    color: "bg-ember/15 text-ember border border-ember/25" },
  completed: { label: "Completed", color: "bg-success/15 text-success border border-success/25" },
  cancelled: { label: "Cancelled", color: "bg-danger/15 text-danger border border-danger/25" },
  "no-show": { label: "No-show",   color: "bg-warning/15 text-warning border border-warning/25" },
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay() === 0 ? 6 : x.getDay() - 1;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 → 22
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRICE_TYPES = ["fixed", "range", "cash", "no-cash"] as const;
type PriceType = typeof PRICE_TYPES[number];
const PRICE_LABELS: Record<PriceType, string> = { fixed: "Fixed", range: "Range", cash: "Cash", "no-cash": "No Cash" };

const BLANK = { customer_name: "", customer_phone: "", customer_email: "", job_type: "", area: "", date: "", time: "09:00", priceType: "fixed" as PriceType, priceMin: "", priceMax: "", notes: "" };

interface GCalEvent {
  id: string | null | undefined;
  title: string;
  start: string | null | undefined;
  end: string | null | undefined;
  description: string | null;
  location: string | null;
}

type ActiveItem = (Booking & { _isGcal?: false }) | (GCalEvent & { _isGcal: true });

export default function BookingsPage() {
  const { client } = useClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filter, setFilter] = useState<Filter>("All");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(BLANK);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [gCalEvents, setGCalEvents] = useState<GCalEvent[]>([]);
  const [calConnected, setCalConnected] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editingGcal, setEditingGcal] = useState(false);
  const [gcalEditForm, setGcalEditForm] = useState({ title: "", date: "", startTime: "", endTime: "" });
  const [gcalActionLoading, setGcalActionLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("bookings").select("*").order("booking_datetime", { ascending: false });
      setBookings((data as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!client?.id) return;
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    fetch(`/api/calendar/events?clientId=${client.id}&start=${start.toISOString()}&end=${end.toISOString()}`)
      .then((r) => r.json())
      .then((json) => {
        setCalConnected(json.connected ?? false);
        setGCalEvents(json.events ?? []);
      })
      .catch(() => setCalConnected(false));
  }, [client?.id, weekStart]);

  const filtered = useMemo(() => {
    let list = filter === "All" ? bookings : bookings.filter((b) => b.status.toLowerCase() === filter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_phone.includes(q) ||
        (b.job_type ?? "").toLowerCase().includes(q) ||
        (b.area ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, filter, search]);

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const slotMap = useMemo(() => {
    const m: Record<string, Array<{ type: "booking"; data: Booking } | { type: "gcal"; data: GCalEvent }>> = {};
    bookings.forEach((b) => {
      if (!b.booking_datetime) return;
      const d = new Date(b.booking_datetime);
      const key = `${d.toDateString()}:${d.getHours()}`;
      if (!m[key]) m[key] = [];
      m[key].push({ type: "booking", data: b });
    });
    gCalEvents.forEach((e) => {
      if (!e.start) return;
      const d = new Date(e.start);
      const key = `${d.toDateString()}:${d.getHours()}`;
      if (!m[key]) m[key] = [];
      m[key].push({ type: "gcal", data: e });
    });
    return m;
  }, [bookings, gCalEvents]);

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.booking_datetime && new Date(b.booking_datetime) > new Date() && b.status === "booked").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    revenue: bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + (b.service_price ?? 0), 0),
  };

  const updateStatus = async (id: string, status: string) => {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    if (active && !("_isGcal" in active) && (active as Booking).id === id) {
      setActive({ ...(active as Booking), status });
    }
    await supabase.from("bookings").update({ status }).eq("id", id);
  };

  const deleteBooking = async (id: string) => {
    setDeleteLoading(true);
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      setBookings((bs) => bs.filter((b) => b.id !== id));
      setActive(null);
      showToast("Booking deleted", true);
    } else {
      showToast("Failed to delete booking", false);
    }
    setDeleteLoading(false);
  };

  const openAddForSlot = (d: Date, h: number) => {
    // Use local date components — toISOString() converts to UTC which gives the wrong date in UTC+2
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(h).padStart(2, "0")}:00`;
    setAddForm({ ...BLANK, date: dateStr, time: timeStr });
    setShowAdd(true);
  };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    if (!addForm.customer_name.trim() || !addForm.date) return;
    setAddLoading(true);
    const dt = new Date(`${addForm.date}T${addForm.time}:00`);

    const priceMin = addForm.priceMin ? parseFloat(addForm.priceMin) : null;
    const priceMax = addForm.priceMax ? parseFloat(addForm.priceMax) : null;
    let price_display: string | null = null;
    let service_price: number | null = null;
    if (addForm.priceType === "fixed" && priceMin != null) {
      price_display = `R${priceMin.toLocaleString("en-ZA")}`;
      service_price = priceMin;
    } else if (addForm.priceType === "range" && priceMin != null) {
      price_display = priceMax != null
        ? `R${priceMin.toLocaleString("en-ZA")} – R${priceMax.toLocaleString("en-ZA")}`
        : `R${priceMin.toLocaleString("en-ZA")}+`;
      service_price = priceMin;
    } else if (addForm.priceType === "cash") {
      price_display = "Cash";
    } else if (addForm.priceType === "no-cash") {
      price_display = "No Cash / EFT";
    }

    const bookingBase = {
      customer_name: addForm.customer_name,
      customer_phone: addForm.customer_phone || "",
      customer_email: addForm.customer_email || null,
      job_type: addForm.job_type || null,
      area: addForm.area || null,
      booking_datetime: dt.toISOString(),
      status: "booked",
      service_price,
      notes: addForm.notes || null,
    };

    let { data, error } = await supabase.from("bookings").insert([{ ...bookingBase, price_display }]).select().maybeSingle();
    // If price_display column doesn't exist yet, retry without it
    if (error?.message?.includes("price_display")) {
      ({ data, error } = await supabase.from("bookings").insert([bookingBase]).select().maybeSingle());
    }
    if (!error && data) {
      setBookings((bs) => [data as Booking, ...bs]);
      setShowAdd(false);
      setAddForm(BLANK);
      setWeekStart(startOfWeek(dt));

      let calFailed = false;
      let emailFailed = false;

      if (client?.id && calConnected) {
        try {
          const r = await fetch("/api/calendar/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId: client.id, booking: { ...bookingBase, price_display, customer_email: addForm.customer_email || null } }),
          });
          if (!r.ok) calFailed = true;
        } catch { calFailed = true; }
      }

      if (addForm.customer_email && client?.id) {
        try {
          const r = await fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "confirmation", bookingId: data.id, clientId: client.id }),
          });
          if (!r.ok) emailFailed = true;
        } catch { emailFailed = true; }
      }

      if (calFailed) showToast("Booking saved. Calendar sync failed.", false);
      else if (emailFailed) showToast("Booking saved. Email failed to send.", false);
      else if (addForm.customer_email) showToast(`Booking saved · confirmation sent to ${addForm.customer_email}`);
      else showToast("Booking saved");
    } else {
      showToast("Failed to save booking. Try again.", false);
    }
    setAddLoading(false);
  };

  const deleteGcalEvent = async (eventId: string) => {
    if (!client?.id) return;
    setGcalActionLoading(true);
    const r = await fetch("/api/calendar/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, eventId }),
    });
    if (r.ok) {
      setGCalEvents((evs) => evs.filter((e) => e.id !== eventId));
      setActive(null);
      showToast("Event deleted from Google Calendar");
    } else {
      showToast("Failed to delete event", false);
    }
    setGcalActionLoading(false);
  };

  const saveGcalEdit = async () => {
    if (!client?.id || !activeGcal?.id) return;
    setGcalActionLoading(true);
    const start = new Date(`${gcalEditForm.date}T${gcalEditForm.startTime}:00`);
    const end = new Date(`${gcalEditForm.date}T${gcalEditForm.endTime}:00`);
    const r = await fetch("/api/calendar/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        eventId: activeGcal.id,
        title: gcalEditForm.title,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
      }),
    });
    if (r.ok) {
      const updatedStart = start.toISOString();
      const updatedEnd = end.toISOString();
      setGCalEvents((evs) => evs.map((e) =>
        e.id === activeGcal.id ? { ...e, title: gcalEditForm.title, start: updatedStart, end: updatedEnd } : e
      ));
      setActive({ ...activeGcal, title: gcalEditForm.title, start: updatedStart, end: updatedEnd });
      setEditingGcal(false);
      showToast("Event updated in Google Calendar");
    } else {
      showToast("Failed to update event", false);
    }
    setGcalActionLoading(false);
  };

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(new Date(d)); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(new Date(d)); };

  const activeIsGcal = active && "_isGcal" in active && active._isGcal;
  const activeBooking = active && !activeIsGcal ? active as Booking : null;
  const activeGcal = activeIsGcal ? active as GCalEvent & { _isGcal: true } : null;

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Your appointments. Add new ones, update status, or jump to any week."
        actions={
          <>
            <div className="flex h-9 rounded-xl border border-[var(--border)] bg-surface-input overflow-hidden">
              <button onClick={() => setView("calendar")} className={cn("px-3 flex items-center gap-1.5 text-small font-medium cursor-pointer transition-colors", view === "calendar" ? "bg-surface-active text-fg" : "text-fg-muted hover:text-fg")}>
                <LayoutGrid className="w-3.5 h-3.5" /> Calendar
              </button>
              <button onClick={() => setView("list")} className={cn("px-3 flex items-center gap-1.5 text-small font-medium cursor-pointer border-l border-[var(--border)] transition-colors", view === "list" ? "bg-surface-active text-fg" : "text-fg-muted hover:text-fg")}>
                <Rows3 className="w-3.5 h-3.5" /> List
              </button>
            </div>
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setAddForm(BLANK); setShowAdd(true); }}>
              Add booking
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total bookings", value: stats.total, color: "#38BDF8" },
          { label: "Upcoming", value: stats.upcoming, color: "#60A5FA" },
          { label: "Completed", value: stats.completed, color: "#22C55E" },
          { label: "Est. revenue", value: `R${stats.revenue.toLocaleString("en-ZA")}`, color: "#8B5CF6" },
        ].map((s, i) => (
          <Card key={i} className="!p-4">
            <p className="text-tiny text-fg-subtle font-medium mb-1">{s.label}</p>
            <p className="text-h1 text-fg num leading-none" style={{ color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Connect calendar banner — only shown when explicitly disconnected */}
      {calConnected === false && (
        <div className="mb-4 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-ember/[0.06] border border-ember/20">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-ember shrink-0" />
            <p className="text-small text-fg-muted">Connect your Google Calendar to see all your appointments in one place.</p>
          </div>
          <a href="/dashboard/settings?tab=integrations" className="shrink-0 text-small font-semibold text-ember hover:text-ember-deep transition-colors cursor-pointer">
            Connect calendar
          </a>
        </div>
      )}

      {view === "calendar" ? (
        <Card className="!p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-small font-semibold text-fg">
                {days[0].toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                {" – "}
                {days[6].toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <Button variant="ghost" size="sm" onClick={() => { setWeekStart(startOfWeek(new Date())); setSelectedDay(null); }}>
                Today
              </Button>
              {calConnected === true ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/25 text-tiny text-[#818cf8] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
                  Google Calendar synced
                </span>
              ) : calConnected === false ? (
                <a href="/dashboard/settings?tab=integrations" className="hidden sm:inline-flex items-center gap-1 text-tiny text-fg-subtle hover:text-ember transition-colors cursor-pointer">
                  <Link2 className="w-3 h-3" /> Connect calendar
                </a>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-tiny text-fg-subtle mr-1 hidden sm:block">Click any slot to add a booking</p>
              <Button variant="outline" size="icon" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Day headers */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)]">
                <div className="bg-surface-card" />
                {days.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isSelected = selectedDay === d.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : d.toDateString())}
                      className={cn(
                        "p-2.5 text-center border-l border-[var(--border)] cursor-pointer transition-colors duration-150",
                        isSelected ? "bg-ember/10" : isToday ? "bg-ember/[0.05]" : "bg-surface-card hover:bg-surface-hover"
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{DAY_LABELS[i]}</p>
                      <p className={cn("text-small font-bold num mt-0.5", isToday || isSelected ? "text-ember" : "text-fg")}>{d.getDate()}</p>
                    </button>
                  );
                })}
              </div>

              {/* Hour rows */}
              {HOURS.map((h) => (
                <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)]" style={{ minHeight: "56px" }}>
                  <div className="text-tiny text-fg-subtle text-right pr-3 num flex items-start pt-2 leading-none">{h}:00</div>
                  {days.map((d, i) => {
                    const key = `${d.toDateString()}:${h}`;
                    const items = slotMap[key] ?? [];
                    const isSelected = selectedDay === d.toDateString();
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-l border-[var(--border)] p-0.5 space-y-0.5 transition-colors duration-100",
                          items.length === 0 ? "cursor-pointer" : "",
                          isSelected ? "bg-ember/[0.03]" : "hover:bg-surface-hover"
                        )}
                        onClick={() => { if (items.length === 0) openAddForSlot(d, h); }}
                        title={items.length === 0 ? `Add booking — ${DAY_LABELS[i]} ${d.getDate()} at ${h}:00` : undefined}
                      >
                        {items.map((item, idx) => {
                          if (item.type === "gcal") {
                            const startTime = item.data.start ? new Date(item.data.start).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
                            return (
                              <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setActive({ ...item.data, _isGcal: true }); }}
                                className="w-full text-left px-1.5 py-1 rounded-md text-[10px] font-medium cursor-pointer hover:brightness-110 transition-all bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/25"
                              >
                                <p className="font-semibold truncate leading-tight">{item.data.title}</p>
                                <p className="opacity-70 truncate leading-tight">{startTime}</p>
                              </button>
                            );
                          }
                          const b = item.data;
                          const startTime = b.booking_datetime ? new Date(b.booking_datetime).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
                          return (
                            <button
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); setActive({ ...b, _isGcal: false } as Booking & { _isGcal: false }); }}
                              className={cn(
                                "w-full text-left px-1.5 py-1 rounded-md text-[10px] font-medium cursor-pointer hover:brightness-110 transition-all",
                                SLOT_COLOR[b.status] ?? "bg-ember/15 text-ember border border-ember/25"
                              )}
                            >
                              <p className="font-semibold truncate leading-tight">{b.customer_name}</p>
                              <p className="opacity-75 truncate leading-tight">{startTime} · {b.job_type ?? "Service"}</p>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-fg-subtle" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, job, area…" className="bg-transparent outline-none text-small text-fg placeholder:text-fg-faint flex-1" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("h-9 px-3.5 rounded-xl text-small font-medium cursor-pointer transition-colors duration-150", filter === f ? "bg-ember text-paper" : "bg-surface-input text-fg-muted border border-[var(--border)] hover:text-fg hover:bg-surface-hover")}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Card className="!p-0 overflow-hidden">
            {loading ? (
              <div className="p-5"><Skeleton className="h-32" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No bookings" description="Once your digital assistant books appointments, they'll show up here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-small">
                  <thead>
                    <tr className="text-fg-subtle text-tiny uppercase tracking-wider border-b border-[var(--border)]">
                      <th className="px-5 py-3 text-left font-medium">Customer</th>
                      <th className="px-5 py-3 text-left font-medium">Phone</th>
                      <th className="px-5 py-3 text-left font-medium">Job</th>
                      <th className="px-5 py-3 text-left font-medium">Area</th>
                      <th className="px-5 py-3 text-left font-medium">Date &amp; time</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map((b) => (
                      <tr key={b.id} className="hover:bg-surface-hover cursor-pointer transition-colors" onClick={() => setActive({ ...b, _isGcal: false })}>
                        <td className="px-5 py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar name={b.customer_name} size={28} />
                            <span className="text-fg">{b.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-fg-muted num">{formatPhone(b.customer_phone)}</td>
                        <td className="px-5 py-3 text-fg-muted">{b.job_type ?? "N/A"}</td>
                        <td className="px-5 py-3 text-fg-muted">{b.area ?? "N/A"}</td>
                        <td className="px-5 py-3 text-fg-muted num">{formatDateTime(b.booking_datetime)}</td>
                        <td className="px-5 py-3"><Badge tone={TONE[b.status] ?? "neutral"} dot>{b.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Booking detail panel — bottom sheet on mobile, centred modal on desktop */}
      {active && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => { setActive(null); setEditingGcal(false); }} />
          <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto bg-surface-card rounded-t-2xl border-t border-[var(--border)] scrollbar-thin animate-slide-up md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:max-h-[88vh] md:rounded-2xl md:border md:shadow-pop">
            {/* Drag handle — mobile only */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
            </div>
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-small font-semibold text-fg">
                    {activeIsGcal ? "Calendar event" : "Booking details"}
                  </p>
                  {activeIsGcal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#6366f1]/15 border border-[#6366f1]/25 text-[10px] text-[#818cf8] font-medium">
                      <Calendar className="w-2.5 h-2.5" /> Google Calendar
                    </span>
                  )}
                </div>
                <button onClick={() => { setActive(null); setEditingGcal(false); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover cursor-pointer transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Google Calendar event */}
              {activeGcal && (
                <>
                  {!editingGcal ? (
                    <>
                      <div className="text-center py-2">
                        <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/25 flex items-center justify-center mx-auto mb-3">
                          <Calendar className="w-6 h-6 text-[#818cf8]" />
                        </div>
                        <p className="text-h2 text-fg">{activeGcal.title}</p>
                        {activeGcal.location && (
                          <p className="text-small text-fg-muted mt-1 flex items-center justify-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> {activeGcal.location}
                          </p>
                        )}
                      </div>

                      {activeGcal.start && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-input border border-[var(--border)]">
                          <Clock className="w-4 h-4 text-fg-subtle shrink-0" />
                          <div>
                            <p className="text-small font-semibold text-fg num">
                              {new Date(activeGcal.start).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false })}
                              {activeGcal.end && ` – ${new Date(activeGcal.end).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false })}`}
                            </p>
                            <p className="text-tiny text-fg-muted">
                              {new Date(activeGcal.start).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeGcal.description && (
                        <div className="px-4 py-3 rounded-xl bg-surface-input border border-[var(--border)]">
                          <p className="text-tiny text-fg-subtle font-medium mb-1">Notes</p>
                          <p className="text-small text-fg-muted">{activeGcal.description}</p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          const s = activeGcal.start ? new Date(activeGcal.start) : new Date();
                          const e = activeGcal.end ? new Date(activeGcal.end) : new Date(s.getTime() + 3600000);
                          setGcalEditForm({
                            title: activeGcal.title,
                            date: s.toISOString().split("T")[0],
                            startTime: s.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }),
                            endTime: e.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }),
                          });
                          setEditingGcal(true);
                        }}
                        className="w-full h-10 rounded-xl bg-surface-input border border-[var(--border)] flex items-center justify-center gap-2 text-small font-medium text-fg hover:bg-surface-hover cursor-pointer transition-colors"
                      >
                        <Pencil className="w-4 h-4" /> Edit event
                      </button>

                      <button
                        onClick={() => activeGcal.id && deleteGcalEvent(activeGcal.id)}
                        disabled={gcalActionLoading || !activeGcal.id}
                        className="w-full h-10 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center gap-2 text-small font-medium text-danger hover:bg-danger/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        {gcalActionLoading ? "Deleting…" : "Delete event"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-small font-semibold text-fg">Edit event</p>
                      <div className="space-y-3">
                        <ModalField label="Title">
                          <input
                            value={gcalEditForm.title}
                            onChange={(e) => setGcalEditForm({ ...gcalEditForm, title: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg outline-none focus:border-ember/50 transition-colors"
                          />
                        </ModalField>
                        <ModalField label="Date">
                          <input
                            type="date"
                            value={gcalEditForm.date}
                            onChange={(e) => setGcalEditForm({ ...gcalEditForm, date: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg outline-none focus:border-ember/50 transition-colors"
                          />
                        </ModalField>
                        <div className="grid grid-cols-2 gap-3">
                          <ModalField label="Start time">
                            <input
                              type="time"
                              value={gcalEditForm.startTime}
                              onChange={(e) => setGcalEditForm({ ...gcalEditForm, startTime: e.target.value })}
                              className="w-full h-10 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg outline-none focus:border-ember/50 transition-colors"
                            />
                          </ModalField>
                          <ModalField label="End time">
                            <input
                              type="time"
                              value={gcalEditForm.endTime}
                              onChange={(e) => setGcalEditForm({ ...gcalEditForm, endTime: e.target.value })}
                              className="w-full h-10 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg outline-none focus:border-ember/50 transition-colors"
                            />
                          </ModalField>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setEditingGcal(false)}>Cancel</Button>
                        <Button
                          variant="primary"
                          className="flex-1"
                          loading={gcalActionLoading}
                          disabled={!gcalEditForm.title.trim() || !gcalEditForm.date}
                          icon={<Check className="w-4 h-4" />}
                          onClick={saveGcalEdit}
                        >
                          Save
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Qwikly booking */}
              {activeBooking && (
                <>
                  <div className="text-center py-2">
                    <Avatar name={activeBooking.customer_name} size={60} className="mx-auto mb-3" />
                    <p className="text-h2 text-fg">{activeBooking.customer_name}</p>
                    <p className="text-small text-fg-muted mt-0.5 num">{formatPhone(activeBooking.customer_phone)}</p>
                    <div className="mt-2 flex justify-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-lg text-tiny font-semibold capitalize", STATUS_CONFIG[activeBooking.status]?.color ?? "bg-surface-input text-fg-muted border border-[var(--border)]")}>
                        {STATUS_CONFIG[activeBooking.status]?.label ?? activeBooking.status}
                      </span>
                    </div>
                  </div>

                  {activeBooking.booking_datetime && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-input border border-[var(--border)]">
                      <Clock className="w-4 h-4 text-fg-subtle shrink-0" />
                      <div>
                        <p className="text-small font-semibold text-fg num">{formatTime(activeBooking.booking_datetime)}</p>
                        <p className="text-tiny text-fg-muted">{formatDate(activeBooking.booking_datetime)}</p>
                      </div>
                    </div>
                  )}

                  <div className={cn("grid gap-2", activeBooking.customer_email ? "grid-cols-3" : "grid-cols-2")}>
                    {/* Call — opens native phone dialler */}
                    <a
                      href={`tel:${activeBooking.customer_phone.replace(/[^0-9+]/g, "")}`}
                      className="min-h-[44px] rounded-xl bg-surface-input border border-[var(--border)] flex flex-col items-center justify-center gap-0.5 text-tiny font-medium text-fg hover:bg-surface-hover active:bg-surface-active cursor-pointer transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call</span>
                    </a>

                    {/* WhatsApp — opens chat with pre-filled message */}
                    <a
                      href={`https://wa.me/${activeBooking.customer_phone.replace(/\D/g, "").replace(/^0/, "27")}?text=${encodeURIComponent(`Hi ${activeBooking.customer_name}, confirming your ${activeBooking.job_type ?? "service"} booking${activeBooking.booking_datetime ? ` on ${formatDate(activeBooking.booking_datetime)} at ${formatTime(activeBooking.booking_datetime)}` : ""}. Please reply if you have any questions.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex flex-col items-center justify-center gap-0.5 text-tiny font-medium text-[#25D366] hover:bg-[#25D366]/25 active:bg-[#25D366]/30 cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>

                    {/* Email — opens mail client with subject + body pre-filled */}
                    {activeBooking.customer_email && (
                      <a
                        href={`mailto:${activeBooking.customer_email}?subject=${encodeURIComponent(`Your ${activeBooking.job_type ?? "service"} booking`)}&body=${encodeURIComponent(`Hi ${activeBooking.customer_name},\n\nThis is regarding your ${activeBooking.job_type ?? "service"} booking${activeBooking.booking_datetime ? ` on ${formatDate(activeBooking.booking_datetime)} at ${formatTime(activeBooking.booking_datetime)}` : ""}.\n\nPlease reply if you have any questions.\n\nKind regards`)}`}
                        className="min-h-[44px] rounded-xl bg-surface-input border border-[var(--border)] flex flex-col items-center justify-center gap-0.5 text-tiny font-medium text-fg hover:bg-surface-hover active:bg-surface-active cursor-pointer transition-colors"
                      >
                        <Link2 className="w-4 h-4" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  <div>
                    <p className="text-tiny text-fg-subtle font-medium mb-2">Job details</p>
                    <div className="panel !p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-small text-fg-muted">Job type</span>
                        <span className="text-small text-fg font-medium">{activeBooking.job_type ?? "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-small text-fg-muted flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Area</span>
                        <span className="text-small text-fg font-medium">{activeBooking.area ?? "N/A"}</span>
                      </div>
                      {(activeBooking.price_display || activeBooking.service_price != null) && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]">
                          <span className="text-small text-fg-muted">Price</span>
                          <span className="text-small text-fg font-semibold num">
                            {activeBooking.price_display ?? `R${activeBooking.service_price!.toLocaleString("en-ZA")}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeBooking.notes && (
                    <div>
                      <p className="text-tiny text-fg-subtle font-medium mb-2">Job notes</p>
                      <div className="panel !p-3">
                        <p className="text-small text-fg-muted leading-relaxed">{activeBooking.notes}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-tiny text-fg-subtle font-medium mb-2">Update status</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["booked", "completed", "cancelled", "no-show"].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(activeBooking.id, s)}
                          className={cn(
                            "h-9 rounded-lg text-small font-medium cursor-pointer transition-colors duration-150 capitalize",
                            activeBooking.status === s
                              ? "bg-surface-active text-fg border border-[var(--border-strong)]"
                              : "bg-surface-input text-fg-muted border border-[var(--border)] hover:text-fg hover:bg-surface-hover"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <button
                      onClick={() => deleteBooking(activeBooking.id)}
                      disabled={deleteLoading}
                      className="w-full h-10 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center gap-2 text-small font-medium text-danger hover:bg-danger/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteLoading ? "Deleting…" : "Delete booking"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Add Booking modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAdd(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-surface-card border border-[var(--border)] rounded-2xl shadow-pop animate-slide-up flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <p className="text-h2 text-fg">Add a booking</p>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 flex-1 scrollbar-thin">
            <div className="space-y-3">
              {/* Row 1: Name */}
              <ModalField label="Customer name *">
                <input value={addForm.customer_name} onChange={(e) => setAddForm({ ...addForm, customer_name: e.target.value })} placeholder="e.g. John Smith" className="w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
              </ModalField>

              {/* Row 2: Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Phone">
                  <input value={addForm.customer_phone} onChange={(e) => setAddForm({ ...addForm, customer_phone: e.target.value })} placeholder="+27 82 123 4567" className="w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                </ModalField>
                <ModalField label="Email">
                  <input type="email" value={addForm.customer_email} onChange={(e) => setAddForm({ ...addForm, customer_email: e.target.value })} placeholder="optional" className="w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                </ModalField>
              </div>

              {/* Row 3: Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Date *">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { const d = addForm.date ? new Date(addForm.date + "T12:00:00") : new Date(); d.setDate(d.getDate() - 1); setAddForm({ ...addForm, date: d.toISOString().split("T")[0] }); }} className="w-7 h-9 flex items-center justify-center rounded-lg bg-surface-input border border-[var(--border)] text-fg-muted hover:text-fg cursor-pointer transition-colors shrink-0"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <input type="date" value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} className="flex-1 h-9 px-2 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg outline-none focus:border-ember/50 transition-colors text-center min-w-0" />
                    <button type="button" onClick={() => { const d = addForm.date ? new Date(addForm.date + "T12:00:00") : new Date(); d.setDate(d.getDate() + 1); setAddForm({ ...addForm, date: d.toISOString().split("T")[0] }); }} className="w-7 h-9 flex items-center justify-center rounded-lg bg-surface-input border border-[var(--border)] text-fg-muted hover:text-fg cursor-pointer transition-colors shrink-0"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </ModalField>
                <ModalField label="Time">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const [h, m] = addForm.time.split(":").map(Number);
                        const total = Math.max(0, h * 60 + m - 30);
                        setAddForm({ ...addForm, time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}` });
                      }}
                      className="w-7 h-9 flex items-center justify-center rounded-lg bg-surface-input border border-[var(--border)] text-fg-muted hover:text-fg cursor-pointer transition-colors shrink-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="time"
                      value={addForm.time}
                      onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                      className="flex-1 h-9 px-2 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg outline-none focus:border-ember/50 transition-colors text-center min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const [h, m] = addForm.time.split(":").map(Number);
                        const total = Math.min(23 * 60 + 30, h * 60 + m + 30);
                        setAddForm({ ...addForm, time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}` });
                      }}
                      className="w-7 h-9 flex items-center justify-center rounded-lg bg-surface-input border border-[var(--border)] text-fg-muted hover:text-fg cursor-pointer transition-colors shrink-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </ModalField>
              </div>

              {/* Row 4: Job type + Area */}
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Job type">
                  <input value={addForm.job_type} onChange={(e) => setAddForm({ ...addForm, job_type: e.target.value })} placeholder="e.g. Geyser repair" className="w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                </ModalField>
                <ModalField label="Area">
                  <input value={addForm.area} onChange={(e) => setAddForm({ ...addForm, area: e.target.value })} placeholder="e.g. Sandton" className="w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                </ModalField>
              </div>

              {/* Price */}
              <ModalField label="Price">
                <div className="space-y-2">
                  <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
                    {PRICE_TYPES.map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setAddForm({ ...addForm, priceType: pt })}
                        className={cn(
                          "flex-1 h-8 text-tiny font-medium cursor-pointer transition-colors",
                          addForm.priceType === pt ? "bg-ember text-paper" : "bg-surface-input text-fg-muted hover:text-fg"
                        )}
                      >
                        {PRICE_LABELS[pt]}
                      </button>
                    ))}
                  </div>
                  {addForm.priceType === "fixed" && (
                    <input type="number" min="0" value={addForm.priceMin} onChange={(e) => setAddForm({ ...addForm, priceMin: e.target.value })} placeholder="Amount e.g. 1500" className="w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                  )}
                  {addForm.priceType === "range" && (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
                      <input type="number" min="0" value={addForm.priceMin} onChange={(e) => setAddForm({ ...addForm, priceMin: e.target.value })} placeholder="From" className="min-w-0 w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                      <span className="text-tiny text-fg-subtle">to</span>
                      <input type="number" min="0" value={addForm.priceMax} onChange={(e) => setAddForm({ ...addForm, priceMax: e.target.value })} placeholder="To" className="min-w-0 w-full h-9 px-3 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors" />
                    </div>
                  )}
                </div>
              </ModalField>

              {/* Notes — always visible */}
              <ModalField label="Job notes">
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Access code, special instructions, customer requests…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-surface-input border border-[var(--border)] text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/50 transition-colors resize-none"
                />
              </ModalField>
            </div>
            {addForm.date && addForm.time && new Date(`${addForm.date}T${addForm.time}:00`) < new Date() && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/25 text-tiny text-warning mt-3">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                This date and time is in the past.
              </div>
            )}
            <div className="pb-4" />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={addLoading} disabled={!addForm.customer_name.trim() || !addForm.date} icon={<Check className="w-4 h-4" />} onClick={handleAdd}>
                Save booking
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-surface-card border border-[var(--border-strong)] shadow-pop text-small text-fg flex items-center gap-2 motion-safe:animate-[fadeIn_150ms_ease-out] whitespace-nowrap">
          {toast.ok
            ? <Check className="w-3.5 h-3.5 text-success shrink-0" />
            : <X className="w-3.5 h-3.5 text-danger shrink-0" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-tiny text-fg-subtle font-medium mb-1.5">{label}</p>
      {children}
    </div>
  );
}
