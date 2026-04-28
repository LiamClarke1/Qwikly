"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";

interface InvoiceLine {
  id: string;
  description: string;
  amount_zar: number;
  booking_id: string | null;
}

interface InvoiceDetail {
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
  notes: string | null;
  invoice_lines: InvoiceLine[];
}

function fmt(zar: number) {
  return "R" + zar.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft:       { label: "Draft",      icon: Clock,          color: "text-fg-muted" },
  sent:        { label: "Sent",       icon: Clock,          color: "text-brand" },
  paid:        { label: "Paid",       icon: CheckCircle,    color: "text-success" },
  overdue:     { label: "Overdue",    icon: AlertTriangle,  color: "text-warning" },
  written_off: { label: "Written off", icon: AlertTriangle, color: "text-danger" },
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { client, loading: clientLoading } = useClient();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!client || !params.id) return;
    supabase
      .from("invoices")
      .select("*, invoice_lines(*)")
      .eq("id", params.id)
      .eq("client_id", client.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); }
        else { setInvoice(data as InvoiceDetail); }
        setLoading(false);
      });
  }, [client, params.id]);

  if (clientLoading || loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-small text-fg-muted hover:text-fg transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to invoices
        </button>
        <p className="text-fg-muted text-body">Invoice not found.</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const lines: InvoiceLine[] = invoice.invoice_lines ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-small text-fg-muted hover:text-fg transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to invoices
      </button>

      {/* Invoice document */}
      <div className="bg-bg-card border border-line rounded-2xl overflow-hidden max-w-2xl">
        {/* Header */}
        <div className="px-8 py-8 border-b border-line">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-display-2 font-display text-fg">
                {invoice.invoice_number || "Draft Invoice"}
              </p>
              <p className="text-small text-fg-muted mt-1">
                {fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}
              </p>
            </div>
            <span className={cn("flex items-center gap-1.5 text-body font-medium", cfg.color)}>
              <StatusIcon className="w-4 h-4" />
              {cfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <p className="text-tiny text-fg-subtle uppercase tracking-wider mb-2">From</p>
              <p className="text-small text-fg font-medium">Clarke Agency</p>
              <p className="text-small text-fg-muted">Qwikly Platform</p>
              <p className="text-small text-fg-muted">Johannesburg, South Africa</p>
              <p className="text-small text-fg-muted">hello@qwikly.co.za</p>
            </div>
            <div>
              <p className="text-tiny text-fg-subtle uppercase tracking-wider mb-2">Billing details</p>
              {invoice.due_at && (
                <p className="text-small text-fg-muted">
                  Due: <span className="text-fg">{fmtDate(invoice.due_at)}</span>
                </p>
              )}
              {invoice.paid_at && (
                <p className="text-small text-fg-muted">
                  Paid: <span className="text-success">{fmtDate(invoice.paid_at)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="px-8 py-6">
          {lines.length === 0 ? (
            <p className="text-small text-fg-muted italic">No line items.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left pb-3 text-tiny uppercase tracking-wider text-fg-subtle font-semibold">
                    Description
                  </th>
                  <th className="text-right pb-3 text-tiny uppercase tracking-wider text-fg-subtle font-semibold">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-line/50">
                    <td className="py-3 text-small text-fg">{line.description}</td>
                    <td className="py-3 text-small text-fg text-right font-display">
                      {fmt(line.amount_zar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals */}
          <div className="mt-6 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-small text-fg-muted">
              <span>Subtotal</span>
              <span className="font-display text-fg">{fmt(invoice.subtotal_zar)}</span>
            </div>
            {invoice.vat_zar > 0 && (
              <div className="flex justify-between text-small text-fg-muted">
                <span>VAT (15%)</span>
                <span className="font-display text-fg">{fmt(invoice.vat_zar)}</span>
              </div>
            )}
            <div className="flex justify-between text-body font-semibold text-fg border-t border-line pt-2">
              <span>Total</span>
              <span className="font-display text-display-2">{fmt(invoice.total_zar)}</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-8 py-5 bg-white/[0.02] border-t border-line">
          <p className="text-tiny text-fg-subtle">
            8% commission per completed booking. Min R150 · Max R5,000.
            {invoice.vat_zar === 0 && " VAT not applicable (not VAT registered)."}
          </p>
          {invoice.notes && (
            <p className="text-small text-fg-muted mt-2">{invoice.notes}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-line text-small text-fg-muted hover:text-fg hover:border-fg/20 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Save / Print
        </button>
      </div>
    </div>
  );
}
