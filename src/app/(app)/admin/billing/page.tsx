"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, Receipt, CheckCircle, AlertTriangle, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";

interface AdminPeriod {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  total_invoiced_zar: number;
  total_paid_zar: number;
  commission_zar: number;
  vat_zar: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  clients: { business_name: string };
  qwikly_billing_invoices?: { invoice_number: string | null; status: string } | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:      { label: "Open",        color: "bg-[#E85A2C]/10 text-[#E85A2C] border border-[#E85A2C]/20",    icon: Clock },
  locked:    { label: "Locked",      color: "bg-slate-50 text-slate-500 border border-slate-200",            icon: Lock },
  invoiced:  { label: "Invoiced",    color: "bg-blue-50 text-blue-600 border border-blue-200",               icon: Receipt },
  paid:      { label: "Paid",        color: "bg-emerald-50 text-emerald-600 border border-emerald-200",      icon: CheckCircle },
  overdue:   { label: "Overdue",     color: "bg-red-50 text-red-600 border border-red-200",                  icon: AlertTriangle },
  suspended: { label: "Suspended",   color: "bg-red-50 text-red-600 border border-red-200",                  icon: AlertTriangle },
};

export default function AdminBillingPage() {
  const [periods, setPeriods] = useState<AdminPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const status = tab === "all" ? "" : tab;
    const res = await fetch(`/api/admin/billing?status=${status}&limit=200`);
    if (res.ok) setPeriods((await res.json()).periods ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const totalCommission = periods.reduce((s, p) => s + p.commission_zar, 0);
  const totalPaid = periods.filter(p => p.status === "paid").reduce((s, p) => s + p.commission_zar, 0);
  const totalOverdue = periods.filter(p => p.status === "overdue").reduce((s, p) => s + p.commission_zar, 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-medium mb-1">Admin</p>
        <h1 className="text-[28px] font-bold leading-tight text-slate-900">Billing</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">Total commissions</p>
          <p className="text-display-2 font-display text-slate-800">{fmt(totalCommission)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">Collected</p>
          <p className="text-display-2 font-display text-emerald-600">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">Overdue</p>
          <p className={cn("text-display-2 font-display", totalOverdue > 0 ? "text-red-600" : "text-slate-800")}>{fmt(totalOverdue)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-slate-200 rounded-xl p-1 bg-white mb-4 max-w-lg">
        {["all", "open", "invoiced", "overdue", "paid", "suspended"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer capitalize",
              tab === t ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}>
            {STATUS_CFG[t]?.label ?? "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[13px] text-slate-500 py-8 text-center">Loading…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_120px_32px] gap-4 px-5 py-3 border-b border-slate-200">
            {["Client", "Period", "Invoiced", "Collected", "Fee", "Status", ""].map((h, i) => (
              <p key={i} className={cn("text-[11px] uppercase tracking-wider text-slate-400 font-semibold", i >= 2 && i < 6 ? "text-right" : "")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-slate-200">
            {periods.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-slate-500 text-center">No billing periods found</p>
            ) : periods.map(period => {
              const cfg = STATUS_CFG[period.status] ?? STATUS_CFG.open;
              const StatusIcon = cfg.icon;
              const start = new Date(period.period_start);
              return (
                <div key={period.id} className="flex sm:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_120px_32px] gap-4 items-center px-5 py-4">
                  <p className="text-[13px] font-medium text-slate-800">{period.clients?.business_name ?? "—"}</p>
                  <p className="hidden md:block text-[13px] text-slate-500">
                    {start.toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
                  </p>
                  <p className="hidden md:block text-[13px] text-slate-500 text-right">{fmt(period.total_invoiced_zar)}</p>
                  <p className="hidden md:block text-[13px] text-slate-500 text-right">{fmt(period.total_paid_zar)}</p>
                  <p className="hidden md:block text-[13px] font-display text-slate-800 text-right">{fmt(period.commission_zar)}</p>
                  <div className="hidden sm:flex justify-end">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full", cfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
