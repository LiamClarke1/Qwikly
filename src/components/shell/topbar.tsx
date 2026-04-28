"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Pause, Play, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { client, setClient } = useClient();
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (client?.ai_paused !== undefined) setPaused(!!client.ai_paused);
  }, [client]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

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

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 h-16 px-4 md:px-7 border-b border-white/[0.06] bg-[#111827]/95 backdrop-blur-xl flex items-center gap-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      <button
        onClick={onMenu}
        className="hidden h-11 w-11 rounded-xl flex items-center justify-center text-fg-muted hover:text-fg hover:bg-white/[0.04] cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 max-w-md hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl bg-white/[0.03] border border-line">
        <Search className="w-4 h-4 text-fg-subtle" />
        <input
          placeholder="Search customers, bookings, leads…"
          className="bg-transparent outline-none text-small text-fg placeholder:text-fg-faint flex-1"
        />
        <kbd className="hidden md:inline-flex h-5 px-1.5 rounded text-tiny text-fg-subtle border border-line bg-ink-800">⌘K</kbd>
      </div>

      <div className="flex-1 sm:hidden" />

      <button
        onClick={togglePause}
        disabled={busy || !client}
        className={cn(
          "h-9 px-3 rounded-xl border flex items-center gap-2 text-small font-medium cursor-pointer transition-colors duration-150 disabled:opacity-50",
          paused
            ? "bg-warning-soft border-warning/30 text-warning"
            : "bg-brand-soft border-brand/30 text-brand"
        )}
        title={paused ? "AI is paused. Click to resume." : "AI is on. Click to pause."}
      >
        {paused ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{paused ? "AI paused" : "AI on"}</span>
      </button>

      <button className="h-11 w-11 rounded-xl border border-line bg-white/[0.03] flex items-center justify-center text-fg-muted hover:text-fg cursor-pointer relative">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />
      </button>

      <div className="flex items-center gap-3 pl-2 border-l border-line">
        <div className="block text-right max-w-[100px] sm:max-w-none">
          <p className="text-small font-semibold text-fg leading-tight">
            {client?.business_name ?? "Welcome"}
          </p>
          <p className="text-tiny text-fg-muted">{email}</p>
        </div>
        <Avatar name={client?.business_name ?? email} size={32} />
        <button
          onClick={signOut}
          className="h-11 w-11 rounded-xl flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-white/[0.04] cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
