"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Filter, Search, ChevronRight,
  Clock, CheckCircle, AlertTriangle, Send, Eye,
  XCircle, RefreshCw, MinusCircle, TrendingUp
} from "lucide-react";
import { useClient } from "@/lib/use-client";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

const TABS: Array<{ key: string; label: string }> = [
  { key: "all",         label: "All" },
  { key: "draft",       label: "Drafts" },
  { key: "scheduled",   label: "Scheduled" },
  { key: "sent",        label: "Sent" },
  { key: "overdue",     label: "Overdue" },
  { key: "paid",        label: "Paid" },
  { key: "cancelled",   label: "Cancelled" },
];

const STATUS_ICONS: Partial<Record<InvoiceStatus, React.ElementType>> = {
  draft:        Clock,
  scheduled:    Clock,
  sent:         Send,
  viewed:       Eye,
  partial_paid: MinusCircle,
  paid:         CheckCircle,
  overdue:      AlertTriangle,
  cancelled:    XCircle,
  disputed:     AlertTriangle,
  written_off:  XCircle,
  refunded:     RefreshCw,
};

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  status: InvoiceStatus;
  customer_name: string;
  customer_mobile: string | null;
  total_zar: number;
  amount_paid_zar: number;
  due_at: string | null;
  issued_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  customer_viewed_count: number;
}

interface Stats {
  invoiced: number;
  collected: number;
  outstanding: number;
  overdue: number;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const Icon = STATUS_ICONS[status] ?? Clock;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-tiny font-medium px-2.5 py-1 rounded-full", STATUS_COLORS[status])}>
      <Icon className="w-3 h-3" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-surface-card border border-[var(--border)] rounded-2xl p-5">
      <p className="text-small text-fg-muted mb-1">{label}</p>
      <p className={cn("text-display-2 font-display", accent ? "text-warning" : "text-fg")}>{value}</p>
      {sub && <p className="text-tiny text-fg-subtle mt-0.5">{sub}</p>}
    </div>
  );
}

export default function InvoicesPage() {
  const { client, loading: clientLoading } = useClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<Stats>({ invoiced: 0, collected: 0, outstanding: 0, overdue: 0, estimated_fee: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchInvoices = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const status = activeTab === "all" ? "" : activeTab;
    const res = await fetch(`/api/invoices?status=${status}&limit=100`);
    if (!res.ok) { setLoading(false); return; }
    const { invoices: data } = await res.json();
    setInvoices(data ?? []);

    // Compute stats from full dataset
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthInvoices = (data as InvoiceRow[]).filter(i => i.created_at >= monthStart);
    const invoiced = thisMonthInvoices.reduce((s, i) => s + i.total_zar, 0);
    const collected = thisMonthInvoices.filter(i => ["paid", "partial_paid"].includes(i.status)).reduce((s, i) => s + i.amount_paid_zar, 0);
    const outstanding = (data as InvoiceRow[]).filter(i => ["sent", "viewed", "partial_paid"].includes(i.status)).reduce((s, i) => s + (i.total_zar - i.amount_paid_zar), 0);
    const overdue = (data as InvoiceRow[]).filter(i => i.status === "overdue").reduce((s, i) => s + (i.total_zar - i.amount_paid_zar), 0);

    setStats({ invoiced, collected, outstanding, overdue });
    setLoading(false);
  }, [client, activeTab]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.customer_name.toLowerCase().includes(q) ||
      (i.invoice_number ?? "").toLowerCase().includes(q) ||
      (i.customer_mobile ?? "").includes(q)
    );
  });

  if (clientLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Invoicing"
        title="Invoices"
        description="Send professional invoices to your customers and get paid faster."
        actions={
          <Button onClick={() => router.push("/dashboard/invoices/new")} icon={<Plus className="w-4 h-4" />}>
            New invoice
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="This month invoiced" value={fmt(stats.invoiced)} />
        <StatCard label="Collected" value={fmt(stats.collected)} />
        <StatCard label="Outstanding" value={fmt(stats.outstanding)} accent={stats.outstanding > 0} />
        <StatCard label="Overdue" value={fmt(stats.overdue)} accent={stats.overdue > 0} />
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-[var(--border)] rounded-xl p-1 bg-surface-input">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-small font-medium transition-colors cursor-pointer",
                activeTab === tab.key
                  ? "bg-surface-active text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-surface-hover"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-faint pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer or invoice #"
            className="w-full bg-surface-input border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-small text-fg placeholder:text-fg-faint outline-none focus:border-ember/40"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={activeTab === "all" ? "No invoices yet" : `No ${activeTab} invoices`}
          description={activeTab === "all" ? "Create your first invoice and send it to a customer in under 30 seconds." : undefined}
          action={activeTab === "all" ? (
            <Button onClick={() => router.push("/dashboard/invoices/new")} icon={<Plus className="w-4 h-4" />}>Create invoice</Button>
          ) : undefined}
        />
      ) : (
        <div className="bg-surface-card border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_100px_100px_100px_32px] gap-4 px-5 py-3 border-b border-[var(--border)]">
            {["Customer", "Invoice #", "Amount", "Due", "Status", ""].map((h, i) => (
              <p key={i} className={cn("text-tiny uppercase tracking-wider text-fg-subtle font-semibold", i >= 2 && i < 5 ? "text-right" : "")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {filtered.map(inv => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="group flex sm:grid md:grid-cols-[2fr_1fr_100px_100px_100px_32px] gap-4 items-center px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-fg group-hover:text-ember transition-colors truncate">
                    {inv.customer_name}
                  </p>
                  <p className="text-tiny text-fg-muted mt-0.5">
                    {inv.sent_at ? `Sent ${fmtDate(inv.sent_at)}` : `Created ${fmtDate(inv.created_at)}`}
                    {inv.customer_viewed_count > 0 && <span className="ml-2 text-fg-faint">· Viewed {inv.customer_viewed_count}×</span>}
                  </p>
                </div>
                <p className="hidden md:block text-small text-fg-muted font-mono">
                  {inv.invoice_number ?? "Draft"}
                </p>
                <div className="hidden md:block text-right">
                  <p className="text-body font-display text-fg">{fmt(inv.total_zar)}</p>
                  {inv.amount_paid_zar > 0 && inv.amount_paid_zar < inv.total_zar && (
                    <p className="text-tiny text-fg-muted">{fmt(inv.amount_paid_zar)} paid</p>
                  )}
                </div>
                <p className="hidden md:block text-small text-fg-muted text-right">
                  {inv.due_at ? fmtDate(inv.due_at) : "—"}
                </p>
                <div className="hidden sm:flex justify-end">
                  <StatusBadge status={inv.status} />
                </div>
                <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors ml-auto shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-tiny text-fg-subtle">
        Your Qwikly subscription is billed monthly. No per-job fees, ever.{" "}
        <Link href="/dashboard/billing" className="text-ember hover:underline">View billing history</Link>
      </p>
    </div>
  );
}
