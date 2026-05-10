"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepDef {
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
}

export const STEP_TITLES: StepDef[] = [
  { number: 1, title: "Define your ICP" },
  { number: 2, title: "Build the seed list" },
  { number: 3, title: "Lock in sending domains" },
  { number: 4, title: "Approve the copy" },
  { number: 5, title: "Launch readiness" },
];

interface Props {
  currentStep: 1 | 2 | 3 | 4 | 5;
  onJump?: (step: 1 | 2 | 3 | 4 | 5) => void;
}

export default function Stepper({ currentStep, onJump }: Props) {
  return (
    <ol className="flex items-stretch gap-2 md:gap-3 overflow-x-auto pb-1">
      {STEP_TITLES.map(({ number, title }) => {
        const completed = number < currentStep;
        const active = number === currentStep;
        const future = number > currentStep;

        return (
          <li key={number} className="flex-1 min-w-[140px]">
            <button
              type="button"
              onClick={() => onJump?.(number)}
              disabled={!onJump || future}
              className={cn(
                "w-full text-left rounded-xl border px-3 py-3 transition-colors duration-150",
                active && "bg-surface-card border-ember/40 shadow-[0_0_0_1px_rgba(232,90,44,0.25)]",
                completed && "bg-surface-card border-[var(--border)] hover:bg-surface-hover",
                future && "bg-surface-card/40 border-[var(--border)] opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-tiny font-semibold",
                    completed && "bg-ember text-paper",
                    active && "bg-ember/15 text-ember border border-ember/40",
                    future && "bg-surface-input text-fg-faint border border-[var(--border)]",
                  )}
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : number}
                </span>
                <span
                  className={cn(
                    "text-tiny uppercase tracking-wide font-semibold",
                    active && "text-ember",
                    completed && "text-fg-muted",
                    future && "text-fg-faint",
                  )}
                >
                  Step {number}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1.5 text-small font-medium leading-tight",
                  active && "text-fg",
                  completed && "text-fg",
                  future && "text-fg-muted",
                )}
              >
                {title}
              </p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
