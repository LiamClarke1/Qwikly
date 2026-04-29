"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { cn } from "@/lib/cn";

export function Topbar({ onMenu, isDark, onToggleTheme }: { onMenu?: () => void; isDark?: boolean; onToggleTheme?: () => void }) {
  const router = useRouter();
  const { client, setClient } = useClient();
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (client?.ai_paused !== undefined) setPaused(!!client.ai_paused);
  }, [client]);

  const togglePause = async () => {
    if (!client) return;
    setBusy(true);
    const next = !paused;
    setPaused(next);
    const { error } = await supabase
      .from("clients")
      .update({ ai_paused: next })
      .eq("id", client.id);
    if (!error) setClient({ ...client, ai_paused: next });
    setBusy(false);
  };

  void router; // keep import for future use

  return (
    <header className="sticky top-0 z-30 h-16 px-4 md:px-7 border-b border-ink/[0.08] bg-paper/95 backdrop-blur-xl flex items-center gap-3 shadow-[0_1px_0_rgba(14,14,12,0.05)]">
      {/* Mobile: brand mark only */}
      <div className="flex md:hidden items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-grad-brand flex items-center justify-center shadow-glow">
          <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-small font-semibold text-ink font-display">Qwikly</span>
      </div>

      <div className="flex-1" />

      {/* Dark/light mode toggle */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-hover cursor-pointer transition-colors duration-150"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      )}

      {/* Qwikly is on/off toggle — visible on all sizes */}
      <button
        onClick={togglePause}
        disabled={busy || !client}
        aria-label={paused ? "Qwikly is paused. Tap to turn on." : "Qwikly is on. Tap to pause."}
        className={cn(
          "flex items-center gap-2 h-8 px-3 rounded-full border text-small font-medium cursor-pointer transition-all duration-200 disabled:opacity-50 select-none",
          paused
            ? "bg-warning/10 border-warning/30 text-warning"
            : "bg-brand/10 border-brand/30 text-brand"
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            paused ? "bg-warning" : "bg-brand animate-pulse"
          )}
        />
        <span className="hidden sm:inline">
          {paused ? "Qwikly is paused" : "Qwikly is on"}
        </span>
        <span className="sm:hidden">
          {paused ? "Paused" : "On"}
        </span>
      </button>
    </header>
  );
}
