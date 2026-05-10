"use client";

import { Check } from "lucide-react";
import CTAButton from "@/components/CTAButton";

type PipelineTier = {
  id: "lite" | "pro";
  name: string;
  tagline: string;
  setup: string;
  monthly: string;
  features: string[];
  highlight: boolean;
  cta: string;
  ctaHref: string;
};

const pipelineTiers: PipelineTier[] = [
  {
    id: "lite",
    name: "Pipeline Lite",
    tagline: "One ICP, one campaign, monthly review",
    setup: "R7,500",
    monthly: "R7,500",
    highlight: false,
    cta: "Book a strategy call",
    ctaHref: "/contact?subject=pipeline-lite",
    features: [
      "Up to 1,500 prospects per month",
      "One ICP",
      "One campaign",
      "Monthly review call",
      "Deliverability infrastructure included",
      "POPIA compliance handled",
    ],
  },
  {
    id: "pro",
    name: "Pipeline Pro",
    tagline: "Multi-ICP, AB tested, weekly review",
    setup: "R7,500",
    monthly: "R15,000",
    highlight: true,
    cta: "Book a strategy call",
    ctaHref: "/contact?subject=pipeline-pro",
    features: [
      "Up to 5,000 prospects per month",
      "Multi-ICP",
      "AB tested copy",
      "Weekly review call",
      "Dedicated Slack channel",
      "Deliverability infrastructure included",
      "POPIA compliance handled",
    ],
  },
];

export function PipelinePricingBlock() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
      {pipelineTiers.map((tier) => (
        <div
          key={tier.id}
          className={`relative flex flex-col ${
            tier.highlight ? "ed-card-ink pt-10" : "ed-card-ghost"
          }`}
        >
          {tier.highlight && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <span className="eyebrow bg-ember text-paper px-4 py-1.5 rounded-full whitespace-nowrap">
                Most Popular
              </span>
            </div>
          )}

          <p
            className={`eyebrow mb-1 ${
              tier.highlight ? "text-ember" : "text-ink-500"
            }`}
          >
            {tier.name}
          </p>
          <p
            className={`text-sm leading-snug mb-8 ${
              tier.highlight ? "text-paper/65" : "text-ink-700"
            }`}
          >
            {tier.tagline}
          </p>

          <div className="mb-8">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`font-display font-medium leading-none ${
                  tier.highlight ? "text-paper" : "text-ink"
                }`}
                style={{ fontSize: "clamp(2rem, 3.5vw, 2.6rem)" }}
              >
                {tier.monthly}
              </span>
              <span
                className={`text-sm ${
                  tier.highlight ? "text-paper/50" : "text-ink-500"
                }`}
              >
                per month
              </span>
            </div>
            <p
              className={`text-xs mt-2 ${
                tier.highlight ? "text-paper/55" : "text-ink-500"
              }`}
            >
              Plus {tier.setup} one-time setup
            </p>
          </div>

          <ul className="flex-1 space-y-3 mb-8">
            {tier.features.map((feature, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 text-sm leading-relaxed ${
                  tier.highlight ? "text-paper/85" : "text-ink-700"
                }`}
              >
                <Check
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-ember"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <CTAButton
            href={tier.ctaHref}
            variant={tier.highlight ? "solid" : "primary"}
            size="md"
            className="w-full justify-center"
          >
            {tier.cta}
          </CTAButton>
        </div>
      ))}
    </div>
  );
}

export default PipelinePricingBlock;
