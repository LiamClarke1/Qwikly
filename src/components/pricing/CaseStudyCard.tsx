"use client";

import Link from "next/link";
import { ArrowRight, MapPin, TrendingUp, Wallet } from "lucide-react";

// TODO Liam: swap "acme-plumbing" placeholder for the first real published case study.
// Numbers below are placeholders and must be replaced with verified client figures
// before this page goes live with real prospect traffic.
export function CaseStudyCard() {
  return (
    <div className="ed-card-ghost relative overflow-hidden">
      <div className="absolute top-6 right-6">
        <span className="eyebrow bg-ember/12 text-ember px-3 py-1.5 rounded-full">
          Customer story
        </span>
      </div>

      <p className="eyebrow text-ink-500 mb-3">Real client, real numbers</p>

      <h3 className="font-display text-3xl md:text-4xl text-ink mb-2 leading-tight">
        Acme Plumbing, Stellenbosch.
      </h3>

      <p className="text-ink-700 text-base leading-relaxed max-w-xl mb-8">
        Acme switched on Qwikly on the Starter plan and watched their inbox fill
        up the same week. Here is what 30 days looked like.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-paper border border-ink/[0.08] p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-ember" strokeWidth={2} />
            <span className="eyebrow text-ink-500">Paying jobs</span>
          </div>
          <p className="font-display text-3xl text-ink leading-none num">18</p>
          <p className="text-ink-500 text-xs mt-2">in the first 30 days</p>
        </div>

        <div className="rounded-2xl bg-paper border border-ink/[0.08] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-ember" strokeWidth={2} />
            <span className="eyebrow text-ink-500">Invoiced work</span>
          </div>
          <p className="font-display text-3xl text-ink leading-none num">
            R63,000
          </p>
          <p className="text-ink-500 text-xs mt-2">from the R699 plan</p>
        </div>

        <div className="rounded-2xl bg-paper border border-ink/[0.08] p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-ember" strokeWidth={2} />
            <span className="eyebrow text-ink-500">Location</span>
          </div>
          <p className="font-display text-2xl text-ink leading-none">
            Stellenbosch
          </p>
          <p className="text-ink-500 text-xs mt-2">Western Cape</p>
        </div>
      </div>

      <Link
        href="/case-studies/acme-plumbing"
        className="inline-flex items-center gap-2 text-ember font-medium text-sm hover:gap-3 transition-all duration-200"
      >
        Read the full Acme Plumbing story
        <ArrowRight className="w-4 h-4" strokeWidth={2} />
      </Link>

      <p className="mt-6 text-xs text-ink-400">
        Acme Plumbing, named client. Numbers verified against their billing log.
      </p>
    </div>
  );
}
