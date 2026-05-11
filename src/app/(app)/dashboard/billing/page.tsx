// Subscription billing overview.
//
// Replaces the legacy 8% commission stats page. The commission model was
// retired on 2026-05-11 in favour of monthly subscriptions. This page is a
// thin read-only summary, the full plan/upgrade/cancellation UI lives at
// /dashboard/settings/billing.
//
// NOTE: when the payfast_payments table lands (Phase 2 agents F/G/H/I), the
// recent payments list should read directly from `payfast_payments` where
// status='captured' ordered by created_at desc limit 10. For now we proxy
// through /api/subscription/invoices, which returns [] until that table is
// populated. The empty state below is the correct UX in both cases.

"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/empty";
import { fmt, fmtDateLong } from "@/lib/money";

interface SubscriptionSummary {
  plan: string;
  cycle: string;
  renewsAt: string | null;
  status: string;
  trialEndsAt: string | null;
}

interface PaymentRow {
  id: string;
  issuedAt: string;
  amountZar: number;
  status: string;
  pdfUrl: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Free trial",
  starter: "Starter",
  pro: "Pro",
  founders: "Founders",
  business: "Business",
  enterprise: "Enterprise",
  premium: "Legacy Premium",
};

function planLabel(plan: string) {
  return PLAN_LABELS[plan] ?? plan;
}

export default function BillingOverviewPage() {
  const [sub, setSub] = useState<SubscriptionSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, invRes] = await Promise.all([
          fetch("/api/subscription"),
          fetch("/api/subscription/invoices"),
        ]);
        if (subRes.ok) setSub(await subRes.json());
        if (invRes.ok) {
          const { invoices } = await invRes.json();
          setPayments(Array.isArray(invoices) ? invoices.slice(0, 10) : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const planName = sub ? planLabel(sub.plan) : "Free trial";
  const renewsAt = sub?.renewsAt ?? sub?.trialEndsAt ?? null;
  const renewsLabel = renewsAt ? fmtDateLong(renewsAt) : "Not scheduled";

  return (
    <div className="animate-fade-in max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Subscription overview"
        description="Your current plan, upcoming renewal, and recent payments. Manage upgrades, top-ups, and cancellation under settings."
      />

      {/* Plan summary card */}
      <div className="bg-surface-card border border-line rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-small text-fg-muted mb-1">Current plan</p>
            <p className="text-h1 text-fg">{planName}</p>
            <p className="text-small text-fg-muted mt-2">
              {sub?.status === "active" || !sub?.status
                ? `Next billing date: ${renewsLabel}`
                : `Status: ${sub.status}`}
            </p>
          </div>
          <Link href="/dashboard/settings/billing">
            <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
              Manage plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent payments */}
      <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
          <Receipt className="w-4 h-4 text-fg-muted" />
          <p className="text-small font-semibold text-fg">Recent payments</p>
        </div>

        {payments.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CreditCard className="w-8 h-8 text-fg-subtle mx-auto mb-3" />
            <p className="text-small text-fg">
              Your first invoice will appear here after your trial converts.
            </p>
            <p className="text-tiny text-fg-muted mt-1">
              Need to upgrade now?{" "}
              <Link
                href="/dashboard/settings/billing"
                className="text-brand hover:underline"
              >
                Pick a plan
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/50">
            {payments.map((p) => (
              <div
                key={p.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-small font-medium text-fg">
                    {fmtDateLong(p.issuedAt)}
                  </p>
                  <p className="text-tiny text-fg-muted capitalize">
                    {p.status}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-small font-display text-fg">
                    {fmt(p.amountZar)}
                  </p>
                  <Link
                    href={`/api/billing/invoices/${p.id}/pdf`}
                    className="text-small text-brand hover:underline flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="bg-surface-card border border-line rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-small font-semibold text-fg">
            Upgrade, top up, or cancel
          </p>
          <p className="text-tiny text-fg-muted">
            All plan changes happen in settings.
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="text-small text-brand hover:underline flex items-center gap-1.5"
        >
          Go to billing settings
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
