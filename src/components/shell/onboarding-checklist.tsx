"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Rocket, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ClientRow } from "@/lib/use-client";

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  isDone: (c: ClientRow | null, extras: Extras) => boolean;
};

type Extras = { kbCount: number };

const STEPS: Step[] = [
  {
    id: "account",
    title: "Create your account",
    description: "You're in. Welcome to Qwikly.",
    href: "/dashboard/settings?tab=account",
    cta: "View account",
    isDone: () => true,
  },
  {
    id: "assistant",
    title: "Connect your digital assistant",
    description: "Point it at your website, drop in any brochures, and we'll teach it your business.",
    href: "/dashboard/setup",
    cta: "Start setup",
    isDone: (c) => !!c?.onboarding_complete || !!c?.system_prompt,
  },
  {
    id: "email",
    title: "Connect your email",
    description: "So we can send you daily summaries and escalation alerts.",
    href: "/dashboard/settings?tab=account",
    cta: "Connect email",
    isDone: (c) => !!c?.notification_email,
  },
  {
    id: "whatsapp",
    title: "Connect your WhatsApp Business",
    description: "The moment this is linked, your digital assistant goes live.",
    href: "/dashboard/settings?tab=account",
    cta: "Connect WhatsApp",
    isDone: (c) => !!(c?.meta_phone_number_id),
  },
  {
    id: "website",
    title: "Add your website assistant",
    description: "Embed one line of code — visitors get an instant reply, 24/7.",
    href: "/dashboard/settings?tab=account",
    cta: "Set up now",
    isDone: (c) => !!(c?.web_widget_status === "verified" || c?.onboarding_completed_at),
  },
];

export function OnboardingChecklist({
  client, kbCount = 0, onDismiss,
}: {
  client: ClientRow | null;
  kbCount?: number;
  onDismiss?: () => void;
}) {
  const extras: Extras = { kbCount };
  const done = useMemo(() => STEPS.filter((s) => s.isDone(client, extras)).length, [client, extras]);
  const total = STEPS.length;
  const next = useMemo(() => STEPS.find((s) => !s.isDone(client, extras)), [client, extras]);
  const [expanded, setExpanded] = useState(true);

  if (done === total) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0D111A] overflow-hidden mb-6">
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-h3 text-fg font-semibold">Get your digital assistant live</p>
              <p className="text-small text-fg-muted mt-0.5">Five quick steps. Most people finish in 15 minutes.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="h-8 px-3 rounded-lg text-tiny font-medium text-fg-muted hover:text-fg hover:bg-white/[0.04] cursor-pointer"
            >
              {expanded ? "Hide" : "Show"}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-white/[0.04] cursor-pointer"
                title="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-small text-fg-muted"><span className="text-fg font-semibold">{done}</span> of {total} complete</p>
            <p className="text-small text-fg-muted num">{pct}%</p>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full bg-grad-brand transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {!expanded && next && (
          <Link href={next.href} className="block">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand/40 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full border-2 border-brand bg-brand/10 flex items-center justify-center shrink-0 text-small font-bold text-brand">
                {done + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-fg">{next.title}</p>
                <p className="text-tiny text-fg-muted">{next.description}</p>
              </div>
              <Button variant="primary" size="sm" className="shrink-0">{next.cta}</Button>
            </div>
          </Link>
        )}

        {expanded && (
          <div className="space-y-2">
            {STEPS.map((s, i) => {
              const complete = s.isDone(client, extras);
              const isNext = !complete && STEPS.slice(0, i).every((p) => p.isDone(client, extras));
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer",
                    complete
                      ? "bg-success/[0.03] border-success/20"
                      : isNext
                      ? "bg-white/[0.03] border-brand/40 hover:border-brand"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-line-strong"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-small font-bold",
                      complete
                        ? "bg-success/20 border-2 border-success text-success"
                        : isNext
                        ? "bg-brand/10 border-2 border-brand text-brand"
                        : "bg-white/[0.04] border-2 border-white/[0.06] text-fg-subtle"
                    )}
                  >
                    {complete ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-body font-semibold", complete ? "text-fg-muted line-through" : "text-fg")}>
                      {s.title}
                    </p>
                    <p className="text-tiny text-fg-muted">{s.description}</p>
                  </div>
                  {!complete && <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />}
                </Link>
              );
            })}
          </div>
        )}

        {done === total - 1 && (
          <div className="mt-4 p-4 rounded-xl bg-brand/10 border border-brand/30 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p className="text-small text-fg"><span className="font-semibold">One step to go.</span> Add your website assistant to capture leads directly from your site, 24/7.</p>
          </div>
        )}
      </div>
    </div>
  );
}
