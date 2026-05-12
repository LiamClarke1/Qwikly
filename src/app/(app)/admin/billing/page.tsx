"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CheckCircle, AlertTriangle, Clock, Lock, Receipt,
  Send, RefreshCw, DollarSign, Loader2, X, ChevronDown,
  FileText, BellRing,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BillingInvoice {
  id: string;
  invoice_number: string | null;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
  due_at: string | null;
  total_zar: number;
}

interface AdminPeriod {
  id: string;
  client_id: number;
  period_start: string;
  period_end: string;
  total_invoiced_zar: number;
  total_paid_zar: number;
  commission_zar: number;
  vat_zar: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  clients: { id: number; business_name: string; client_email: string | null };
  qwikly_billing_invoices: BillingInvoice[] | BillingInvoice | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:      { label: "Open",      color: "bg-[#E85A2C]/10 text-[#E85A2C] border border-[#E85A2C]/20",  icon: Clock },
  locked:    { label: "Locked",    color: "bg-slate-50 text-slate-500 border border-slate-200",          icon: Lock },
  invoiced:  { label: "Invoiced",  color: "bg-blue-50 text-blue-600 border border-blue-200",             icon: Receipt },
  paid:      { label: "Paid",      color: "bg-emerald-50 text-emerald-600 border border-emerald-200",    icon: CheckCircle },
  overdue:   { label: "Overdue",   color: "bg-red-50 text-red-600 border border-red-200",                icon: AlertTriangle },
  suspended: { label: "Suspended", color: "bg-red-50 text-red-600 border border-red-200",                icon: AlertTriangle },
};

