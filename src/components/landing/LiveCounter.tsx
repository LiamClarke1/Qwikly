"use client";

import { useEffect, useState } from "react";

interface ScoreboardStats {
  jobsBooked: number;
  revenueGenerated: number;
  revenueIsEstimate: boolean;
  businessesPowered: number;
}

const ZERO_STATS: ScoreboardStats = {
  jobsBooked: 0,
  revenueGenerated: 0,
  revenueIsEstimate: true,
  businessesPowered: 0,
};

function formatZar(n: number): string {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `R${Math.round(n / 1000)}k`;
  return `R${n.toLocaleString("en-ZA")}`;
}

export function LiveCounter() {
  const [stats, setStats] = useState<ScoreboardStats>(ZERO_STATS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/scoreboard", { cache: "force-cache", next: { revalidate: 300 } as never })
      .then((r) => (r.ok ? r.json() : ZERO_STATS))
      .then((data: ScoreboardStats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: Array<{ value: string; label: string; footnote?: string }> = [
    { value: stats.jobsBooked.toLocaleString("en-ZA"), label: "Jobs booked" },
    {
      value: formatZar(stats.revenueGenerated),
      label: "Revenue captured for SA businesses",
      footnote: stats.revenueIsEstimate ? "industry estimate" : undefined,
    },
    { value: stats.businessesPowered.toLocaleString("en-ZA"), label: "Businesses powered" },
  ];

  return (
    <section
      aria-label="Live Qwikly scoreboard"
      className="relative py-16 md:py-20 grain overflow-hidden"
    >
      <div className="relative mx-auto max-w-site px-6 lg:px-10">
        <div className="flex items-center gap-3 mb-10">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-ember tick" />
          <p className="eyebrow text-ink-500">Live scoreboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div key={c.label} className="ed-card-ghost">
              <p
                className="font-mono num text-ink leading-none"
                style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                {c.value}
              </p>
              <p className="eyebrow text-ink-500 mt-5">{c.label}</p>
              {c.footnote && (
                <p className="mt-2 text-[11px] text-ink-400 italic">{c.footnote}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
