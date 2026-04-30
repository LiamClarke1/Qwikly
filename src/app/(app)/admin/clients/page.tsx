"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, ChevronRight, MessageSquare, Mail, Globe,
  ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal,
  CheckCircle2, Clock, AlertTriangle, PauseCircle, XCircle,
  LayoutList, LayoutGrid, Filter, X, Bookmark, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo, formatZAR } from "@/lib/format";
import type { CrmClientListItem, CrmTag, CrmSavedView } from "@/lib/crm-types";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  onboarding: { label: "Onboarding", icon: Clock,          cls: "bg-amber-50 text-amber-700 border-amber-200" },
  active:     { label: "Active",     icon: CheckCircle2,   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk:    { label: "At Risk",    icon: AlertTriangle,  cls: "bg-red-50 text-red-600 border-red-200" },
  paused:     { label: "Paused",     icon: PauseCircle,    cls: "bg-slate-100 text-slate-500 border-slate-200" },
  churned:    { label: "Churned",    icon: XCircle,        cls: "bg-slate-100 text-slate-400 border-slate-200" },
} as const;

const PLAN_CONFIG = {
  starter:    { label: "Starter",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
  growth:     { label: "Growth",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pro:        { label: "Pro",        cls: "bg-violet-50 text-violet-700 border-violet-200" },
  enterprise: { label: "Enterprise", cls: "bg-amber-50 text-amber-700 border-amber-200" },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", cfg.cls)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PlanPill({ plan }: { plan: string }) {
  const cfg = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.starter;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function ChannelIcons({ channels }: { channels: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {channels.includes("whatsapp") && (
        <span title="WhatsApp" className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
        </span>
      )}
      {channels.includes("email") && (
        <span title="Email" className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
          <Mail className="w-2.5 h-2.5 text-blue-600" />
        </span>
      )}
      {channels.includes("web_chat") && (
        <span title="Web Chat" className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
          <Globe className="w-2.5 h-2.5 text-violet-600" />
        </span>
      )}
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const r = 9;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
      <circle cx="12" cy="12" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 12 12)" />
      <text x="12" y="15" textAnchor="middle" fontSize="6" fontWeight="600" fill={color}>{score}</text>
    </svg>
  );
}

function OnboardingBar({ step, complete }: { step: number | null; complete: boolean | null }) {
  const pct = complete ? 100 : Math.min(100, Math.round(((step ?? 1) / 6) * 100));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#E85A2C]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums">{pct}%</span>
    </div>
  );
}

function TagPills({ tags }: { tags: CrmTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.slice(0, 3).map(t => (
        <span key={t.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: t.color + "20", color: t.color }}>
          {t.name}
        </span>
      ))}
      {tags.length > 3 && <span className="text-[10px] text-slate-400">+{tags.length - 3}</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type SortCol = "business_name" | "mrr_zar" | "health_score" | "created_at" | "plan" | "crm_status";

interface Filters {
  status: string[];
  plan:   string[];
  tag:    string[];
}

export default function CrmClientsPage() {
  const [clients,    setClients]    = useState<CrmClientListItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortCol,    setSortCol]    = useState<SortCol>("created_at");
  const [sortDir,    setSortDir]    = useState<"asc" | "desc">("desc");
  const [filters,    setFilters]    = useState<Filters>({ status: [], plan: [], tag: [] });
  const [viewMode,   setViewMode]   = useState<"table" | "grid">("table");
  const [allTags,    setAllTags]    = useState<CrmTag[]>([]);
  const [savedViews, setSavedViews] = useState<CrmSavedView[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [viewsOpen,  setViewsOpen]  = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ)         params.set("q", debouncedQ);
    if (filters.status.length) params.set("status", filters.status.join(","));
    if (filters.plan.length)   params.set("plan",   filters.plan.join(","));
    if (filters.tag.length)    params.set("tag",    filters.tag.join(","));
    params.set("sort", sortCol);
    params.set("dir",  sortDir);
    params.set("page", page.toString());

    const res = await fetch(`/api/admin/crm/clients?${params}`);
    if (res.ok) {
      const d = await res.json();
      setClients(d.clients);
      setTotal(d.total);
      setPages(d.pages);
    }
    setLoading(false);
  }, [debouncedQ, filters, sortCol, sortDir, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    fetch("/api/admin/crm/tags").then(r => r.ok ? r.json() : null).then(d => d && setAllTags(d.tags));
    fetch("/api/admin/crm/views").then(r => r.ok ? r.json() : null).then(d => d && setSavedViews(d.views));
  }, []);

  const activeFilterCount = filters.status.length + filters.plan.length + filters.tag.length;

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function toggleFilter(key: keyof Filters, val: string) {
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val],
    }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ status: [], plan: [], tag: [] });
    setPage(1);
  }

  function applyView(v: CrmSavedView) {
    const f = v.filters as Partial<Filters>;
    setFilters({ status: f.status ?? [], plan: f.plan ?? [], tag: f.tag ?? [] });
    if (v.sort_by) setSortCol(v.sort_by as SortCol);
    if (v.sort_dir) setSortDir(v.sort_dir as "asc" | "desc");
    setPage(1);
    setViewsOpen(false);
  }

  async function saveCurrentView() {
    const name = prompt("Name this view:");
    if (!name?.trim()) return;
    const res = await fetch("/api/admin/crm/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), filters, sort_by: sortCol, sort_dir: sortDir }),
    });
    if (res.ok) {
      const d = await res.json();
      setSavedViews(v => [...v, d.view]);
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const active   = clients.filter(c => c.crm_status === "active").length;
    const at_risk  = clients.filter(c => c.crm_status === "at_risk").length;
    const onboard  = clients.filter(c => c.crm_status === "onboarding").length;
    const totalMrr = clients.reduce((s, c) => s + (c.mrr_zar ?? 0), 0);
    return { active, at_risk, onboard, totalMrr };
  }, [clients]);

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-0.5" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[#E85A2C] ml-0.5" />
      : <ArrowDown className="w-3 h-3 text-[#E85A2C] ml-0.5" />;
  }

  function ColHeader({ col, label, className }: { col: SortCol; label: string; className?: string }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className={cn("flex items-center gap-0.5 text-[11px] uppercase tracking-widest text-slate-400 font-semibold hover:text-slate-600 transition-colors cursor-pointer", className)}
      >
        {label}<SortIcon col={col} />
      </button>
    );
  }

  const allSelected = clients.length > 0 && clients.every(c => selected.has(c.id));
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(clients.map(c => c.id)));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
          <h1 className="text-[28px] font-bold text-slate-900 leading-tight">CRM</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {total} {total === 1 ? "client" : "clients"} total
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E85A2C] text-white text-[13px] font-semibold hover:bg-[#d04f25] transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add client
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Active",      value: stats.active,                   cls: "text-emerald-600" },
          { label: "At Risk",     value: stats.at_risk,                  cls: "text-red-500" },
          { label: "Onboarding",  value: stats.onboard,                  cls: "text-amber-600" },
          { label: "Total MRR",   value: formatZAR(stats.totalMrr / 100), cls: "text-slate-800" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">{s.label}</p>
            <p className={cn("text-[20px] font-bold", s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative w-full md:flex-1 md:min-w-[200px] md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search clients…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 focus:border-[#E85A2C]/40"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setFilterOpen(o => !o)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer",
            filterOpen || activeFilterCount > 0
              ? "bg-[#E85A2C]/10 border-[#E85A2C]/30 text-[#E85A2C]"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-[#E85A2C] text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Saved views */}
        <div className="relative">
          <button
            onClick={() => setViewsOpen(o => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Bookmark className="w-4 h-4" />
            Views
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {viewsOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-md z-20 py-1">
              {savedViews.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-slate-400">No saved views</p>
              )}
              {savedViews.map(v => (
                <button key={v.id} onClick={() => applyView(v)}
                  className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
                  {v.name}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button onClick={saveCurrentView}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#E85A2C] font-medium hover:bg-slate-50 cursor-pointer">
                  Save current view…
                </button>
              </div>
            </div>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5">
          {(["table","grid"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={cn("p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === m ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-400 hover:text-slate-600"
              )}>
              {m === "table" ? <LayoutList className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <FilterGroup label="Status" options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              active={filters.status} onToggle={v => toggleFilter("status", v)} />
            <FilterGroup label="Plan" options={Object.entries(PLAN_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              active={filters.plan} onToggle={v => toggleFilter("plan", v)} />
            <FilterGroup label="Tags" options={allTags.map(t => ({ value: t.id, label: t.name, color: t.color }))}
              active={filters.tag} onToggle={v => toggleFilter("tag", v)} />
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#E85A2C]/5 border border-[#E85A2C]/20 rounded-xl px-4 py-2 mb-3 text-[13px]">
          <span className="font-semibold text-[#E85A2C]">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            <BulkButton label="Export" onClick={() => {}} />
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table / Grid */}
      {loading ? (
        <SkeletonTable />
      ) : clients.length === 0 ? (
        <EmptyState hasFilters={activeFilterCount > 0 || !!debouncedQ} onClear={clearFilters} />
      ) : (
        <>
          {/* Mobile card list — always shown on small screens */}
          <div className="md:hidden space-y-2">
            {clients.map(c => (
              <Link key={c.id} href={`/admin/clients/${c.id}`}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 shadow-sm active:bg-slate-50">
                <div className="w-9 h-9 rounded-full bg-[#E85A2C]/10 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                  {c.logo_url
                    ? <img src={c.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[11px] font-bold text-[#E85A2C]">{(c.business_name ?? "?")[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{c.business_name ?? "Unnamed"}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <StatusPill status={c.crm_status} />
                    <span className="text-[11px] text-slate-400">{c.mrr_zar ? formatZAR(c.mrr_zar / 100) + " /mo" : "—"}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>

          {/* Desktop table/grid */}
          <div className="hidden md:block">
            {viewMode === "table" ? (
              <TableView
                clients={clients}
                selected={selected}
                allSelected={allSelected}
                onSelectAll={toggleSelectAll}
                onSelect={id => setSelected(s => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; })}
                ColHeader={ColHeader}
                onRefresh={fetchClients}
              />
            ) : (
              <GridView clients={clients} />
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-[13px] text-slate-500">
          <span>Page {page} of {pages} ({total} clients)</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
              Prev
            </button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────
function TableView({
  clients, selected, allSelected, onSelectAll, onSelect, ColHeader, onRefresh,
}: {
  clients: CrmClientListItem[];
  selected: Set<number>;
  allSelected: boolean;
  onSelectAll: () => void;
  onSelect: (id: number) => void;
  ColHeader: React.FC<{ col: "business_name"|"mrr_zar"|"health_score"|"created_at"|"plan"|"crm_status"; label: string; className?: string }>;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header row */}
      <div className="grid grid-cols-[24px_1.8fr_90px_80px_90px_90px_90px_80px_100px_40px] gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50 items-center">
        <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="rounded cursor-pointer" />
        <ColHeader col="business_name" label="Business" />
        <ColHeader col="crm_status" label="Status" />
        <ColHeader col="plan" label="Plan" />
        <ColHeader col="mrr_zar" label="MRR" className="justify-end" />
        <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Onboarding</span>
        <ColHeader col="health_score" label="Health" className="justify-center" />
        <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Channels</span>
        <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Last active</span>
        <span />
      </div>

      {clients.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            "grid grid-cols-[24px_1.8fr_90px_80px_90px_90px_90px_80px_100px_40px] gap-3 items-center px-5 py-3.5 group hover:bg-slate-50/80 transition-colors",
            i > 0 && "border-t border-slate-100",
            selected.has(c.id) && "bg-[#E85A2C]/[0.02]"
          )}
        >
          <input type="checkbox" checked={selected.has(c.id)} onChange={() => onSelect(c.id)} className="rounded cursor-pointer" />

          {/* Business */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {c.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#E85A2C]/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-[#E85A2C]">
                    {(c.business_name ?? "?")[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <Link href={`/admin/clients/${c.id}`}
                  className="text-[13px] font-semibold text-slate-800 hover:text-[#E85A2C] truncate block transition-colors cursor-pointer">
                  {c.business_name ?? "Unnamed"}
                </Link>
                {c.client_email && (
                  <p className="text-[11px] text-slate-400 truncate">{c.client_email}</p>
                )}
              </div>
            </div>
            {c.tags.length > 0 && <div className="mt-1 ml-8"><TagPills tags={c.tags} /></div>}
          </div>

          <StatusPill status={c.crm_status} />
          <PlanPill plan={c.plan} />

          <div className="text-right">
            <p className="text-[13px] font-semibold text-slate-800 tabular-nums">
              {c.mrr_zar ? formatZAR(c.mrr_zar / 100) : <span className="text-slate-300">—</span>}
            </p>
          </div>

          <OnboardingBar step={c.onboarding_step} complete={c.onboarding_complete} />

          <div className="flex justify-center">
            <HealthRing score={c.health_score ?? 100} />
          </div>

          <ChannelIcons channels={c.channels} />

          <p className="text-[12px] text-slate-400">
            {c.last_activity_at ? timeAgo(c.last_activity_at) : <span className="text-slate-300">—</span>}
          </p>

          <Link href={`/admin/clients/${c.id}`}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#E85A2C]/10 transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#E85A2C] transition-colors" />
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── Grid view ────────────────────────────────────────────────────────────────
function GridView({ clients }: { clients: CrmClientListItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {clients.map(c => (
        <Link key={c.id} href={`/admin/clients/${c.id}`}
          className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-[#E85A2C]/20 transition-all cursor-pointer group">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {c.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#E85A2C]/10 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-[#E85A2C]">{(c.business_name ?? "?")[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-[#E85A2C] transition-colors">{c.business_name ?? "Unnamed"}</p>
                <p className="text-[11px] text-slate-400 truncate">{c.trade ?? c.industry ?? ""}</p>
              </div>
            </div>
            <StatusPill status={c.crm_status} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <p className="text-slate-400">MRR</p>
              <p className="font-semibold text-slate-800">{c.mrr_zar ? formatZAR(c.mrr_zar / 100) : "—"}</p>
            </div>
            <div>
              <p className="text-slate-400">Convos</p>
              <p className="font-semibold text-slate-800">{c.conversation_count.toLocaleString()}</p>
            </div>
          </div>
          {c.tags.length > 0 && <div className="mt-3"><TagPills tags={c.tags} /></div>}
          <div className="mt-3">
            <OnboardingBar step={c.onboarding_step} complete={c.onboarding_complete} />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FilterGroup({ label, options, active, onToggle }: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o.value} onClick={() => onToggle(o.value)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer",
              active.includes(o.value)
                ? "bg-[#E85A2C] border-[#E85A2C] text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
            style={o.color && !active.includes(o.value) ? { borderColor: o.color + "50", color: o.color } : {}}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BulkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
      {label}
    </button>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="h-10 bg-slate-50 border-b border-slate-100" />
      {[0,1,2,3,4,5].map(i => (
        <div key={i} className={cn("h-[58px] bg-white flex items-center px-5 gap-3", i > 0 && "border-t border-slate-100")}>
          <div className="w-4 h-4 rounded bg-slate-100 animate-pulse" />
          <div className="flex-1 h-4 rounded-lg bg-slate-100 animate-pulse" style={{ maxWidth: "280px" }} />
          <div className="w-16 h-5 rounded-full bg-slate-100 animate-pulse" />
          <div className="w-16 h-5 rounded-full bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <Filter className="w-8 h-8 mx-auto mb-3 text-slate-300" />
      <p className="text-[14px] font-semibold text-slate-700 mb-1">
        {hasFilters ? "No clients match these filters" : "No clients yet"}
      </p>
      <p className="text-[13px] text-slate-400 mb-4">
        {hasFilters ? "Try adjusting or clearing your filters." : "Add your first client to get started."}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="text-[13px] text-[#E85A2C] font-medium hover:underline cursor-pointer">
          Clear filters
        </button>
      )}
    </div>
  );
}
