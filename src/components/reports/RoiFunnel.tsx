"use client";

import { Card, CardHeader } from "@/components/ui/card";
import type { RoiFunnelLevel } from "@/lib/reports/roi";

// Visual funnel: 4 stacked bars whose width scales relative to the top step.
// Drop-off shown as a percentage on every step after the first.
export function RoiFunnel({ levels }: { levels: RoiFunnelLevel[] }) {
  const top = Math.max(1, levels[0]?.count ?? 0);

  return (
    <Card>
      <CardHeader
        title="Pipeline"
        description="Visitors all the way through to completed jobs."
      />
      <div className="space-y-2.5">
        {levels.map((lvl, idx) => {
          const pct = Math.max(8, Math.min(100, (lvl.count / top) * 100));
          const drop = lvl.dropOff;
          return (
            <div key={lvl.label} className="flex items-center gap-3">
              <div className="w-36 shrink-0">
                <p className="text-small text-fg font-medium">{lvl.label}</p>
                {drop !== null && drop > 0 && (
                  <p className="text-tiny text-fg-subtle font-mono">
                    {Math.round(drop * 100)}% drop-off
                  </p>
                )}
              </div>
              <div className="flex-1 min-w-0 h-9 rounded-lg bg-surface-input relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all"
                  style={{
                    width: `${pct}%`,
                    background:
                      idx === 0
                        ? "linear-gradient(90deg, rgba(232,90,44,0.85), rgba(232,90,44,0.55))"
                        : idx === 1
                          ? "linear-gradient(90deg, rgba(232,90,44,0.70), rgba(232,90,44,0.40))"
                          : idx === 2
                            ? "linear-gradient(90deg, rgba(60,90,61,0.75), rgba(60,90,61,0.45))"
                            : "linear-gradient(90deg, rgba(60,90,61,0.85), rgba(60,90,61,0.55))",
                  }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="font-mono num text-small font-semibold text-fg">
                    {lvl.count.toLocaleString("en-ZA")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
