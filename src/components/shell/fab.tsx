"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, CalendarPlus, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

const actions = [
  { label: "New invoice", icon: FileText, href: "/dashboard/invoices/new" },
  { label: "New booking", icon: CalendarPlus, href: "/dashboard/bookings" },
  { label: "Add contact", icon: UserPlus, href: "/dashboard/contacts" },
];

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="md:hidden fixed bottom-16 right-4 z-40" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 1rem)" }}>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action items */}
      <div className={cn(
        "flex flex-col gap-2 mb-3 items-end transition-all duration-300 origin-bottom",
        open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none"
      )}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => { setOpen(false); router.push(action.href); }}
              className="flex items-center gap-3 pl-4 pr-3 h-11 rounded-2xl bg-[#1c2233] border border-white/[0.10] text-fg text-small font-medium shadow-pop cursor-pointer hover:border-brand/30 transition-all duration-150 animate-slide-up"
            >
              {action.label}
              <div className="w-8 h-8 rounded-xl bg-brand/15 flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand" />
              </div>
            </button>
          );
        })}
      </div>

      {/* FAB trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close quick actions" : "Quick actions"}
        className="w-14 h-14 rounded-2xl bg-grad-brand text-white flex items-center justify-center shadow-glow cursor-pointer hover:brightness-110 active:brightness-95 transition-all duration-200 ml-auto"
      >
        <Plus className={cn("w-6 h-6 transition-transform duration-300", open && "rotate-45")} />
      </button>
    </div>
  );
}
