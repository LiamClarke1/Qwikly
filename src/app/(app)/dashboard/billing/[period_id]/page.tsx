"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, Lock,
  Receipt, ExternalLink, MessageSquare, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";
import type { BillingPeriod, QwiklyBillingInvoice } from "@/lib/invoices/types";

interface PeriodDetail extends Omit<BillingPeriod, "qwikly_billing_invoices"> {
  qwikly_billing_invoices: QwiklyBillingInvoice | null;
  invoices_summary: Array<{
    id: string;
    invoice_number: string | null;
    customer_name: string;
    total_zar: number;
    amount_paid_zar: number;
    qwikly_commission_zar: number | null;
    paid_at: string | null;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:      { label: "In progress",  color: "bg-brand/10 text-brand border border-brand/20",           icon: Clock },
  locked:    { label: "Locked",       color: "bg-white/5 text-fg-muted border border-white/10",         icon: Lock },
  invoiced:  { label: "Invoice sent", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",  icon: Receipt },
  paid:      { label: "Paid",         color: "bg-success/10 text-success border border-success/20",     icon: CheckCircle },
  overdue:   { label: "Overdue",      color: "bg-danger/10 text-danger border border-danger/20",        icon: AlertTriangle },
  suspended: { label: "Suspended",    color: "bg-danger/10 text-danger border border-danger/20",        icon: AlertTriangle },
};

function DisputeModal({ periodId, onClose, onDone }: { periodId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    await fetch(`/api/billing/periods/${periodId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, disputed_amount: parseFloat(amount) || 0 }),
    });
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => { onDone(); }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-line rounded-2xl p-6 w-full max-w-md">
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-body font-semibold text-fg">Dispute submitted</p>
            <p className="text-small text-fg-muted mt-1">We&apos;ll review and respond within 2 business days.</p>
          </div>
        ) : (
          <>
            <h3 className="text-h2 text-fg mb-1">Dispute this charge</h3>
            <p className="text-small text-fg-muted mb-5">Describe what&apos;s incorrect. We&apos;ll review and respond within 2 business days.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-small font-medium text-fg mb-1.5">Amount in dispute (ZAR)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="Leave blank if disputing full amount"
                  className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-body text-fg placeholder:text-fg-faint outline-none focus:border-brand/40" />
              </div>
              <div>
                <label className="block text-small font-medium text-fg mb-1.5">Reason for dispute</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={4}
                  placeholder="e.g. Invoice #INV-2025-0023 was refunded but still included in commission…"
                  className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/40 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" loading={loading} className="flex-1" disabled={!reason.trim()}>Submit dispute</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillingPeriodPage() {
  const params = useParams<{ period_id: string }>();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDispute, setShowDispute] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/billing/periods/${params.period_id}`);
    if (!res.ok) { setLoading(false); return; }
    setPeriod(await res.json());
    setLoading(false);
  }, [params.period_id]);

  useEffect(() => { load(); }, [load]);

  async function payNow() {
    if (!period?.qwikly_billing_invoices?.id) return;
    setPayLoading(true);
    const res = await fetch(`/api/billing/checkout/${period.qwikly_billing_invoices.id}`, { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setPayLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!period) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-fg-muted">Billing period not found.</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[period.status] ?? STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;
  const start = new Date(period.period_start);
  const monthLabel = start.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const billingInvoice = period.qwikly_billing_invoices;
  const canPay = ["invoiced", "overdue"].includes(period.status) && billingInvoice;
  const canDispute = ["invoiced", "overdue", "locked"].includes(period.status);
  const commissionPlusVat = period.commission_zar + period.vat_zar;

  return (
    <div className="animate-fade-in max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-6 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to billing
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-small text-brand font-medium mb-1">Billing</p>
          <h1 className="text-h1 text-fg">{monthLabel}</h1>
          <p className="text-small text-fg-muted mt-0.5">{fmtDate(period.period_start)} – {fmtDate(period.period_end)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center gap-1.5 text-small font-medium px-3 py-1.5 rounded-full", cfg.color)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
          {canDispute && (
            <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => setShowDispute(true)}>
              Dispute
            </Button>
          )}
          {canPay && (
            <Button size="sm" loading={payLoading} onClick={payNow} icon={<Receipt className="w-3.5 h-3.5" />}>
              Pay {fmt(commissionPlusVat)}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* Period summary card */}
          <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
            <p className="px-5 py-3.5 text-small font-semibold text-fg border-b border-line">Period summary</p>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-line/50">
                <span className="text-small text-fg-muted">Total invoiced (by your customers)</span>
                <span className="text-small text-fg">{fmt(period.total_invoiced_zar)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line/50">
                <span className="text-small text-fg-muted">Total collected</span>
                <span className="text-small text-fg">{fmt(period.total_paid_zar)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line/50">
                <span className="text-small text-fg-muted">Collected ex-VAT</span>
                <span className="text-small text-fg">{fmt(period.total_paid_ex_vat_zar)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line/50">
                <span className="text-small text-fg-muted">Subscription fee</span>
                <span className="text-small font-semibold text-fg">{fmt(period.commission_zar)}</span>
              </div>
              {period.vat_zar > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-line/50">
                  <span className="text-small text-fg-muted">VAT on commission</span>
                  <span className="text-small text-fg">{fmt(period.vat_zar)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-body font-semibold text-fg">Total due to Qwikly</span>
                <span className="text-body font-display text-brand">{fmt(commissionPlusVat)}</span>
              </div>
            </div>
          </div>

          {/* Invoices this period */}
          {(period.invoices_summary ?? []).length > 0 && (
            <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
              <p className="px-5 py-3.5 text-small font-semibold text-fg border-b border-line">Invoices this period</p>
              <div className="divide-y divide-line/50">
                {period.invoices_summary.map(inv => (
                  <div key={inv.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-small font-medium text-fg">{inv.customer_name}</p>
                      <p className="text-tiny text-fg-muted">{inv.invoice_number ?? "Draft"}{inv.paid_at ? ` · paid ${fmtDate(inv.paid_at)}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-small text-fg">{fmt(inv.amount_paid_zar)}</p>
                      {inv.qwikly_commission_zar != null && (
                        <p className="text-tiny text-fg-subtle">{fmt(inv.qwikly_commission_zar)} fee</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Billing invoice */}
          {billingInvoice && (
            <div className="bg-surface-card border border-line rounded-2xl p-5">
              <p className="text-small font-semibold text-fg mb-3">Your billing invoice</p>
              <p className="text-tiny text-fg-muted mb-1">Invoice #</p>
              <p className="text-small text-fg font-mono mb-3">{billingInvoice.invoice_number ?? "Pending"}</p>
              {billingInvoice.due_at && (
                <>
                  <p className="text-tiny text-fg-muted mb-1">Due</p>
                  <p className="text-small text-fg mb-3">{fmtDate(billingInvoice.due_at)}</p>
                </>
              )}
              <p className="text-tiny text-fg-muted mb-1">Amount</p>
              <p className="text-h2 font-display text-fg mb-4">{fmt(billingInvoice.total_zar)}</p>
              {billingInvoice.status === "paid" ? (
                <div className="flex items-center gap-2 text-small text-success">
                  <CheckCircle className="w-4 h-4" />
                  Paid {billingInvoice.paid_at ? fmtDate(billingInvoice.paid_at) : ""}
                </div>
              ) : canPay ? (
                <Button onClick={payNow} loading={payLoading} size="sm" className="w-full">
                  Pay now
                </Button>
              ) : null}
            </div>
          )}

          {/* Payment dates */}
          <div className="bg-surface-card border border-line rounded-2xl p-5">
            <p className="text-small font-semibold text-fg mb-3">Key dates</p>
            <div className="space-y-2.5">
              <div>
                <p className="text-tiny text-fg-muted">Period</p>
                <p className="text-small text-fg">{fmtDate(period.period_start)} – {fmtDate(period.period_end)}</p>
              </div>
              {period.locked_at && (
                <div>
                  <p className="text-tiny text-fg-muted">Locked</p>
                  <p className="text-small text-fg">{fmtDate(period.locked_at)}</p>
                </div>
              )}
              {period.due_at && (
                <div>
                  <p className="text-tiny text-fg-muted">Payment due</p>
                  <p className={cn("text-small", period.status === "overdue" ? "text-danger" : "text-fg")}>{fmtDate(period.due_at)}</p>
                </div>
              )}
              {period.paid_at && (
                <div>
                  <p className="text-tiny text-fg-muted">Paid</p>
                  <p className="text-small text-success">{fmtDate(period.paid_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Support */}
          <div className="bg-surface-card border border-line rounded-2xl p-4">
            <p className="text-tiny text-fg-muted mb-2">Questions about this charge?</p>
            <a href="mailto:billing@qwikly.co.za" className="text-small text-brand hover:underline flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Contact billing support
            </a>
          </div>
        </div>
      </div>

      {showDispute && (
        <DisputeModal
          periodId={params.period_id}
          onClose={() => setShowDispute(false)}
          onDone={() => { setShowDispute(false); load(); }}
        />
      )}
    </div>
  );
}
