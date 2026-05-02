"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  User, Building2, Bot, Users, Key, Plug, CreditCard, AlertTriangle,
} from "lucide-react";

const NAV = [
  { href: "/dashboard/settings/profile",     label: "Profile",       icon: User          },
  { href: "/dashboard/settings/business",    label: "Business",      icon: Building2     },
  { href: "/dashboard/settings/assistant",   label: "Assistant",     icon: Bot           },
  { href: "/dashboard/settings/team",        label: "Team",          icon: Users         },
  { href: "/dashboard/settings/api-keys",    label: "API Keys",      icon: Key           },
  { href: "/dashboard/settings/integrations",label: "Integrations",  icon: Plug          },
  { href: "/dashboard/settings/billing",     label: "Billing",       icon: CreditCard    },
  { href: "/dashboard/settings/danger-zone", label: "Danger Zone",   icon: AlertTriangle },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
      {/* Sidebar nav — desktop sticky, mobile horizontal scroll */}
      <nav className="lg:sticky lg:top-20 self-start">
        {/* Desktop */}
        <div className="hidden lg:block space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const danger = href.includes("danger");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-small font-medium transition-colors duration-150 cursor-pointer",
                  active
                    ? danger
                      ? "bg-red-500/10 text-red-600 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]"
                      : "bg-surface-active text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]"
                    : danger
                      ? "text-red-500/70 hover:text-red-600 hover:bg-red-500/5"
                      : "text-fg-muted hover:text-fg hover:bg-surface-hover"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active
                      ? danger ? "text-red-500" : "text-ember"
                      : danger ? "text-red-400" : "text-fg-subtle"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Mobile horizontal scroll */}
        <div className="lg:hidden flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const danger = href.includes("danger");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-tiny font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer",
                  active
                    ? danger
                      ? "bg-red-500/10 text-red-600"
                      : "bg-surface-active text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]"
                    : danger
                      ? "text-red-400 hover:text-red-600 hover:bg-red-500/5"
                      : "text-fg-muted hover:text-fg hover:bg-surface-hover"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? (danger ? "text-red-500" : "text-ember") : "text-fg-subtle")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
