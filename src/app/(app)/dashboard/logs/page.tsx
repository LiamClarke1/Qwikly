"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, X, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import {
  ConversationRow,
  type LogConversation,
} from "./_components/ConversationRow";

// ── Types ────────────────────────────────────────────────────────────────────

type SentimentFilter = "all" | "positive" | "neutral" | "negative";

// ── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(rows: LogConversation[]) {
  const headers = [
    "id",
    "visitor",
    "channel",
    "page_url",
    "timestamp",
    "message_count",
    "lead_captured",
    "sentiment",
    "status",
  ];

  const escape = (v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const count =
        Array.isArray(r.messages_log) && r.messages_log.length > 0
          ? (r.messages_log[0] as { count: number }).count
          : 0;
      return [
        escape(r.id),
        escape(r.customer_phone ?? r.visitor_id ?? "anonymous"),
        escape(r.channel ?? "whatsapp"),
        escape(r.page_url),
        escape(r.created_at),
        escape(count),
        escape(r.lead_captured ? "yes" : "no"),
        escape(r.sentiment ?? ""),
        escape(r.status ?? ""),
      ].join(",");
    }),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `qwikly-logs-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const { client, loading: clientLoading } = useClient();

  const [conversations, setConversations] = useState<LogConversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [leadsOnly, setLeadsOnly] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");
  const [search, setSearch] = useState("");

  // Load conversations
  useEffect(() => {
    if (clientLoading || !client) return;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages_log(count)")
        .eq("client_id", client.id)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setConversations(data as LogConversation[]);
      }
      setLoading(false);
    })();
  }, [client, clientLoading]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = conversations;

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((c) => new Date(c.created_at).getTime() >= from);
    }
    if (dateTo) {
      // include the full end day
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((c) => new Date(c.created_at).getTime() <= to.getTime());
    }
    if (leadsOnly) {
      list = list.filter((c) => c.lead_captured === true);
    }
    if (sentiment !== "all") {
      list = list.filter((c) => c.sentiment === sentiment);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.customer_phone ?? "").toLowerCase().includes(q) ||
          (c.visitor_id ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, dateFrom, dateTo, leadsOnly, sentiment, search]);

  const SENTIMENT_OPTIONS: { value: SentimentFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "positive", label: "Positive" },
    { value: "neutral", label: "Neutral" },
    { value: "negative", label: "Negative" },
  ];

  const hasFilters =
    dateFrom || dateTo || leadsOnly || sentiment !== "all" || search.trim();

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setLeadsOnly(false);
    setSentiment("all");
    setSearch("");
  };

  return (
    <>
      <PageHeader
        title="Conversation Logs"
        description="Browse, filter, and review every conversation transcript."
        actions={
          <button
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold bg-ember text-white hover:bg-ember/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        }
      />

      {/* Filter bar */}
      <div className="rounded-2xl border border-ink/[0.08] shadow-sm bg-white px-4 py-3 mb-4 flex flex-wrap gap-3 items-end">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2 rounded-lg border border-ink/[0.12] text-[12px] text-ink bg-white outline-none focus:border-ember/60 transition-colors cursor-pointer num"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2 rounded-lg border border-ink/[0.12] text-[12px] text-ink bg-white outline-none focus:border-ember/60 transition-colors cursor-pointer num"
            />
          </div>
        </div>

        {/* Leads only */}
        <button
          onClick={() => setLeadsOnly((v) => !v)}
          className={cn(
            "h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors cursor-pointer",
            leadsOnly
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-white text-ink-500 border-ink/[0.12] hover:border-ink/30"
          )}
        >
          Leads only
        </button>

        {/* Sentiment pills */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-ink-400 shrink-0" />
          {SENTIMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSentiment(opt.value)}
              className={cn(
                "h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer",
                sentiment === opt.value
                  ? "bg-ember text-white"
                  : "bg-slate-100 text-ink-500 hover:bg-slate-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-ink/[0.12] bg-white flex-1 min-w-[160px] focus-within:border-ember/60 transition-colors">
          <Search className="w-3.5 h-3.5 text-ink-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Phone or visitor ID…"
            className="flex-1 bg-transparent outline-none text-[12px] text-ink placeholder:text-ink-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-ink-400 hover:text-ink cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-ink-400 hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-[11px] text-ink-400 mb-2 px-1">
        {loading ? "Loading…" : `${filtered.length} conversation${filtered.length !== 1 ? "s" : ""}`}
        {conversations.length > 0 && filtered.length !== conversations.length && (
          <span className="text-ink-400"> of {conversations.length}</span>
        )}
      </p>

      {/* Table header */}
      <div className="rounded-2xl border border-ink/[0.08] shadow-sm bg-white overflow-hidden">
        {/* Column headers */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-ink/[0.06] bg-slate-50/60">
          <div className="w-5 shrink-0" />
          <div className="w-24 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Channel
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Visitor / Phone
            </span>
          </div>
          <div className="w-24 shrink-0 text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              When
            </span>
          </div>
          <div className="w-12 shrink-0 text-center hidden md:block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Msgs
            </span>
          </div>
          <div className="w-8 shrink-0 text-center hidden md:flex justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Lead
            </span>
          </div>
          <div className="w-24 shrink-0 hidden lg:block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Sentiment
            </span>
          </div>
          <div className="w-20 shrink-0 hidden lg:block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Status
            </span>
          </div>
        </div>

        {/* Rows */}
        {loading || clientLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-ink-400" />
            </div>
            <p className="text-sm font-semibold text-ink">
              {hasFilters ? "No conversations match your filters" : "No conversations yet"}
            </p>
            <p className="text-[12px] text-ink-400 mt-1 max-w-xs">
              {hasFilters
                ? "Try adjusting the date range, sentiment filter, or search."
                : "Conversations will appear here once your digital assistant starts chatting."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-[12px] font-semibold text-ember hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((convo) => (
              <ConversationRow key={convo.id} convo={convo} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
