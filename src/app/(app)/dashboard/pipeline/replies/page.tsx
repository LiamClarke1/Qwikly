"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { ReplyDrafter } from "@/components/pipeline-dash/ReplyDrafter";

export default function RepliesPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pb-6 border-b border-ink/[0.08]">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/pipeline"
            className="eyebrow text-ink-500 hover:text-ember"
          >
            Pipeline
          </Link>
          <h1 className="font-display text-[36px] md:text-[42px] leading-[1.05] tracking-tight text-ink">
            Reply drafter
          </h1>
          <p className="text-ink-500 text-[14px]">
            Paste a reply or pick a prospect. Pattern matching surfaces the right response.
          </p>
        </div>
      </header>

      <ReplyDrafter />
    </div>
  );
}
