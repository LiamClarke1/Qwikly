"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Contact, Receipt, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/conversations", label: "Chats", icon: MessageSquare },
  { href: "/dashboard/contacts", label: "Contacts", icon: Contact },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
];

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0D111A]/96 backdrop-blur-xl border-t border-white/[0.06]"
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
                "flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors duration-150",
                active ? "text-brand" : "text-fg-subtle"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {active && (
                <span className="sr-only">(current)</span>
              )}
            </Link>
          );
        })}
        <button
          onClick={onMore}
          aria-label="Open navigation menu"
          className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] text-fg-subtle cursor-pointer"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
