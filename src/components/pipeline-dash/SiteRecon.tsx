"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Pencil } from "lucide-react";
import { saveUniqueHook } from "@/app/(app)/dashboard/pipeline/prospects/[id]/actions";

export interface SiteReconData {
  id: string;
  title: string | null;
  h1: string | null;
  metaDescription: string | null;
  specialism: string | null;
  heroText: string | null;
  uniqueHook: string | null;
  scrapedFromUrl: string | null;
  scrapedFromLabel: string | null;
  verified: boolean;
  hasReconData: boolean;
}

// Auto fallback hook: keeps language warm and South African. Not "AI", not "bot".
function fallbackHook(company: string | null, city: string | null): string {
  if (company && city) {
    return `Most ${city} owners I speak to lose a handful of after hours enquiries every week, Qwikly catches those before they keep scrolling.`;
  }
  if (company) {
    return `${company} feels like the kind of business where one or two missed enquiries a week is the difference between a quiet month and a strong one.`;
  }
  return "Qwikly replies in under a minute, day or night, so the customer books before they keep scrolling.";
}

export function SiteRecon({
  data,
  company,
  city,
}: {
  data: SiteReconData;
  company: string | null;
  city: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [hook, setHook] = useState<string>(
    data.uniqueHook && data.uniqueHook.trim().length > 0
      ? data.uniqueHook
      : fallbackHook(company, city),
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveUniqueHook(data.id, hook);
      setEditing(false);
    });
  }

  return (
    <div className="ed-card !p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">
              Site recon
            </h2>
            {data.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F1E9] text-[#1F7A3A] ring-1 ring-[#CDE3D5] px-2 py-0.5 text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3" />
                Site verified
              </span>
            ) : null}
          </div>
          <p className="text-[12.5px] text-ink-500">
            Scraped from{" "}
            {data.scrapedFromUrl ? (
              <a
                href={data.scrapedFromUrl}
                target="_blank"
                rel="noreferrer"
                className="text-ember hover:underline"
              >
                {data.scrapedFromLabel || data.scrapedFromUrl}
              </a>
            ) : (
              <span className="text-ink-400">their site</span>
            )}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-2.5 text-[13px]">
        <Row label="Title" value={data.title} />
        <Row label="H1" value={data.h1} />
        <Row label="Meta description" value={data.metaDescription} alignRight />
        <Row label="Specialism" value={data.specialism} />
      </dl>

      {data.heroText ? (
        <div className="border-t border-ink/[0.08] pt-3 flex flex-col gap-1">
          <span className="eyebrow text-ink-500">Hero text</span>
          <p className="text-[13px] leading-relaxed italic text-ink-500">
            {data.heroText.length > 240
              ? `${data.heroText.slice(0, 240)}...`
              : data.heroText}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg bg-[#FCEEE6] ring-1 ring-[#F4D5C5] p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#A2421F]">
            Unique Step 1 hook ,{" "}
            {data.uniqueHook && data.uniqueHook.trim().length > 0 ? "custom" : "auto"}
          </span>
          {editing ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="text-[11.5px] font-medium text-[#A2421F] hover:text-[#7A2F15] disabled:opacity-50"
            >
              {isPending ? "Saving," : "Save"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#A2421F] hover:text-[#7A2F15]"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={3}
            className="w-full rounded-md bg-white border border-[#F4D5C5] text-[13px] text-ink p-2 focus:outline-none focus:border-[#A2421F]"
          />
        ) : (
          <p className="text-[13.5px] leading-relaxed text-[#7A2F15]">{hook}</p>
        )}
      </div>

      {!data.hasReconData ? (
        <p className="text-[11.5px] text-ink-400 italic">
          Site recon will populate after the next refresh, industry estimate.
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  alignRight,
}: {
  label: string;
  value: string | null;
  alignRight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/[0.05] last:border-b-0 pb-2 last:pb-0">
      <dt className="text-[12px] text-ink-500 w-[140px] shrink-0">{label}</dt>
      <dd
        className={`text-[13px] text-ink flex-1 ${
          alignRight ? "text-right" : ""
        }`}
      >
        {value && value.trim().length > 0 ? value : <span className="text-ink-400">,</span>}
      </dd>
    </div>
  );
}
