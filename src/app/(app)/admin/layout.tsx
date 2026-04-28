"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileText, ShieldAlert, Receipt, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin",          label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/invoicing", label: "Invoicing", icon: FileText },
  { href: "/admin/risk",      label: "Risk",      icon: ShieldAlert },
  { href: "/admin/billing",   label: "Billing",   icon: Receipt },
  { href: "/admin/disputes",  label: "Disputes",  icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Gate: only Qwikly staff (role = admin) may access
    fetch("/api/admin/me")
      .then(r => { if (!r.ok) router.replace("/dashboard"); else setChecking(false); })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  if (checking) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-line bg-bg-card flex flex-col py-6 px-3 gap-1">
        <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold px-3 mb-3">Admin</p>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-small font-medium transition-colors cursor-pointer",
                active ? "bg-brand/10 text-brand" : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
