"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Home, MessageSquare, CalendarCheck, Settings, Sparkles, LogOut, Rocket, Receipt, Users, Code2, ScrollText } from "lucide-react";
import { supabase } from "@/lib/supabase";

type NavIcon = React.ComponentType<{ className?: string }>;
type NavItem = { href: string; label: string; icon: NavIcon };

const NAV: NavItem[] = [
  { href: "/dashboard",               label: "Home",      icon: Home as NavIcon },
  { href: "/dashboard/conversations", label: "Chats",     icon: MessageSquare as NavIcon },
  { href: "/dashboard/embed",          label: "Embed",     icon: Code2 as NavIcon },
  { href: "/dashboard/logs",           label: "Logs",      icon: ScrollText as NavIcon },
  { href: "/dashboard/bookings",      label: "Calendar",  icon: CalendarCheck as NavIcon },
  { href: "/dashboard/invoices",      label: "Money",     icon: Receipt as NavIcon },
  { href: "/admin/clients",            label: "CRM",       icon: Users as NavIcon },
  { href: "/dashboard/settings",      label: "Settings",  icon: Settings as NavIcon },
  { href: "/dashboard/setup",         label: "Setup",     icon: Rocket as NavIcon },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="h-full w-full md:w-64 shrink-0 flex flex-col bg-white border-r border-ink/[0.08]">
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-h3 text-ink font-display leading-none">Qwikly</p>
            <p className="text-tiny text-ink-500 mt-0.5">Digital front desk</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin pb-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-body font-medium transition-all duration-150 cursor-pointer",
                active
                  ? "bg-ember/[0.08] text-ink border border-ember/[0.12]"
                  : "text-ink-500 hover:text-ink hover:bg-ink/[0.04]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-ember rounded-full" />
              )}
              <Icon className={cn("w-[18px] h-[18px]", active ? "text-ember" : "text-ink-400 group-hover:text-ink-600")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 border-t border-ink/[0.07]" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button
          onClick={signOut}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-body font-medium text-ink-500 hover:text-ink hover:bg-ink/[0.04] transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px] text-ink-400" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