const INV_STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:                { label: "Draft",              color: "bg-slate-100 text-slate-500" },
  sent:                 { label: "Sent",               color: "bg-blue-50 text-blue-700" },
  awaiting_verification:{ label: "Client confirmed",   color: "bg-violet-50 text-violet-700" },
  paid:                 { label: "Paid",               color: "bg-emerald-50 text-emerald-700" },
  overdue:              { label: "Overdue",             color: "bg-red-50 text-red-600" },
  written_off:          { label: "Written off",         color: "bg-slate-100 text-slate-400" },
  disputed:             { label: "Disputed",            color: "bg-amber-50 text-amber-700" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInvoice(p: AdminPeriod): BillingInvoice | null {
  if (!p.qwikly_billing_invoices) return null;
  if (Array.isArray(p.qwikly_billing_invoices)) {
    return p.qwikly_billing_invoices[0] ?? null;
  }
  return p.qwikly_billing_invoices;
}

// ── Mark-paid popover ─────────────────────────────────────────────────────────

function MarkPaidPopover({
  invoiceId, onDone, onClose,
}: { invoiceId: string; onDone: () => void; onClose: () => void }) {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function confirm() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/qwikly-billing-invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid", payment_method: "eft", external_ref: ref.trim() || undefined }),
    });
    setBusy(false);
    if (res.ok) { onDone(); }
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Failed"); }
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-30 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-slate-800">Mark as paid</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-[12px] text-slate-500 mb-3">Payment method: <strong>EFT</strong>. Optionally add a reference.</p>
      <input
        ref={inputRef}
        value={ref}
        onChange={e => setRef(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
        placeholder="EFT reference (optional)"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 mb-3"
      />
      {err && <p className="text-[11px] text-red-500 mb-2">{err}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
        <button onClick={confirm} disabled={busy}
          className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-semibold hover:bg-emerald-600 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Confirm paid
        </button>
      </div>
    </div>
  );
}

// ── Period row ────────────────────────────────────────────────────────────────

function PeriodRow({ period, onRefresh }: { period: AdminPeriod; onRefresh: () => void }) {
  const [markOpen, setMarkOpen] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [toast, setToast]     = useState<string | null>(null);

  const inv = getInvoice(period);
  const cfg = STATUS_CFG[period.status] ?? STATUS_CFG.open;
  const StatusIcon = cfg.icon;
  const invCfg = inv ? (INV_STATUS_CFG[inv.status] ?? INV_STATUS_CFG.draft) : null;

  const isPaid    = period.status === "paid";
  const canSend   = inv && ["draft"].includes(inv.status);
  const canRemind = inv && ["sent", "overdue", "awaiting_verification"].includes(inv.status);
  const canPay    = inv && ["draft", "sent", "overdue", "awaiting_verification"].includes(inv.status);
  const canGen    = !inv;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function sendOrRemind() {
    if (!inv) return;
    setSendBusy(true);
    const action = canSend ? "send" : "remind";
    const res = await fetch(`/api/admin/qwikly-billing-invoices/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setSendBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { flash(action === "send" ? "Invoice sent" : "Reminder sent"); onRefresh(); }
    else flash(d.error ?? "Send failed");
  }

  async function generateInvoice() {
    setGenBusy(true);
    const res = await fetch("/api/admin/billing/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: period.client_id }),
    });
    setGenBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { flash("Draft invoice generated"); onRefresh(); }
    else flash(d.error ?? "Generate failed");
  }

  const start = new Date(period.period_start);

  return (
    <div className="relative px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      {/* Left: client + period */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-slate-800">{period.clients?.business_name ?? "—"}</p>
          {inv && invCfg && (
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", invCfg.color)}>
              {inv.invoice_number ? `#${inv.invoice_number}` : "Draft"} · {invCfg.label}
            </span>
          )}
          {isPaid && period.paid_at && (
            <span className="text-[11px] text-slate-400">Paid {fmtDate(period.paid_at)}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[12px] text-slate-400 flex-wrap">
          <span>{start.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</span>
          {inv?.due_at && !isPaid && (
            <span className={cn(new Date(inv.due_at) < new Date() ? "text-red-500 font-medium" : "")}>
              Due {fmtDate(inv.due_at)}
            </span>
          )}
          {inv?.sent_at && (
            <span>Sent {fmtDate(inv.sent_at)}</span>
          )}
        </div>
      </div>

      {/* Centre: amounts */}
      <div className="flex items-center gap-5 text-right shrink-0">
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Amount</p>
          <p className="text-[14px] font-bold text-slate-800">{fmt(period.commission_zar)}</p>
          <p className="text-[10px] text-slate-400">excl. VAT</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total</p>
          <p className="text-[13px] font-semibold text-slate-700">{fmt(period.total_invoiced_zar)}</p>
          <p className="text-[10px] text-slate-400">incl. VAT</p>
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium", cfg.color)}>
          <StatusIcon className="w-3 h-3" />{cfg.label}
        </span>

        {/* Generate invoice */}
        {canGen && (
          <button
            onClick={generateInvoice}
            disabled={genBusy}
            title="Generate draft invoice"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-medium hover:bg-slate-200 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {genBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Generate
          </button>
        )}

        {/* Send or Remind */}
        {(canSend || canRemind) && (
          <button
            onClick={sendOrRemind}
            disabled={sendBusy}
            title={canSend ? "Send invoice" : "Send payment reminder"}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] font-medium disabled:opacity-50 cursor-pointer transition-colors",
              canSend
                ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100",
            )}
          >
            {sendBusy
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : canSend ? <Send className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}
            {canSend ? "Send" : "Remind"}
          </button>
        )}

        {/* Mark paid */}
        {canPay && (
          <div className="relative">
            <button
              onClick={() => setMarkOpen(o => !o)}
              title="Mark as paid (EFT)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-[12px] font-medium hover:bg-emerald-100 cursor-pointer transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Mark paid
            </button>
            {markOpen && (
              <MarkPaidPopover
                invoiceId={inv!.id}
                onDone={() => { setMarkOpen(false); onRefresh(); }}
                onClose={() => setMarkOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Inline toast */}
      {toast && (
        <div className="absolute bottom-2 right-5 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[12px] font-medium shadow-lg animate-fade-in z-20">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBillingPage() {
  const [periods, setPeriods] = useState<AdminPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const status = tab === "all" ? "" : tab;
    const res = await fetch(`/api/admin/billing?status=${status}&limit=200`);
    if (res.ok) setPeriods((await res.json()).periods ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const totalFees    = periods.reduce((s, p) => s + p.commission_zar, 0);
  const totalPaid    = periods.filter(p => p.status === "paid").reduce((s, p) => s + p.commission_zar, 0);
  const totalOverdue = periods.filter(p => p.status === "overdue").reduce((s, p) => s + p.commission_zar, 0);
  const totalOut     = periods.filter(p => ["invoiced", "open", "locked"].includes(p.status)).reduce((s, p) => s + p.commission_zar, 0);

  const tabs = [
    { v: "all",      l: "All" },
    { v: "open",     l: "Open" },
    { v: "invoiced", l: "Invoiced" },
    { v: "overdue",  l: "Overdue" },
    { v: "paid",     l: "Paid" },
    { v: "suspended",l: "Suspended" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[28px] font-bold leading-tight text-slate-900">Billing</h1>
        <p className="text-[13px] text-slate-500 mt-1">EFT subscription billing tracker</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Total fees"   value={fmt(totalFees)}    color="text-slate-800" />
        <SummaryCard label="Collected"    value={fmt(totalPaid)}    color="text-emerald-600" />
        <SummaryCard label="Outstanding"  value={fmt(totalOut)}     color="text-blue-600" />
        <SummaryCard label="Overdue"      value={fmt(totalOverdue)} color={totalOverdue > 0 ? "text-red-600" : "text-slate-400"} />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-slate-200 rounded-xl p-1 bg-white mb-4 max-w-xl">
        {tabs.map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
              tab === t.v ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
            )}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : periods.length === 0 ? (
        <div className="text-center py-16 text-[13px] text-slate-400">No billing periods found</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm">
          {periods.map(p => (
            <PeriodRow key={p.id} period={p} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</p>
      <p className={cn("text-[22px] font-bold leading-none", color)}>{value}</p>
    </div>
  );
}
