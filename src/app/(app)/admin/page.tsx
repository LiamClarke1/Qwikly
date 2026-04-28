"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ShieldAlert, Receipt, MessageSquare, TrendingUp, Users } from "lucide-react";
import { fmt } from "@/lib/money";

interface AdminStats {
  total_clients: number;
  active_clients: number;
  total_invoices_sent: number;
  total_paid_zar: number;
  total_commission_zar: number;
  open_disputes: number;
  high_risk_clients: number;
  current_period_commission: number;
}

const CARDS = [
  { label: "Active clients",       key: "active_clients" as keyof AdminStats,         icon: Users,       href: "/admin/invoicing", money: false },
  { label: "Total collected",      key: "total_paid_zar" as keyof AdminStats,          icon: TrendingUp,  href: "/admin/invoicing", money: true  },
  { label: "Total commission",     key: "total_commission_zar" as keyof AdminStats,    icon: Receipt,     href: "/admin/billing",   money: true  },
  { label: "This period",          key: "current_period_commission" as keyof AdminStats, icon: Receipt,  href: "/admin/billing",   money: true  },
  { label: "High risk clients",    key: "high_risk_clients" as keyof AdminStats,       icon: ShieldAlert, href: "/admin/risk",      money: false },
  { label: "Open disputes",        key: "open_disputes" as keyof AdminStats,           icon: MessageSquare, href: "/admin/disputes", money: false },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <p className="text-small text-brand font-medium mb-1">Admin</p>
        <h1 className="text-h1 text-fg">Overview</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {CARDS.map(card => {
          const Icon = card.icon;
          const val = stats?.[card.key] ?? 0;
          return (
            <Link key={card.key} href={card.href}
              className="bg-bg-card border border-line rounded-2xl p-5 hover:border-brand/30 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <p className="text-small text-fg-muted">{card.label}</p>
                <Icon className="w-4 h-4 text-fg-faint group-hover:text-brand transition-colors" />
              </div>
              <p className="text-display-2 font-display text-fg">
                {card.money ? fmt(val as number) : (val as number).toLocaleString()}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/admin/invoicing", label: "Invoicing",     desc: "All invoices across all clients",        icon: FileText },
          { href: "/admin/risk",      label: "Risk flags",    desc: "High-risk client accounts",              icon: ShieldAlert },
          { href: "/admin/billing",   label: "Billing",       desc: "Commission periods and collection",       icon: Receipt },
          { href: "/admin/disputes",  label: "Disputes",      desc: "Open and resolved billing disputes",     icon: MessageSquare },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="bg-bg-card border border-line rounded-2xl p-5 flex gap-4 items-start hover:border-brand/30 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-brand/10 flex items-center justify-center shrink-0 transition-colors">
              <item.icon className="w-4.5 h-4.5 text-fg-muted group-hover:text-brand transition-colors" />
            </div>
            <div>
              <p className="text-small font-semibold text-fg mb-0.5">{item.label}</p>
              <p className="text-tiny text-fg-muted">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
