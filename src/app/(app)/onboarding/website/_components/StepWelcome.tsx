"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClientRow } from "@/lib/use-client";
import { CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { type PlanTier, PLAN_CONFIG } from "@/lib/plan";

interface Props {
  client: ClientRow;
  plan: PlanTier;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepWelcome({ client, plan, onAdvance }: Props) {
  const router = useRouter();
  const config = PLAN_CONFIG[plan];

  useEffect(() => {
    const t = setTimeout(() => {
      router.push("/dashboard?welcome=true");
    }, 8000);
    return () => clearTimeout(t);
  }, [router]);

  const highlights = [
    `You're on the ${config.name} plan — ${config.leadLimit ? `${config.leadLimit} leads/month` : "unlimited leads"}`,
    "Your chat widget is ready to go live",
    "Leads will be delivered to your email",
    plan !== "starter" ? "No branding on your widget" : '"Powered by Qwikly" badge visible',
  ];

  return (
    <div className="pt-10 max-w-lg text-center flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-grad-brand flex items-center justify-center shadow-glow mb-6">
        <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
      </div>

      <h1 className="text-display-1 font-semibold text-fg mb-3">
        You&rsquo;re live.
      </h1>
      <p className="text-fg-muted text-body mb-8 leading-relaxed max-w-sm">
        {client.business_name ? `${client.business_name}'s` : "Your"} Qwikly assistant is configured and ready. Leads captured from your website will land in your inbox automatically.
      </p>

      <div className="w-full rounded-2xl bg-white/[0.03] border border-line p-6 mb-8 text-left space-y-3">
        {highlights.filter(Boolean).map((h) => (
          <div key={h} className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="text-small text-fg-muted">{h}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAdvance()}
        className="w-full h-12 bg-grad-brand text-white text-small font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:brightness-95 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
      >
        Go to dashboard <ArrowRight className="w-4 h-4" />
      </button>
      <p className="text-tiny text-fg-subtle mt-3">Redirecting automatically in a moment…</p>
    </div>
  );
}
