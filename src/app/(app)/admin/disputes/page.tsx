"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";
import { Button } from "@/components/ui/button";

interface AdminDispute {
  id: string;
  client_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  disputed_amount: number;
  status: "open" | "resolved" | "rejected";
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  clients: { business_name: string };
}

const STATUS_CFG = {
  open:     { label: "Open",     color: "bg-amber-50 text-amber-600 border border-amber-200",    icon: Clock },
  resolved: { label: "Resolved", color: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-600 border border-red-200",          icon: AlertTriangle },
};

function ResolveModal({ dispute, onClose, onDone }: { dispute: AdminDispute; onClose: () => void; onDone: () => void }) {
  const [resolution, setResolution] = useState("");
  const [action, setAction] = useState<"resolved" | "rejected">("resolved");
  const [creditAmount, setCreditAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, resolution_notes: resolution, credit_amount: parseFloat(creditAmount) || 0 }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-[15px] font-semibold text-slate-800 mb-1">Resolve dispute</h3>
        <p className="text-[13px] text-slate-500 mb-1">{dispute.clients?.business_name}</p>
        <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">{dispute.reason}</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-3">
            {(["resolved", "rejected"] as const).map(a => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[13px] font-medium border transition-all cursor-pointer capitalize",
                  action === a
                    ? a === "resolved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                    : "bg-white text-slate-500 border-slate-200"
                )}>
                {a}
              </button>
            ))}
          </div>
          {action === "resolved" && (
            <div>
              <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Credit amount (ZAR, optional)</label>
              <input type="number" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                placeholder="Amount to credit back"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#E85A2C]/40" />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Resolution notes</label>
            <textarea value={resolution} onChange={e => setResolution(e.target.value)} required rows={3}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#E85A2C]/40 resize-none"
              placeholder="Explain the decision…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1" disabled={!resolution.trim()}>Confirm</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "resolved" | "rejected" | "all">("open");
  const [resolving, setResolving] = useState<AdminDispute | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const status = tab === "all" ? "" : tab;
    const res = await fetch(`/api/admin/disputes?status=${status}`);
    if (res.ok) setDisputes((await res.json()).disputes ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-semibold mb-1">Admin</p>
        <h1 className="text-[28px] font-bold leading-tight text-slate-900">Disputes</h1>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-slate-200 rounded-xl p-1 bg-white mb-4 max-w-sm">
        {(["open", "resolved", "rejected", "all"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer capitalize",
              tab === t ? "bg-[#E85A2C]/10 text-[#E85A2C]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[13px] text-slate-500 py-8 text-center">Loading…</div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <MessageSquare className="w-8 h-8 text-slate-400" />
          <p className="text-[13px] text-slate-500">No disputes in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.open;
            const StatusIcon = cfg.icon;
            return (
              <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{d.clients?.business_name ?? "Unknown client"}</p>
                    <p className="text-[11px] text-slate-500">{d.entity_type.replace(/_/g, " ")} · {fmtDate(d.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full", cfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <p className="text-[13px] font-display text-slate-800">{fmt(d.disputed_amount)}</p>
                  </div>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-3">{d.reason}</p>
                {d.resolution_notes && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 mb-3">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Resolution</p>
                    <p className="text-[13px] text-slate-500">{d.resolution_notes}</p>
                  </div>
                )}
                {d.status === "open" && (
                  <Button variant="secondary" size="sm" onClick={() => setResolving(d)} icon={<CheckCircle className="w-3.5 h-3.5" />}>
                    Resolve
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onDone={() => { setResolving(null); fetch_(); }}
        />
      )}
    </div>
  );
}
