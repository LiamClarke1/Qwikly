"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Rows3, LayoutGrid,
  Phone, MessageSquare, MapPin, Search, X, Check, Clock, Link2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Card, CardHeader } from "@/components/ui/card";
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
  job_type: string | null;
  area: string | null;
  booking_datetime: string | null;
  status: string;
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
  gcal: "bg-violet/15 text-violet border border-violet/20 opacity-80",
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay() === 0 ? 6 : x.getDay() - 1;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 → 18
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BLANK = { customer_name: "", customer_phone: "", job_type: "", area: "", date: "", time: "09:00" };

interface GCalEvent {
  id: string | null | undefined;
  title: string;
  start: string | null | undefined;
  end: string | null | undefined;
  description: string | null;
  location: string | null;
}

export default function BookingsPage() {
  const { client } = useClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filter, setFilter] = useState<Filter>("All");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [active, setActive] = useState<Booking | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(BLANK);
  const [addLoading, setAddLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [gCalEvents, setGCalEvents] = useState<GCalEvent[]>([]);
  const [calConnected, setCalConnected] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("bookings").select("*").order("booking_datetime", { ascending: false });
      setBookings((data as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Fetch Google Calendar events for visible week
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
      .catch(() => {});
  }, [client?.id, weekStart]);

  const filtered = useMemo(() => {
    let list = filter === "All" ? bookings : bookings.filter((b) => b.status.toLowerCase() === filter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
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
    const m: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      if (!b.booking_datetime) return;
      const d = new Date(b.booking_datetime);
      const key = `${d.toDateString()}:${d.getHours()}`;
      if (!m[key]) m[key] = [];
      m[key].push(b);
    });
    // Overlay Google Calendar events as read-only entries
    gCalEvents.forEach((e) => {
      if (!e.start) return;
      const d = new Date(e.start);
      const key = `${d.toDateString()}:${d.getHours()}`;
      if (!m[key]) m[key] = [];
      // Cast gCal event to a Booking-like shape for display
      m[key].push({
        id: e.id ?? `gcal-${e.start}`,
        customer_name: e.title,
        customer_phone: "",
        job_type: e.location ?? null,
        area: null,
        booking_datetime: e.start,
        status: "gcal",
      } as Booking);
    });
    return m;
  }, [bookings, gCalEvents]);

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.booking_datetime && new Date(b.booking_datetime) > new Date() && b.status === "booked").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    revenue: bookings.filter((b) => b.status === "completed").length * 750,
  };

  const updateStatus = async (id: string, status: string) => {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    if (active?.id === id) setActive((a) => a ? { ...a, status } : a);
    await supabase.from("bookings").update({ status }).eq("id", id);
  };

  const openAddForSlot = (d: Date, h: number) => {
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = `${String(h).padStart(2, "0")}:00`;
    setAddForm({ ...BLANK, date: dateStr, time: timeStr });
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!addForm.customer_name.trim() || !addForm.date) return;
    setAddLoading(true);
    const dt = new Date(`${addForm.date}T${addForm.time}:00`);
    const booking = {
      customer_name: addForm.customer_name,
      customer_phone: addForm.customer_phone || "",
      job_type: addForm.job_type || null,
      area: addForm.area || null,
      booking_datetime: dt.toISOString(),
      status: "booked",
    };
    const { data, error } = await supabase.from("bookings").insert([booking]).select().single();
    if (!error && data) {
      setBookings((bs) => [data as Booking, ...bs]);
      setShowAdd(false);
      setAddForm(BLANK);
      // Sync to Google Calendar if connected
      if (client?.id && calConnected) {
        fetch("/api/calendar/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.id, booking }),
        }).catch(() => {});
      }
    }
    setAddLoading(false);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(new Date(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(new Date(d));
  };

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Your appointments. Add new ones, update status, or jump to any week."
        actions={
          <>
            <div className="flex h-9 rounded-xl border border-line bg-white/[0.03] overflow-hidden">
              <button onClick={() => setView("calendar")} className={cn("px-3 flex items-center gap-1.5 text-small font-medium cursor-pointer", view === "calendar" ? "bg-white/[0.06] text-fg" : "text-fg-muted hover:text-fg")}>
                <LayoutGrid className="w-3.5 h-3.5" /> Calendar
              </button>
              <button onClick={() => setView("list")} className={cn("px-3 flex items-center gap-1.5 text-small font-medium cursor-pointer border-l border-line", view === "list" ? "bg-white/[0.06] text-fg" : "text-fg-muted hover:text-fg")}>
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

      {view === "calendar" ? (
        <Card className="!p-0 overflow-hidden">
          {/* Calendar toolbar */}
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-small font-semibold text-fg">
                {days[0].toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                {" – "}
                {days[6].toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <Button variant="ghost" size="sm" onClick={() => { setWeekStart(startOfWeek(new Date())); setSelectedDay(null); }}>
                Today
              </Button>
              {calConnected ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-brand/10 border border-brand/20 text-tiny text-brand font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  Google Calendar
                </span>
              ) : (
                <a href="/dashboard/settings?tab=integrations" className="hidden sm:inline-flex items-center gap-1 text-tiny text-fg-subtle hover:text-brand transition-colors cursor-pointer">
                  <Link2 className="w-3 h-3" /> Connect calendar
                </a>
              )}
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
              <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-line">
                <div className="bg-ink-900" />
                {days.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isSelected = selectedDay === d.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : d.toDateString())}
                      className={cn(
                        "p-2.5 text-center border-l border-line cursor-pointer transition-colors duration-150",
                        isSelected ? "bg-brand/10" : isToday ? "bg-brand/[0.05]" : "bg-ink-900 hover:bg-white/[0.02]"
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{DAY_LABELS[i]}</p>
                      <p className={cn("text-small font-bold num mt-0.5", isToday || isSelected ? "text-brand" : "text-fg")}>{d.getDate()}</p>
                    </button>
                  );
                })}
              </div>

              {/* Hour rows */}
              {HOURS.map((h) => (
                <div key={h} className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-line" style={{ minHeight: "48px" }}>
                  <div className="p-1.5 text-tiny text-fg-subtle text-right pr-2.5 num flex items-start pt-2">{h}:00</div>
                  {days.map((d, i) => {
                    const key = `${d.toDateString()}:${h}`;
                    const items = slotMap[key] ?? [];
                    const isSelected = selectedDay === d.toDateString();
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-l border-line p-0.5 space-y-0.5 transition-colors duration-100",
                          items.length === 0 ? "cursor-pointer" : "",
                          isSelected ? "bg-brand/[0.03]" : "hover:bg-white/[0.015]"
                        )}
                        onClick={() => { if (items.length === 0) openAddForSlot(d, h); }}
                        title={items.length === 0 ? `Add booking — ${DAY_LABELS[i]} ${d.getDate()} at ${h}:00` : undefined}
                      >
                        {items.map((b) => (
                          <button
                            key={b.id}
                            onClick={(e) => { e.stopPropagation(); setActive(b); }}
                            className={cn(
                              "w-full text-left px-1.5 py-1 rounded-md text-[10px] font-medium cursor-pointer hover:brightness-110 transition-all",
                              SLOT_COLOR[b.status] ?? "bg-brand/20 text-brand border border-brand/25"
                            )}
                          >
                            <p className="font-semibold truncate leading-tight">{b.customer_name}</p>
                            <p className="opacity-75 truncate leading-tight">{b.job_type ?? "Service"}</p>
                          </button>
                        ))}
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
          {/* List filters + search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white/[0.03] border border-line max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-fg-subtle" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, job, area…" className="bg-transparent outline-none text-small text-fg placeholder:text-fg-faint flex-1" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("h-9 px-3.5 rounded-xl text-small font-medium cursor-pointer transition-colors duration-150", filter === f ? "bg-brand text-white" : "bg-white/[0.04] text-fg-muted border border-line hover:text-fg hover:bg-white/[0.07]")}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Card className="!p-0 overflow-hidden">
            {loading ? (
              <div className="p-5"><Skeleton className="h-32" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No bookings" description="Once your AI books appointments, they'll show up here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-small">
                  <thead>
                    <tr className="text-fg-subtle text-tiny uppercase tracking-wider border-b border-line">
                      <th className="px-5 py-3 text-left font-medium">Customer</th>
                      <th className="px-5 py-3 text-left font-medium">Phone</th>
                      <th className="px-5 py-3 text-left font-medium">Job</th>
                      <th className="px-5 py-3 text-left font-medium">Area</th>
                      <th className="px-5 py-3 text-left font-medium">Date &amp; time</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setActive(b)}>
                        <td className="px-5 py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar name={b.customer_name} size={28} />
                            <span className="text-fg">{b.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-fg-muted num">{formatPhone(b.customer_phone)}</td>
                        <td className="px-5 py-3 text-fg-muted">{b.job_type ?? "—"}</td>
                        <td className="px-5 py-3 text-fg-muted">{b.area ?? "—"}</td>
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

      {/* Booking detail panel */}
      {active && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActive(null)} />
          <aside className="fixed top-0 right-0 z-50 h-screen w-full max-w-sm bg-ink-900 border-l border-line overflow-y-auto scrollbar-thin animate-slide-up">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-small font-semibold text-fg">Booking details</p>
                <button onClick={() => setActive(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-white/[0.04] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <Avatar name={active.customer_name} size={60} className="mx-auto mb-2.5" />
                <p className="text-h2 text-fg">{active.customer_name}</p>
                <p className="text-small text-fg-muted mt-0.5 num">{formatPhone(active.customer_phone)}</p>
              </div>
              {active.booking_datetime && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-line">
                  <Clock className="w-4 h-4 text-fg-subtle shrink-0" />
                  <div>
                    <p className="text-small font-semibold text-fg num">{formatTime(active.booking_datetime)}</p>
                    <p className="text-tiny text-fg-muted">{formatDate(active.booking_datetime)}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${active.customer_phone.replace(/[^0-9+]/g, "")}`} className="h-10 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center gap-2 text-small font-medium text-fg hover:bg-white/[0.08] cursor-pointer">
                  <Phone className="w-4 h-4" /> Call
                </a>
                <a href={`https://wa.me/${active.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center gap-2 text-small font-medium text-brand hover:bg-brand/20 cursor-pointer">
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </a>
              </div>
              <div>
                <p className="text-tiny text-fg-subtle font-medium mb-2">Job details</p>
                <div className="panel !p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-small text-fg-muted">Job type</span>
                    <span className="text-small text-fg font-medium">{active.job_type ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-small text-fg-muted flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Area</span>
                    <span className="text-small text-fg font-medium">{active.area ?? "—"}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-tiny text-fg-subtle font-medium mb-2">Update status</p>
                <div className="flex flex-wrap gap-1.5">
                  {["booked", "completed", "cancelled", "no-show"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(active.id, s)}
                      className={cn(
                        "px-3 h-8 rounded-lg text-small font-medium cursor-pointer transition-colors duration-150 capitalize",
                        active.status === s ? "bg-white/[0.10] text-fg border border-line-strong" : "bg-white/[0.03] text-fg-muted border border-line hover:text-fg"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Add Booking modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAdd(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-ink-900 border border-line rounded-2xl shadow-pop animate-slide-up p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-h2 text-fg">Add a booking</p>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-white/[0.04] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <ModalField label="Customer name *">
                <input value={addForm.customer_name} onChange={(e) => setAddForm({ ...addForm, customer_name: e.target.value })} placeholder="e.g. John Smith" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
              </ModalField>
              <ModalField label="Phone number">
                <input value={addForm.customer_phone} onChange={(e) => setAddForm({ ...addForm, customer_phone: e.target.value })} placeholder="+27 82 123 4567" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Date *">
                  <input type="date" value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg outline-none focus:border-brand/50 transition-colors" />
                </ModalField>
                <ModalField label="Time">
                  <input type="time" value={addForm.time} onChange={(e) => setAddForm({ ...addForm, time: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg outline-none focus:border-brand/50 transition-colors" />
                </ModalField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Job type">
                  <input value={addForm.job_type} onChange={(e) => setAddForm({ ...addForm, job_type: e.target.value })} placeholder="e.g. Geyser repair" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
                </ModalField>
                <ModalField label="Area">
                  <input value={addForm.area} onChange={(e) => setAddForm({ ...addForm, area: e.target.value })} placeholder="e.g. Sandton" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
                </ModalField>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={addLoading} disabled={!addForm.customer_name.trim() || !addForm.date} icon={<Check className="w-4 h-4" />} onClick={handleAdd}>
                Save booking
              </Button>
            </div>
          </div>
        </>
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
