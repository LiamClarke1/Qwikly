"use client";

import {
  Briefcase,
  Stethoscope,
  Wrench,
  Scissors,
  Scale,
  Car,
  Sparkles,
  Building2,
  Dumbbell,
  ShoppingBag,
  Camera,
  Utensils,
} from "lucide-react";

// Industry estimates are deliberately broad ranges. Marked as "industry
// estimate" so nothing reads as a fact about this specific prospect.
const INDUSTRY_MAP: Record<
  string,
  { icon: typeof Briefcase; retainer: string; math: string }
> = {
  dental: {
    icon: Stethoscope,
    retainer: "R8 to R25k retainer",
    math: "1 retainer = R15k+",
  },
  medical: {
    icon: Stethoscope,
    retainer: "R10 to R30k retainer",
    math: "1 retainer = R18k+",
  },
  aesthetics: {
    icon: Sparkles,
    retainer: "R6 to R20k retainer",
    math: "1 retainer = R12k+",
  },
  wellness: {
    icon: Sparkles,
    retainer: "R5 to R18k retainer",
    math: "1 retainer = R10k+",
  },
  trades: {
    icon: Wrench,
    retainer: "R5 to R15k retainer",
    math: "1 retainer = R10k+",
  },
  plumbing: {
    icon: Wrench,
    retainer: "R5 to R15k retainer",
    math: "1 retainer = R10k+",
  },
  legal: {
    icon: Scale,
    retainer: "R12 to R50k retainer",
    math: "1 retainer = R20k+",
  },
  automotive: {
    icon: Car,
    retainer: "R5 to R20k retainer",
    math: "1 retainer = R12k+",
  },
  fitness: {
    icon: Dumbbell,
    retainer: "R4 to R15k retainer",
    math: "1 retainer = R8k+",
  },
  hospitality: {
    icon: Utensils,
    retainer: "R5 to R20k retainer",
    math: "1 retainer = R10k+",
  },
  retail: {
    icon: ShoppingBag,
    retainer: "R5 to R25k retainer",
    math: "1 retainer = R12k+",
  },
  photography: {
    icon: Camera,
    retainer: "R4 to R15k retainer",
    math: "1 retainer = R8k+",
  },
  beauty: {
    icon: Scissors,
    retainer: "R4 to R12k retainer",
    math: "1 retainer = R7k+",
  },
  property: {
    icon: Building2,
    retainer: "R8 to R30k retainer",
    math: "1 retainer = R15k+",
  },
};

function lookup(industry: string | null) {
  if (!industry) {
    return {
      icon: Briefcase,
      retainer: "R5 to R50k+ retainer",
      math: "1 retainer = R15k+",
    };
  }
  const key = industry.toLowerCase().trim();
  if (INDUSTRY_MAP[key]) return INDUSTRY_MAP[key];
  for (const [k, v] of Object.entries(INDUSTRY_MAP)) {
    if (key.includes(k)) return v;
  }
  return {
    icon: Briefcase,
    retainer: "R5 to R50k+ retainer",
    math: "1 retainer = R15k+",
  };
}

export function ICPContext({ industry }: { industry: string | null }) {
  const { icon: Icon, retainer, math } = lookup(industry);
  return (
    <div className="ed-card !p-5 flex flex-col gap-3">
      <h3 className="font-display text-[18px] leading-tight tracking-tight text-ink">
        ICP context
      </h3>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-[#F4EEE4] inline-flex items-center justify-center text-ink-500">
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-[14px] font-medium text-ink capitalize">
          {industry || "General"}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-[12.5px] text-ink-500">
        <div>
          {retainer}{" "}
          <span className="text-[11px] text-ink-400 italic">, industry estimate</span>
        </div>
        <div>
          {math}{" "}
          <span className="text-[11px] text-ink-400 italic">, industry estimate</span>
        </div>
      </div>
    </div>
  );
}
