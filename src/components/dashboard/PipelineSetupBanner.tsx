"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  show: boolean;
}

export function PipelineSetupBanner({ show }: Props) {
  if (!show) return null;
  return (
    <div className="bg-ember/10 border-b border-ember/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-small">
        <div className="text-ink-900">
          <strong>Your lead engine isn&apos;t set up yet.</strong>{" "}
          Finish setup to start receiving prospects, takes 3 minutes.
        </div>
        <Link
          href="/dashboard/pipeline/setup"
          className="inline-flex items-center gap-1 rounded-md bg-ember px-3 py-1.5 text-white font-medium hover:bg-ember/90 whitespace-nowrap cursor-pointer"
        >
          Finish setup <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
