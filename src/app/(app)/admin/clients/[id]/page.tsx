"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Globe, User, Mail, Phone, Building2, Tag,
  CheckCircle2, Clock, AlertTriangle, PauseCircle, XCircle,
  MessageSquare, BarChart2, FileText, CheckSquare, Paperclip,
  Activity, TrendingUp, Loader2, Plus, Trash2, Pencil,
  Download, Upload, X, ChevronDown, RefreshCw, Send,
  BookOpen,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/cn";
import { timeAgo, formatDate, formatZAR, initials } from "@/lib/format";
import { PLAN_CONFIG, resolvePlan } from "@/lib/plan";
import type {
  CrmClientDetail, CrmNote, CrmTask, CrmContact, CrmFile,
  CrmEvent, CrmReport, CrmTag, CrmStatsSummary, CrmStatsDay,
} from "@/lib/crm-types";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ["Overview","Analytics","Conversations","Contacts","Notes","Tasks","Files","Timeline","Reports"] as const;
type Tab = typeof TABS[number];

const STATUS_CONFIG = {
  onboarding: { label: "Onboarding", icon: Clock,         cls: "bg-amber-50 text-amber-700 border-amber-200" },
  active:     { label: "Active",     icon: CheckCircle2,  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk:    { label: "At Risk",    icon: AlertTriangle, cls: "bg-red-50 text-red-600 border-red-200" },
  paused:     { label: "Paused",     icon: PauseCircle,   cls: "bg-slate-100 text-slate-500 border-slate-200" },
  churned:    { label: "Churned",    icon: XCircle,       cls: "bg-slate-100 text-slate-400 border-slate-200" },
} as const;

const PRIORITY_CONFIG = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500" },
  medium: { label: "Medium", cls: "bg-blue-50 text-blue-600" },
  high:   { label: "High",   cls: "bg-amber-50 text-amber-600" },
  urgent: { label: "Urgent", cls: "bg-red-50 text-red-600" },
} as const;

const EVENT_LABELS: Record<string, string> = {
  status_changed:       "Status changed",
  plan_changed:         "Plan changed",
  plan_upgraded:        "Plan upgraded",
  report_generated:     "Report generated",
  report_requested:     "Report requested",
  note_added:           "Note added",
  task_created:         "Task created",
  client_archived:      "Client archived",
  integration_connected:"Integration connected",
};

