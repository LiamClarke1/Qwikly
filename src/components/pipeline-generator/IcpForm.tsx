"use client";

import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  GenerateProspectInput,
  INTENT_SIGNALS,
  JOB_TITLES,
  SA_INDUSTRIES,
  SA_LOCATIONS,
  IntentSignal,
  JobTitle,
  SaIndustry,
  SaLocation,
} from "@/lib/pipeline/generator/types";
import { estimateMatches } from "@/lib/pipeline/generator/run";
import { generateProspects } from "@/app/(app)/dashboard/pipeline/generate/actions";
import { EstimatePanel } from "./EstimatePanel";
import { ResultModal, ResultModalState } from "./ResultModal";

const DEFAULT_INPUT: GenerateProspectInput = {
  industries: ["Professional Services"],
  jobTitles: ["Founder", "CEO"],
  companySize: { min: 10, max: 100 },
  locations: ["Cape Town", "Johannesburg"],
  intentSignals: [],
  quantity: 50,
};

export function IcpForm() {
  const [input, setInput] = useState<GenerateProspectInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<ResultModalState | null>(null);
  const [pending, startTransition] = useTransition();

  const estimate = useMemo(() => estimateMatches(input), [input]);

  function toggle<T extends string>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  function reset() {
    setInput(DEFAULT_INPUT);
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateProspects(input);
      if (res.ok) {
        setResult({ kind: "success", count: res.count });
      } else if (res.reason === "schema_pending") {
        setResult({ kind: "schema_pending" });
      } else if (res.reason === "not_signed_in") {
        setResult({
          kind: "error",
          message: "You are not signed in. Refresh and try again.",
        });
      } else if (res.reason === "no_tenant") {
        setResult({
          kind: "error",
          message: "No workspace found for this account.",
        });
      } else if (res.reason === "invalid_input") {
        setResult({
          kind: "error",
          message: "Some fields look incomplete. Pick at least one industry, job title, and location.",
        });
      } else {
        setResult({
          kind: "error",
          message: "Something went wrong saving prospects, try again.",
        });
      }
    });
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6"
      >
        <Card>
          <div className="space-y-7">
            <Field label="Industry" hint="Pick one or more SA industries to target.">
              <ChipGroup<SaIndustry>
                options={SA_INDUSTRIES as readonly SaIndustry[]}
                selected={input.industries as SaIndustry[]}
                onToggle={(v) =>
                  setInput((s) => ({
                    ...s,
                    industries: toggle(s.industries as SaIndustry[], v),
                  }))
                }
              />
            </Field>

            <Field label="Job titles" hint="Roles Qwikly will reach out to.">
              <ChipGroup<JobTitle>
                options={JOB_TITLES as readonly JobTitle[]}
                selected={input.jobTitles as JobTitle[]}
                onToggle={(v) =>
                  setInput((s) => ({
                    ...s,
                    jobTitles: toggle(s.jobTitles as JobTitle[], v),
                  }))
                }
              />
            </Field>

            <Field
              label="Company size"
              hint="Employees, from 5 to 500."
            >
              <RangeSlider
                min={5}
                max={500}
                value={input.companySize}
                onChange={(v) =>
                  setInput((s) => ({ ...s, companySize: v }))
                }
              />
            </Field>

            <Field label="Location" hint="Where the company is based.">
              <ChipGroup<SaLocation>
                options={SA_LOCATIONS as readonly SaLocation[]}
                selected={input.locations as SaLocation[]}
                onToggle={(v) =>
                  setInput((s) => ({
                    ...s,
                    locations: toggle(s.locations as SaLocation[], v),
                  }))
                }
              />
            </Field>

            <Field
              label="Intent signals"
              hint="Optional. Narrow the pool to prospects showing buying intent."
            >
              <CheckboxGroup<IntentSignal>
                options={INTENT_SIGNALS as readonly IntentSignal[]}
                selected={input.intentSignals as IntentSignal[]}
                onToggle={(v) =>
                  setInput((s) => ({
                    ...s,
                    intentSignals: toggle(s.intentSignals as IntentSignal[], v),
                  }))
                }
              />
            </Field>

            <Field
              label="Quantity to generate"
              hint="Between 25 and 500 prospects per batch."
            >
              <QuantityInput
                value={input.quantity}
                onChange={(q) => setInput((s) => ({ ...s, quantity: q }))}
              />
            </Field>

            <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-fg-muted">
                Qwikly will return <strong>{input.quantity}</strong> prospects from a pool of
                {" "}~{estimate.toLocaleString("en-ZA")}.
              </p>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={pending}
              >
                {pending ? "Generating" : `Generate ${input.quantity} prospects`}
              </Button>
            </div>
          </div>
        </Card>

        <div>
          <EstimatePanel input={input} estimate={estimate} />
        </div>
      </form>

      <ResultModal
        state={result}
        onClose={() => setResult(null)}
        onAnother={reset}
      />
    </>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onToggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-small font-medium border transition-colors duration-150",
              isOn
                ? "bg-ember/10 text-ember border-ember/30"
                : "bg-surface-input text-fg-muted border-[var(--border)] hover:bg-surface-hover hover:text-fg",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CheckboxGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <label
            key={opt}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors duration-150",
              isOn
                ? "bg-ember/5 border-ember/30"
                : "bg-surface-input border-[var(--border)] hover:bg-surface-hover",
            )}
          >
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => onToggle(opt)}
              className="accent-ember w-4 h-4"
            />
            <span className="text-small text-fg">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function RangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (v: { min: number; max: number }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge tone="neutral">{value.min} employees</Badge>
        <span className="text-small text-fg-muted">to</span>
        <Badge tone="neutral">{value.max}+ employees</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-tiny font-semibold uppercase tracking-wide text-fg-muted mb-1.5">
            Minimum
          </label>
          <input
            type="range"
            min={min}
            max={max}
            value={value.min}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ min: v, max: Math.max(v, value.max) });
            }}
            className="w-full accent-ember"
          />
        </div>
        <div>
          <label className="block text-tiny font-semibold uppercase tracking-wide text-fg-muted mb-1.5">
            Maximum
          </label>
          <input
            type="range"
            min={min}
            max={max}
            value={value.max}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ min: Math.min(value.min, v), max: v });
            }}
            className="w-full accent-ember"
          />
        </div>
      </div>
    </div>
  );
}

function QuantityInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={25}
        max={500}
        step={25}
        value={value}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (Number.isNaN(raw)) return;
          const clamped = Math.min(500, Math.max(25, Math.round(raw)));
          onChange(clamped);
        }}
        className="w-32 bg-surface-input border border-[var(--border)] rounded-xl px-4 py-2.5 text-body text-fg outline-none focus:border-ember/40 focus:ring-2 focus:ring-ember/10"
      />
      <div className="flex flex-wrap gap-2">
        {[25, 50, 100, 250, 500].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onChange(q)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-tiny font-medium border transition-colors",
              value === q
                ? "bg-ember/10 text-ember border-ember/30"
                : "bg-surface-input text-fg-muted border-[var(--border)] hover:text-fg",
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
