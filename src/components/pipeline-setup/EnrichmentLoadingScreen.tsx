"use client";
import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

const PHASES = [
  "Reading your website",
  "Looking up your business profile",
  "Building your ideal customer profile",
] as const;

/**
 * Cosmetic three-phase progress while the enrich API call is in flight.
 * The phases auto-advance on a timer because the API endpoint is one round
 * trip, we don't have per-phase progress events. The animation makes the
 * wait feel intentional rather than blank.
 */
export function EnrichmentLoadingScreen() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 18000); // advance every 18s; total request ~45-60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-xl mx-auto p-12 text-center space-y-8">
      <h2 className="font-display text-2xl text-ink-900">Hang tight</h2>
      <ul className="space-y-3 text-left max-w-sm mx-auto">
        {PHASES.map((label, idx) => (
          <li key={label} className="flex items-center gap-3">
            {idx < phase ? (
              <Check className="w-5 h-5 text-success" />
            ) : idx === phase ? (
              <Loader2 className="w-5 h-5 text-ember animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-ink-200" />
            )}
            <span className={idx <= phase ? "text-ink-900" : "text-ink-500"}>
              {label}{idx < phase ? ", done" : idx === phase ? "..." : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-tiny text-ink-500">This usually takes 30 to 60 seconds.</p>
    </div>
  );
}
