"use client";

import { useTransition } from "react";
import { Phone, Check } from "lucide-react";
import { setProspectStatus } from "@/app/(app)/dashboard/pipeline/prospects/[id]/actions";

export function CallScript({
  prospectId,
  phone,
  bullets,
}: {
  prospectId: string;
  phone: string | null;
  bullets: string[];
}) {
  const [isPending, startTransition] = useTransition();

  function markCalled() {
    startTransition(async () => {
      await setProspectStatus(prospectId, "contacted");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
          Call script
        </span>
        <ul className="flex flex-col gap-2.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] text-ink leading-relaxed">
              <span className="font-mono text-ember shrink-0">{i + 1}.</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2 text-[13px] font-medium hover:bg-ink-800"
          >
            <Phone className="w-3.5 h-3.5" />
            Call {phone}
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F4EEE4] text-ink-500 px-4 py-2 text-[13px] font-medium">
            No phone on file
          </span>
        )}
        <button
          type="button"
          onClick={markCalled}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2] disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          Mark called
        </button>
      </div>
    </div>
  );
}
