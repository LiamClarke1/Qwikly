"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronRight } from "lucide-react";
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

const STATUS_TABS = ["all", "overdue", "disputed", "written_off", "paid", "cancelled"] as const;

export default function AdminInvoicingPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const status = tab === "all" ? "" : tab;
    const res = await fetch(`/api/admin/invoices?status=${status}&limit=200`);
    if (res.ok) setInvoices((await res.json()).invoices ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = invoices.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.customer_name.toLowerCase().includes(q) ||
      (i.invoice_number ?? "").toLowerCase().includes(q) ||
      i.clients?.business_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[28px] font-bold leading-tight text-slate-900">Invoicing</h1>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
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
    </div>
  );
}
