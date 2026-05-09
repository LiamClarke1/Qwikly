"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, ChevronRight, Send, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

interface AdminInvoice {
  id: string;
  invoice_number: string | null;
  status: InvoiceStatus;
  customer_name: string;
  total_zar: number;
  amount_paid_zar: number;
  due_at: string | null;
  created_at: string;
  sent_at: string | null;
  clients: { business_name: string };
}

interface BulkSendOutcome {
  invoice_id: string;
  invoice_number: string | null;
  customer_name: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
}

interface BulkSendResponse {
  ok: boolean;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  outcomes: BulkSendOutcome[];
}

const STATUS_TABS = ["all", "overdue", "disputed", "written_off", "paid", "cancelled"] as const;

export default function AdminInvoicingPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [draftCount, setDraftCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const status = tab === "all" ? "" : tab;
    const res = await fetch(`/api/admin/invoices?status=${status}&limit=200`);
    if (res.ok) setInvoices((await res.json()).invoices ?? []);
    setLoading(false);
  }, [tab]);

  const fetchDraftCount = useCallback(async () => {
    const res = await fetch(`/api/admin/invoices?status=draft&limit=200`);
    if (res.ok) {
      const data = await res.json();
      setDraftCount((data.invoices ?? []).length);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { fetchDraftCount(); }, [fetchDraftCount]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => invoices.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.customer_name.toLowerCase().includes(q) ||
      (i.invoice_number ?? "").toLowerCase().includes(q) ||
      i.clients?.business_name?.toLowerCase().includes(q)
    );
  }), [invoices, search]);

  const handleSendAllDrafts = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/send-all-drafts`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast({ text: err.error ?? "Bulk send failed", tone: "error" });
        return;
      }
      const data = (await res.json()) as BulkSendResponse;
      const parts = [`Sent ${data.sent} of ${data.total}`];
      if (data.failed > 0) parts.push(`${data.failed} failed`);
      if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
      setToast({
        text: parts.join(", "),
        tone: data.failed > 0 ? "error" : "ok",
      });
      await Promise.all([fetch_(), fetchDraftCount()]);
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Bulk send failed", tone: "error" });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
          <h1 className="text-[28px] font-bold leading-tight text-slate-900">Invoicing</h1>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={draftCount === 0 || sending}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer",
            draftCount === 0 || sending
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-[#E85A2C] text-white hover:bg-[#cf4e22]"
          )}
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? "Sending…" : `Send all drafts${draftCount > 0 ? ` (${draftCount})` : ""}`}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-slate-200 rounded-xl p-1 bg-white">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer capitalize",
                tab === t ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}>
              {t === "all" ? "All" : STATUS_LABELS[t as InvoiceStatus] ?? t}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number or client…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#E85A2C]/40 focus:ring-2 focus:ring-[#E85A2C]/20" />
        </div>
      </div>

      {loading ? (
        <div className="text-[13px] text-slate-500 py-8 text-center">Loading…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_100px_100px_100px_32px] gap-4 px-5 py-3 border-b border-slate-200">
            {["Client", "Customer", "Invoice #", "Amount", "Due", "Status", ""].map((h, i) => (
              <p key={i} className={cn("text-[11px] uppercase tracking-wider text-slate-400 font-semibold", i >= 3 && i < 6 ? "text-right" : "")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-slate-500 text-center">No invoices found</p>
            ) : filtered.map(inv => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} target="_blank"
                className="group flex sm:grid md:grid-cols-[2fr_1.5fr_1fr_100px_100px_100px_32px] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <p className="text-[13px] text-slate-500">{inv.clients?.business_name ?? "—"}</p>
                <div>
                  <p className="text-[13px] font-medium text-slate-800 group-hover:text-[#E85A2C] transition-colors">{inv.customer_name}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(inv.sent_at ?? inv.created_at)}</p>
                </div>
                <p className="hidden md:block text-[13px] font-mono text-slate-500">{inv.invoice_number ?? "Draft"}</p>
                <p className="hidden md:block text-[13px] text-slate-800 text-right">{fmt(inv.total_zar)}</p>
                <p className="hidden md:block text-[13px] text-slate-500 text-right">{inv.due_at ? fmtDate(inv.due_at) : "—"}</p>
                <div className="hidden sm:flex justify-end">
                  <span className={cn("inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[inv.status])}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !sending && setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-[16px] font-bold text-slate-900">Send {draftCount} draft invoice{draftCount === 1 ? "" : "s"}?</h2>
              <button
                type="button"
                onClick={() => !sending && setConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                disabled={sending}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
              Each draft will be emailed to the customer, and sent on WhatsApp where a number is on file. Successful sends move to the <strong>Sent</strong> status. Failures stay as drafts so you can retry.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="px-3.5 py-2 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAllDrafts}
                disabled={sending}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white cursor-pointer",
                  sending ? "bg-[#E85A2C]/60" : "bg-[#E85A2C] hover:bg-[#cf4e22]"
                )}
              >
                {sending ? "Sending…" : `Send ${draftCount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[13px] font-medium shadow-lg border",
          toast.tone === "ok"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        )}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
