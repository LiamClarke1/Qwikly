"use client";

import { Card } from "@/components/ui/card";
import type { RoiKpi } from "@/lib/reports/roi";

// Pure presentational. Renders a single KPI with eyebrow caps label and
// JetBrains Mono numerals. Shows an "industry estimate" tag when applicable.
export function RoiKpiCard({ kpi, accent = "#E85A2C" }: { kpi: RoiKpi; accent?: string }) {
  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow text-fg-subtle">{kpi.label}</p>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      </div>
      <p className="font-mono num text-3xl font-semibold text-fg leading-none tracking-tight">
        {kpi.display}
      </p>
      <div className="mt-2 min-h-[18px]">
        {kpi.estimate ? (
          <span className="text-tiny text-fg-subtle font-mono">industry estimate</span>
        ) : kpi.hasData ? (
          <span className="text-tiny text-fg-muted">last 30 days</span>
        ) : (
          <span className="text-tiny text-fg-subtle">no data yet</span>
        )}
      </div>
    </Card>
  );
}
