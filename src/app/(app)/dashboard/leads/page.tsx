"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Download, X, Clock, Phone, Mail,
  MessageSquare, ArrowLeft, Loader2, AlertTriangle,
  CheckCircle2, Flame, Copy, Check, Zap, Calendar, Star,
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
  role: "assistant" | "customer" | "owner";
  content: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVisitorPlaceholder(phone: string | null | undefined): boolean {
  if (!phone) return true;
  return (
    phone.startsWith("vid_") ||
    phone === "web_visitor" ||
    phone === "visitor" ||
    phone === "unknown" ||
    phone.length > 25
  );
}

function getDisplayName(lead: Lead): string {
  if (lead.customer_name) return lead.customer_name;
  if (!isVisitorPlaceholder(lead.customer_phone)) return lead.customer_phone;
  return "New visitor";
}

function getDisplayPhone(lead: Lead): string | null {
  if (!lead.customer_phone || isVisitorPlaceholder(lead.customer_phone)) return null;
  return lead.customer_phone;
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new:           { label: "New",       cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  lead:          { label: "New",       cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  confirmed:     { label: "Confirmed", cls: "bg-green-500/10 text-green-700 border-green-500/20" },
  no_show:       { label: "No-show",   cls: "bg-warning/10 text-warning border-warning/20" },
  closed:        { label: "Done",      cls: "bg-ink/[0.05] text-ink-500 border-ink/[0.08]" },
  escalated:     { label: "Needs you", cls: "bg-danger/10 text-danger border-danger/20" },
  suggest_other: { label: "Suggest",   cls: "bg-ink/[0.05] text-ink-500 border-ink/[0.08]" },
};

const FILTER_STATUSES = ["new", "confirmed", "no_show", "closed", "escalated"];

// ─── Next steps ───────────────────────────────────────────────────────────────

type NextStep = { icon: React.ReactNode; action: string; detail: string };

const NEXT_STEPS: Record<string, NextStep> = {
  new:       { icon: <Phone className="w-3.5 h-3.5" />,        action: "Call or text them",  detail: "Reach out while they're still warm" },
  lead:      { icon: <Phone className="w-3.5 h-3.5" />,        action: "Call or text them",  detail: "Reach out while they're still warm" },
  escalated: { icon: <Zap className="w-3.5 h-3.5" />,          action: "Respond urgently",   detail: "This lead needs your personal attention" },
  confirmed: { icon: <Calendar className="w-3.5 h-3.5" />,     action: "Show up on time",    detail: "Add to calendar and confirm the day before" },
  no_show:   { icon: <MessageSquare className="w-3.5 h-3.5" />, action: "Follow up",          detail: "Send a quick message to reschedule" },
  closed:    { icon: <Star className="w-3.5 h-3.5" />,          action: "Request a review",   detail: "Ask them to leave a Google review" },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const displayName = getDisplayName(lead);
  const displayPhone = getDisplayPhone(lead);
  const initial = displayName.charAt(0).toUpperCase();
  const avatarCls = avatarColor(displayName);
  const s = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
  const isNew = lead.status === "new" || lead.status === "lead";
  const isDone = lead.status === "closed";

  const waPhone = displayPhone ? displayPhone.replace(/[^0-9]/g, "").replace(/^0/, "27") : null;
  const waLink = waPhone
    ? `https://wa.me/${waPhone}?text=Hi+${encodeURIComponent(displayName)}%2C+thanks+for+reaching+out!`
    : null;

  useEffect(() => {
    supabase
      .from("messages_log")
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

  async function copyPhone() {
    if (!displayPhone) return;
    await navigator.clipboard.writeText(displayPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col lg:h-full bg-white border-l border-ink/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-small font-bold text-white", avatarCls)}>
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-small font-semibold text-ink">{displayName}</p>
              {lead.booking_intent && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-ember/10 text-ember border border-ember/20">
                  <Flame className="w-2.5 h-2.5" /> Hot
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", s.cls)}>
                {s.label}
              </span>
              <p className="text-tiny text-ink-400">{timeAgo(lead.created_at)}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-ink/[0.05] text-ink-400 hover:text-ink transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto">
        {/* Lead summary — clean, no box title */}
        <div className="px-5 pt-4 pb-3 border-b border-ink/[0.06]">
          {(lead.job_type || lead.area || lead.preferred_time) && (
            <p className="text-body font-semibold text-ink leading-snug">
              {[lead.job_type, lead.area && `in ${lead.area}`].filter(Boolean).join(" ")}
            </p>
          )}
          {lead.preferred_time && (
            <p className="text-tiny text-ink-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 shrink-0" /> Available {lead.preferred_time}
            </p>
          )}
          <p className="text-tiny text-ink-300 mt-1">Captured {formatDateTime(lead.created_at)}</p>
        </div>

        {/* Contact action buttons */}
        <div className="px-5 py-4 border-b border-ink/[0.06]">
          {displayPhone ? (
            <div className="space-y-2">
              <a
                href={`tel:${displayPhone}`}
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-ink text-white text-small font-semibold hover:bg-ink/90 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" /> Call {displayPhone}
              </a>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[#25D366] text-white text-small font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {lead.customer_email && (
                <a
                  href={`mailto:${lead.customer_email}`}
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-ink/[0.12] text-ink text-small font-medium hover:bg-ink/[0.03] transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-ink-400" /> {lead.customer_email}
                </a>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <p className="text-tiny text-ink-400 flex-1">{displayPhone}</p>
                <button
                  type="button"
                  onClick={copyPhone}
                  className="flex items-center gap-1 text-tiny text-ink-400 hover:text-ink transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-tiny text-ink-300 flex items-center gap-2 italic">
                <Phone className="w-3.5 h-3.5 shrink-0" /> Phone not captured yet
              </p>
              {lead.customer_email && (
                <a
                  href={`mailto:${lead.customer_email}`}
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-ink/[0.12] text-ink text-small font-medium hover:bg-ink/[0.03] transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-ink-400" /> {lead.customer_email}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Primary status CTA */}
        <div className="px-5 py-4 border-b border-ink/[0.06] space-y-2">
          {!isDone && (
            <button
              type="button"
              onClick={() => updateStatus("closed")}
              disabled={statusUpdating}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-green-600 text-white text-small font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {statusUpdating ? "Saving…" : "Mark as done"}
            </button>
          )}
          <div className="flex gap-2">
            {isNew && (
              <button
                type="button"
                onClick={() => updateStatus("confirmed")}
                disabled={statusUpdating}
                className="flex-1 h-9 rounded-xl border border-green-600/40 text-green-700 text-tiny font-semibold hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                Confirm booking
              </button>
            )}
            {lead.status === "confirmed" && (
              <button
                type="button"
                onClick={() => updateStatus("no_show")}
                disabled={statusUpdating}
                className="flex-1 h-9 rounded-xl border border-ink/[0.12] text-ink-500 text-tiny font-semibold hover:bg-ink/[0.04] transition-colors cursor-pointer disabled:opacity-60"
              >
                No-show
              </button>
            )}
            {!isDone && (
              <button
                type="button"
                onClick={() => updateStatus("escalated")}
                disabled={statusUpdating}
                className={cn(
                  "h-9 rounded-xl border text-tiny font-semibold transition-colors cursor-pointer disabled:opacity-60",
                  isNew ? "flex-1" : "flex-1",
                  lead.status === "escalated"
                    ? "bg-danger/10 text-danger border-danger/20"
                    : "border-ink/[0.12] text-ink-500 hover:bg-ink/[0.04]"
                )}
              >
                Needs you
              </button>
            )}
            {isDone && (
              <button
                type="button"
                onClick={() => updateStatus("new")}
                disabled={statusUpdating}
                className="flex-1 h-9 rounded-xl border border-ink/[0.12] text-ink-500 text-tiny font-semibold hover:bg-ink/[0.04] transition-colors cursor-pointer disabled:opacity-60"
              >
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* Conversation — collapsed by default */}
        <div className="border-t border-ink/[0.06]">
          <button
            type="button"
            onClick={() => setChatOpen((o) => !o)}
            className="flex items-center justify-between w-full px-5 py-3 text-tiny text-ink-400 font-medium hover:bg-ink/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Conversation
              {messages.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-ink/[0.07] text-[10px] font-bold text-ink-500">
                  {messages.length}
                </span>
              )}
            </span>
            <span className="text-ink-300">{chatOpen ? "▴" : "▾"}</span>
          </button>
          {chatOpen && (
            <div className="px-5 pb-5">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-tiny text-ink-400 py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              ) : messages.length === 0 ? (
                <p className="text-tiny text-ink-300 italic py-3">No messages yet</p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-small leading-relaxed",
                        msg.role === "assistant"
                          ? "bg-ink/[0.05] text-ink rounded-tl-sm mr-auto"
                          : msg.role === "owner"
                          ? "bg-ink text-white rounded-tr-sm ml-auto"
                          : "bg-brand/10 text-ink rounded-tr-sm ml-auto"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const tier = resolvePlan(client?.plan);
  const config = PLAN_CONFIG[tier];
  const canExport = config.csvExport;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("conversations")
      .select(
        "id,customer_name,customer_phone,customer_email,job_type,status,created_at,updated_at,preferred_time,area,booking_intent"
      )
      .eq("is_lead", true)
      .order("created_at", { ascending: false })
      .limit(200);

    // "lead" is the initial status set by the chat route; treat it as "new"
    if (statusFilter === "new") {
      q = q.in("status", ["new", "lead"]);
    } else if (statusFilter !== "all") {
      q = q.eq("status", statusFilter);
    }

    const { data, error } = await q;
    if (error) console.error("[leads] query error:", error.message);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  function handleStatusChange(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  async function exportCSV() {
    setExportLoading(true);
    try {
      const rows = leads.map((l) => ({
        Name: getDisplayName(l),
        Phone: getDisplayPhone(l) ?? "",
        Email: l.customer_email ?? "",
        Need: l.job_type ?? "",
        Area: l.area ?? "",
        "Preferred time": l.preferred_time ?? "",
        Status: STATUS_CONFIG[l.status]?.label ?? l.status,
        "Booking intent": l.booking_intent ? "Yes" : "No",
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
        {(["all", ...FILTER_STATUSES] as string[]).map((st) => (
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
        style={selectedLead && !isMobile ? { height: "calc(100vh - 280px)", maxHeight: "calc(100vh - 280px)" } : {}}
      >
        {/* Table — hidden on mobile when panel is open */}
        <div className={cn("bg-white", selectedLead ? "hidden lg:block lg:overflow-y-auto" : "")}>
          {/* Column headers */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_140px_160px_90px] gap-4 px-5 py-3 bg-ink/[0.02] border-b border-ink/[0.06] text-tiny font-semibold text-ink-400 uppercase tracking-wider">
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
              const displayName = getDisplayName(lead);
              const displayPhone = getDisplayPhone(lead);
              const initial = displayName.charAt(0).toUpperCase();
              const avatarCls = avatarColor(displayName);

              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? null : lead.id;
                    setSelectedId(next);
                    router.replace(
                      `/dashboard/leads${next ? `?id=${next}` : ""}`,
                      { scroll: false }
                    );
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 sm:gap-0 sm:grid sm:grid-cols-[1fr_140px_160px_90px] px-5 py-4 border-b border-ink/[0.05] transition-colors duration-150 cursor-pointer text-left",
                    isSelected ? "bg-brand/[0.04]" : "hover:bg-ink/[0.02]"
                  )}
                >
                  {/* Lead cell */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-small font-bold text-white", avatarCls)}>
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-small font-semibold text-ink truncate">{displayName}</p>
                        {lead.booking_intent && <Flame className="w-3 h-3 text-ember shrink-0" />}
                      </div>
                      <p className="text-tiny text-ink-400 truncate">
                        {displayPhone ?? timeAgo(lead.created_at)}
                        {lead.area ? ` · ${lead.area}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Need */}
                  <div className="hidden sm:block text-tiny truncate pr-2">
                    {lead.job_type
                      ? <span className="text-ink-500">{lead.job_type}</span>
                      : <span className="text-ink-300">—</span>
                    }
                  </div>

                  {/* Preferred time */}
                  <div className="hidden sm:flex items-center gap-1 text-tiny pr-2">
                    {lead.preferred_time ? (
                      <>
                        <Clock className="w-3 h-3 shrink-0 text-ink-300" />
                        <span className="text-ink-400">{lead.preferred_time}</span>
                      </>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
                    <span className={cn("px-2.5 py-1 rounded-lg text-tiny font-semibold border inline-block", s.cls)}>
                      {s.label}
                    </span>
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
