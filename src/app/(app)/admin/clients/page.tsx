"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Globe, MessageSquare, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { timeAgo } from "@/lib/format";

interface ClientRow {
  id: number;
  business_name: string | null;
  trade: string | null;
  owner_name: string | null;
  client_email: string | null;
  web_widget_domain: string | null;
  web_widget_status: string | null;
  onboarding_complete: boolean | null;
  created_at: string;
  conversation_count: number;
  last_activity: string | null;
}

function StatusBadge({ status, onboarding }: { status: string | null; onboarding: boolean | null }) {
  if (status === "verified") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
      <CheckCircle2 className="w-3 h-3" /> Live
    </span>
  );
  if (onboarding) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-medium">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-fg-faint text-[11px] font-medium">
      <AlertCircle className="w-3 h-3" /> Setup
    </span>
  );
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/clients")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setClients(d.clients); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.business_name?.toLowerCase().includes(q) ||
      c.trade?.toLowerCase().includes(q) ||
      c.owner_name?.toLowerCase().includes(q) ||
      c.client_email?.toLowerCase().includes(q) ||
      c.web_widget_domain?.toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-small text-brand font-medium mb-1">Admin</p>
        <h1 className="text-h1 text-fg">Clients</h1>
        <p className="text-small text-fg-muted mt-1">{clients.length} businesses onboarded</p>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-line bg-bg-card text-small text-fg placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.03] border border-line animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-fg-muted text-small">
          {clients.length === 0 ? "No clients yet." : "No matches."}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-bg-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_100px_100px_40px] gap-4 px-5 py-3 border-b border-line">
            <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold">Business</p>
            <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold">Status</p>
            <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold text-right">Convos</p>
            <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold text-right">Last active</p>
            <span />
          </div>

          {filtered.map((c, i) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className={`grid grid-cols-[1fr_120px_100px_100px_40px] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer group ${i > 0 ? "border-t border-line" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-small font-semibold text-fg truncate">{c.business_name ?? "Unnamed"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.trade && <p className="text-tiny text-fg-muted truncate">{c.trade}</p>}
                  {c.web_widget_domain && (
                    <span className="flex items-center gap-1 text-tiny text-fg-faint">
                      <Globe className="w-3 h-3" />
                      {c.web_widget_domain}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <StatusBadge status={c.web_widget_status} onboarding={c.onboarding_complete} />
              </div>

              <div className="flex items-center justify-end gap-1 text-small text-fg-muted">
                <MessageSquare className="w-3.5 h-3.5" />
                {c.conversation_count.toLocaleString()}
              </div>

              <p className="text-tiny text-fg-faint text-right">
                {c.last_activity ? timeAgo(c.last_activity) : "—"}
              </p>

              <ChevronRight className="w-4 h-4 text-fg-faint group-hover:text-brand transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
