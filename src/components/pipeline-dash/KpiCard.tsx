"use client";

import { cn } from "@/lib/cn";

// Editorial KPI card. Big mono numeral, eyebrow label, optional dim hint.
// Mirrors Mission Control's hero KPI tile.
export function KpiCard({
  label,
  value,
  hint,
  awaiting = false,
  estimate = false,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  awaiting?: boolean;
  estimate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ed-card !p-5 md:!p-6 flex flex-col gap-3 min-h-[128px]",
        className
      )}
    >
      <div className="eyebrow text-ink-500">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="num font-mono font-medium tracking-tight text-ink text-[34px] leading-none md:text-[40px]">
          {value}
        </span>
        {estimate ? (
          <span className="text-[11px] text-ink-500 font-mono">
            industry estimate
          </span>
        ) : null}
      </div>
      {awaiting ? (
        <div className="text-[11px] text-ink-400 font-mono">
          Awaiting first run
        </div>
      ) : hint ? (
        <div className="text-[12px] text-ink-500">{hint}</div>
      ) : null}
    </div>
  );
}
