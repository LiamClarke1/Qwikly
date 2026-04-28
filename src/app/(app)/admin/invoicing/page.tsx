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
        <p className="text-small text-brand font-medium mb-1">Admin</p>
        <h1 className="text-h1 text-fg">Invoicing</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-line rounded-xl p-1 bg-white/[0.02]">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-small font-medium transition-colors cursor-pointer capitalize",
                tab === t ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
              )}>
              {t === "all" ? "All" : STATUS_LABELS[t as InvoiceStatus] ?? t}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-faint pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full bg-white/[0.04] border border-line rounded-xl pl-9 pr-4 py-2 text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/40" />
        </div>
      </div>

      {loading ? (
        <div className="text-small text-fg-muted py-8 text-center">Loading…</div>
      ) : (
        <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_100px_100px_100px_32px] gap-4 px-5 py-3 border-b border-line">
            {["Client", "Customer", "Invoice #", "Amount", "Due", "Status", ""].map((h, i) => (
              <p key={i} className={cn("text-tiny uppercase tracking-wider text-fg-subtle font-semibold", i >= 3 && i < 6 ? "text-right" : "")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-line">
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-small text-fg-muted text-center">No invoices found</p>
            ) : filtered.map(inv => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} target="_blank"
                className="group flex sm:grid md:grid-cols-[2fr_1.5fr_1fr_100px_100px_100px_32px] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <p className="text-small text-fg-muted">{inv.clients?.business_name ?? "—"}</p>
                <div>
                  <p className="text-small font-medium text-fg group-hover:text-brand transition-colors">{inv.customer_name}</p>
                  <p className="text-tiny text-fg-muted">{fmtDate(inv.sent_at ?? inv.created_at)}</p>
                </div>
                <p className="hidden md:block text-small font-mono text-fg-muted">{inv.invoice_number ?? "Draft"}</p>
                <p className="hidden md:block text-small text-fg text-right">{fmt(inv.total_zar)}</p>
                <p className="hidden md:block text-small text-fg-muted text-right">{inv.due_at ? fmtDate(inv.due_at) : "—"}</p>
                <div className="hidden sm:flex justify-end">
                  <span className={cn("inline-flex items-center text-tiny font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[inv.status])}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-fg-subtle ml-auto shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
