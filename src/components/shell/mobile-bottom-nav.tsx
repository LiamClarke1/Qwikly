"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, CalendarCheck, Settings, Receipt } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard",               label: "Home",     icon: Home },
  { href: "/dashboard/conversations", label: "Chats",    icon: MessageSquare },
  { href: "/dashboard/bookings",      label: "Calendar", icon: CalendarCheck },
  { href: "/dashboard/invoices",      label: "Money",    icon: Receipt },
  { href: "/dashboard/settings",      label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-paper/96 backdrop-blur-xl border-t border-ink/[0.08]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors duration-150 cursor-pointer",
                active ? "text-ember" : "text-ink-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {active && <span className="sr-only">(current)</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
