"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Download, X, Clock, Phone, Mail,
  MessageSquare, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Flame,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { resolvePlan, PLAN_CONFIG } from "@/lib/plan";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  job_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  preferred_time: string | null;
  area: string | null;
  booking_intent: boolean | null;
}

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new:       { label: "New",       cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  confirmed: { label: "Confirmed", cls: "bg-green-500/10 text-green-700 border-green-500/20" },
  no_show:   { label: "No-show",   cls: "bg-warning/10 text-warning border-warning/20" },
  closed:    { label: "Done",      cls: "bg-ink/[0.05] text-ink-500 border-ink/[0.08]" },
  escalated: { label: "Needs you", cls: "bg-danger/10 text-danger border-danger/20" },
};

const ALL_STATUSES = ["new", "confirmed", "no_show", "closed", "escalated"];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-ink/[0.05]">
      <div className="w-8 h-8 rounded-full bg-ink/[0.07] animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 bg-ink/[0.07] rounded animate-pulse" />
        <div className="h-2.5 w-24 bg-ink/[0.05] rounded animate-pulse" />
      </div>
      <div className="h-5 w-16 rounded-lg bg-ink/[0.05] animate-pulse" />
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  lead,
  onClose,
  onStatusChange,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    setMessagesLoading(true);
    supabase
      .from("messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", lead.id)
      .order("created_at")
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setMessagesLoading(false);
      });
  }, [lead.id]);

  async function updateStatus(status: string) {
    setStatusUpdating(true);
    await supabase.from("conversations").update({ status }).eq("id", lead.id);
    setStatusUpdating(false);
    onStatusChange(lead.id, status);
  }

  const s = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;

  return (
    <div className="flex flex-col h-full bg-white border-l border-ink/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ink/[0.07] border border-ink/[0.08] flex items-center justify-center text-small font-semibold text-ink-500">
            {(lead.customer_name ?? lead.customer_phone).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-small font-semibold text-ink">
              {lead.customer_name ?? "Unknown visitor"}
            </p>
            <p className="text-tiny text-ink-400">{timeAgo(lead.created_at)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-ink/[0.05] text-ink-400 hover:text-ink transition-colors cursor-pointer"
          aria-label="Close detail panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contact details */}
      <div className="px-5 py-4 border-b border-ink/[0.06] shrink-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className={cn("px-2.5 py-1 rounded-lg text-tiny font-semibold border", s.cls)}>
            {s.label}
          </span>
          {lead.booking_intent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-tiny font-semibold border bg-ember/10 text-ember border-ember/20">
              <Flame className="w-3 h-3" /> Booking intent
            </span>
          )}
          {lead.job_type && (
            <span className="px-2.5 py-1 rounded-lg text-tiny font-medium bg-ink/[0.05] text-ink-500 border border-ink/[0.08]">
              {lead.job_type}
            </span>
          )}
        </div>
        <div className="space-y-1.5 pt-1">
          {lead.customer_phone && (
            <a href={`tel:${lead.customer_phone}`} className="flex items-center gap-2 text-tiny text-ink-600 hover:text-ink transition-colors cursor-pointer">
              <Phone className="w-3.5 h-3.5 shrink-0" /> {lead.customer_phone}
            </a>
          )}
          {lead.customer_email && (
            <a href={`mailto:${lead.customer_email}`} className="flex items-center gap-2 text-tiny text-ink-600 hover:text-ink transition-colors cursor-pointer">
              <Mail className="w-3.5 h-3.5 shrink-0" /> {lead.customer_email}
            </a>
          )}
          {lead.area && (
            <p className="text-tiny text-ink-400">Area: {lead.area}</p>
          )}
          {lead.preferred_time && (
            <p className="flex items-center gap-1.5 text-tiny text-ink-400">
              <Clock className="w-3.5 h-3.5 shrink-0" /> Preferred: {lead.preferred_time}
            </p>
          )}
          <p className="text-tiny text-ink-400">Captured {formatDateTime(lead.created_at)}</p>
        </div>
      </div>

      {/* Status actions */}
      <div className="px-5 py-3 border-b border-ink/[0.06] shrink-0">
        <p className="text-tiny text-ink-400 font-medium mb-2">Update status</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((st) => {
            const cfg = STATUS_CONFIG[st];
            return (
              <button
                key={st}
                type="button"
                onClick={() => updateStatus(st)}
                disabled={statusUpdating || lead.status === st}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-tiny font-semibold border transition-all duration-150 cursor-pointer disabled:cursor-default",
                  lead.status === st
                    ? cfg.cls
                    : "bg-transparent text-ink-400 border-ink/[0.08] hover:border-ink/[0.18] hover:text-ink"
                )}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-tiny text-ink-400 font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" /> Conversation
        </p>
        {messagesLoading ? (
          <div className="flex items-center gap-2 text-tiny text-ink-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-tiny text-ink-400 italic">No messages recorded.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-small leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-ink/[0.05] text-ink rounded-tl-sm mr-auto"
                    : "bg-brand/10 text-ink rounded-tr-sm ml-auto"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main leads content ───────────────────────────────────────────────────────

function LeadsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { client } = useClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [exportLoading, setExportLoading] = useState(false);

  const tier = resolvePlan(client?.plan);
  const config = PLAN_CONFIG[tier];
  const canExport = config.csvExport;

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function loadLeads() {
    setLoading(true);
    let q = supabase
      .from("conversations")
      .select("id,customer_name,customer_phone,customer_email,job_type,status,created_at,updated_at,preferred_time,area,booking_intent")
      .eq("is_lead", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) console.error("[leads] query error:", error.message, error.details);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }

  function handleStatusChange(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  async function exportCSV() {
    setExportLoading(true);
    try {
      const rows = leads.map((l) => ({
        Name: l.customer_name ?? "",
        Phone: l.customer_phone,
        Email: l.customer_email ?? "",
        Need: l.job_type ?? "",
        Area: l.area ?? "",
        "Preferred time": l.preferred_time ?? "",
        Status: l.status,
        Captured: formatDateTime(l.created_at),
      }));
      const header = Object.keys(rows[0] ?? {}).join(",");
      const body = rows
        .map((r) =>
          Object.values(r)
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      const blob = new Blob([header + "\n" + body], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qwikly-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Leads Inbox</h1>
          <p className="text-small text-ink-500 mt-0.5">Every visitor captured by your assistant</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport ? (
            <button
              type="button"
              onClick={exportCSV}
              disabled={exportLoading || leads.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white border border-ink/[0.12] text-small font-medium text-ink-600 hover:text-ink hover:border-ink/[0.22] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export CSV
            </button>
          ) : (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white border border-ink/[0.12] text-small font-medium text-ink-400 hover:text-ink hover:border-ink/[0.22] transition-all duration-150 cursor-pointer"
              title="Upgrade to Pro to export leads"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
              <span className="text-[10px] font-bold text-ember ml-1">Pro</span>
            </Link>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", ...ALL_STATUSES] as string[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-tiny font-medium transition-colors duration-150 cursor-pointer border",
              statusFilter === st
                ? "bg-ink text-paper border-ink"
                : "bg-white text-ink-500 border-ink/[0.10] hover:border-ink/[0.22] hover:text-ink"
            )}
          >
            {st === "all" ? "All" : STATUS_CONFIG[st]?.label ?? st}
          </button>
        ))}
      </div>

      {/* Table + detail panel */}
      <div
        className={cn(
          "rounded-2xl border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]",
          selectedLead ? "lg:grid lg:grid-cols-[1fr_380px]" : ""
        )}
        style={selectedLead ? { maxHeight: "calc(100vh - 280px)" } : {}}
      >
        {/* Table */}
        <div className={cn("bg-white", selectedLead ? "overflow-y-auto" : "")}>
          {/* Column headers */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_120px_140px_80px] gap-4 px-5 py-3 bg-ink/[0.02] border-b border-ink/[0.06] text-tiny font-semibold text-ink-400 uppercase tracking-wider">
            <span>Lead</span>
            <span>Need</span>
            <span>Preferred time</span>
            <span className="text-right">Status</span>
          </div>

          {loading ? (
            [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-ink/[0.05] flex items-center justify-center">
                <Users className="w-5 h-5 text-ink-300" />
              </div>
              <div>
                <p className="text-small font-medium text-ink">No leads yet</p>
                <p className="text-tiny text-ink-400 mt-1 max-w-xs leading-relaxed">
                  {statusFilter === "all"
                    ? "Once your widget captures a visitor, they'll appear here."
                    : `No leads with status "${STATUS_CONFIG[statusFilter]?.label ?? statusFilter}".`}
                </p>
              </div>
              {statusFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="text-tiny text-ember font-medium hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            leads.map((lead) => {
              const s = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
              const isSelected = selectedId === lead.id;
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? null : lead.id;
                    setSelectedId(next);
                    router.replace(`/dashboard/leads${next ? `?id=${next}` : ""}`, {
                      scroll: false,
                    });
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 sm:gap-0 sm:grid sm:grid-cols-[1fr_120px_140px_80px] px-5 py-4 border-b border-ink/[0.05] transition-colors duration-150 cursor-pointer text-left",
                    isSelected ? "bg-brand/[0.04]" : "hover:bg-ink/[0.02]"
                  )}
                >
                  {/* Lead cell */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-ink/[0.07] border border-ink/[0.08] flex items-center justify-center shrink-0 text-small font-semibold text-ink-500">
                      {(lead.customer_name ?? lead.customer_phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-semibold text-ink truncate">
                        {lead.customer_name ?? lead.customer_phone}
                      </p>
                      <p className="text-tiny text-ink-400 truncate">
                        {lead.customer_phone}
                        {lead.area ? ` · ${lead.area}` : ""}
                      </p>
                    </div>
                  </div>
                  {/* Need */}
                  <div className="hidden sm:block text-tiny text-ink-500 truncate pr-2">
                    {lead.job_type ?? "—"}
                  </div>
                  {/* Preferred time */}
                  <div className="hidden sm:flex items-center gap-1 text-tiny text-ink-400 pr-2">
                    {lead.preferred_time ? (
                      <><Clock className="w-3 h-3 shrink-0" /> {lead.preferred_time}</>
                    ) : "—"}
                  </div>
                  {/* Status */}
                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end gap-1.5">
                    <span className={cn("px-2.5 py-1 rounded-lg text-tiny font-semibold border inline-block", s.cls)}>
                      {s.label}
                    </span>
                    {lead.booking_intent && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-tiny font-semibold border bg-ember/10 text-ember border-ember/20">
                        <Flame className="w-3 h-3" /> Hot
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selectedLead && (
          <DetailPanel
            lead={selectedLead}
            onClose={() => {
              setSelectedId(null);
              router.replace("/dashboard/leads", { scroll: false });
            }}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Mobile: back link when panel open */}
      {selectedLead && (
        <div className="lg:hidden mt-4">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-2 text-small text-ember font-medium cursor-pointer hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to leads
          </button>
        </div>
      )}

      {/* Starter export prompt */}
      {!canExport && leads.length >= 5 && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-ember/[0.20] bg-ember/[0.04]">
          <AlertTriangle className="w-4 h-4 text-ember mt-0.5 shrink-0" />
          <p className="text-tiny text-ink-600 leading-relaxed">
            You have {leads.length} leads.{" "}
            <Link
              href="/dashboard/billing"
              className="font-semibold text-ember hover:underline cursor-pointer"
            >
              Upgrade to Pro
            </Link>{" "}
            to export your lead list as CSV.
          </p>
          <CheckCircle2 className="hidden" />
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsContent />
    </Suspense>
  );
}
