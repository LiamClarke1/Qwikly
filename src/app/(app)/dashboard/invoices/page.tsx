"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { PageHeader } from "@/components/ui/page";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";

interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal_zar: number;
  vat_zar: number;
  total_zar: number;
  status: string;
  sent_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft:        { label: "Draft",     icon: Clock,          color: "bg-white/5 text-fg-muted border border-line" },
  sent:         { label: "Sent",      icon: FileText,       color: "bg-brand/10 text-brand border border-brand/20" },
  paid:         { label: "Paid",      icon: CheckCircle,    color: "bg-success/10 text-success border border-success/20" },
  overdue:      { label: "Overdue",   icon: AlertTriangle,  color: "bg-warning/10 text-warning border border-warning/20" },
  written_off:  { label: "Written off", icon: XCircle,      color: "bg-danger/10 text-danger border border-danger/20" },
};

function fmt(zar: number) {
  return "R" + zar.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-tiny font-medium px-2.5 py-1 rounded-full border", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function InvoicesPage() {
  const { client, loading: clientLoading } = useClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Summary stats
  const totalPaid    = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total_zar, 0);
  const totalPending = invoices.filter(i => ["sent","overdue"].includes(i.status)).reduce((s, i) => s + i.total_zar, 0);
  const lastInvoice  = invoices[0] ?? null;

  useEffect(() => {
    if (!client) return;
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", client.id)
      .order("period_end", { ascending: false })
      .then(({ data }) => {
        setInvoices(data ?? []);
        setLoading(false);
      });
  }, [client]);

  if (clientLoading || loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Weekly commission invoices for jobs booked through Qwikly."
      />

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Total paid</p>
          <p className="text-display-2 text-fg font-display">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Outstanding</p>
          <p className={cn("text-display-2 font-display", totalPending > 0 ? "text-warning" : "text-fg")}>
            {fmt(totalPending)}
          </p>
        </div>
        <div className="bg-bg-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Commission rate</p>
          <p className="text-display-2 text-fg font-display">8%</p>
          <p className="text-tiny text-fg-subtle mt-0.5">min R150 · max R5,000</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Invoices are generated weekly for completed bookings. Your first invoice will appear after your first billing cycle."
        />
      ) : (
        <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_100px_40px] gap-4 px-5 py-3 border-b border-line">
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Invoice</p>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Period</p>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold text-right">Amount</p>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Due</p>
            <p className="text-tiny uppercase tracking-wider text-fg-subtle font-semibold">Status</p>
            <span />
          </div>

          <div className="divide-y divide-line">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="group flex sm:grid sm:grid-cols-[1fr_120px_100px_100px_100px_40px] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-body font-medium text-fg group-hover:text-brand transition-colors">
                    {inv.invoice_number || "Draft"}
                  </p>
                  <p className="text-tiny text-fg-muted mt-0.5">
                    {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                  </p>
                </div>
                <p className="hidden sm:block text-small text-fg-muted">
                  {fmtDate(inv.period_end)}
                </p>
                <p className="text-body font-display text-fg text-right">
                  {fmt(inv.total_zar)}
                </p>
                <p className="hidden sm:block text-small text-fg-muted">
                  {inv.due_at ? fmtDate(inv.due_at) : "—"}
                </p>
                <div className="hidden sm:block">
                  <StatusBadge status={inv.status} />
                </div>
                <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-tiny text-fg-subtle">
        Invoices are generated every Sunday at 23:59 SAST and sent Monday morning.
        Payment is debited Wednesday at 10:00. Questions?{" "}
        <a href="mailto:hello@qwikly.co.za" className="text-brand hover:underline">
          hello@qwikly.co.za
        </a>
      </p>
    </div>
  );
}
