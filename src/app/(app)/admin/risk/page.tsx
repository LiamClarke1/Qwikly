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
    high:   { label: "High risk",   color: "bg-red-50 text-red-600 border border-red-200" },
    medium: { label: "Medium risk", color: "bg-amber-50 text-amber-600 border border-amber-200" },
    low:    { label: "Low risk",    color: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  }[level];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full", cfg.color)}>
      {score.toFixed(0)}
    </span>
  );
}

export default function AdminRiskPage() {
  const [clients, setClients] = useState<RiskClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "paused">("all");
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/risk").then(r => r.ok ? r.json() : { clients: [] }).then(d => {
      setClients(d.clients ?? []);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, []);

  async function recalculate() {
    setRecalculating(true);
    setRecalcMessage(null);
    const r = await fetch("/api/admin/risk/recalculate", { method: "POST" });
    setRecalculating(false);
    if (r.ok) {
      const d = await r.json();
      const seconds = Math.round((d.elapsed_ms ?? 0) / 100) / 10;
      setRecalcMessage(`Recalculated ${d.updated} clients in ${seconds}s${d.errors ? `, ${d.errors} errors` : ""}.`);
      load();
    } else {
      setRecalcMessage("Recalculation failed, please try again.");
    }
  }

  const filtered = clients.filter(c => {
    if (filter === "high") return c.risk_score >= 70;
    if (filter === "medium") return c.risk_score >= 40 && c.risk_score < 70;
    if (filter === "paused") return c.status === "paused" || c.status === "churned";
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] text-[#E85A2C] font-medium mb-1">Admin</p>
          <h1 className="text-[28px] font-bold leading-tight text-slate-900">Risk</h1>
          <p className="text-[13px] text-slate-500 mt-1">Client risk scores and flags from automated monitoring. Auto-recomputed daily at 02:00 SAST.</p>
        </div>
        <button
          onClick={recalculate}
          disabled={recalculating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E85A2C] text-white text-[13px] font-semibold hover:bg-[#d04f25] disabled:opacity-60 cursor-pointer shadow-sm whitespace-nowrap"
        >
          <ShieldAlert className="w-4 h-4" />
          {recalculating ? "Recalculating..." : "Recalculate scores"}
        </button>
      </div>

      {recalcMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-emerald-700">{recalcMessage}</p>
          <button onClick={() => setRecalcMessage(null)} className="text-[12px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-slate-200 rounded-xl p-1 bg-white mb-4 max-w-sm shadow-sm">
        {(["all", "high", "medium", "paused"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer capitalize",
              filter === f ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[13px] text-slate-500 py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
          <p className="text-[13px] text-slate-500">No clients in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[14px] font-semibold text-slate-800">{c.business_name}</p>
                  <p className="text-[11px] text-slate-500">Joined {fmtDate(c.created_at)}{c.last_invoice_at ? ` · Last invoice ${fmtDate(c.last_invoice_at)}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RiskBadge score={c.risk_score} />
                  {(c.status === "paused" || c.status === "churned") && (
                    <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                      {c.status === "paused" ? "Paused" : "Suspended"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Total invoices</p>
                  <p className="text-[13px] font-medium text-slate-800">{c.invoice_count}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Overdue invoices</p>
                  <p className={cn("text-[13px] font-medium", c.overdue_count > 0 ? "text-red-600" : "text-slate-800")}>{c.overdue_count}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Overdue amount</p>
                  <p className={cn("text-[13px] font-medium font-display", c.total_overdue_zar > 0 ? "text-amber-600" : "text-slate-800")}>{fmt(c.total_overdue_zar)}</p>
                </div>
              </div>

              {c.risk_flags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {c.risk_flags.map(flag => (
                    <span key={flag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
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
