"use client";

import { useTransition } from "react";
import { Clock, XCircle } from "lucide-react";
import {
  snoozeProspect,
  setProspectStatus,
} from "@/app/(app)/dashboard/pipeline/prospects/[id]/actions";

export function QuickActions({ prospectId }: { prospectId: string }) {
  const [isPending, startTransition] = useTransition();

  function snooze(days: number) {
    startTransition(async () => {
      await snoozeProspect(prospectId, days);
    });
  }

  function markLost() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Mark this prospect as lost?");
      if (!ok) return;
    }
    startTransition(async () => {
      await setProspectStatus(prospectId, "dead");
    });
  }

  return (
    <div className="ed-card !p-5 flex flex-col gap-3">
      <h3 className="font-display text-[18px] leading-tight tracking-tight text-ink">
        Quick actions
      </h3>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => snooze(7)}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2] disabled:opacity-50"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze 7d
        </button>
        <button
          type="button"
          onClick={() => snooze(30)}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2] disabled:opacity-50"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze 30d
        </button>
        <button
          type="button"
          onClick={markLost}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#EFCFC7] text-[#B33B2E] px-4 py-2 text-[13px] font-medium hover:bg-[#F7E2DE] disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" />
          Mark lost
        </button>
      </div>
    </div>
  );
}
