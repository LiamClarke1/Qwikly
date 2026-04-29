"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileText, ShieldAlert, Receipt, MessageSquare, Users, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin",           label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/clients",   label: "Clients",   icon: Users },
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
    fetch("/api/admin/me")
      .then(r => { if (!r.ok) router.replace("/dashboard"); else setChecking(false); })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  if (checking) return null;

  return (
    <div className="flex min-h-screen bg-[#F4EEE4]">
      {/* Sidebar — matches dashboard sidebar style */}
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col py-5 px-3 gap-0.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 mb-3 text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold px-3 mb-2">Admin</p>

        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer",
                active
                  ? "bg-[#E85A2C]/[0.08] text-[#1a1a1a] border border-[#E85A2C]/[0.12]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              <item.icon className={cn("w-4 h-4", active ? "text-[#E85A2C]" : "text-slate-400")} />
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
