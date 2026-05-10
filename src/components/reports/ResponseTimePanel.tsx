"use client";

import { Card, CardHeader } from "@/components/ui/card";
import type { RoiResponseTime } from "@/lib/reports/roi";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "awaiting wiring";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return `${h} hr`;
}

// Single-stat panel. Both reference numbers are clearly labelled
// "industry estimate" inline, per spec.
export function ResponseTimePanel({ data }: { data: RoiResponseTime }) {
  const headline = data.hasData
    ? `Median response time, ${formatDuration(data.medianSeconds)}`
    : "Median response time, industry estimate, awaiting wiring";

  return (
    <Card>
      <CardHeader
        title="Response time"
        description="How fast new enquiries get a reply."
      />
      <p className="font-display text-2xl text-fg leading-tight">{headline}</p>
      <p className="text-small text-fg-muted mt-3">
        Industry average is {formatDuration(data.industryAverageSeconds)}{" "}
        <span className="font-mono text-tiny text-fg-subtle">(industry estimate)</span>
        . Faster replies book {data.upliftMultiplier}x more meetings{" "}
        <span className="font-mono text-tiny text-fg-subtle">(industry estimate)</span>
        .
      </p>
      {!data.hasData && (
        <p className="text-tiny text-fg-subtle mt-3 font-mono">
          Real response-time tracking lights up automatically once owner replies are wired in.
        </p>
      )}
    </Card>
  );
}
