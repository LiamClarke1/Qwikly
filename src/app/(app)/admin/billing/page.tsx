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
  open:      { label: "Open",        color: "bg-brand/10 text-brand border border-brand/20",           icon: Clock },
  locked:    { label: "Locked",      color: "bg-white/5 text-fg-muted border border-white/10",         icon: Lock },
  invoiced:  { label: "Invoiced",    color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",  icon: Receipt },
  paid:      { label: "Paid",        color: "bg-success/10 text-success border border-success/20",     icon: CheckCircle },
  overdue:   { label: "Overdue",     color: "bg-danger/10 text-danger border border-danger/20",        icon: AlertTriangle },
  suspended: { label: "Suspended",   color: "bg-danger/10 text-danger border border-danger/20",        icon: AlertTriangle },
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
        <p className="text-small text-brand font-medium mb-1">Admin</p>
        <h1 className="text-h1 text-fg">Billing</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Total commissions</p>
          <p className="text-display-2 font-display text-fg">{fmt(totalCommission)}</p>
        </div>
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Collected</p>
          <p className="text-display-2 font-display text-success">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Overdue</p>
          <p className={cn("text-display-2 font-display", totalOverdue > 0 ? "text-danger" : "text-fg")}>{fmt(totalOverdue)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-line rounded-xl p-1 bg-white/[0.02] mb-4 max-w-lg">
        {["all", "open", "invoiced", "overdue", "paid", "suspended"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-small font-medium transition-colors cursor-pointer capitalize",
              tab === t ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
            )}>
            {STATUS_CFG[t]?.label ?? "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-small text-fg-muted py-8 text-center">Loading…</div>
      ) : (
        <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_120px_32px] gap-4 px-5 py-3 border-b border-line">
            {["Client", "Period", "Invoiced", "Collected", "Fee", "Status", ""].map((h, i) => (
              <p key={i} className={cn("text-tiny uppercase tracking-wider text-fg-subtle font-semibold", i >= 2 && i < 6 ? "text-right" : "")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-line">
            {periods.length === 0 ? (
              <p className="px-5 py-8 text-small text-fg-muted text-center">No billing periods found</p>
            ) : periods.map(period => {
              const cfg = STATUS_CFG[period.status] ?? STATUS_CFG.open;
              const StatusIcon = cfg.icon;
              const start = new Date(period.period_start);
              return (
                <div key={period.id} className="flex sm:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_120px_32px] gap-4 items-center px-5 py-4">
                  <p className="text-small font-medium text-fg">{period.clients?.business_name ?? "—"}</p>
                  <p className="hidden md:block text-small text-fg-muted">
                    {start.toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
                  </p>
                  <p className="hidden md:block text-small text-fg-muted text-right">{fmt(period.total_invoiced_zar)}</p>
                  <p className="hidden md:block text-small text-fg-muted text-right">{fmt(period.total_paid_zar)}</p>
                  <p className="hidden md:block text-small font-display text-fg text-right">{fmt(period.commission_zar)}</p>
                  <div className="hidden sm:flex justify-end">
                    <span className={cn("inline-flex items-center gap-1 text-tiny font-medium px-2.5 py-1 rounded-full", cfg.color)}>
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
