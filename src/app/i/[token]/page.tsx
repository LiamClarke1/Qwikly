"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle, AlertTriangle, Clock, Phone, MessageCircle,
  Upload, CreditCard, Banknote, FileText, X, Loader2
} from "lucide-react";
import { fmt, fmtDateLong } from "@/lib/money";
import { cn } from "@/lib/cn";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_zar: number;
  line_total_zar: number;
  tax_rate: number;
}

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  version: number;
  status: string;
  customer_name: string;
  customer_mobile: string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  subtotal_zar: number;
  vat_zar: number;
  total_zar: number;
  amount_paid_zar: number;
  notes: string | null;
  payment_terms: string | null;
  bank_details_snapshot: { bank_name?: string; bank_account_number?: string; bank_branch_code?: string; bank_account_type?: string } | null;
  delivery_channels: string[];
  branding_snapshot: { logo_url?: string; accent_color?: string; footer_text?: string } | null;
  invoice_line_items: LineItem[];
  customer_view_token: string;
  clients: {
    business_name: string | null;
    whatsapp_number: string | null;
    notification_phone: string | null;
    allow_cash_invoices: boolean;
  };
}

function StatusBanner({ status, paidAt, dueAt }: { status: string; paidAt: string | null; dueAt: string | null }) {
  if (status === "paid" || status === "refunded") {
    return (
      <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-4 mb-6">
        <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-400">Payment confirmed</p>
          {paidAt && <p className="text-xs text-green-400/70 mt-0.5">Paid {fmtDateLong(paidAt)}</p>}
        </div>
      </div>
    );
  }
  if (status === "overdue") {
    return (
      <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 mb-6">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-400">Payment overdue</p>
          {dueAt && <p className="text-xs text-red-400/70 mt-0.5">Was due {fmtDateLong(dueAt)}</p>}
        </div>
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-6">
        <X className="w-5 h-5 text-gray-400 shrink-0" />
        <p className="text-sm font-medium text-gray-400">This invoice has been cancelled.</p>
      </div>
    );
  }
  if (status === "partial_paid") {
    return (
      <div className="flex items-center gap-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-5 py-4 mb-6">
        <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
        <p className="text-sm font-medium text-yellow-400">Partially paid — balance still due.</p>
      </div>
    );
  }
  return null;
}

