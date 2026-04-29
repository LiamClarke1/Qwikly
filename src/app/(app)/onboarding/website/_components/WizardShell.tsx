"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface WizardShellProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  children: React.ReactNode;
  onSaveLater?: () => void;
}

const STEP_LABELS = [
  "Your business",
  "Your website",
  "Customise",
  "Calendar",
  "Working hours",
  "Install widget",
  "Verify install",
  "Test conversation",
];

export function WizardShell({
  currentStep,
  totalSteps,
  title,
  children,
  onSaveLater,
}: WizardShellProps) {
  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-fg-muted hover:text-fg transition-colors text-sm cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-fg-subtle text-xs hidden sm:block">
            Get your website assistant live in ~10 minutes
          </span>
          {onSaveLater && (
            <button
              onClick={onSaveLater}
              className="text-sm text-fg-muted hover:text-fg transition-colors cursor-pointer"
            >
              Save &amp; continue later
            </button>
          )}
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border/50">
        <div className="max-w-4xl mx-auto">
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const n = i + 1;
              const done = n < currentStep;
              const active = n === currentStep;
              return (
                <div key={n} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      done
                        ? "bg-success text-white"
                        : active
                        ? "bg-brand text-white"
                        : "bg-bg-elevated text-fg-subtle border border-border"
                    }`}
                  >
                    {done ? "✓" : n}
                  </div>
                  {n < totalSteps && (
                    <div
                      className={`h-0.5 w-4 rounded-full transition-all ${done ? "bg-success" : "bg-border"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar + label */}
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-fg-muted text-xs shrink-0">
              {currentStep}/{totalSteps} — {title}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 pb-16">{children}</div>
      </div>
    </div>
  );
}