// ─── Shared pieces ────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border", cfg.cls)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function HealthRing({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const r = 20; const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 26 26)" />
        <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Health</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm">
      <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{label}</p>
      <p className="text-[18px] md:text-[22px] font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold text-slate-800">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <p className="text-[12px] text-slate-400 w-28 shrink-0">{label}</p>
      <p className="text-[13px] text-slate-700 flex-1">{value}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CrmClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab,    setTab]    = useState<Tab>("Overview");
  const [client, setClient] = useState<CrmClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClient = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/clients/${id}`);
    if (res.ok) { const d = await res.json(); setClient(d.client); }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadClient(); }, [loadClient]);

  async function patchClient(updates: Record<string, unknown>) {
    await fetch(`/api/admin/crm/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await loadClient();
  }

  if (loading) return <DetailSkeleton />;
  if (!client) return <div className="text-center py-20 text-slate-400 text-[13px]">Client not found.</div>;

  return (
    <div className="max-w-6xl">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-5 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
          {client.logo_url
            ? <img src={client.logo_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg font-bold text-slate-400">{(client.business_name ?? "?")[0]?.toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h1 className="text-[20px] md:text-[26px] font-bold text-slate-900 leading-tight">{client.business_name ?? "Unnamed"}</h1>
            <StatusPill status={client.crm_status} />
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5">{client.trade ?? client.industry ?? "—"}</p>
          {/* Mobile actions row */}
          <div className="flex items-center gap-2 mt-2 md:hidden">
            <StatusSelect current={client.crm_status} onChange={v => patchClient({ crm_status: v })} />
          </div>
        </div>
        {/* Desktop health + status — hidden on mobile */}
        <div className="hidden md:flex shrink-0 items-center gap-3">
          <HealthRing score={client.health_score ?? 100} />
          <StatusSelect current={client.crm_status} onChange={v => patchClient({ crm_status: v })} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Conversations" value={client.conversation_count.toLocaleString()} />
        <StatCard label="Open tasks" value={client.tasks_open} />
        <StatCard label="Bookings" value={client.bookings_total.toLocaleString()} />
        <StatCard label="MRR" value={client.mrr_zar ? formatZAR(client.mrr_zar / 100) : "—"} sub="/month" />
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 mb-6 border-b border-slate-200 overflow-x-auto overflow-y-hidden scrollbar-none -mx-4 md:mx-0 px-4 md:px-0 select-none"
        style={{ touchAction: "pan-x" }}
      >
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-3 md:px-4 py-2.5 text-[12px] md:text-[13px] font-medium transition-colors cursor-pointer border-b-2 -mb-px shrink-0",
              tab === t ? "border-[#E85A2C] text-[#E85A2C]" : "border-transparent text-slate-500 hover:text-slate-800"
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview"       && <OverviewTab client={client} onPatch={patchClient} />}
      {tab === "Analytics"      && <AnalyticsTab clientId={id} />}
      {tab === "Conversations"  && <ConversationsTab clientId={id} />}
      {tab === "Contacts"       && <ContactsTab clientId={id} clientName={client.business_name} />}
      {tab === "Notes"          && <NotesTab clientId={id} />}
      {tab === "Tasks"          && <TasksTab clientId={id} />}
      {tab === "Files"          && <FilesTab clientId={id} />}
      {tab === "Timeline"       && <TimelineTab clientId={id} />}
      {tab === "Reports"        && <ReportsTab clientId={id} clientName={client.business_name} />}
    </div>
  );
}

// ─── Status select ────────────────────────────────────────────────────────────
function StatusSelect({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
        Change status <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-md z-10 py-1">
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button key={val} onClick={() => { onChange(val); setOpen(false); }}
                className={cn("w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 cursor-pointer", current === val && "text-[#E85A2C] font-semibold")}>
                <Icon className="w-3.5 h-3.5" /> {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isRealPhone(v: string | null | undefined): boolean {
  if (!v) return false;
  const stripped = v.replace(/^whatsapp:/, "");
  return /^(\+|0)\d{7,}/.test(stripped);
}

// ─── Plan select ──────────────────────────────────────────────────────────────
const PLAN_UI_CONFIG = {
  trial:    { label: "Trial",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
  starter:  { label: "Starter",  cls: "bg-slate-100 text-slate-600 border-slate-300" },
  pro:      { label: "Pro",      cls: "bg-violet-50 text-violet-700 border-violet-200" },
  premium:  { label: "Premium",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  billions: { label: "Billions", cls: "bg-[#E85A2C]/10 text-[#E85A2C] border-[#E85A2C]/30" },
} as const;

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_UI_CONFIG[plan as keyof typeof PLAN_UI_CONFIG] ?? PLAN_UI_CONFIG.trial;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function InlinePlanSelect({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const plans: Array<keyof typeof PLAN_UI_CONFIG> = ["trial", "pro", "premium", "billions"];
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 cursor-pointer group"
      >
        <PlanBadge plan={current} />
        <Pencil className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
          {plans.map(p => (
            <button key={p} onClick={() => { onChange(p); setOpen(false); }}
              className={cn("w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-slate-50 cursor-pointer",
                current === p && "font-semibold text-[#E85A2C]")}>
              <PlanBadge plan={p} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lead usage bar ───────────────────────────────────────────────────────────
function LeadUsageBar({ used, limit }: { used: number | null; limit: number | null }) {
  if (!limit) return <span className="text-[13px] text-slate-400">Unlimited</span>;
  const pct = used != null ? Math.min(100, Math.round((used / limit) * 100)) : null;
  const color = pct != null && pct >= 90 ? "#ef4444" : pct != null && pct >= 70 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex flex-col gap-1 flex-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-slate-700 font-medium">{used != null ? `${used} / ${limit}` : `— / ${limit}`} leads</span>
        {pct != null && <span className="text-slate-400">{pct}%</span>}
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden w-full">
        {pct != null && (
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        )}
      </div>
    </div>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-[13px] text-slate-400">—</span>;
  const { label, cls } = score >= 70
    ? { label: "High risk",   cls: "bg-red-50 text-red-600 border-red-200" }
    : score >= 40
    ? { label: "Medium risk", cls: "bg-amber-50 text-amber-600 border-amber-200" }
    : { label: "Low risk",    cls: "bg-emerald-50 text-emerald-600 border-emerald-200" };
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", cls)}>{label}</span>
      <span className="text-[12px] text-slate-400">{score}/100</span>
    </div>
  );
}

// ─── Trial countdown badge ────────────────────────────────────────────────────
function TrialCountdown({ endsAt }: { endsAt: string | null }) {
  if (!endsAt) return null;
  const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
      Trial expired
    </span>
  );
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      days <= 3 ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
    )}>
      {days}d left in trial
    </span>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ client, onPatch }: { client: CrmClientDetail; onPatch: (u: Record<string, unknown>) => void }) {
  const whatsappConnected = isRealPhone(client.whatsapp_number);
  const planTier          = resolvePlan(client.plan);
  const planCfg           = PLAN_CONFIG[planTier];
  const leadLimit         = planCfg.leadLimit;

  const onboardingSteps = [
    { label: "Account created",       done: true },
    { label: "Assistant configured",  done: !!client.system_prompt?.trim() },
    { label: "WhatsApp connected",    done: whatsappConnected },
    { label: "Web widget installed",  done: client.web_widget_status === "verified" },
    { label: "First conversation",    done: client.conversation_count > 0 },
  ];

  const completedSteps = onboardingSteps.filter(s => s.done).length;
  const onboardingPct  = Math.round((completedSteps / onboardingSteps.length) * 100);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Business info */}
      <SectionCard title="Business info">
        <InfoRow label="Owner"     value={client.owner_name} />
        <InfoRow label="Email"     value={client.client_email} />
        <InfoRow label="WhatsApp"  value={whatsappConnected ? client.whatsapp_number?.replace(/^whatsapp:/, "") : null} />
        <InfoRow label="Website"   value={client.website ?? client.web_widget_domain} />
        <InfoRow label="Industry"  value={client.industry} />
        <InfoRow label="Address"   value={client.address} />
        <InfoRow label="Joined"    value={formatDate(client.created_at)} />
      </SectionCard>

      {/* Plan & subscription */}
      <SectionCard title="Plan & billing">
        {/* Plan row — inline editable */}
        <div className="flex items-start gap-3 py-2 border-b border-slate-50">
          <p className="text-[12px] text-slate-400 w-28 shrink-0 mt-0.5">Plan</p>
          <div className="flex items-center gap-2 flex-wrap">
            <InlinePlanSelect
              current={client.plan ?? "trial"}
              onChange={v => onPatch({ plan: v })}
            />
            {client.plan === "trial" && <TrialCountdown endsAt={client.trial_ends_at ?? null} />}
          </div>
        </div>

        {/* Billing cycle */}
        <div className="flex items-start gap-3 py-2 border-b border-slate-50">
          <p className="text-[12px] text-slate-400 w-28 shrink-0 mt-0.5">Billing</p>
          <div className="flex items-center gap-2">
            {client.billing_cycle ? (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                client.billing_cycle === "annual"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              )}>
                {client.billing_cycle === "annual" ? "Annual (15% off)" : "Monthly"}
              </span>
            ) : (
              <span className="text-[13px] text-slate-400">—</span>
            )}
          </div>
        </div>

        {/* MRR */}
        <div className="flex items-start gap-3 py-2 border-b border-slate-50">
          <p className="text-[12px] text-slate-400 w-28 shrink-0">MRR</p>
          <p className="text-[13px] text-slate-700 font-semibold">
            {client.mrr_zar
              ? formatZAR(client.mrr_zar / 100) + " /mo"
              : planCfg.priceMonthly > 0
              ? formatZAR(planCfg.priceMonthly) + " /mo"
              : <span className="text-slate-400 font-normal">Free trial</span>}
          </p>
        </div>

        {/* Lead usage */}
        <div className="flex items-start gap-3 py-2 border-b border-slate-50">
          <p className="text-[12px] text-slate-400 w-28 shrink-0 mt-0.5">Lead usage</p>
          <LeadUsageBar used={client.leads_used_mtd ?? null} limit={leadLimit} />
        </div>

        {/* LTV */}
        {client.ltv_zar ? (
          <div className="flex items-start gap-3 py-2 border-b border-slate-50">
            <p className="text-[12px] text-slate-400 w-28 shrink-0">LTV</p>
            <p className="text-[13px] text-slate-700">{formatZAR(client.ltv_zar / 100)}</p>
          </div>
        ) : null}

        {/* Next renewal */}
        {client.next_renewal_at && (
          <div className="flex items-start gap-3 py-2 border-b border-slate-50">
            <p className="text-[12px] text-slate-400 w-28 shrink-0">Next renewal</p>
            <p className="text-[13px] text-slate-700">{formatDate(client.next_renewal_at)}</p>
          </div>
        )}

        {/* Risk score */}
        <div className="flex items-start gap-3 py-2">
          <p className="text-[12px] text-slate-400 w-28 shrink-0 mt-0.5">Risk</p>
          <RiskBadge score={client.risk_score} />
        </div>
      </SectionCard>

      {/* Onboarding checklist */}
      <SectionCard title="Onboarding checklist">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-slate-400">{completedSteps} of {onboardingSteps.length} complete</span>
            <span className="text-[12px] font-semibold text-slate-600">{onboardingPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#E85A2C] transition-all duration-500"
              style={{ width: `${onboardingPct}%` }} />
          </div>
        </div>
        <div className="space-y-2.5">
          {onboardingSteps.map(s => (
            <div key={s.label} className="flex items-center gap-2.5">
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                s.done ? "bg-emerald-500 border-emerald-500" : "border-slate-200 bg-white")}>
                {s.done && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={cn("text-[13px]", s.done ? "text-slate-700" : "text-slate-400")}>{s.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Tags */}
      <SectionCard title="Tags">
        {client.tags.length === 0
          ? <p className="text-[13px] text-slate-400">No tags assigned.</p>
          : <div className="flex flex-wrap gap-2">
              {client.tags.map(t => (
                <span key={t.id} className="px-2.5 py-1 rounded-lg text-[12px] font-medium"
                  style={{ backgroundColor: t.color + "20", color: t.color, border: `1px solid ${t.color}40` }}>
                  {t.name}
                </span>
              ))}
            </div>
        }
      </SectionCard>

      {/* Services */}
      {client.services_offered && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm md:col-span-2">
          <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Services offered</p>
          <p className="text-[13px] text-slate-600 leading-relaxed">{client.services_offered}</p>
        </div>
      )}
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ clientId }: { clientId: string }) {
  const [range,   setRange]   = useState("30d");
  const [loading, setLoading] = useState(true);
  const [daily,   setDaily]   = useState<CrmStatsDay[]>([]);
  const [summary, setSummary] = useState<CrmStatsSummary | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/crm/clients/${clientId}/stats?range=${range}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setDaily(d.daily); setSummary(d.summary); } setLoading(false); });
  }, [clientId, range]);

  const RANGES = [{ v: "30d", l: "30 days" }, { v: "90d", l: "90 days" }, { v: "12m", l: "12 months" }];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] font-semibold text-slate-700">Performance metrics</p>
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              className={cn("px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer",
                range === r.v ? "bg-[#E85A2C] text-white" : "text-slate-500 hover:bg-slate-50")}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total convos" value={summary.conversations_total.toLocaleString()} />
            <StatCard label="WhatsApp" value={summary.conversations_whatsapp.toLocaleString()} />
            <StatCard label="Web chat" value={summary.conversations_web.toLocaleString()} />
            <StatCard label="Leads captured" value={summary.leads_captured.toLocaleString()} />
            <StatCard label="Leads converted" value={summary.leads_converted.toLocaleString()}
              sub={summary.leads_captured > 0 ? `${Math.round((summary.leads_converted / summary.leads_captured) * 100)}% rate` : undefined} />
            <StatCard label="Bookings created" value={summary.bookings_created.toLocaleString()} />
          </div>

          {daily.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[13px] font-semibold text-slate-800 mb-4">Conversations over time</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="conversations_total" name="Total"
                    stroke="#E85A2C" fill="#E85A2C" fillOpacity={0.08} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="conversations_whatsapp" name="WhatsApp"
                    stroke="#10b981" fill="#10b981" fillOpacity={0.06} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {daily.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[13px] font-semibold text-slate-800 mb-4">Leads & bookings</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="leads_captured" name="Leads" fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar dataKey="bookings_created" name="Bookings" fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-400 text-[13px]">No data for this period.</div>
      )}
    </div>
  );
}