function EftModal({ invoice, token, onClose, onSubmit }: {
  invoice: InvoiceData;
  token: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [amount, setAmount] = useState(String(Math.max(0, invoice.total_zar - invoice.amount_paid_zar).toFixed(2)));
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // In production: upload proof to Supabase storage first, then record payment
      await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_zar: parseFloat(amount),
          method: "eft",
          source: "customer_self_serve",
          payer_name: invoice.customer_name,
          proof_url: proofFile ? `(uploaded: ${proofFile.name})` : null,
          token,
        }),
      });
      setDone(true);
      setTimeout(onSubmit, 1500);
    } catch {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#0D111A] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">Payment noted</p>
          <p className="text-sm text-gray-400">The business will confirm once your payment lands.</p>
        </div>
      </div>
    );
  }

  const bank = invoice.bank_details_snapshot;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0D111A] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">I paid via EFT</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {bank?.bank_name && (
          <div className="bg-white/5 rounded-xl p-4 mb-5 space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">EFT details</p>
            <p className="text-sm text-gray-300">Bank: <span className="text-white">{bank.bank_name}</span></p>
            <p className="text-sm text-gray-300">Account: <span className="text-white font-mono">{bank.bank_account_number}</span></p>
            {bank.bank_branch_code && <p className="text-sm text-gray-300">Branch: <span className="text-white font-mono">{bank.bank_branch_code}</span></p>}
            <p className="text-sm text-gray-300">Reference: <span className="text-white font-semibold">{invoice.invoice_number ?? invoice.id.slice(0, 8)}</span></p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount paid (ZAR)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Proof of payment (optional)</label>
            <label className="flex items-center gap-2 bg-white/5 border border-white/10 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.08] transition-colors">
              <Upload className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400">{proofFile ? proofFile.name : "Upload screenshot or PDF"}</span>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Notify the business
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEft, setShowEft] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const paymentStatus = searchParams.get("payment");

  const loadInvoice = useCallback(async () => {
    const res = await fetch(`/api/i/${token}`);
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setInvoice(data);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  useEffect(() => {
    if (paymentStatus === "success") setPaymentMsg("Payment successful! Your receipt will be sent shortly.");
    if (paymentStatus === "failed") setPaymentMsg("Payment failed. Please try again or use EFT.");
    if (paymentStatus === "cancelled") setPaymentMsg(null);
  }, [paymentStatus]);

  async function handleCardPay() {
    if (!invoice) return;
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.mode === "eft_only") {
        setPaymentMsg("Card payments are not set up yet. Please use EFT.");
        setShowEft(true);
      } else {
        setPaymentMsg(data.error ?? "Payment error. Please try EFT.");
      }
    } catch {
      setPaymentMsg("Network error. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 rounded-full border-2 border-[#E85A2C]/30 border-t-[#E85A2C] animate-spin" />
          <span className="text-sm">Loading invoice…</span>
        </div>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center px-4">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">Invoice not found</p>
          <p className="text-sm text-gray-400">This link may be invalid or the invoice may have been cancelled.</p>
        </div>
      </div>
    );
  }

  const accent = invoice.branding_snapshot?.accent_color ?? "#E85A2C";
  const businessName = invoice.clients.business_name ?? "Your service provider";
  const amountDue = Math.max(0, invoice.total_zar - invoice.amount_paid_zar);
  const isPaid = invoice.status === "paid" || invoice.status === "refunded";
  const isCancelled = invoice.status === "cancelled";
  const canPay = !isPaid && !isCancelled && amountDue > 0;
  const clientPhone = invoice.clients.whatsapp_number ?? invoice.clients.notification_phone;

  return (
    <div className="min-h-screen bg-[#07080B] pb-12">
      {/* Header bar */}
      <div className="border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
        <span className="text-base font-bold text-white tracking-tight">
          Qwikly<span style={{ color: accent }}>.</span>
        </span>
        {clientPhone && (
          <a
            href={`tel:${clientPhone}`}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Payment result message */}
        {paymentMsg && (
          <div className={cn(
            "flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-5 text-sm",
            paymentStatus === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            {paymentStatus === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {paymentMsg}
          </div>
        )}

        <StatusBanner status={invoice.status} paidAt={invoice.paid_at} dueAt={invoice.due_at} />

        {/* Invoice document */}
        <div className="bg-[#0D111A] border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Business header */}
          <div className="px-6 py-5 border-b border-white/[0.06]">
            {invoice.branding_snapshot?.logo_url && (
              <img src={invoice.branding_snapshot.logo_url} alt={businessName} className="h-8 mb-3 object-contain" />
            )}
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: accent }}>
              Invoice {invoice.invoice_number ?? ""}
              {invoice.version > 1 && <span className="ml-2 text-gray-500 normal-case tracking-normal font-normal">(revised)</span>}
            </p>
            <p className="text-xl font-bold text-white leading-tight">{businessName}</p>
            {invoice.due_at && (
              <p className="text-xs text-gray-400 mt-1">
                Due {fmtDateLong(invoice.due_at)}{invoice.payment_terms ? ` · ${invoice.payment_terms}` : ""}
              </p>
            )}
          </div>

          {/* Bill to */}
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bill to</p>
            <p className="text-sm font-medium text-white">{invoice.customer_name}</p>
          </div>

          {/* Line items */}
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left pb-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Item</th>
                  <th className="text-right pb-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_line_items.map((li) => (
                  <tr key={li.id} className="border-t border-white/[0.04]">
                    <td className="py-2.5 text-sm text-white pr-4">
                      {li.description}
                      {li.quantity !== 1 && <span className="text-gray-400 ml-1.5">× {li.quantity}</span>}
                    </td>
                    <td className="py-2.5 text-sm text-white text-right font-mono whitespace-nowrap">{fmt(li.line_total_zar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-b border-white/[0.06] space-y-1.5">
            {invoice.vat_zar > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-mono">{fmt(invoice.subtotal_zar)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">VAT (15%)</span>
                  <span className="text-white font-mono">{fmt(invoice.vat_zar)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-base font-bold pt-1">
              <span className="text-white">Total</span>
              <span style={{ color: accent }} className="font-mono">{fmt(invoice.total_zar)}</span>
            </div>
            {invoice.amount_paid_zar > 0 && invoice.amount_paid_zar < invoice.total_zar && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Paid</span>
                  <span className="text-green-400 font-mono">- {fmt(invoice.amount_paid_zar)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-white">Balance due</span>
                  <span className="text-white font-mono">{fmt(amountDue)}</span>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Notes</p>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          {invoice.branding_snapshot?.footer_text && (
            <div className="px-6 py-3 bg-white/[0.02]">
              <p className="text-xs text-gray-500">{invoice.branding_snapshot.footer_text}</p>
            </div>
          )}
        </div>

        {/* Payment actions */}
        {canPay && (
          <div className="mt-5 space-y-3">
            <button
              onClick={handleCardPay}
              disabled={checkingOut}
              className="w-full py-4 rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2.5 transition-opacity hover:opacity-90 active:opacity-80 cursor-pointer disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, #C3431C 100%)` }}
            >
              {checkingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              Pay {fmt(amountDue)} now
            </button>

            <button
              onClick={() => setShowEft(true)}
              className="w-full py-3.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.10] transition-colors cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              I paid via EFT
            </button>

            {invoice.clients.allow_cash_invoices && (
              <button
                onClick={async () => {
                  if (!confirm("Confirm you have paid cash to the business?")) return;
                  await fetch(`/api/invoices/${invoice.id}/pay`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount_zar: amountDue, method: "cash", source: "customer_self_serve", token }),
                  });
                  loadInvoice();
                }}
                className="w-full py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors cursor-pointer"
              >
                Mark as paid in cash
              </button>
            )}
          </div>
        )}

        {/* Contact the business */}
        {clientPhone && (
          <div className="mt-6 flex gap-3">
            <a
              href={`tel:${clientPhone}`}
              className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
            <a
              href={`https://wa.me/${clientPhone?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          Invoiced via <a href="https://qwikly.co.za" className="hover:text-gray-400 transition-colors">Qwikly</a>
        </p>
      </div>

      {showEft && (
        <EftModal
          invoice={invoice}
          token={token}
          onClose={() => setShowEft(false)}
          onSubmit={() => { setShowEft(false); loadInvoice(); }}
        />
      )}
    </div>
  );
}
