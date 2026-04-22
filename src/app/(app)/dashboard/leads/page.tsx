"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import {
  Users, UserCheck, PhoneCall, TrendingUp, LayoutGrid, Rows3,
  Phone, MessageSquare, ChevronRight, Plus, Search, X, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatDate, formatPhone, timeAgo } from "@/lib/format";

interface Lead {
  id: string;
  phone_number: string;
  customer_name: string | null;
  job_type: string | null;
  area: string | null;
  status: string;
  created_at: string;
}

const STAGES = [
  { id: "new", label: "New", tone: "sky" as const, color: "#38BDF8" },
  { id: "followed_up", label: "Followed up", tone: "warning" as const, color: "#60A5FA" },
  { id: "booked", label: "Booked", tone: "brand" as const, color: "#3B82F6" },
  { id: "lost", label: "Lost", tone: "danger" as const, color: "#F87171" },
];

const BLANK = { customer_name: "", phone_number: "", job_type: "", area: "", status: "new" };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads((data as Lead[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        (l.customer_name ?? "").toLowerCase().includes(q) ||
        l.phone_number.includes(q) ||
        (l.job_type ?? "").toLowerCase().includes(q) ||
        (l.area ?? "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  const grouped = useMemo(() => {
    const m: Record<string, Lead[]> = { new: [], followed_up: [], booked: [], lost: [] };
    filtered.forEach((l) => { if (m[l.status]) m[l.status].push(l); else m.new.push(l); });
    return m;
  }, [filtered]);

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    booked: leads.filter((l) => l.status === "booked").length,
    rate: leads.length ? Math.round((leads.filter((l) => l.status === "booked").length / leads.length) * 100) : 0,
  };

  const move = async (id: string, status: string) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    if (active?.id === id) setActive((a) => a ? { ...a, status } : a);
    await supabase.from("leads").update({ status }).eq("id", id);
  };

  const handleAdd = async () => {
    if (!form.phone_number.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("leads").insert([{
      customer_name: form.customer_name || null,
      phone_number: form.phone_number,
      job_type: form.job_type || null,
      area: form.area || null,
      status: form.status,
    }]).select().single();
    setSaving(false);
    if (!error && data) {
      setLeads((ls) => [data as Lead, ...ls]);
      setShowAdd(false);
      setForm(BLANK);
    }
  };

  return (
    <>
      <PageHeader
        title="Leads"
        description="Everyone who reached out. Track them from enquiry to booked job."
        actions={
          <>
            <div className="flex h-9 rounded-xl border border-line bg-white/[0.03] overflow-hidden">
              <button onClick={() => setView("board")} className={cn("px-3 flex items-center gap-1.5 text-small font-medium cursor-pointer", view === "board" ? "bg-white/[0.06] text-fg" : "text-fg-muted hover:text-fg")}>
                <LayoutGrid className="w-3.5 h-3.5" /> Board
              </button>
              <button onClick={() => setView("table")} className={cn("px-3 flex items-center gap-1.5 text-small font-medium cursor-pointer border-l border-line", view === "table" ? "bg-white/[0.06] text-fg" : "text-fg-muted hover:text-fg")}>
                <Rows3 className="w-3.5 h-3.5" /> Table
              </button>
            </div>
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setForm(BLANK); setShowAdd(true); }}>
              Add lead
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { icon: Users, label: "Total leads", value: stats.total, color: "#38BDF8" },
          { icon: PhoneCall, label: "New enquiries", value: stats.new, color: "#60A5FA" },
          { icon: UserCheck, label: "Converted", value: stats.booked, color: "#3B82F6" },
          { icon: TrendingUp, label: "Conversion rate", value: `${stats.rate}%`, color: "#8B5CF6" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center" style={{ color: s.color }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-h2 text-fg num leading-none">{s.value}</p>
                  <p className="text-tiny text-fg-muted mt-0.5">{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white/[0.03] border border-line max-w-sm">
          <Search className="w-3.5 h-3.5 text-fg-subtle" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, job or area…" className="bg-transparent outline-none text-small text-fg placeholder:text-fg-faint flex-1" />
        </div>
      </div>

      {/* Board / Table */}
      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 flex-1 min-w-[200px]" />)}
        </div>
      ) : view === "board" ? (
        <div className="pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STAGES.map((s) => (
              <div key={s.id} className="panel !p-0 flex flex-col" style={{ maxHeight: "calc(100vh - 330px)", minHeight: "200px" }}>
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <p className="text-small font-semibold text-fg">{s.label}</p>
                  </div>
                  <span className="text-tiny text-fg-subtle bg-white/[0.04] px-1.5 py-0.5 rounded-full font-medium">{grouped[s.id]?.length ?? 0}</span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
                  {(grouped[s.id] ?? []).length === 0 ? (
                    <p className="text-tiny text-fg-subtle text-center py-8">No leads here</p>
                  ) : (
                    (grouped[s.id] ?? []).map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setActive(l)}
                        className="w-full text-left p-3 rounded-xl bg-ink-800/60 border border-line hover:border-line-strong transition-all duration-150 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar name={l.customer_name ?? l.phone_number} size={26} />
                          <div className="flex-1 min-w-0">
                            <p className="text-small font-semibold text-fg truncate">{l.customer_name ?? "Unknown"}</p>
                            <p className="text-tiny text-fg-muted truncate">{formatPhone(l.phone_number)}</p>
                          </div>
                        </div>
                        {(l.job_type || l.area) && (
                          <p className="text-tiny text-fg-muted mb-2 truncate">{l.job_type ?? ""}{l.job_type && l.area ? " · " : ""}{l.area ?? ""}</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-tiny text-fg-subtle num">{timeAgo(l.created_at)}</span>
                          <select
                            value={l.status}
                            onChange={(e) => { e.stopPropagation(); move(l.id, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] bg-ink-700 border border-line rounded px-1 py-0.5 text-fg-muted cursor-pointer"
                          >
                            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="text-fg-subtle text-tiny uppercase tracking-wider border-b border-line">
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Phone</th>
                  <th className="px-5 py-3 text-left font-medium">Job</th>
                  <th className="px-5 py-3 text-left font-medium">Area</th>
                  <th className="px-5 py-3 text-left font-medium">Added</th>
                  <th className="px-5 py-3 text-left font-medium">Stage</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((l) => {
                  const stage = STAGES.find((s) => s.id === l.status) ?? STAGES[0];
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setActive(l)}>
                      <td className="px-5 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.customer_name ?? l.phone_number} size={28} />
                          <span className="text-fg">{l.customer_name ?? "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-fg-muted num">{formatPhone(l.phone_number)}</td>
                      <td className="px-5 py-3 text-fg-muted">{l.job_type ?? "—"}</td>
                      <td className="px-5 py-3 text-fg-muted">{l.area ?? "—"}</td>
                      <td className="px-5 py-3 text-fg-muted num">{formatDate(l.created_at)}</td>
                      <td className="px-5 py-3"><Badge tone={stage.tone} dot>{stage.label}</Badge></td>
                      <td className="px-5 py-3"><ChevronRight className="w-4 h-4 text-fg-subtle" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <EmptyState icon={Users} title="No leads found" description="Leads appear here as soon as customers message your AI." />}
        </Card>
      )}

      {/* Lead detail panel */}
      {active && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActive(null)} />
          <aside className="fixed top-0 right-0 z-50 h-screen w-full max-w-sm bg-ink-900 border-l border-line overflow-y-auto scrollbar-thin animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-small font-semibold text-fg">Lead details</p>
                <button onClick={() => setActive(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-white/[0.04] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center mb-5">
                <Avatar name={active.customer_name ?? active.phone_number} size={60} className="mx-auto mb-2.5" />
                <p className="text-h2 text-fg">{active.customer_name ?? "Unknown"}</p>
                <p className="text-small text-fg-muted mt-0.5 num">{formatPhone(active.phone_number)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5">
                <a href={`tel:${active.phone_number.replace(/[^0-9+]/g, "")}`} className="h-10 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center gap-2 text-small font-medium text-fg hover:bg-white/[0.08] cursor-pointer">
                  <Phone className="w-4 h-4" /> Call
                </a>
                <a href={`https://wa.me/${active.phone_number.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center gap-2 text-small font-medium text-brand hover:bg-brand/20 cursor-pointer">
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </a>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-tiny text-fg-subtle font-medium mb-2">Move to stage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STAGES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => move(active.id, s.id)}
                        className={cn(
                          "px-3 h-8 rounded-lg text-small font-medium cursor-pointer transition-colors duration-150 flex items-center gap-1.5",
                          active.status === s.id ? "bg-white/[0.10] text-fg border border-line-strong" : "bg-white/[0.03] text-fg-muted border border-line hover:text-fg"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <LabeledField label="Job type"><p className="text-small text-fg">{active.job_type ?? "Not specified"}</p></LabeledField>
                <LabeledField label="Area"><p className="text-small text-fg">{active.area ?? "Not specified"}</p></LabeledField>
                <LabeledField label="First contact"><p className="text-small text-fg num">{formatDate(active.created_at)}</p></LabeledField>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Add Lead modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAdd(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-ink-900 border border-line rounded-2xl shadow-pop animate-slide-up p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-h2 text-fg">Add a lead</p>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-white/[0.04] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <ModalField label="Phone number *">
                <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+27 82 123 4567" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
              </ModalField>
              <ModalField label="Customer name">
                <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="e.g. John Smith" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Job type">
                  <input value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} placeholder="e.g. Geyser repair" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
                </ModalField>
                <ModalField label="Area">
                  <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Sandton" className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/50 transition-colors" />
                </ModalField>
              </div>
              <ModalField label="Stage">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-ink-800 border border-line text-small text-fg outline-none focus:border-brand/50 cursor-pointer transition-colors">
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </ModalField>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={saving} disabled={!form.phone_number.trim()} icon={<Check className="w-4 h-4" />} onClick={handleAdd}>
                Add lead
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-tiny text-fg-subtle font-medium mb-1">{label}</p>
      {children}
    </div>
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
