"use client";

import { useState, useTransition } from "react";
import { Rocket, CheckCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markReady } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { PipelineSetupState } from "@/lib/pipeline/setup-state";

interface Props {
  state: PipelineSetupState;
  onAdvance: (next: PipelineSetupState) => void;
}

export const LAUNCH_SUCCESS_MESSAGE = "Setup complete. Qwikly will review and launch within 48 hours.";

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
      <span className="text-small text-fg-muted">{label}</span>
      <span className="text-small text-fg text-right max-w-[60%]">{value || <span className="text-fg-faint">Not set</span>}</span>
    </div>
  );
}

export default function LaunchStep({ state, onAdvance }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isReady = state.status === "ready" || state.status === "launched";

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await markReady();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdvance(res.state);
    });
  }

  if (isReady) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-14 h-14 rounded-full bg-ember/15 text-ember flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-h2 text-fg mb-2">Ready for launch.</h2>
          <p className="text-body text-fg-muted max-w-md">{LAUNCH_SUCCESS_MESSAGE}</p>
        </div>
      </Card>
    );
  }

  const icp = state.icp;
  const seed = state.seed_list;
  const dom = state.domains;
  const cp = state.copy;

  const seedSourceLabel =
    seed.source === "qwikly_generator"
      ? "Generated with Qwikly"
      : seed.source === "csv_upload"
        ? `CSV upload (${seed.valid_rows} valid of ${seed.total_rows})`
        : "Not set";

  return (
    <Card>
      <CardHeader
        title="Step 5, launch readiness"
        description="Review everything below. When you mark ready, Qwikly will check it over and launch within 48 hours."
      />

      <div className="space-y-5">
        <div>
          <h3 className="eyebrow text-ember mb-2">ICP</h3>
          <div className="rounded-xl border border-[var(--border)] bg-surface-input/40 px-4">
            <SummaryRow label="Name" value={icp.name} />
            <SummaryRow label="Industries" value={icp.industries.join(", ")} />
            <SummaryRow label="Job titles" value={icp.job_titles.join(", ")} />
            <SummaryRow
              label="Company size"
              value={
                icp.company_size_min || icp.company_size_max
                  ? `${icp.company_size_min ?? "?"} to ${icp.company_size_max ?? "?"}`
                  : ""
              }
            />
            <SummaryRow label="Locations" value={icp.locations.join(", ")} />
            <SummaryRow label="Pain point" value={icp.pain_point} />
            <SummaryRow label="Value prop" value={icp.value_prop} />
          </div>
        </div>

        <div>
          <h3 className="eyebrow text-ember mb-2">Seed list</h3>
          <div className="rounded-xl border border-[var(--border)] bg-surface-input/40 px-4">
            <SummaryRow label="Source" value={seedSourceLabel} />
            {seed.source === "csv_upload" && (
              <>
                <SummaryRow label="Total rows" value={String(seed.total_rows)} />
                <SummaryRow label="Valid rows" value={String(seed.valid_rows)} />
              </>
            )}
            {seed.warnings.length > 0 && (
              <SummaryRow label="Warnings" value={seed.warnings.join(" · ")} />
            )}
          </div>
        </div>

        <div>
          <h3 className="eyebrow text-ember mb-2">Sending domains</h3>
          <div className="rounded-xl border border-[var(--border)] bg-surface-input/40 px-4">
            <SummaryRow label="Number of domains" value={String(dom.count)} />
            <SummaryRow label="Pattern" value={dom.pattern} />
            {dom.notes && <SummaryRow label="Notes" value={dom.notes} />}
          </div>
        </div>

        <div>
          <h3 className="eyebrow text-ember mb-2">Copy approval</h3>
          <div className="rounded-xl border border-[var(--border)] bg-surface-input/40 px-4">
            <SummaryRow label="Email 1, icebreaker" value={cp.approve_email_1 ? "Approved" : "Pending"} />
            <SummaryRow label="Email 2, TL;DR" value={cp.approve_email_2 ? "Approved" : "Pending"} />
            <SummaryRow label="Email 3, breakup" value={cp.approve_email_3 ? "Approved" : "Pending"} />
            {cp.customisations && <SummaryRow label="Customisations" value={cp.customisations} />}
          </div>
        </div>

        {error && <p className="text-small text-danger">{error}</p>}

        <div className="pt-2">
          <Button
            onClick={submit}
            loading={pending}
            size="lg"
            className="w-full"
            icon={<Rocket className="w-4 h-4" />}
          >
            Mark campaign ready, notify Qwikly
          </Button>
          <p className="text-small text-fg-muted text-center mt-3">
            Nothing sends until Qwikly green-lights it. Manual review takes up to 48 hours.
          </p>
        </div>
      </div>
    </Card>
  );
}
