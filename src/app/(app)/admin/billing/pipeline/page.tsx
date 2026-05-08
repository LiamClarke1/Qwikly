"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatZAR } from "@/lib/format";

type Tab = "upcoming" | "awaiting" | "overdue" | "paid";

interface UpcomingRow {
  client_id: number; business_name: string | null;
  days_until: number; next_anchor: string;
  estimated_amount_zar: number; plan: string;
}
interface AwaitingRow {
  id: string; invoice_number: string | null; total_zar: number;
  client_marked_paid_at: string; client_payment_note: string | null;
  client_id: number; clients: { business_name: string };
}
interface OverdueRow {
  id: string; invoice_number: string | null; total_zar: number;
  due_at: string; sent_at: string;
  client_id: number; clients: { business_name: string };
}
interface PaidRow {
  id: string; invoice_number: string | null; total_zar: number;
  paid_at: string; client_id: number; clients: { business_name: string };
}
interface DraftRow {
  id: string; invoice_number: string | null; total_zar: number;
  created_at: string; client_id: number; clients: { business_name: string };
}

interface PipelineData {
  today: string;
  summary: {
    forecast_7d_zar: number; forecast_30d_zar: number;
    awaiting_count: number; overdue_count: number;
    drafts_count: number;
  };
  upcoming: UpcomingRow[];
  awaiting_verification: AwaitingRow[];
  overdue: OverdueRow[];
  paid_this_month: PaidRow[];
  drafts: DraftRow[];
}

export default function BillingPipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/billing/pipeline");
    if (r.ok) setData(await r.json());
    else setActionError("Could not load pipeline data, please refresh.");
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function patch(id: string, action: "verify" | "revert" | "mark_paid") {
    setActionId(id);
    setActionError(null);
    const r = await fetch(`/api/admin/qwikly-billing-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActionId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setActionError(j.error ?? `Action "${action}" failed, please refresh and try again.`);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[28px] font-bold text-slate-900 leading-tight">Billing Pipeline</h1>
        <p className="text-[13px] text-slate-500 mt-1">{data?.today ?? "loading..."}</p>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-red-700">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-[12px] text-red-600 hover:text-red-800 font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {data && data.summary.drafts_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-amber-900">
              {data.summary.drafts_count} draft invoice{data.summary.drafts_count === 1 ? "" : "s"} ready to send
            </p>
            <p className="text-[12px] text-amber-700">
              The daily cron creates draft invoices on each client&apos;s billing day. Send them when ready (auto-send pending integration).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="7-day forecast" value={data ? formatZAR(data.summary.forecast_7d_zar) : "..."} icon={Calendar} accent="text-slate-700" />
        <StatCard label="30-day forecast" value={data ? formatZAR(data.summary.forecast_30d_zar) : "..."} icon={Calendar} accent="text-slate-700" />
        <StatCard label="Awaiting verification" value={data?.summary.awaiting_count ?? "..."} icon={ShieldCheck} accent="text-violet-600" />
        <StatCard label="Overdue" value={data?.summary.overdue_count ?? "..."} icon={AlertTriangle} accent="text-red-500" />
      </div>

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-4 max-w-fit">
        {([
          ["upcoming", "Upcoming, 14d"],
          ["awaiting", `Awaiting verify${data?.summary.awaiting_count ? ` (${data.summary.awaiting_count})` : ""}`],
          ["overdue", `Overdue${data?.summary.overdue_count ? ` (${data.summary.overdue_count})` : ""}`],
          ["paid", "Paid this month"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
              tab === k ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800"
            )}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-400">Loading...</p>
        ) : tab === "upcoming" ? (
          (data?.upcoming ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No invoices due in the next 14 days.</p>
            : (data?.upcoming ?? []).map((u, i) => (
              <Link key={u.client_id} href={`/admin/clients/${u.client_id}`}
                className={cn("flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors", i > 0 && "border-t border-slate-100")}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800">{u.business_name ?? "Unnamed"}</p>
                  <p className="text-[12px] text-slate-500">{u.next_anchor}, {u.plan}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-slate-700">in {u.days_until}d</p>
                  <p className="text-[12px] text-slate-500">est. {formatZAR(u.estimated_amount_zar)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))
        ) : tab === "awaiting" ? (
          (data?.awaiting_verification ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No invoices awaiting verification.</p>
            : (data?.awaiting_verification ?? []).map((a, i) => (
              <div key={a.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800">{a.clients.business_name}</p>
                  <p className="text-[12px] text-slate-500">{a.invoice_number}, {formatZAR(a.total_zar)}, client confirmed {new Date(a.client_marked_paid_at).toLocaleDateString()}</p>
                  {a.client_payment_note && <p className="text-[11px] text-slate-400 mt-0.5">&ldquo;{a.client_payment_note}&rdquo;</p>}
                </div>
                <button onClick={() => patch(a.id, "verify")} disabled={actionId === a.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                  Mark verified
                </button>
                <button onClick={() => patch(a.id, "revert")} disabled={actionId === a.id}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                  Not received
                </button>
              </div>
            ))
        ) : tab === "overdue" ? (
          (data?.overdue ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No overdue invoices.</p>
            : (data?.overdue ?? []).map((o, i) => {
              const days = Math.floor((Date.now() - new Date(o.due_at).getTime()) / 86_400_000);
              return (
                <div key={o.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-800">{o.clients.business_name}</p>
                    <p className="text-[12px] text-red-600 font-medium">{o.invoice_number}, {formatZAR(o.total_zar)}, {days}d overdue</p>
                  </div>
                  <button onClick={() => patch(o.id, "mark_paid")} disabled={actionId === o.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                    Mark paid
                  </button>
                </div>
              );
            })
        ) : (
          (data?.paid_this_month ?? []).length === 0
            ? <p className="p-8 text-center text-slate-400">No invoices paid this month yet.</p>
            : (
              <>
                <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                  <p className="text-[13px] text-emerald-700 font-semibold">
                    Total: {formatZAR((data?.paid_this_month ?? []).reduce((s, p) => s + p.total_zar, 0))}
                  </p>
                </div>
                {(data?.paid_this_month ?? []).map((p, i) => (
                  <div key={p.id} className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-t border-slate-100")}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-800">{p.clients.business_name}</p>
                      <p className="text-[12px] text-slate-500">{p.invoice_number}, paid {new Date(p.paid_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[13px] font-semibold text-slate-700">{formatZAR(p.total_zar)}</p>
                  </div>
                ))}
              </>
            )
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{label}</p>
        <p className={cn("text-[24px] font-bold leading-none", accent)}>{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50">
        <Icon className={cn("w-5 h-5", accent)} />
      </div>
    </div>
  );
}