// ─── Conversations tab ────────────────────────────────────────────────────────
function ConversationsTab({ clientId }: { clientId: string }) {
  const [convos, setConvos] = useState<{
    id: string; customer_name: string|null; channel: string; status: string; created_at: string; summary: string|null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reuse existing admin endpoint
    fetch(`/api/admin/clients/${clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConvos(d.conversations); setLoading(false); });
  }, [clientId]);

  const CHANNEL_CLS: Record<string, string> = {
    whatsapp: "bg-emerald-50 text-emerald-700 border-emerald-200",
    email:    "bg-blue-50 text-blue-700 border-blue-200",
    web_chat: "bg-violet-50 text-violet-700 border-violet-200",
  };

  if (loading) return <SkeletonList />;

  return convos.length === 0 ? (
    <EmptyTabState icon={<MessageSquare className="w-8 h-8 text-slate-300" />} label="No conversations yet" />
  ) : (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {convos.map((c, i) => (
        <div key={c.id} className={cn("px-5 py-4 flex items-start gap-3", i > 0 && "border-t border-slate-100")}>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-slate-800">{c.customer_name ?? "Visitor"}</p>
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border", CHANNEL_CLS[c.channel] ?? "bg-slate-100 text-slate-500 border-slate-200")}>
                {c.channel === "web_chat" ? "Web" : c.channel}
              </span>
              <span className="text-[11px] text-slate-400">{timeAgo(c.created_at)}</span>
            </div>
            {c.summary && <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{c.summary}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contacts tab ─────────────────────────────────────────────────────────────
function ContactsTab({ clientId, clientName }: { clientId: string; clientName: string | null }) {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({ name: "", role: "", email: "", phone: "" });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/clients/${clientId}/contacts`);
    if (res.ok) { const d = await res.json(); setContacts(d.contacts); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function addContact() {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/crm/clients/${clientId}/contacts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await load();
    setForm({ name: "", role: "", email: "", phone: "" });
    setAdding(false);
    setSaving(false);
  }

  async function deleteContact(cid: string) {
    await fetch(`/api/admin/crm/contacts/${cid}`, { method: "DELETE" });
    setContacts(cs => cs.filter(c => c.id !== cid));
  }

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add contact
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">New contact</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {(["name","role","email","phone"] as const).map(f => (
              <input key={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20" />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
            <button onClick={addContact} disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyTabState icon={<User className="w-8 h-8 text-slate-300" />} label="No contacts added yet" />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {contacts.map((c, i) => (
            <div key={c.id} className={cn("flex items-center gap-3 px-5 py-3.5", i > 0 && "border-t border-slate-100")}>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-slate-500">{initials(c.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-800">{c.name}</p>
                  {c.is_primary && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#E85A2C]/10 text-[#E85A2C] font-medium">Primary</span>}
                  {c.role && <span className="text-[11px] text-slate-400">{c.role}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.email && <p className="text-[12px] text-slate-500">{c.email}</p>}
                  {c.phone && <p className="text-[12px] text-slate-500">{c.phone}</p>}
                </div>
              </div>
              <button onClick={() => deleteContact(c.id)} className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notes tab ────────────────────────────────────────────────────────────────
function NotesTab({ clientId }: { clientId: string }) {
  const [notes,   setNotes]   = useState<CrmNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body,    setBody]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/clients/${clientId}/notes`);
    if (res.ok) { const d = await res.json(); setNotes(d.notes); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function addNote() {
    if (!body.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/crm/clients/${clientId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
    });
    setBody("");
    await load();
    setSaving(false);
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/crm/notes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editBody }),
    });
    setEditing(null);
    await load();
  }

  async function deleteNote(id: string) {
    await fetch(`/api/admin/crm/notes/${id}`, { method: "DELETE" });
    setNotes(ns => ns.filter(n => n.id !== id));
  }

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Write a note about this client…"
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 mb-3" />
        <div className="flex justify-end">
          <button onClick={addNote} disabled={saving || !body.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 cursor-pointer">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Add note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyTabState icon={<FileText className="w-8 h-8 text-slate-300" />} label="No notes yet" />
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm group">
              <div className="flex items-start justify-between gap-3">
                {editing === n.id ? (
                  <div className="flex-1">
                    <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 mb-2" />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(n.id)} className="px-3 py-1 rounded-lg bg-[#E85A2C] text-white text-[12px] font-semibold cursor-pointer">Save</button>
                      <button onClick={() => setEditing(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-[12px] text-slate-600 cursor-pointer">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-700 leading-relaxed flex-1 whitespace-pre-wrap">{n.body}</p>
                )}
                {editing !== n.id && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setEditing(n.id); setEditBody(n.body); }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteNote(n.id)} className="text-slate-400 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">{timeAgo(n.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tasks tab ────────────────────────────────────────────────────────────────
function TasksTab({ clientId }: { clientId: string }) {
  const [tasks,   setTasks]   = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_at: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/clients/${clientId}/tasks`);
    if (res.ok) { const d = await res.json(); setTasks(d.tasks); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function addTask() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/crm/clients/${clientId}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, due_at: form.due_at || null }),
    });
    setForm({ title: "", description: "", priority: "medium", due_at: "" });
    setAdding(false);
    await load();
    setSaving(false);
  }

  async function updateStatus(taskId: string, status: string) {
    await fetch(`/api/admin/crm/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: status as CrmTask["status"] } : t));
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/admin/crm/tasks/${taskId}`, { method: "DELETE" });
    setTasks(ts => ts.filter(t => t.id !== taskId));
  }

  const open = tasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const done = tasks.filter(t => t.status === "done");

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add task
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">New task</p>
          <div className="space-y-2 mb-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Task title" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 focus:outline-none">
                {(["low","medium","high","urgent"] as const).map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              <input type="date" value={form.due_at} onChange={e => setForm(p => ({ ...p, due_at: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-[12px] text-slate-600 cursor-pointer">Cancel</button>
            <button onClick={addTask} disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyTabState icon={<CheckSquare className="w-8 h-8 text-slate-300" />} label="No tasks yet" />
      ) : (
        <>
          {open.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {open.map((t, i) => <TaskRow key={t.id} task={t} i={i} total={open.length} onStatus={updateStatus} onDelete={deleteTask} />)}
            </div>
          )}
          {done.length > 0 && (
            <details className="group">
              <summary className="text-[12px] text-slate-400 cursor-pointer list-none flex items-center gap-1 mb-2">
                <span>Completed ({done.length})</span>
              </summary>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm opacity-60">
                {done.map((t, i) => <TaskRow key={t.id} task={t} i={i} total={done.length} onStatus={updateStatus} onDelete={deleteTask} />)}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, i, total, onStatus, onDelete }: {
  task: CrmTask; i: number; total: number;
  onStatus: (id: string, s: string) => void;
  onDelete: (id: string) => void;
}) {
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3 group", i > 0 && "border-t border-slate-100")}>
      <input type="checkbox" checked={task.status === "done"}
        onChange={e => onStatus(task.id, e.target.checked ? "done" : "open")}
        className="rounded cursor-pointer shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-medium", task.status === "done" ? "line-through text-slate-400" : "text-slate-800")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", pCfg.cls)}>{pCfg.label}</span>
          {task.due_at && (
            <span className="text-[11px] text-slate-400">Due {formatDate(task.due_at)}</span>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all cursor-pointer">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Files tab ────────────────────────────────────────────────────────────────
function FilesTab({ clientId }: { clientId: string }) {
  const [files,   setFiles]   = useState<(CrmFile & { url?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/clients/${clientId}/files`);
    if (res.ok) { const d = await res.json(); setFiles(d.files); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const metaRes = await fetch(`/api/admin/crm/clients/${clientId}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mime_type: file.type, size_bytes: file.size }),
    });
    if (metaRes.ok) {
      const { upload_url } = await metaRes.json();
      if (upload_url) await fetch(upload_url, { method: "PUT", body: file });
      await load();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function deleteFile(fileId: string) {
    await fetch(`/api/admin/crm/files/${fileId}`, { method: "DELETE" });
    setFiles(fs => fs.filter(f => f.id !== fileId));
  }

  function fmtSize(b: number | null) {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 cursor-pointer">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Upload file"}
        </button>
      </div>

      {files.length === 0 ? (
        <EmptyTabState icon={<Paperclip className="w-8 h-8 text-slate-300" />} label="No files uploaded yet" />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {files.map((f, i) => (
            <div key={f.id} className={cn("flex items-center gap-3 px-5 py-3.5 group", i > 0 && "border-t border-slate-100")}>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Paperclip className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-800 truncate">{f.name}</p>
                <p className="text-[11px] text-slate-400">{fmtSize(f.size_bytes)} · {timeAgo(f.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"><Download className="w-3.5 h-3.5" /></a>
                )}
                <button onClick={() => deleteFile(f.id)} className="text-slate-300 hover:text-red-400 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────
function TimelineTab({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/crm/clients/${clientId}/events?page=${page}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setEvents(p => page === 1 ? d.events : [...p, ...d.events]); setTotal(d.total); } setLoading(false); });
  }, [clientId, page]);

  const EVENT_ICON: Record<string, React.ElementType> = {
    status_changed:   RefreshCw,
    note_added:       FileText,
    task_created:     CheckSquare,
    report_generated: BarChart2,
    report_requested: BarChart2,
    client_archived:  XCircle,
  };

  if (loading && page === 1) return <SkeletonList />;

  return events.length === 0 ? (
    <EmptyTabState icon={<Activity className="w-8 h-8 text-slate-300" />} label="No activity yet" />
  ) : (
    <div className="space-y-0">
      {events.map((e, i) => {
        const Icon = EVENT_ICON[e.event_type] ?? Activity;
        return (
          <div key={e.id} className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-1">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1 mb-0 min-h-[20px]" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <p className="text-[13px] text-slate-700 font-medium leading-none mt-1.5">
                {EVENT_LABELS[e.event_type] ?? e.event_type}
              </p>
              {e.payload && Object.keys(e.payload).length > 0 && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {JSON.stringify(e.payload).slice(0, 80)}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(e.created_at)}</p>
            </div>
          </div>
        );
      })}
      {events.length < total && (
        <button onClick={() => setPage(p => p + 1)} disabled={loading}
          className="w-full text-center py-2 text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────
function ReportsTab({ clientId, clientName }: { clientId: string; clientName: string | null }) {
  const [reports, setReports]   = useState<CrmReport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/clients/${clientId}/reports`);
    if (res.ok) { const d = await res.json(); setReports(d.reports); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function generateReport() {
    setGenLoading(true);
    await fetch(`/api/admin/crm/clients/${clientId}/reports`, { method: "POST" });
    await load();
    setGenLoading(false);
  }

  const STATUS_CLS: Record<string, string> = {
    pending:    "bg-amber-50 text-amber-600 border-amber-200",
    generating: "bg-blue-50 text-blue-600 border-blue-200",
    ready:      "bg-emerald-50 text-emerald-600 border-emerald-200",
    failed:     "bg-red-50 text-red-600 border-red-200",
  };

  if (loading) return <SkeletonList />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-slate-500">Monthly performance reports for {clientName ?? "this client"}</p>
        <button onClick={generateReport} disabled={genLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 cursor-pointer">
          {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
          Generate report
        </button>
      </div>

      {reports.length === 0 ? (
        <EmptyTabState icon={<BarChart2 className="w-8 h-8 text-slate-300" />} label="No reports generated yet" />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {reports.map((r, i) => (
            <div key={r.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">
                  {new Date(r.period_start).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", STATUS_CLS[r.status] ?? STATUS_CLS.pending)}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                  {r.email_sent_at && <span className="text-[11px] text-slate-400">Sent {timeAgo(r.email_sent_at)}</span>}
                  {r.email_opened_at && <span className="text-[11px] text-emerald-500">Opened</span>}
                  {r.downloaded_at && <span className="text-[11px] text-emerald-500">Downloaded</span>}
                </div>
              </div>
              {r.metrics_snapshot && (
                <div className="text-right text-[11px] text-slate-400 space-y-0.5">
                  <p>{(r.metrics_snapshot as Record<string, number>).conversations_total ?? 0} convos</p>
                  <p>{(r.metrics_snapshot as Record<string, number>).bookings_created ?? 0} bookings</p>
                </div>
              )}
              {r.storage_path && (
                <a href="#" className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function EmptyTabState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 mb-3">
        {icon}
      </div>
      <p className="text-[13px] text-slate-400">{label}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0,1,2].map(i => (
        <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl space-y-4">
      <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-64 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 rounded-lg bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
      </div>
    </div>
  );
}
