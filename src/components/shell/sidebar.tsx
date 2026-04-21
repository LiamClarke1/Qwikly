"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare, badge: "live" },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="h-full w-64 shrink-0 flex flex-col bg-ink-900/80 backdrop-blur-xl border-r border-line">
      <div className="px-5 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-h3 text-fg leading-none">Qwikly</p>
            <p className="text-tiny text-fg-muted mt-0.5">AI Front Desk</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {nav.map((item) => {
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
                  ? "bg-white/[0.06] text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-fg-muted hover:text-fg hover:bg-white/[0.03]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-brand rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              )}
              <Icon className={cn("w-[18px] h-[18px]", active ? "text-brand" : "text-fg-subtle group-hover:text-fg-muted")} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto inline-flex items-center gap-1 text-tiny font-semibold text-brand">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-soft" />
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 m-3 rounded-2xl bg-grad-mesh border border-line relative overflow-hidden">
        <p className="text-small font-semibold text-fg">Connect WhatsApp</p>
        <p className="text-tiny text-fg-muted mt-1 leading-relaxed">
          Link Meta Business to enable manual replies and broadcasts.
        </p>
        <Link
          href="/dashboard/settings?tab=integrations"
          className="mt-3 inline-flex text-tiny font-semibold text-brand hover:underline"
        >
          Set up →
        </Link>
      </div>
    </aside>
  );
}
