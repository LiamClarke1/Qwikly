"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, CheckCircle, Copy, ExternalLink,
  Pencil, Trash2, RefreshCw, AlertTriangle, Clock,
  FileText, DollarSign, Loader2, ChevronDown, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, fmtDate, fmtDateLong } from "@/lib/money";
import { STATUS_LABELS, STATUS_COLORS, isEditable } from "@/lib/invoices/stateMachine";
import type { Invoice, Payment, InvoiceStatus } from "@/lib/invoices/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

interface InvoiceDetail extends Invoice {
  payments: Payment[];
  invoice_attachments: Array<{ id: string; file_name: string; file_url: string; file_type: string }>;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-small font-medium px-3 py-1.5 rounded-full", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function TimelineItem({ event, ts, detail }: { event: string; ts: string; detail?: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-line mt-1" />
      </div>
      <div className="pb-4">
        <p className="text-small font-medium text-fg">{event}</p>
        <p className="text-tiny text-fg-muted mt-0.5">{fmtDate(ts)}{detail ? ` · ${detail}` : ""}</p>
      </div>
    </div>
  );
}

function RecordPaymentModal({ invoiceId, amountDue, onClose, onDone }: {
  invoiceId: string;
  amountDue: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(amountDue.toFixed(2));
  const [method, setMethod] = useState("eft");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_zar: parseFloat(amount), method, notes }),
    });
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-line rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-h2 text-fg mb-5">Record payment</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-small font-medium text-fg mb-1.5">Amount (ZAR)</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-body text-fg outline-none focus:border-brand/40" />
          </div>
          <div>
            <label className="block text-small font-medium text-fg mb-1.5">Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-body text-fg outline-none focus:border-brand/40 cursor-pointer">
              <option value="eft">EFT</option>
              <option value="cash">Cash</option>
              <option value="yoco_card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-small font-medium text-fg mb-1.5">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-body text-fg outline-none focus:border-brand/40"
              placeholder="Reference number, etc." />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Record payment</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/invoices/${params.id}`);
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setInvoice(data);
    setInternalNotes(data.internal_notes ?? "");
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function doAction(action: string, body?: Record<string, unknown>) {
    setActionLoading(action);
    try {
      await fetch(`/api/invoices/${params.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  async function sendInvoice() {
    setActionLoading("send");
    await fetch(`/api/invoices/${params.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: invoice?.delivery_channels }),
    });
    await load();
    setActionLoading(null);
  }

  async function duplicateInvoice() {
    setActionLoading("duplicate");
    const res = await fetch(`/api/invoices/${params.id}/duplicate`, { method: "POST" });
    const { id } = await res.json();
    router.push(`/dashboard/invoices/${id}/edit`);
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/invoices/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internal_notes: internalNotes }),
    });
    setSavingNotes(false);
  }

  function copyLink() {
    if (!invoice) return;
    navigator.clipboard.writeText(`${BASE_URL}/i/${invoice.customer_view_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-fg-muted">Invoice not found.</p>
      </div>
    );
  }

  const amountDue = Math.max(0, invoice.total_zar - invoice.amount_paid_zar);
  const editable = isEditable(invoice.status as InvoiceStatus);
  const publicUrl = `${BASE_URL}/i/${invoice.customer_view_token}`;
  const canSend = ["draft", "scheduled"].includes(invoice.status);
  const canResend = ["sent", "viewed", "partial_paid", "overdue"].includes(invoice.status);
  const canPay = ["sent", "viewed", "partial_paid", "overdue"].includes(invoice.status);
  const canCancel = !["paid", "cancelled", "written_off", "refunded"].includes(invoice.status);

  return (
    <div className="animate-fade-in max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-small text-fg-muted hover:text-fg mb-6 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to invoices
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-small text-brand font-medium mb-1">Invoice</p>
          <h1 className="text-h1 text-fg">{invoice.invoice_number ?? "Draft invoice"}</h1>
          <p className="text-small text-fg-muted mt-1">{invoice.customer_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={invoice.status as InvoiceStatus} />
          {editable && (
            <Link href={`/dashboard/invoices/${params.id}/edit`}>
              <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
            </Link>
          )}
          {canSend && (
            <Button size="sm" loading={actionLoading === "send"} onClick={sendInvoice} icon={<Send className="w-3.5 h-3.5" />}>
              Send
            </Button>
          )}
          {canResend && (
            <Button variant="secondary" size="sm" loading={actionLoading === "send"} onClick={sendInvoice} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Resend
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main invoice */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
            {/* Invoice header */}
            <div className="px-6 py-5 border-b border-line">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-tiny text-fg-subtle uppercase tracking-wider mb-2">Customer</p>
                  <p className="text-small font-medium text-fg">{invoice.customer_name}</p>
                  {invoice.customer_mobile && <p className="text-tiny text-fg-muted">{invoice.customer_mobile}</p>}
                  {invoice.customer_email && <p className="text-tiny text-fg-muted">{invoice.customer_email}</p>}
                </div>
                <div>
                  <p className="text-tiny text-fg-subtle uppercase tracking-wider mb-2">Details</p>
                  {invoice.issued_at && <p className="text-tiny text-fg-muted">Issued: <span className="text-fg">{fmtDate(invoice.issued_at)}</span></p>}
                  {invoice.due_at && <p className="text-tiny text-fg-muted">Due: <span className="text-fg">{fmtDate(invoice.due_at)}</span></p>}
                  {invoice.payment_terms && <p className="text-tiny text-fg-muted">Terms: <span className="text-fg">{invoice.payment_terms}</span></p>}
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="px-6 py-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left pb-2.5 text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Description</th>
                    <th className="text-right pb-2.5 text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Qty</th>
                    <th className="text-right pb-2.5 text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Unit</th>
                    <th className="text-right pb-2.5 text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.invoice_line_items ?? []).sort((a, b) => (a as unknown as { sort_order: number }).sort_order - (b as unknown as { sort_order: number }).sort_order).map((li, i) => (
                    <tr key={i} className="border-b border-line/50">
                      <td className="py-3 text-small text-fg pr-4">{li.description}</td>
                      <td className="py-3 text-small text-fg-muted text-right">{li.quantity}</td>
                      <td className="py-3 text-small text-fg-muted text-right">{fmt(li.unit_price_zar)}</td>
                      <td className="py-3 text-small text-fg text-right font-display">{fmt(li.line_total_zar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 space-y-1.5 max-w-[200px] ml-auto">
                {invoice.subtotal_zar !== invoice.total_zar && (
                  <div className="flex justify-between text-small text-fg-muted">
                    <span>Subtotal</span>
                    <span>{fmt(invoice.subtotal_zar)}</span>
                  </div>
                )}
                {invoice.discount_total_zar > 0 && (
                  <div className="flex justify-between text-small text-fg-muted">
                    <span>Discount</span>
                    <span>- {fmt(invoice.discount_total_zar)}</span>
                  </div>
                )}
                {invoice.vat_zar > 0 && (
                  <div className="flex justify-between text-small text-fg-muted">
                    <span>VAT (15%)</span>
                    <span>{fmt(invoice.vat_zar)}</span>
                  </div>
                )}
                <div className="flex justify-between text-body font-semibold text-fg border-t border-line pt-2">
                  <span>Total</span>
                  <span className="font-display">{fmt(invoice.total_zar)}</span>
                </div>
                {invoice.amount_paid_zar > 0 && (
                  <div className="flex justify-between text-small text-success">
                    <span>Paid</span>
                    <span>- {fmt(invoice.amount_paid_zar)}</span>
                  </div>
                )}
                {amountDue > 0 && invoice.amount_paid_zar > 0 && (
                  <div className="flex justify-between text-small font-semibold text-fg">
                    <span>Balance due</span>
                    <span>{fmt(amountDue)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="px-6 py-4 border-t border-line bg-white/[0.01]">
                <p className="text-tiny text-fg-subtle uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-small text-fg-muted whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payments */}
          {(invoice.payments ?? []).length > 0 && (
            <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
              <p className="px-5 py-3.5 text-small font-semibold text-fg border-b border-line">Payments</p>
              {invoice.payments.map(p => (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between border-b border-line/50 last:border-0">
                  <div>
                    <p className="text-small text-fg">{fmtDate(p.paid_at)} · {p.method}</p>
                    {p.payer_name && <p className="text-tiny text-fg-muted">{p.payer_name}</p>}
                  </div>
                  <p className="text-small font-display text-success">+ {fmt(p.amount_zar)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Internal notes */}
          <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
            <p className="px-5 py-3.5 text-small font-semibold text-fg border-b border-line">Internal notes</p>
            <div className="p-5">
              <textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Notes visible only to you…"
                rows={3}
                className="w-full bg-transparent resize-none text-small text-fg placeholder:text-fg-faint outline-none leading-relaxed"
              />
              {savingNotes && <p className="text-tiny text-fg-subtle">Saving…</p>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Public link */}
          <div className="bg-surface-card border border-line rounded-2xl p-5">
            <p className="text-small font-semibold text-fg mb-3">Customer link</p>
            <p className="text-tiny text-fg-muted mb-3 break-all">{BASE_URL}/i/{invoice.customer_view_token.slice(0, 8)}…</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={copyLink} icon={<Copy className="w-3.5 h-3.5" />} className="flex-1">
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>View</Button>
              </a>
            </div>
            {invoice.customer_viewed_count > 0 && (
              <p className="text-tiny text-fg-subtle mt-3 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Viewed {invoice.customer_viewed_count}× by customer
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-surface-card border border-line rounded-2xl p-5 space-y-2">
            <p className="text-small font-semibold text-fg mb-3">Actions</p>
            {canPay && (
              <Button variant="secondary" size="sm" onClick={() => setShowPayModal(true)} icon={<DollarSign className="w-3.5 h-3.5" />} className="w-full justify-start">
                Record payment
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={duplicateInvoice} loading={actionLoading === "duplicate"} icon={<Copy className="w-3.5 h-3.5" />} className="w-full justify-start">
              Duplicate
            </Button>
            {canCancel && (
              <Button variant="danger" size="sm"
                onClick={async () => {
                  const reason = prompt("Reason for cancellation (optional):");
                  if (reason === null) return;
                  await doAction("cancel", { reason });
                }}
                loading={actionLoading === "cancel"}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="w-full justify-start"
              >
                {invoice.status === "draft" ? "Delete draft" : "Cancel invoice"}
              </Button>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-surface-card border border-line rounded-2xl p-5">
            <p className="text-small font-semibold text-fg mb-4">Activity</p>
            <div>
              {invoice.created_at && <TimelineItem event="Created" ts={invoice.created_at} />}
              {invoice.sent_at && <TimelineItem event="Sent to customer" ts={invoice.sent_at} detail={
                invoice.delivery_sent_log?.length
                  ? invoice.delivery_sent_log.map((l: { channel: string; status: string }) => `${l.channel}: ${l.status}`).join(" · ")
                  : invoice.delivery_channels?.includes("link") ? "link only" : invoice.delivery_channels?.join(", ")
              } />}
              {invoice.viewed_at && <TimelineItem event="Viewed by customer" ts={invoice.viewed_at} detail={`${invoice.customer_viewed_count} view${invoice.customer_viewed_count !== 1 ? "s" : ""}`} />}
              {(invoice.payments ?? []).map(p => (
                <TimelineItem key={p.id} event={`Payment: ${fmt(p.amount_zar)}`} ts={p.paid_at} detail={p.method} />
              ))}
              {invoice.paid_at && <TimelineItem event="Fully paid" ts={invoice.paid_at} />}
              {invoice.cancelled_at && <TimelineItem event="Cancelled" ts={invoice.cancelled_at} />}
            </div>
          </div>

        </div>
      </div>

      {showPayModal && (
        <RecordPaymentModal
          invoiceId={params.id}
          amountDue={amountDue}
          onClose={() => setShowPayModal(false)}
          onDone={() => { setShowPayModal(false); load(); }}
        />
      )}
    </div>
  );
}
