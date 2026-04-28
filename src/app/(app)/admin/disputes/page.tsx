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
  open:     { label: "Open",     color: "bg-warning/10 text-warning border border-warning/20",   icon: Clock },
  resolved: { label: "Resolved", color: "bg-success/10 text-success border border-success/20",   icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-danger/10 text-danger border border-danger/20",      icon: AlertTriangle },
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-line rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-h2 text-fg mb-1">Resolve dispute</h3>
        <p className="text-small text-fg-muted mb-1">{dispute.clients?.business_name}</p>
        <p className="text-tiny text-fg-subtle mb-5 leading-relaxed">{dispute.reason}</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-3">
            {(["resolved", "rejected"] as const).map(a => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-small font-medium border transition-all cursor-pointer capitalize",
                  action === a
                    ? a === "resolved" ? "bg-success/10 text-success border-success/30" : "bg-danger/10 text-danger border-danger/30"
                    : "bg-white/[0.03] text-fg-muted border-line"
                )}>
                {a}
              </button>
            ))}
          </div>
          {action === "resolved" && (
            <div>
              <label className="block text-small font-medium text-fg mb-1.5">Credit amount (ZAR, optional)</label>
              <input type="number" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                placeholder="Amount to credit back"
                className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-body text-fg placeholder:text-fg-faint outline-none focus:border-brand/40" />
            </div>
          )}
          <div>
            <label className="block text-small font-medium text-fg mb-1.5">Resolution notes</label>
            <textarea value={resolution} onChange={e => setResolution(e.target.value)} required rows={3}
              className="w-full bg-white/5 border border-line rounded-xl px-4 py-2.5 text-small text-fg placeholder:text-fg-faint outline-none focus:border-brand/40 resize-none"
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
        <p className="text-small text-brand font-medium mb-1">Admin</p>
        <h1 className="text-h1 text-fg">Disputes</h1>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border border-line rounded-xl p-1 bg-white/[0.02] mb-4 max-w-sm">
        {(["open", "resolved", "rejected", "all"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-small font-medium transition-colors cursor-pointer capitalize",
              tab === t ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
            )}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-small text-fg-muted py-8 text-center">Loading…</div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <MessageSquare className="w-8 h-8 text-fg-faint" />
          <p className="text-small text-fg-muted">No disputes in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.open;
            const StatusIcon = cfg.icon;
            return (
              <div key={d.id} className="bg-bg-card border border-line rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-small font-semibold text-fg">{d.clients?.business_name ?? "Unknown client"}</p>
                    <p className="text-tiny text-fg-muted">{d.entity_type.replace(/_/g, " ")} · {fmtDate(d.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("inline-flex items-center gap-1 text-tiny font-medium px-2.5 py-1 rounded-full", cfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <p className="text-small font-display text-fg">{fmt(d.disputed_amount)}</p>
                  </div>
                </div>
                <p className="text-small text-fg-muted leading-relaxed mb-3">{d.reason}</p>
                {d.resolution_notes && (
                  <div className="bg-white/[0.03] rounded-xl px-4 py-3 mb-3">
                    <p className="text-tiny text-fg-subtle uppercase tracking-wider mb-1">Resolution</p>
                    <p className="text-small text-fg-muted">{d.resolution_notes}</p>
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
