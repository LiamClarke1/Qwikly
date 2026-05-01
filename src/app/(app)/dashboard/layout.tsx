"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { AssistantChat } from "@/components/shell/assistant-chat";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Read stored theme preference on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("qwikly-theme") : null;
    if (stored === "dark") setIsDark(true);
  }, []);

  const toggleTheme = () => {
    setIsDark((d) => {
      const next = !d;
      localStorage.setItem("qwikly-theme", next ? "dark" : "light");
      return next;
    });
  };

  // Lock body scroll so iOS doesn't bounce the entire page behind the app shell.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyBg = body.style.backgroundColor;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.backgroundColor = isDark ? "#111827" : "#F4EEE4";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.backgroundColor = prevBodyBg;
    };
  }, [isDark]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setAuthed(true);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen [min-height:100dvh] flex items-center justify-center bg-paper">
        <div className="flex items-center gap-3 text-ink-500">
          <div className="w-5 h-5 rounded-full border-2 border-ember/30 border-t-ember animate-spin" />
          <p className="text-small font-sans">Loading workspace…</p>
        </div>
      </div>
    );
  }
  if (!authed) return null;

  return (
    <div className={`h-screen [height:100dvh] flex bg-surface${isDark ? " dark" : ""}`} style={{ overflow: "hidden" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col relative" style={{ minHeight: 0, overflow: "hidden" }}>
        <Topbar isDark={isDark} onToggleTheme={toggleTheme} />
        <div
          style={{
            position: "absolute",
            top: "4rem",
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: "scroll",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <main className="px-4 md:px-7 py-6 md:py-8 pb-24 md:pb-8 max-w-[1400px] w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav />
      <AssistantChat />
    </div>
  );
}
