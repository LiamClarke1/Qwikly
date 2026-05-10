"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, MapPin, Users } from "lucide-react";
import { GenerateProspectInput } from "@/lib/pipeline/generator/types";

export function EstimatePanel({
  input,
  estimate,
}: {
  input: GenerateProspectInput;
  estimate: number;
}) {
  return (
    <Card className="sticky top-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-small text-fg-muted">Live preview</p>
          <h2 className="text-h2 text-fg mt-0.5">Estimated matches</h2>
        </div>
        <Badge tone="brand" dot>
          Updates live
        </Badge>
      </div>

      <div className="rounded-2xl bg-surface-input border border-[var(--border)] p-5">
        <p className="text-tiny font-semibold uppercase tracking-wide text-fg-muted">
          Industry estimate
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-display-2 text-fg leading-none">
            ~{estimate.toLocaleString("en-ZA")}
          </span>
          <span className="text-small text-fg-muted">people in pool</span>
        </div>
        <p className="mt-3 text-small text-fg-muted leading-relaxed">
          Qwikly will pull <strong>{input.quantity}</strong> from this pool, ranked by intent and fit.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <Row
          icon={<Target className="w-4 h-4" />}
          label="Industries"
          value={input.industries.length === 0 ? "Pick at least one" : input.industries.join(", ")}
        />
        <Row
          icon={<Users className="w-4 h-4" />}
          label="Job titles"
          value={input.jobTitles.length === 0 ? "Pick at least one" : input.jobTitles.join(", ")}
        />
        <Row
          icon={<MapPin className="w-4 h-4" />}
          label="Locations"
          value={input.locations.length === 0 ? "Pick at least one" : input.locations.join(", ")}
        />
        <Row
          icon={<Sparkles className="w-4 h-4" />}
          label="Intent signals"
          value={
            input.intentSignals.length === 0
              ? "None"
              : input.intentSignals.join(", ")
          }
        />
      </div>

      <div className="mt-5 rounded-xl border border-[var(--border)] p-3 bg-surface-card">
        <p className="text-tiny font-semibold uppercase tracking-wide text-fg-muted">
          Company size
        </p>
        <p className="mt-1 text-body text-fg">
          {input.companySize.min} to {input.companySize.max} employees
        </p>
      </div>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-ember">{icon}</span>
      <div className="min-w-0">
        <p className="text-tiny font-semibold uppercase tracking-wide text-fg-muted">
          {label}
        </p>
        <p className="text-small text-fg mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
