"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { saveStep4 } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { CopyApproval, PipelineSetupState } from "@/lib/pipeline/setup-state";

export interface CopyTemplatePreview {
  id: "icebreaker" | "tldr" | "breakup";
  label: string;
  day: number;
  subjectExample: string;
  body: string;
}

interface Props {
  initialCopy: CopyApproval;
  templates: CopyTemplatePreview[];
  onAdvance: (next: PipelineSetupState) => void;
}

const APPROVE_LABELS: Record<CopyTemplatePreview["id"], string> = {
  icebreaker: "Approve email 1",
  tldr: "Approve email 2",
  breakup: "Approve email 3 breakup",
};

export default function CopyStep({ initialCopy, templates, onAdvance }: Props) {
  const [copy, setCopy] = useState<CopyApproval>(initialCopy);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setApprove(key: keyof CopyApproval, value: boolean) {
    setCopy((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!copy.approve_email_1 || !copy.approve_email_2 || !copy.approve_email_3) {
      setError("Tick the approve boxes on all three emails before continuing.");
      return;
    }
    startTransition(async () => {
      const res = await saveStep4(copy);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdvance(res.state);
    });
  }

  function approveKey(id: CopyTemplatePreview["id"]): keyof CopyApproval {
    if (id === "icebreaker") return "approve_email_1";
    if (id === "tldr") return "approve_email_2";
    return "approve_email_3";
  }

  return (
    <Card>
      <CardHeader
        title="Step 4, approve the copy"
        description="Three emails over six days. Read each one, tick to approve, and add notes if you want tweaks."
      />

      <div className="space-y-4">
        {templates.map((t) => {
          const k = approveKey(t.id);
          const approved = copy[k] === true;
          return (
            <div
              key={t.id}
              className={
                "rounded-xl border p-5 transition-colors " +
                (approved ? "border-ember/40 bg-ember/5" : "border-[var(--border)] bg-surface-input/40")
              }
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-ember" />
                  <span className="eyebrow text-fg-muted">
                    Day {t.day}, {t.label}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={(e) => setApprove(k, e.target.checked)}
                    className="w-4 h-4 accent-ember"
                  />
                  <span className="text-small font-medium text-fg">{APPROVE_LABELS[t.id]}</span>
                </label>
              </div>

              <p className="text-small text-fg-muted mb-1">
                <span className="font-semibold text-fg">Subject example, </span>
                {t.subjectExample}
              </p>
              <pre className="whitespace-pre-wrap text-small text-fg leading-relaxed bg-surface-card border border-[var(--border)] rounded-lg p-4 mt-2 font-sans">
                {t.body}
              </pre>
            </div>
          );
        })}

        <Field label="Customisations (optional)" hint="Notes for Liam, anything you want changed in the copy.">
          <Textarea
            value={copy.customisations}
            onChange={(e) => setCopy((prev) => ({ ...prev, customisations: e.target.value }))}
            placeholder="Swap in our award mention. Drop the breakup line about clutter. Reference our case study link."
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
