"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import type { FieldProvenance } from "@/lib/pipeline/enrichment/types";

const SOURCE_LABEL: Record<FieldProvenance["source"], string> = {
  site_hero: "Pulled from your homepage hero",
  site_services: "Pulled from your services list",
  gbp_category: "From your Google Business Profile category",
  gbp_location: "From your Google Business Profile location",
  gbp_size: "From your Google Business Profile",
  offer: "From the offer you described",
  synthesis: "Inferred from your offer and website",
};

export function WhyTooltip({ provenance }: { provenance: FieldProvenance | undefined }) {
  const [open, setOpen] = useState(false);
  if (!provenance) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="ml-1.5 inline-flex items-center gap-1 text-tiny text-ink-500 hover:text-ink-800 cursor-pointer"
        aria-label="Why this suggestion?"
      >
        <Info className="w-3 h-3" />
        Why?
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-10 top-full left-0 mt-1 w-64 rounded-md border border-ink-200 bg-light p-3 shadow-lg text-tiny text-ink-700"
        >
          <div className="font-medium text-ink-900 mb-1">{SOURCE_LABEL[provenance.source]}</div>
          <div className="italic">&ldquo;{provenance.evidence}&rdquo;</div>
        </div>
      )}
    </div>
  );
}
