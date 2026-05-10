"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  startedAt: string;
  completedAt: string | null;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

function formatHM(ms: number): { hh: string; mm: string } {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const hh = Math.floor(totalMin / 60).toString().padStart(2, "0");
  const mm = (totalMin % 60).toString().padStart(2, "0");
  return { hh, mm };
}

/**
 * Live "X hours Y minutes left of your 24-hour window" card.
 *
 * Three states:
 *   1. Window still open, not yet complete → terracotta accent, ticking
 *      mono numerals.
 *   2. Window expired, not yet complete → muted "Window closed, but you can
 *      still finish." copy.
 *   3. Complete (any time) → green success styling with the actual time
 *      taken, using the ember palette success tone.
 */
export default function CountdownCard({ startedAt, completedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const startedMs = new Date(startedAt).getTime();
  const completedMs = completedAt ? new Date(completedAt).getTime() : null;
  const msLeft = startedMs + WINDOW_MS - now;
  const expired = msLeft <= 0;

  // Completed state takes precedence over the timer.
  if (completedMs) {
    const taken = Math.max(0, completedMs - startedMs);
    const hours = Math.max(1, Math.round(taken / (60 * 60 * 1000)));
    return (
      <div
        className={cn(
          "ed-card p-5 sm:p-6 rounded-2xl border flex items-start gap-4",
          "bg-green-500/[0.06] border-green-500/25",
        )}
      >
        <div className="w-11 h-11 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-700" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow text-green-700 mb-1">Live</p>
          <p className="text-h3 font-semibold text-ink leading-tight">
            Live in <span className="num font-mono">{hours}</span>{" "}
            {hours === 1 ? "hour" : "hours"}.
          </p>
          <p className="text-small text-ink-500 mt-1">
            Your assistant is up. Watch the first 30 days roll in.
          </p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="ed-card p-5 sm:p-6 rounded-2xl border border-ink/[0.10] bg-ink/[0.03] flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-ink/[0.06] border border-ink/[0.10] flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-ink-400" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow text-ink-400 mb-1">24-hour window</p>
          <p className="text-h3 font-semibold text-ink leading-tight">
            Window closed, but you can still finish.
          </p>
          <p className="text-small text-ink-500 mt-1">
            No rush, tick off whatever is left below.
          </p>
        </div>
      </div>
    );
  }

  const { hh, mm } = formatHM(msLeft);
  return (
    <div className="ed-card p-5 sm:p-6 rounded-2xl border border-ember/25 bg-ember/[0.06] flex items-start gap-4">
      <div className="w-11 h-11 rounded-2xl bg-ember/15 border border-ember/25 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-ember" />
      </div>
      <div className="min-w-0">
        <p className="eyebrow text-ember mb-1">24-hour window</p>
        <p className="text-h3 font-semibold text-ink leading-tight">
          <span className="num font-mono text-ember">{hh}</span>
          <span className="text-ink-500">h </span>
          <span className="num font-mono text-ember">{mm}</span>
          <span className="text-ink-500">m </span>
          left of your 24-hour window.
        </p>
        <p className="text-small text-ink-500 mt-1">
          Tick the five steps below to lock in your launch.
        </p>
      </div>
    </div>
  );
}
