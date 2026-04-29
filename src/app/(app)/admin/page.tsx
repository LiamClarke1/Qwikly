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
  { label: "Total clients",        key: "total_clients" as keyof AdminStats,             icon: Users,       href: "/admin/clients",   money: false },
  { label: "Active clients",       key: "active_clients" as keyof AdminStats,            icon: Users,       href: "/admin/clients",   money: false },
  { label: "Total collected",      key: "total_paid_zar" as keyof AdminStats,            icon: TrendingUp,  href: "/admin/invoicing", money: true  },
  { label: "Total commission",     key: "total_commission_zar" as keyof AdminStats,      icon: Receipt,     href: "/admin/billing",   money: true  },
  { label: "This period",          key: "current_period_commission" as keyof AdminStats, icon: Receipt,     href: "/admin/billing",   money: true  },
  { label: "High risk clients",    key: "high_risk_clients" as keyof AdminStats,         icon: ShieldAlert, href: "/admin/risk",      money: false },
];

const QUICK_LINKS = [
  { href: "/admin/clients",   label: "Clients",    desc: "All onboarded businesses",             icon: Users        },
  { href: "/admin/invoicing", label: "Invoicing",  desc: "All invoices across all clients",      icon: FileText     },
  { href: "/admin/risk",      label: "Risk flags", desc: "High-risk client accounts",            icon: ShieldAlert  },
  { href: "/admin/billing",   label: "Billing",    desc: "Commission periods and collection",    icon: Receipt      },
  { href: "/admin/disputes",  label: "Disputes",   desc: "Open and resolved billing disputes",  icon: MessageSquare },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[28px] font-bold text-slate-900 leading-tight">Overview</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {CARDS.map(card => {
          const Icon = card.icon;
          const val = stats?.[card.key] ?? 0;
          return (
            <Link
              key={card.key}
              href={card.href}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#E85A2C]/30 hover:shadow-sm transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] text-slate-500 font-medium">{card.label}</p>
                <Icon className="w-4 h-4 text-slate-300 group-hover:text-[#E85A2C] transition-colors duration-150" />
              </div>
              <p className="text-[28px] font-bold text-slate-900 leading-none">
                {loading
                  ? <span className="inline-block w-12 h-7 rounded-lg bg-slate-100 animate-pulse" />
                  : card.money ? fmt(val as number) : (val as number).toLocaleString()
                }
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {QUICK_LINKS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 items-start hover:border-[#E85A2C]/30 hover:shadow-sm transition-all duration-150 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-[#E85A2C]/10 flex items-center justify-center shrink-0 transition-colors duration-150">
              <item.icon className="w-4.5 h-4.5 text-slate-400 group-hover:text-[#E85A2C] transition-colors duration-150" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-800 mb-0.5">{item.label}</p>
              <p className="text-[12px] text-slate-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
