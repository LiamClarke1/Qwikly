"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  SUGGESTION_INSTANT_REPLY,
  SUGGESTION_TIGHTEN_QUALIFIER,
  SUGGESTION_CALENDAR_REMINDER,
} from "@/lib/reports/roi";

// Map suggestion strings to their action targets. Hard-coded, no ML.
const ACTIONS: Record<string, { href: string; cta: string }> = {
  [SUGGESTION_INSTANT_REPLY]: {
    href: "/dashboard/settings/instant-reply",
    cta: "Open Instant Reply",
  },
  [SUGGESTION_TIGHTEN_QUALIFIER]: {
    href: "/dashboard/settings",
    cta: "Tighten the qualifier",
  },
  [SUGGESTION_CALENDAR_REMINDER]: {
    href: "/dashboard/bookings",
    cta: "Review bookings",
  },
};

export function NextStepsCard({ suggestions }: { suggestions: string[] }) {
  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Next steps"
        description="Small changes that compound into more booked jobs."
      />
      <ul className="space-y-3">
        {suggestions.map((s, i) => {
          const action = ACTIONS[s];
          return (
            <li
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl bg-surface-input border border-[var(--border)]"
            >
              <span className="w-8 h-8 shrink-0 rounded-lg bg-ember/15 text-ember flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-small text-fg leading-snug">{s}</p>
                {action && (
                  <Link
                    href={action.href}
                    className="inline-flex items-center gap-1 mt-2 text-tiny font-semibold text-ember hover:text-ember-deep"
                  >
                    {action.cta}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
