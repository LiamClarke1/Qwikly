"use client";

import Link from "next/link";

const NICHES: { slug: string; label: string }[] = [
  { slug: "plumbers", label: "Plumbers" },
  { slug: "electricians", label: "Electricians" },
  { slug: "salons", label: "Salons" },
  { slug: "dentists", label: "Dentists" },
  { slug: "builders", label: "Builders" },
  { slug: "auto", label: "Auto" },
  { slug: "attorneys", label: "Attorneys" },
  { slug: "cleaning", label: "Cleaning" },
];

export function NicheChips() {
  return (
    <div className="mx-auto max-w-site px-6 lg:px-10 py-16">
      <div className="mb-8">
        <p className="eyebrow text-ink-500 mb-3">Built for your trade</p>
        <h2 className="font-display text-2xl md:text-3xl text-ink max-w-2xl leading-tight">
          Qwikly adapts to whatever you do.
        </h2>
        <p className="mt-3 text-ink-700 text-sm leading-relaxed max-w-xl">
          Same digital system, tuned to the questions your customers actually
          ask. Pick your trade for examples and benchmarks.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {NICHES.map((n) => (
          <Link
            key={n.slug}
            href={`/niche/${n.slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-paper border border-ink/[0.12] hover:border-ember hover:bg-ember/[0.04] hover:text-ember transition-all duration-200 text-sm text-ink-700 font-medium"
          >
            {n.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
