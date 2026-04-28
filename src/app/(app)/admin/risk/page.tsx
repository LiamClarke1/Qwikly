"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";

interface RiskClient {
  id: string;
  business_name: string;
  risk_score: number;
  risk_flags: string[];
  status: string;
  created_at: string;
  invoice_count: number;
  overdue_count: number;
  total_overdue_zar: number;
  last_invoice_at: string | null;
}

function RiskBadge({ score }: { score: number }) {
  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  const cfg = {
    high:   { label: "High risk",   color: "bg-danger/10 text-danger border border-danger/20" },
    medium: { label: "Medium risk", color: "bg-warning/10 text-warning border border-warning/20" },
    low:    { label: "Low risk",    color: "bg-success/10 text-success border border-success/20" },
  }[level];
  return (
    <span className={cn("inline-flex items-center gap-1 text-tiny font-medium px-2.5 py-1 rounded-full", cfg.color)}>
      {score.toFixed(0)}
    </span>
  );
}

export default function AdminRiskPage() {
  const [clients, setClients] = useState<RiskClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "paused">("all");

  useEffect(() => {
    fetch("/api/admin/risk").then(r => r.ok ? r.json() : { clients: [] }).then(d => {
      setClients(d.clients ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = clients.filter(c => {
    if (filter === "high") return c.risk_score >= 70;
    if (filter === "medium") return c.risk_score >= 40 && c.risk_score < 70;
    if (filter === "paused") return c.status === "paused" || c.status === "churned";
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-small text-brand font-medium mb-1">Admin</p>
        <h1 className="text-h1 text-fg">Risk</h1>
        <p className="text-small text-fg-muted mt-1">Client risk scores and flags from automated monitoring.</p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-line rounded-xl p-1 bg-white/[0.02] mb-4 max-w-sm">
        {(["all", "high", "medium", "paused"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-small font-medium transition-colors cursor-pointer capitalize",
              filter === f ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
            )}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-small text-fg-muted py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <CheckCircle className="w-8 h-8 text-success" />
          <p className="text-small text-fg-muted">No clients in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-bg-card border border-line rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-body font-semibold text-fg">{c.business_name}</p>
                  <p className="text-tiny text-fg-muted">Joined {fmtDate(c.created_at)}{c.last_invoice_at ? ` · Last invoice ${fmtDate(c.last_invoice_at)}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RiskBadge score={c.risk_score} />
                  {(c.status === "paused" || c.status === "churned") && (
                    <span className="inline-flex items-center text-tiny font-medium px-2.5 py-1 rounded-full bg-danger/10 text-danger border border-danger/20">
                      {c.status === "paused" ? "Paused" : "Suspended"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-tiny text-fg-muted mb-0.5">Total invoices</p>
                  <p className="text-small font-medium text-fg">{c.invoice_count}</p>
                </div>
                <div>
                  <p className="text-tiny text-fg-muted mb-0.5">Overdue invoices</p>
                  <p className={cn("text-small font-medium", c.overdue_count > 0 ? "text-danger" : "text-fg")}>{c.overdue_count}</p>
                </div>
                <div>
                  <p className="text-tiny text-fg-muted mb-0.5">Overdue amount</p>
                  <p className={cn("text-small font-medium font-display", c.total_overdue_zar > 0 ? "text-warning" : "text-fg")}>{fmt(c.total_overdue_zar)}</p>
                </div>
              </div>

              {c.risk_flags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {c.risk_flags.map(flag => (
                    <span key={flag} className="inline-flex items-center gap-1 text-tiny px-2 py-0.5 rounded-lg bg-warning/10 text-warning border border-warning/15">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
