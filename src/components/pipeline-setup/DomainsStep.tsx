"use client";

import { useState, useTransition } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { saveStep3 } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { DomainsConfig, PipelineSetupState } from "@/lib/pipeline/setup-state";

interface Props {
  initialDomains: DomainsConfig;
  onAdvance: (next: PipelineSetupState) => void;
}

export default function DomainsStep({ initialDomains, onAdvance }: Props) {
  const [count, setCount] = useState<number>(initialDomains.count);
  const [pattern, setPattern] = useState(initialDomains.pattern);
  const [notes, setNotes] = useState(initialDomains.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (count < 2 || count > 5) {
      setError("Pick between 2 and 5 sending domains.");
      return;
    }
    if (!pattern.trim()) {
      setError("Suggest a root domain pattern, like qwikly-{name}.co.za.");
      return;
    }
    startTransition(async () => {
      const res = await saveStep3({
        count,
        pattern: pattern.trim(),
        notes: notes.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdvance(res.state);
    });
  }

  return (
    <Card>
      <CardHeader
        title="Step 3, lock in sending domains"
        description="Tell Qwikly how many domains to spin up and what pattern to use. We do the rest."
      />

      <div className="rounded-xl border border-ember/30 bg-ember/5 p-4 mb-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-ember mt-0.5 shrink-0" />
        <p className="text-small text-fg-muted leading-relaxed">
          We provision and warm domains for you. This is an internal step, you do not configure DNS yourself.
          Warmup takes 14 days before send volume ramps up.
        </p>
      </div>

      <div className="space-y-5">
        <Field
          label="Number of sending domains"
          hint="Two is enough for a small launch. Four or five is safer once volume scales."
        >
          <div className="flex items-center gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={
                  "h-10 w-12 rounded-xl border text-body font-semibold transition-colors " +
                  (count === n
                    ? "border-ember/50 bg-ember/15 text-ember"
                    : "border-[var(--border)] bg-surface-input text-fg-muted hover:bg-surface-hover")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Preferred root domain pattern"
          hint="Use {name} as a placeholder. Example, qwikly-{name}.co.za."
        >
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="qwikly-{name}.co.za"
          />
        </Field>

        <Field label="Notes for the warmup team (optional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you want us to know about brand naming, tone, or specific TLDs to avoid."
            rows={3}
          />
        </Field>

        {error && <p className="text-small text-danger">{error}</p>}

        <div className="flex justify-end pt-1">
          <Button onClick={submit} loading={pending} icon={<ArrowRight className="w-4 h-4" />}>
            Save and continue
          </Button>
        </div>
      </div>
    </Card>
  );
}
