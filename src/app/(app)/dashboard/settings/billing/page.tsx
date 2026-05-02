"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard, Calendar, Check, Download, Shield,
  ArrowRight, X, CheckCircle, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, fmtDateLong } from "@/lib/money";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanId = "starter" | "pro" | "premium";
type BillingCycle = "monthly" | "annual";
type InvoiceStatus = "paid" | "open" | "overdue";

interface SubscriptionData {
  plan: PlanId;
  cycle: BillingCycle;
  renewsAt: string | null;
  paymentMethod: { brand: string; last4: string } | null;
  status: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionInvoice {
  id: string;
  issuedAt: string;
  amountZar: number;
  status: InvoiceStatus;
  pdfUrl: string | null;
}

// ─── API stubs (Terminal 6 implements these) ──────────────────────────────────

// TODO: wire to subscription service — GET /api/subscription
// Returns: SubscriptionData
async function fetchSubscription(): Promise<SubscriptionData | null> {
  const res = await fetch("/api/subscription");
  if (!res.ok) return null;
  return res.json();
}

// TODO: wire to subscription service — GET /api/subscription/invoices
// Returns: { invoices: SubscriptionInvoice[] } (most recent first)
async function fetchInvoices(): Promise<SubscriptionInvoice[]> {
  const res = await fetch("/api/subscription/invoices");
  if (!res.ok) return [];
  const { invoices } = await res.json();
  return invoices ?? [];
}

async function requestPlanChange(plan: PlanId, cycle: BillingCycle): Promise<string | null> {
  const res = await fetch("/api/subscription/change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, cycle }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url ?? null;
}

async function requestCancel(): Promise<void> {
  await fetch("/api/subscription/cancel", { method: "POST" });
}

async function requestPaymentMethodUpdate(): Promise<string | null> {
  const res = await fetch("/api/subscription/payment-method", { method: "POST" });
  if (!res.ok) return null;
  const { url } = await res.json();
  return url ?? null;
}

// ─── Pricing constants ────────────────────────────────────────────────────────

const MONTHLY: Record<PlanId, number> = { starter: 0, pro: 599, premium: 1299 };
// Annual = 10 months (2 months free)
const ANNUAL:  Record<PlanId, number> = { starter: 0, pro: 5990, premium: 12990 };

const PLANS: Record<PlanId, { name: string; tagline: string; highlight: boolean; features: string[] }> = {
  starter: {
    name: "Starter",
    tagline: "Free forever — no card required",
    highlight: false,
    features: [
      "25 qualified leads/month",
      "Website chat widget",
      "Email lead delivery",
      '"Powered by Qwikly" branding',
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "Most popular for growing businesses",
    highlight: true,
    features: [
      "200 qualified leads/month",
      "Custom branding (your logo)",
      "Custom greeting + qualifying questions",
      "Lead exports (CSV)",
      "Priority email support",
    ],
  },
  premium: {
    name: "Premium",
    tagline: "Unlimited leads, unlimited potential",
    highlight: false,
    features: [
      "Unlimited qualified leads",
      "Everything in Pro, plus:",
      "WhatsApp routing (coming soon)",
      "Calendar integration (coming soon)",
      "API access",
      "Dedicated support",
    ],
  },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; classes: string }> = {
  paid:    { label: "Paid",    classes: "bg-success/10 text-success border border-success/20" },
  open:    { label: "Due",     classes: "bg-brand/10 text-brand border border-brand/20" },
  overdue: { label: "Overdue", classes: "bg-danger/10 text-danger border border-danger/20" },
};

// ─── Plan Change Modal ────────────────────────────────────────────────────────

function PlanChangeModal({
  from, to, fromCycle, toCycle, onClose, onConfirm,
}: {
  from: PlanId; to: PlanId; fromCycle: BillingCycle; toCycle: BillingCycle;
  onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isAnnualToMonthly = fromCycle === "annual" && toCycle === "monthly";
  const isDowngrade = MONTHLY[to] < MONTHLY[from] || isAnnualToMonthly;

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setDone(true);
    setTimeout(onClose, 1600);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-line rounded-2xl p-6 w-full max-w-md">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-body font-semibold text-fg">Plan updated</p>
            <p className="text-small text-fg-muted mt-1">Your subscription has been changed.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-h2 text-fg">Confirm plan change</h3>
              <button onClick={onClose} className="text-fg-muted hover:text-fg cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-tiny text-fg-muted mb-0.5">From</p>
                  <p className="text-small font-semibold text-fg">
                    {PLANS[from].name} <span className="text-fg-muted font-normal capitalize">({fromCycle})</span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-fg-muted shrink-0" />
                <div className="text-right">
                  <p className="text-tiny text-fg-muted mb-0.5">To</p>
                  <p className="text-small font-semibold text-fg">
                    {PLANS[to].name} <span className="text-fg-muted font-normal capitalize">({toCycle})</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="text-small text-fg-muted mb-5 leading-relaxed">
              {isAnnualToMonthly
                ? "Annual plans switching to monthly take effect at your next renewal. No refund is issued for the remaining annual period."
                : isDowngrade
                ? "Your new plan will apply from your next renewal date. You keep your current features until then."
                : "Your upgrade takes effect immediately. Any prorated difference will appear on your next invoice."}
            </p>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>Cancel</Button>
              <Button onClick={handleConfirm} loading={loading} className="flex-1">Confirm change</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({
  renewsAt, onClose, onConfirm,
}: { renewsAt: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setDone(true);
    setTimeout(onClose, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-line rounded-2xl p-6 w-full max-w-md">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-body font-semibold text-fg">Subscription cancelled</p>
            <p className="text-small text-fg-muted mt-1">
              You&apos;ll keep access until {fmtDateLong(renewsAt)}.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-h2 text-fg">Cancel subscription?</h3>
              <button onClick={onClose} className="text-fg-muted hover:text-fg cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-small text-fg-muted mb-2 leading-relaxed">
              Your plan stays active until{" "}
              <span className="text-fg font-medium">{fmtDateLong(renewsAt)}</span>.
              After that, your account will be paused and you won&apos;t be charged again.
            </p>
            <p className="text-small text-fg-muted mb-5">
              Within your first 30 days?{" "}
              <a href="mailto:billing@qwikly.co.za" className="text-brand hover:underline">Contact support</a>
              {" "}for a full refund instead.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>
                Keep subscription
              </Button>
              <Button variant="danger" onClick={handleConfirm} loading={loading} className="flex-1">
                Cancel subscription
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<{ plan: PlanId; cycle: BillingCycle } | null>(null);
  // Resolve legacy plan IDs on load
  const resolvedPlan = (sub?.plan as string) === "lite" ? "starter" as PlanId :
    (sub?.plan as string) === "business" ? "premium" as PlanId : (sub?.plan as PlanId);
  const [showCancel, setShowCancel] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [subData, invoiceData] = await Promise.all([fetchSubscription(), fetchInvoices()]);
    setSub(subData);
    setInvoices(invoiceData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Starter users have no paid subscription row — show them on the free plan
  const effectiveSub = sub ?? {
    plan: "starter" as PlanId,
    cycle: "monthly" as BillingCycle,
    renewsAt: null,
    paymentMethod: null,
    status: "active",
    cancelAtPeriodEnd: false,
  };

  const currentPlanId: PlanId = resolvedPlan ?? "starter";
  const plan = PLANS[currentPlanId];
  const isMonthly = effectiveSub.cycle === "monthly";
  const monthlyPrice = MONTHLY[currentPlanId];
  const displayPrice = isMonthly ? monthlyPrice : Math.round(ANNUAL[currentPlanId] / 12);
  const annualSaving = monthlyPrice * 2;

  async function handlePlanChange(plan: PlanId, cycle: BillingCycle) {
    const url = await requestPlanChange(plan, cycle);
    if (url) {
      window.location.href = url;
      return;
    }
    await loadData();
  }

  async function handleCancel() {
    await requestCancel();
    await loadData();
  }

  async function handleUpdatePayment() {
    setPaymentLoading(true);
    const url = await requestPaymentMethodUpdate();
    if (url) window.location.href = url;
    setPaymentLoading(false);
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="Manage your subscription, payment method, and invoice history."
      />

      {/* ── A: Current Subscription ──────────────────────────────────────── */}
      <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <p className="text-small font-semibold text-fg">Current subscription</p>
          {isMonthly && (
            <button
              onClick={() => setPendingChange({ plan: effectiveSub.plan, cycle: "annual" })}
              className="flex items-center gap-1 text-tiny font-medium text-brand hover:underline cursor-pointer transition-colors"
            >
              Switch to annual — save {fmt(annualSaving)}/yr
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-h1 text-fg">{plan.name}</h2>
                {plan.highlight && (
                  <span className="text-tiny font-semibold text-ember bg-ember/10 border border-ember/20 px-2.5 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
              </div>
              <p className="text-small text-fg-muted">{plan.tagline}</p>
              <p className="text-tiny text-fg-subtle mt-1 capitalize">{effectiveSub.cycle} billing</p>
            </div>
            <div className="text-right">
              <p className="text-display-2 font-display text-fg">
                {fmt(displayPrice)}
                <span className="text-small text-fg-muted font-normal">/mo</span>
              </p>
              {!isMonthly && (
                <p className="text-tiny text-fg-muted mt-0.5">
                  Billed {fmt(ANNUAL[effectiveSub.plan])}/year
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-line/50 flex items-center gap-2">
            <Calendar className={cn("w-4 h-4 shrink-0", effectiveSub.cancelAtPeriodEnd ? "text-warning" : "text-fg-muted")} />
            <p className="text-small text-fg-muted">
              {effectiveSub.cancelAtPeriodEnd ? (
                <>
                  <span className="text-warning font-medium">Cancels on</span>{" "}
                  <span className="text-fg font-medium">{fmtDateLong(effectiveSub.renewsAt ?? "")}</span>
                </>
              ) : (
                <>
                  Next renewal{" "}
                  <span className="text-fg font-medium">{fmtDateLong(effectiveSub.renewsAt ?? "")}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line/50">
          <button
            onClick={() => setShowCancel(true)}
            className="text-tiny text-fg-subtle hover:text-danger cursor-pointer transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      </div>

      {/* ── B: Change Plan ───────────────────────────────────────────────── */}
      <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="text-small font-semibold text-fg">Change plan</p>
          <p className="text-tiny text-fg-muted mt-0.5">No per-lead fees. Flat monthly pricing.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["starter", "pro", "premium"] as PlanId[]).map((planId) => {
              const meta = PLANS[planId];
              const isCurrent = planId === currentPlanId;
              const price = isMonthly ? MONTHLY[planId] : Math.round(ANNUAL[planId] / 12);
              const isUpgrade = MONTHLY[planId] > MONTHLY[currentPlanId];

              return (
                <div
                  key={planId}
                  className={cn(
                    "relative rounded-xl border p-5 flex flex-col transition-colors duration-200",
                    isCurrent
                      ? "border-brand/40 bg-brand/5"
                      : "border-line hover:border-white/20"
                  )}
                >
                  {isCurrent && (
                    <span className="absolute top-3 right-3 text-tiny font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {meta.highlight && !isCurrent && (
                    <span className="absolute top-3 right-3 text-tiny font-semibold text-ember bg-ember/10 border border-ember/20 px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}

                  <p className={cn("text-small font-semibold mb-1", isCurrent ? "text-brand" : "text-fg")}>
                    {meta.name}
                  </p>
                  <p className="text-display-2 font-display text-fg mb-0.5">
                    {fmt(price)}
                    <span className="text-tiny text-fg-muted font-normal">/mo</span>
                  </p>
                  <p className="text-tiny text-fg-subtle mb-4">
                    {isMonthly ? "Billed monthly" : `Billed ${fmt(ANNUAL[planId])}/yr`}
                  </p>

                  <ul className="flex-1 space-y-2 mb-5">
                    {meta.features.slice(0, 5).map((feat, i) => {
                      const isLabel = feat.endsWith(":");
                      return !isLabel ? (
                        <li key={i} className="flex items-start gap-2 text-tiny text-fg-muted">
                          <Check className="w-3 h-3 text-brand mt-0.5 shrink-0" strokeWidth={2.5} />
                          {feat}
                        </li>
                      ) : null;
                    })}
                  </ul>

                  {isCurrent ? (
                    <div className="h-8 flex items-center justify-center">
                      <span className="text-tiny text-fg-muted flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-brand" strokeWidth={2.5} />
                        Active plan
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant={isUpgrade ? "primary" : "outline"}
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => setPendingChange({ plan: planId, cycle: effectiveSub.cycle })}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── C: Payment Method ────────────────────────────────────────────── */}
      <div className="bg-surface-card border border-line rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-small font-semibold text-fg mb-2">Payment method</p>
            {effectiveSub.paymentMethod ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-white/8 border border-line rounded flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-fg-muted" aria-hidden="true" />
                </div>
                <p className="text-small text-fg capitalize">
                  {effectiveSub.paymentMethod!.brand} ending in {effectiveSub.paymentMethod!.last4}
                </p>
              </div>
            ) : (
              <p className="text-small text-fg-muted">No card on file</p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpdatePayment}
            loading={paymentLoading}
          >
            Update payment method
          </Button>
        </div>
      </div>

      {/* ── D: Invoice History ───────────────────────────────────────────── */}
      <div className="bg-surface-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="text-small font-semibold text-fg">Invoice history</p>
        </div>
        {invoices.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-small text-fg-muted">No invoices yet — your first invoice will appear here after your initial payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-line">
                  {["Date", "Amount", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-5 py-3 text-tiny uppercase tracking-wider text-fg-subtle font-semibold",
                        i === 1 ? "text-right" : i === 3 ? "text-right" : "text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {invoices.map((inv) => {
                  const statusCfg = INVOICE_STATUS[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-small text-fg">
                        {fmtDateLong(inv.issuedAt)}
                      </td>
                      <td className="px-5 py-4 text-small font-display text-fg text-right">
                        {fmt(inv.amountZar)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex text-tiny font-medium px-2.5 py-1 rounded-full",
                          statusCfg.classes
                        )}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            download
                            className="inline-flex items-center gap-1.5 text-tiny text-brand hover:underline cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            Download
                          </a>
                        ) : (
                          <span className="text-tiny text-fg-subtle">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── E: 30-day money-back notice ──────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-success/5 border border-success/15 rounded-2xl p-4">
        <Shield className="w-4 h-4 text-success mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-small text-fg-muted leading-relaxed">
          <span className="font-semibold text-fg">30-day money-back guarantee.</span>{" "}
          Within 30 days of your first payment?{" "}
          <a href="mailto:billing@qwikly.co.za" className="text-brand hover:underline">
            Contact support
          </a>{" "}
          for a refund — no questions asked.
        </p>
      </div>

      <p className="text-tiny text-fg-subtle pb-2">
        Questions about your bill?{" "}
        <a href="mailto:billing@qwikly.co.za" className="text-brand hover:underline">
          Contact billing support
        </a>
      </p>

      {/* Modals */}
      {pendingChange && (
        <PlanChangeModal
          from={currentPlanId}
          to={pendingChange.plan}
          fromCycle={effectiveSub.cycle}
          toCycle={pendingChange.cycle}
          onClose={() => setPendingChange(null)}
          onConfirm={() => handlePlanChange(pendingChange.plan, pendingChange.cycle)}
        />
      )}
      {showCancel && (
        <CancelModal
          renewsAt={effectiveSub.renewsAt ?? ""}
          onClose={() => setShowCancel(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
