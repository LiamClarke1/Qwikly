"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { ArrowRight, Check, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PLAN_ANNUAL_DISCOUNT_PCT, type PlanTier } from "@/lib/plan";

interface Props {
  client: ClientRow;
  plan: PlanTier;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepBilling({ plan, onAdvance, onBack }: Props) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const config = PLAN_CONFIG[plan];

  if (plan === "trial") {
    return (
      <div className="pt-10 max-w-lg">
        <h1 className="text-display-1 font-semibold text-fg mb-2">
          Your 14-day free trial is ready.
        </h1>
        <p className="text-fg-muted text-body mb-8">
          No bank account required. No credit card. Nothing to pay today.
        </p>

        <div className="rounded-2xl bg-success/5 border border-success/20 p-6 mb-8 space-y-4">
          <p className="text-small font-semibold text-fg">What&apos;s included in your trial:</p>
          <ul className="space-y-2.5">
            {[
              "25 qualified leads during your trial",
              "Full Pro features (custom branding, questions)",
              "Digital assistant platform",
              "Email lead delivery",
              "POPIA compliant",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-success shrink-0" />
                <span className="text-small text-fg-muted">{f}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-success/15">
            <p className="text-tiny text-fg-subtle">
              After 14 days, choose a plan to continue. Your dashboard and all lead history stay with you.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
          <Button type="button" onClick={() => onAdvance()} className="flex-1">
            Activate my free trial →
          </Button>
        </div>
      </div>
    );
  }

  if (plan === "starter") {
    return (
      <div className="pt-10 max-w-lg">
        <h1 className="text-display-1 font-semibold text-fg mb-2">
          Activate your Starter plan.
        </h1>
        <p className="text-fg-muted text-body mb-8">
          30-day money-back guarantee. Cancel anytime.
        </p>

        <div className="rounded-2xl bg-white/[0.03] border border-line p-6 mb-8 space-y-4">
          <p className="text-small font-semibold text-fg">Starter plan includes:</p>
          <ul className="space-y-2.5">
            {[
              "75 qualified leads/month",
              "Digital assistant",
              "Email lead delivery",
              '"Powered by Qwikly" branding',
              "Email support",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-success shrink-0" />
                <span className="text-small text-fg-muted">{f}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-line">
            <p className="text-tiny text-fg-subtle">
              Upgrade to Pro or Premium anytime to remove branding, increase your lead cap, and unlock CSV exports.
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleCheckout("monthly")}
            disabled={checkoutLoading}
            className="w-full flex items-center justify-between p-5 rounded-2xl border border-line hover:border-brand/40 hover:bg-brand/[0.03] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-left"
          >
            <div>
              <p className="text-small font-semibold text-fg">Monthly billing</p>
              <p className="text-tiny text-fg-muted mt-0.5">Cancel anytime</p>
            </div>
            <div className="text-right">
              <p className="text-small font-bold text-fg num">R399/mo</p>
              <ArrowRight className="w-4 h-4 text-fg-subtle ml-auto mt-1" />
            </div>
          </button>
        </div>

        {checkoutLoading && (
          <div className="flex items-center justify-center gap-2 text-fg-muted text-small mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Opening secure checkout…
          </div>
        )}

        {checkoutError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {checkoutError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
          <button
            type="button"
            onClick={() => onAdvance()}
            className="text-small text-fg-muted hover:text-fg underline cursor-pointer transition-colors duration-150"
          >
            Skip for now, set up billing later
          </button>
        </div>
      </div>
    );
  }

  const monthly = config.priceMonthly;
  const annualTotal = Math.round(monthly * 12 * (1 - PLAN_ANNUAL_DISCOUNT_PCT));
  const annualMonthly = Math.round(annualTotal / 12);

  async function handleCheckout(cycle: "monthly" | "annual") {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing_cycle: cycle }),
      });
      if (!res.ok) throw new Error("Checkout failed");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setCheckoutError("Could not start checkout — please try again or contact support.");
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="pt-10 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Activate your {config.name} plan.
      </h1>
      <p className="text-fg-muted text-body mb-8">
        30-day money-back guarantee. Cancel anytime.
      </p>

      {checkoutError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {checkoutError}
        </div>
      )}

      <div className="space-y-3 mb-8">
        {/* Monthly */}
        <button
          type="button"
          onClick={() => handleCheckout("monthly")}
          disabled={checkoutLoading}
          className="w-full flex items-center justify-between p-5 rounded-2xl border border-line hover:border-brand/40 hover:bg-brand/[0.03] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-left"
        >
          <div>
            <p className="text-small font-semibold text-fg">Monthly billing</p>
            <p className="text-tiny text-fg-muted mt-0.5">Cancel anytime</p>
          </div>
          <div className="text-right">
            <p className="text-small font-bold text-fg num">R{monthly}/mo</p>
            <ArrowRight className="w-4 h-4 text-fg-subtle ml-auto mt-1" />
          </div>
        </button>

        {/* Annual */}
        <button
          type="button"
          onClick={() => handleCheckout("annual")}
          disabled={checkoutLoading}
          className="w-full flex items-center justify-between p-5 rounded-2xl border border-brand/40 bg-brand/[0.04] hover:bg-brand/[0.08] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-left relative"
        >
          <span className="absolute -top-3 left-4 px-2.5 py-1 rounded-full bg-brand text-white text-[10px] font-bold tracking-wide">
            2 months free
          </span>
          <div>
            <p className="text-small font-semibold text-fg">Annual billing</p>
            <p className="text-tiny text-fg-muted mt-0.5">Pay R{annualTotal.toLocaleString()} upfront</p>
          </div>
          <div className="text-right">
            <p className="text-small font-bold text-brand num">R{annualMonthly}/mo</p>
            <p className="text-tiny text-fg-subtle line-through num">R{monthly}/mo</p>
          </div>
        </button>
      </div>

      {checkoutLoading && (
        <div className="flex items-center justify-center gap-2 text-fg-muted text-small mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Opening secure checkout…
        </div>
      )}

      <div className="flex items-center gap-2 text-tiny text-fg-subtle mb-8">
        <CreditCard className="w-3.5 h-3.5 shrink-0" />
        Secure payment via Paystack. Your card details are never stored by Qwikly.
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <button
          type="button"
          onClick={() => onAdvance()}
          className="text-small text-fg-muted hover:text-fg underline cursor-pointer transition-colors duration-150"
        >
          Skip for now, set up billing later
        </button>
      </div>
    </div>
  );
}
