"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { AssistantChat } from "@/components/shell/assistant-chat";
import { X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      // If the user has no clients row they haven't completed setup yet
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (!client) {
        router.push("/dashboard/setup");
        return;
      }
      setAuthed(true);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-fg-muted">
          <div className="w-5 h-5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
          <p className="text-small">Loading workspace…</p>
        </div>
      </div>
    );
  }
  if (!authed) return null;

  return (
    <div className="h-screen overflow-hidden flex bg-[#111827]">
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="md:hidden fixed top-0 left-0 z-50 h-screen w-72 max-w-[85vw] overflow-hidden shadow-2xl animate-slide-up">
            <div className="relative h-full w-full">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg bg-white/[0.04] cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 md:px-7 py-6 md:py-8 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      <AssistantChat />
    </div>
  );
}
