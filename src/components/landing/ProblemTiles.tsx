"use client";

import { useState, useEffect, useCallback } from "react";
import { PhoneOff, Clock, FileText, Ghost } from "lucide-react";
import { cn } from "@/lib/cn";

export type Problem = "missing-calls" | "slow-reply" | "quoting" | "ghosting";

const tiles: { id: Problem; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "missing-calls", label: "Missing calls", sublabel: "Phone rings, nobody answers", icon: PhoneOff },
  { id: "slow-reply", label: "Slow to reply", sublabel: "Hours pass before you respond", icon: Clock },
  { id: "quoting", label: "Quoting takes forever", sublabel: "Customers wait days for a price", icon: FileText },
  { id: "ghosting", label: "Customers ghost me", sublabel: "Leads vanish after the first message", icon: Ghost },
];

interface Props {
  selected: Problem | null;
  onChange: (p: Problem) => void;
}

export function ProblemTiles({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const active = selected === tile.id;
        return (
          <button
            key={tile.id}
            onClick={() => onChange(tile.id)}
            className={cn(
              "group relative flex flex-col items-start gap-3 p-5 md:p-6 rounded-2xl border text-left cursor-pointer",
              "min-h-[96px] transition-all duration-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50",
              active
                ? "bg-ink text-paper border-ink shadow-ink"
                : "bg-white/60 border-ink/12 hover:border-ink/25 hover:bg-white hover:shadow-[0_8px_24px_-8px_rgba(14,14,12,0.12)]"
            )}
            aria-pressed={active}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300",
                active ? "bg-ember text-paper" : "bg-ink/6 text-ink-600 group-hover:bg-ember/10 group-hover:text-ember"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className={cn("font-display text-base leading-snug", active ? "text-paper" : "text-ink")}>
                {tile.label}
              </p>
              <p className={cn("text-xs mt-0.5 leading-snug", active ? "text-paper/60" : "text-ink-500")}>
                {tile.sublabel}
              </p>
            </div>
            {active && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-ember" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function useProblem() {
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("problem") as Problem | null;
    const fromStorage = localStorage.getItem("qwikly_problem") as Problem | null;
    const valid: Problem[] = ["missing-calls", "slow-reply", "quoting", "ghosting"];
    const initial = valid.includes(fromUrl as Problem) ? fromUrl : valid.includes(fromStorage as Problem) ? fromStorage : "missing-calls";
    setProblem(initial as Problem);
  }, []);

  const setAndPersist = useCallback((p: Problem) => {
    setProblem(p);
    localStorage.setItem("qwikly_problem", p);
    const url = new URL(window.location.href);
    url.searchParams.set("problem", p);
    window.history.replaceState({}, "", url.toString());

    type WindowWithGtag = Window & { gtag?: (a: string, b: string, c: object) => void };
    const win = window as WindowWithGtag;
    if (typeof win.gtag === "function") {
      win.gtag("event", "homepage.problem_selected", { value: p });
    }
  }, []);

  return { problem, setProblem: setAndPersist };
}
