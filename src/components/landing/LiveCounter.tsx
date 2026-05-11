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
    return () => { cancelled = true; };
  }, []);

  const cards: Array<{ value: string; label: string; footnote?: string; show: boolean }> = [
    {
      value: stats.jobsBooked.toLocaleString("en-ZA"),
      label: "Jobs booked",
      show: true,
    },
    {
      value: formatZar(stats.revenueGenerated),
      label: "Revenue captured for SA businesses",
      footnote: stats.revenueIsEstimate ? "industry estimate" : undefined,
      show: true,
    },
    {
      value: stats.businessesPowered.toLocaleString("en-ZA"),
      label: "Businesses powered",
      show: true,
    },
  ];

  return (
    <section
      aria-label="Live Qwikly scoreboard"
      className="relative rounded-3xl overflow-hidden bg-ink grain-dark"
    >
      {/* ambient glow */}
      <div className="ember-blob w-[560px] h-[380px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25 pointer-events-none" />

      <div className="relative px-8 py-10 md:px-12 md:py-14">
        {/* header row */}
        <div className="flex items-center gap-3 mb-10">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-ember tick" />
          <p className="eyebrow text-paper/50">Live scoreboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-paper/[0.08]">
          {cards.map((c, i) => (
            <div
              key={c.label}
              className={`${i === 0 ? "" : "md:pl-10 lg:pl-14"} ${i === cards.length - 1 ? "" : "pb-8 md:pb-0 md:pr-10 lg:pr-14"}`}
            >
              <p
                className="font-mono num text-paper leading-none"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em" }}
              >
                {c.value}
              </p>
              <p className="eyebrow text-paper/45 mt-4 leading-snug">{c.label}</p>
              {c.footnote && (
                <p className="mt-1.5 text-[11px] text-paper/30 italic">{c.footnote}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
