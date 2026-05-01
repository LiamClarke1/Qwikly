"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt, ChevronRight, CheckCircle, AlertTriangle,
  Clock, Lock, TrendingUp, DollarSign
} from "lucide-react";
import { useClient } from "@/lib/use-client";
import { PageHeader } from "@/components/ui/page";
import { Skeleton, EmptyState } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";
import type { BillingPeriod } from "@/lib/invoices/types";

const PERIOD_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:      { label: "In progress",  color: "bg-brand/10 text-brand border border-brand/20",           icon: Clock },
  locked:    { label: "Locked",       color: "bg-white/5 text-fg-muted border border-white/10",         icon: Lock },
  invoiced:  { label: "Invoice sent", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",  icon: Receipt },
  paid:      { label: "Paid",         color: "bg-success/10 text-success border border-success/20",     icon: CheckCircle },
  overdue:   { label: "Overdue",      color: "bg-danger/10 text-danger border border-danger/20",        icon: AlertTriangle },
  suspended: { label: "Suspended",    color: "bg-danger/10 text-danger border border-danger/20",        icon: AlertTriangle },
};

function PeriodBadge({ status }: { status: string }) {
  const cfg = PERIOD_STATUS_CONFIG[status] ?? PERIOD_STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-tiny font-medium px-2.5 py-1 rounded-full", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

interface BillingStats {
  lifetimePaid: number;
  lifetimeInvoiced: number;
  openCommission: number;
  thisMonthInvoiced: number;
}

export default function BillingPage() {
  const { client, loading: clientLoading } = useClient();
  const router = useRouter();
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [stats, setStats] = useState<BillingStats>({ lifetimePaid: 0, lifetimeInvoiced: 0, openCommission: 0, thisMonthInvoiced: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBilling = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const res = await fetch("/api/billing/periods?limit=24");
    if (!res.ok) { setLoading(false); return; }
    const { periods: data } = await res.json();
    setPeriods(data ?? []);

    const all = (data ?? []) as BillingPeriod[];
    const paid = all.filter(p => p.status === "paid").reduce((s, p) => s + p.commission_zar, 0);
    const invoiced = all.reduce((s, p) => s + p.commission_zar, 0);
    const open = all.filter(p => p.status === "open").reduce((s, p) => s + p.commission_zar, 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonth = all.find(p => p.period_start >= monthStart);
    setStats({ lifetimePaid: paid, lifetimeInvoiced: invoiced, openCommission: open, thisMonthInvoiced: thisMonth?.total_invoiced_zar ?? 0 });
    setLoading(false);
  }, [client]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  if (clientLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="Your Qwikly subscription is billed monthly. No per-job fees, no commissions."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">This month invoiced</p>
          <p className="text-display-2 font-display text-fg">{fmt(stats.thisMonthInvoiced)}</p>
          <p className="text-tiny text-fg-subtle mt-0.5">by your customers</p>
        </div>
        <div className="bg-surface-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Current period fee</p>
          <p className="text-display-2 font-display text-brand">{fmt(stats.openCommission)}</p>
          <p className="text-tiny text-fg-subtle mt-0.5">accruing, due 1st</p>
        </div>
        <div className="bg-surface-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Lifetime invoiced</p>
          <p className="text-display-2 font-display text-fg">{fmt(stats.lifetimeInvoiced)}</p>
          <p className="text-tiny text-fg-subtle mt-0.5">total Qwikly fees</p>
        </div>
        <div className="bg-surface-card border border-line rounded-2xl p-5">
          <p className="text-small text-fg-muted mb-1">Lifetime paid</p>
          <p className="text-display-2 font-display text-fg">{fmt(stats.lifetimePaid)}</p>
          <p className="text-tiny text-fg-subtle mt-0.5">fees settled</p>
        </div>
      </div>

      {/* Fee explainer */}
      <div className="bg-brand/5 border border-brand/15 rounded-2xl p-5 mb-6 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-brand" />
        </div>
        <div>
          <p className="text-small font-semibold text-fg mb-1">How billing works</p>
          <p className="text-small text-fg-muted leading-relaxed">
            Your Qwikly subscription renews monthly. An invoice is sent at the start of each billing cycle.
            You have 7 days to pay before your account is paused. No per-job fees — ever.
          </p>
        </div>
      </div>

      {/* Billing periods */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : periods.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No billing history yet"
          description="Your first billing period will appear here after your first month on Qwikly."
        />
      ) : (
        <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px_32px] gap-4 px-5 py-3 border-b border-line">
            {["Period", "Invoiced", "Collected", "Subscription fee", "Status", ""].map((h, i) => (
              <p key={i} className={cn("text-tiny uppercase tracking-wider text-fg-subtle font-semibold", i >= 1 && i < 5 ? "text-right" : "")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-line">
            {periods.map(period => {
              const cfg = PERIOD_STATUS_CONFIG[period.status] ?? PERIOD_STATUS_CONFIG.open;
              const Icon = cfg.icon;
              const start = new Date(period.period_start);
              const monthLabel = start.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
              return (
                <Link
                  key={period.id}
                  href={`/dashboard/billing/${period.id}`}
                  className="group flex sm:grid md:grid-cols-[2fr_1fr_1fr_1fr_120px_32px] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-body font-medium text-fg group-hover:text-brand transition-colors">{monthLabel}</p>
                    <p className="text-tiny text-fg-muted mt-0.5">
                      {fmtDate(period.period_start)} – {fmtDate(period.period_end)}
                    </p>
                  </div>
                  <p className="hidden md:block text-small text-fg-muted text-right">{fmt(period.total_invoiced_zar)}</p>
                  <p className="hidden md:block text-small text-fg-muted text-right">{fmt(period.total_paid_zar)}</p>
                  <p className="hidden md:block text-small font-display text-fg text-right">{fmt(period.commission_zar)}</p>
                  <div className="hidden sm:flex justify-end">
                    <PeriodBadge status={period.status} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors ml-auto shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-5 text-tiny text-fg-subtle">
        Need help with a charge?{" "}
        <a href="mailto:billing@qwikly.co.za" className="text-brand hover:underline">Contact billing support</a>
      </p>
    </div>
  );
}
