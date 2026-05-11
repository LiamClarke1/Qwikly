"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  currentPlan: string;
}

export function OutboundLockedOverlay({ currentPlan }: Props) {
  const tierLabel =
    currentPlan === 'trial' ? 'Free Trial'
    : currentPlan === 'starter' ? 'Starter'
    : currentPlan === 'premium' ? 'Premium (legacy)'
    : 'your current plan';

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-md"
      role="dialog"
      aria-label="Outbound locked"
    >
      <div className="max-w-md text-center px-6 py-8 rounded-2xl bg-white shadow-xl border border-ink-100">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-ink-50 flex items-center justify-center">
          <Lock className="w-6 h-6 text-ink-700" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900">Outbound is on the Pro plan</h2>
        <p className="mt-2 text-sm text-ink-600">
          You are on {tierLabel}. Upgrade to Pro for R1,799/month to unlock daily hand-picked prospects,
          warmed sending domains, and the full Outbound pipeline.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/dashboard/settings/billing?plan=pro">
            <Button className="w-full">
              Upgrade to Pro
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pipeline" className="text-tiny text-ink-500 hover:text-ink-700 underline">
            Learn what Outbound does
          </Link>
        </div>
      </div>
    </div>
  );
}
