"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { setStep } from "@/app/(app)/dashboard/onboarding/actions";
import type { OnboardingState, OnboardingStepKey } from "@/lib/onboarding/state";

interface ChecklistStep {
  key: OnboardingStepKey;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  actionLabel: string;
  /** Where the primary action button sends them. Either an internal href or an external URL. */
  href: string;
  /** If true, the action opens in a new tab. */
  external?: boolean;
}

interface Props {
  initialState: OnboardingState;
  websiteUrl: string | null;
}

const STEP_DEFS: Omit<ChecklistStep, "href" | "external">[] = [
  {
    key: "step1",
    number: 1,
    title: "Add Qwikly to your website",
    body: "Paste a single line of code into your site. Takes about 90 seconds.",
    actionLabel: "Get my embed code",
  },
  {
    key: "step2",
    number: 2,
    title: "Set up Instant Reply 60s",
    body: "Drop your WhatsApp number, set your business hours. Qwikly will ping you the second a lead comes in.",
    actionLabel: "Configure Instant Reply",
  },
  {
    key: "step3",
    number: 3,
    title: "Customize your greeting",
    body: "Tell Qwikly how to greet visitors and what questions to ask. The default is fine, but a 60-second tweak makes it feel like you.",
    actionLabel: "Customize",
  },
  {
    key: "step4",
    number: 4,
    title: "Send a test lead",
    body: "Open your site in incognito, run a fake conversation, give Qwikly your number. You should get a WhatsApp ping in under 60 seconds.",
    actionLabel: "Open my live site",
  },
  {
    key: "step5",
    number: 5,
    title: "Tell us where to send you a paying job",
    body: "Confirm the email and WhatsApp number where Qwikly should deliver leads. This is what makes the loop close.",
    actionLabel: "Confirm contact details",
  },
];

export default function Checklist({ initialState, websiteUrl }: Props) {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [pending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<OnboardingStepKey | null>(null);

  const steps: ChecklistStep[] = STEP_DEFS.map((s) => {
    if (s.number === 1) return { ...s, href: "/dashboard/embed" };
    if (s.number === 2) return { ...s, href: "/dashboard/settings/instant-reply" };
    if (s.number === 3) return { ...s, href: "/dashboard/settings/assistant" };
    if (s.number === 4) {
      const url = websiteUrl && /^https?:\/\//i.test(websiteUrl) ? websiteUrl : websiteUrl ? `https://${websiteUrl}` : "/dashboard/embed";
      return { ...s, href: url, external: !!websiteUrl };
    }
    return { ...s, href: "/dashboard/settings/profile" };
  });

  const completedCount = STEP_DEFS.filter((s) => state[s.key]).length;
  const allDone = completedCount === 5;

  const toggle = (step: ChecklistStep) => {
    const nextDone = !state[step.key];
    // Optimistic update first.
    setState((prev) => ({ ...prev, [step.key]: nextDone }));
    setErrorKey(null);
    startTransition(async () => {
      const res = await setStep(step.number, nextDone);
      if (!res.ok) {
        // Revert on failure.
        setState((prev) => ({ ...prev, [step.key]: !nextDone }));
        setErrorKey(step.key);
      } else {
        setState(res.state);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-ink-400">
          Setup checklist
        </p>
        <p className="text-tiny text-ink-500 num">
          <span className="font-semibold text-ink">{completedCount}</span> / 5
        </p>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step) => {
          const done = state[step.key];
          return (
            <li
              key={step.key}
              className={cn(
                "ed-card rounded-2xl border p-4 sm:p-5 transition-colors",
                done
                  ? "border-green-500/25 bg-green-500/[0.04]"
                  : "border-ink/[0.10] bg-white hover:border-ink/[0.18]",
              )}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => toggle(step)}
                  disabled={pending}
                  aria-pressed={done}
                  aria-label={done ? `Mark step ${step.number} as not done` : `Mark step ${step.number} as done`}
                  className={cn(
                    "shrink-0 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 cursor-pointer",
                    done
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-ink/25 bg-white hover:border-ember",
                    pending && "opacity-60 cursor-wait",
                  )}
                >
                  {done && <Check className="w-4 h-4" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={cn(
                      "num font-mono text-tiny",
                      done ? "text-green-700" : "text-ember",
                    )}>
                      0{step.number}
                    </span>
                    <h3 className={cn(
                      "text-small sm:text-base font-semibold leading-tight",
                      done ? "text-ink-500 line-through decoration-green-500/40" : "text-ink",
                    )}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-tiny sm:text-small text-ink-500 mt-1.5 leading-relaxed">
                    {step.body}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {step.external ? (
                      <a
                        href={step.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-xl bg-ink text-paper text-tiny font-semibold hover:bg-ink/90 transition-colors duration-150 cursor-pointer"
                      >
                        {step.actionLabel}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-xl bg-ink text-paper text-tiny font-semibold hover:bg-ink/90 transition-colors duration-150 cursor-pointer"
                      >
                        {step.actionLabel}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {errorKey === step.key && (
                      <span className="text-tiny text-danger">Could not save, try again.</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <div className="ed-card mt-6 rounded-2xl border border-green-500/30 bg-green-500/[0.06] p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="eyebrow text-green-700 mb-1">You are live</p>
            <p className="text-h3 font-semibold text-ink leading-tight">
              Qwikly is now capturing leads.
            </p>
            <p className="text-small text-ink-500 mt-1">
              Watch your first 30 days here.
            </p>
          </div>
          <Link
            href="/dashboard/reports/roi"
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-ember text-paper text-small font-semibold hover:bg-ember-deep transition-colors duration-150 cursor-pointer btn-ember-solid"
          >
            See my ROI report
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
