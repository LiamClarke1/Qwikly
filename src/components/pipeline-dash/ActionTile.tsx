"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

// Big call-to-action tile. Cream surface, terracotta accent stripe on hover.
export function ActionTile({
  href,
  title,
  body,
  cta = "Open",
  className,
}: {
  href: string;
  title: string;
  body: string;
  cta?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group ed-card !p-6 md:!p-7 flex flex-col gap-4 relative overflow-hidden",
        className
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-ember translate-x-[-3px] group-hover:translate-x-0 transition-transform duration-300"
      />
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-[22px] md:text-[24px] leading-[1.15] tracking-tight text-ink">
          {title}
        </h3>
        <p className="text-[13.5px] text-ink-500 leading-relaxed max-w-[42ch]">
          {body}
        </p>
      </div>
      <div className="mt-auto inline-flex items-center gap-2 text-[13px] font-medium text-ember group-hover:text-ember-deep">
        {cta}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
