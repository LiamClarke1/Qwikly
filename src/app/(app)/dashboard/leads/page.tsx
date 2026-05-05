"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Download, X, Clock, Phone, Mail,
  MessageSquare, ArrowLeft, Loader2, AlertTriangle,
  CheckCircle2, Flame, Copy, Check, Zap, Calendar, Star,
  Search, StickyNote, User, Banknote, Bell,
  ChevronDown, ChevronUp, ExternalLink, Trash2,
  AlertCircle, History, TrendingUp, Sparkles, Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient, ClientRow } from "@/lib/use-client";
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
  job_value: number | null;
  closed_reason: string | null;
  appointment_at: string | null;
  follow_up_at: string | null;
  assigned_to: string | null;
}

interface Message {
  id: string;
  role: "assistant" | "customer" | "owner";
  content: string;
  created_at: string;
}

interface Note {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
}

interface PastJob {
  id: string;
  job_type: string | null;
  status: string;
  created_at: string;
  area: string | null;
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

function getLeadAgeMinutes(lead: Lead): number {
  return Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 60000);
}

function isLeadOverdue(lead: Lead): boolean {
  if (lead.status !== "new" && lead.status !== "lead") return false;
  return getLeadAgeMinutes(lead) > 1440;
}

function getAgeColor(lead: Lead): string {
  if (lead.status === "closed") return "text-ink-300";
  const mins = getLeadAgeMinutes(lead);
  if (mins < 60) return "text-green-600";
  if (mins < 1440) return "text-amber-600";
  return "text-red-500";
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case "new":
    case "lead": return "border-l-blue-500";
    case "confirmed": return "border-l-green-500";
    case "escalated": return "border-l-red-500";
    case "no_show": return "border-l-amber-500";
    case "closed": return "border-l-ink/20";
    default: return "border-l-ink/20";
  }
}

const PHYSICAL_TRADES = new Set([
  "electrician", "plumber", "plumbing", "roofer", "roofing",
  "solar installer", "solar", "pest control", "pest", "aircon", "hvac",
  "aircon / hvac", "pool cleaning", "pool", "landscaper", "landscaping",
  "garage doors", "security", "painter", "painting", "carpenter",
  "carpentry", "tiler", "tiling", "handyman",
]);

function isPhysicalTrade(trade: string | null | undefined): boolean {
  if (!trade) return false;
  return PHYSICAL_TRADES.has(trade.toLowerCase().trim());
}

// Broad profession word list for fuzzy matching — covers trades, services, and common job titles
const PROFESSION_WORDS = [
  // Trades
  "electrician", "electrical", "electricity",
  "plumber", "plumbing",
  "roofer", "roofing",
  "solar", "installer",
  "landscaper", "landscaping",
  "security",
  "painter", "painting",
  "carpenter", "carpentry",
  "handyman",
  "tiler", "tiling",
  "cleaner", "cleaning",
  "contractor",
  "aircon",
  "mechanic", "welder", "welding",
  "bricklayer", "plasterer", "glazier",
  "locksmith", "plasterboard",
  // Service / hospitality
  "hairdresser", "hairstylist", "barber", "beautician",
  "chef", "cook", "waiter", "waitress",
  "driver", "courier",
  "technician", "operator",
  // Healthcare
  "nurse", "doctor", "dentist", "therapist", "pharmacist",
  // Professional / office
  "manager", "director", "supervisor", "administrator",
  "consultant", "accountant", "auditor", "bookkeeper",
  "lawyer", "attorney", "solicitor",
  "teacher", "lecturer", "trainer",
  "engineer", "developer", "designer", "programmer",
  "analyst", "advisor", "coordinator",
  // Generic / placeholder
  "customer", "client", "visitor", "resident",
  "owner", "boss", "worker", "employee", "staff",
  "test", "testing", "admin", "user", "person",
  "anonymous", "unknown", "noname",
];

// Exact-match non-name words (too short for safe fuzzy matching)
const NON_NAME_EXACT = new Set([
  "n/a", "na", "none", "null", "nil", "no", "yes",
  "test", "admin", "user", "owner", "boss", "staff",
  "me", "self", "them", "this",
]);

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function looksLikeProfession(word: string): boolean {
  if (word.length < 5) return false;
  // Allow 1 edit for words ≤7 chars, 2 edits for longer
  const maxDist = word.length <= 7 ? 1 : 2;
  return PROFESSION_WORDS.some(t => t.length >= 4 && levenshtein(word, t) <= maxDist);
}

// Keep the narrower trade check for determining NEXT STEP style
function looksLikeTrade(word: string): boolean {
  if (word.length < 5) return false;
  if (PHYSICAL_TRADES.has(word)) return true;
  const maxDist = word.length <= 7 ? 1 : 2;
  const TRADE_WORDS = [
    "electrician","electrical","electricity","plumber","plumbing",
    "roofer","roofing","solar","installer","landscaper","landscaping",
    "security","painter","painting","carpenter","carpentry",
    "handyman","tiler","tiling","cleaner","cleaning","contractor","aircon",
  ];
  return TRADE_WORDS.some(t => t.length >= 4 && levenshtein(word, t) <= maxDist);
}

function sanitizeLeadName(name: string | null, jobType: string | null): string {
  if (!name) return "them";
  const lname = name.toLowerCase().trim();
  const ljob = jobType ? jobType.toLowerCase().trim() : "";

  // Exact non-name words
  if (NON_NAME_EXACT.has(lname)) return "them";
  // Phone number pattern
  if (/^[\d\s+\-().]{7,}$/.test(lname)) return "them";
  // Email address
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lname)) return "them";
  // All digits
  if (/^\d+$/.test(lname)) return "them";
  // Single word — fuzzy profession check
  if (!lname.includes(" ") && looksLikeProfession(lname)) return "them";
  // Matches job type closely (any business type, not just trades)
  if (ljob) {
    const jobWords = ljob.split(/\s+/);
    if (lname === ljob || jobWords.some(w => w.length >= 4 && levenshtein(lname, w) <= 1)) return "them";
  }
  return name.split(" ")[0];
}

function getNextStep(lead: Lead, client: ClientRow | null): string {
  const mins = getLeadAgeMinutes(lead);
  const clientTrade = client?.trade ?? null;
  const isTradeService = isPhysicalTrade(clientTrade);
  const name = sanitizeLeadName(lead.customer_name, lead.job_type);
  const job = lead.job_type ? lead.job_type.toLowerCase() : (clientTrade?.toLowerCase() ?? "the work");
  const area = lead.area ? ` in ${lead.area}` : "";
  const timeHint = lead.preferred_time ? ` They mentioned ${lead.preferred_time} works for them.` : "";

  if (isTradeService) {
    switch (lead.status) {
      case "closed":
        return `The ${job} job for ${name} is done. Now is the best time to ask for a Google review while the experience is still fresh. Send: "Hi ${name}, really appreciate you choosing us. If you were happy with the ${job}, a quick Google review would mean the world. Takes 30 seconds."`;
      case "escalated":
        return `${name} has flagged an issue with the ${job}${area}. Put everything else down and call them personally right now. Don't text first, call. Say: "I saw there was a problem, I want to sort this out for you today."`;
      case "confirmed":
        return `${name}'s ${job} booking${area} is confirmed.${timeHint} Message the day before to confirm you're coming. Show up on time, do great work, and ask for a review on the day.`;
      case "no_show":
        return `${name} missed the ${job} appointment${area}. Send: "Hey ${name}, we missed each other earlier. When can I come back? Are you free tomorrow or later this week?" Assume yes and ask when.`;
      default:
        if (mins < 15) return `${name} just enquired about ${job}${area}. Call them right now while they're still on their phone. If no answer, send immediately: "Hi ${name}, just saw your message about the ${job}. When can I come have a look? Are you free today?" Assume they want you. Ask when, not if.`;
        if (mins < 60) return `${name} asked about ${job}${area} less than an hour ago and is almost certainly still deciding.${timeHint} Send now: "Hi ${name}, when can I come check it out for you? Today or tomorrow works for me."`;
        if (mins < 1440) return `${name} asked about ${job}${area} earlier today. Move fast.${timeHint} Send: "Hi ${name}, when can I come have a look at the ${job}? I have time today and tomorrow, what works for you?"`;
        return `${name} asked about ${job}${area} ${timeAgo(lead.created_at)} with no follow-up yet. Send: "Hi ${name}, I still have availability this week for the ${job}. When would be a good time for me to come over?" If no reply within 24 hours, mark this one closed and move on.`;
    }
  } else {
    // Non-trade service — focus on onboarding / sign-up follow-up
    const leadContext = lead.job_type ? `, who is a ${lead.job_type.toLowerCase()},` : "";
    switch (lead.status) {
      case "closed":
        return `${name} has been marked closed. If you haven't made contact yet, try one last message: "Hey ${name}, just circling back — are you still interested in getting set up? Happy to help whenever you're ready."`;
      case "escalated":
        return `${name} has raised a concern. Reach out personally and address it directly: "Hey ${name}, I saw there was an issue — I want to make sure we sort this out for you."`;
      case "confirmed":
        return `${name} is confirmed and moving forward.${timeHint} Make sure the onboarding process is smooth. Check in: "Hey ${name}, just wanted to make sure everything is working properly for you — any questions?"`;
      case "no_show":
        return `${name} didn't complete the process. Follow up: "Hey ${name}, looks like we lost you somewhere along the way. Want to pick up where we left off? I can walk you through it."`;
      default:
        if (mins < 15) return `${name}${leadContext} just enquired. Reach out now while they're still warm. Send: "Hey ${name}, just saw your enquiry — are you ready to move forward and get set up? Happy to walk you through it right now."`;
        if (mins < 60) return `${name} enquired less than an hour ago.${timeHint} Follow up while they're still thinking about it. Send: "Hey ${name}, just following up on your enquiry — are you keen to move forward?"`;
        if (mins < 1440) return `${name} enquired earlier today. Still a good window to convert them.${timeHint} Send: "Hey ${name}, just checking in — did you get a chance to sign up? Takes two minutes and I can help you get started today."`;
        return `${name} enquired ${timeAgo(lead.created_at)} with no follow-up yet. Send one message: "Hey ${name}, just circling back — you showed interest earlier. Still keen to move forward? I'm happy to help whenever you're ready."`;
    }
  }
}

function buildConversationSummary(messages: Message[], lead: Lead, client: ClientRow | null): string {
  const clientTrade = client?.trade ?? null;
  const isTradeService = isPhysicalTrade(clientTrade);
  const name = sanitizeLeadName(lead.customer_name, lead.job_type);
  const displayName = name !== "them" ? name : "This lead";
  const job = lead.job_type ? lead.job_type.toLowerCase() : null;
  const area = lead.area ?? null;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[\d\s+\-().]{7,}$/;
  const urlRe = /https?:\/\/|www\./i;
  const confirmations = new Set([
    "yes", "yeah", "yep", "yup", "ok", "okay", "sure", "alright",
    "no", "nope", "hi", "hello", "hey", "thanks", "thank you",
    "great", "perfect", "good", "sounds good", "cool",
  ]);

  const customerMessages = messages.filter((m) => m.role === "customer");
  const meaningful = customerMessages.filter((m) => {
    const t = m.content.trim();
    const tl = t.toLowerCase();
    if (t.length < 12) return false;
    if (confirmations.has(tl)) return false;
    if (emailRe.test(t)) return false;
    if (phoneRe.test(t)) return false;
    if (urlRe.test(t)) return false;
    return true;
  });

  const parts: string[] = [];

  // Sentence 1 — Opening context
  const locationPart = area ? ` in ${area}` : "";
  if (isTradeService) {
    const jobDesc = job ?? "assistance";
    parts.push(`${displayName} came to you looking for ${jobDesc}${locationPart}.`);
  } else {
    const tradeContext = job ? `, a ${job},` : "";
    parts.push(`${displayName}${tradeContext} reached out to learn more about your service${locationPart}.`);
  }

  // Sentence 2 — Most descriptive message they sent
  const sorted = [...meaningful].sort((a, b) => b.content.length - a.content.length);
  if (sorted.length > 0) {
    const best = sorted[0];
    const excerpt = best.content.length > 200 ? best.content.slice(0, 200) + "…" : best.content;
    parts.push(`They said: "${excerpt}"`);
  } else if (customerMessages.length > 0) {
    const gathered: string[] = [];
    if (area) gathered.push(`their location (${area})`);
    if (lead.preferred_time) gathered.push(`availability (${lead.preferred_time})`);
    if (lead.customer_email) gathered.push("their email");
    if (gathered.length > 0) {
      parts.push(`Your assistant walked them through the conversation and captured ${gathered.join(", ")}.`);
    } else {
      parts.push(`They completed a ${messages.length}-message conversation with your assistant.`);
    }
  } else {
    parts.push("No conversation messages have been captured yet for this lead.");
  }

  // Sentence 3 — Second distinct message if available
  if (sorted.length > 1) {
    const second = sorted[1];
    if (second.content !== sorted[0].content) {
      const excerpt2 = second.content.length > 150 ? second.content.slice(0, 150) + "…" : second.content;
      parts.push(`They also mentioned: "${excerpt2}"`);
    }
  }

  // Sentence 4 — Captured details
  const details: string[] = [];
  if (lead.preferred_time) details.push(`available ${lead.preferred_time}`);
  if (lead.customer_email) details.push("provided their email");
  if (messages.length > 0) details.push(`${messages.length} messages exchanged in total`);
  if (details.length > 0) {
    parts.push(`Details on file: ${details.join(", ")}.`);
  }

  // Sentence 5 — Intent signal
  if (lead.booking_intent) {
    parts.push(isTradeService
      ? "They indicated they're ready to book. This one is warm."
      : "They indicated they're ready to move forward. This lead is warm."
    );
  } else if (customerMessages.length > 0) {
    parts.push("They completed the conversation but haven't confirmed intent yet.");
  }

  return parts.slice(0, 5).join(" ");
}

function buildFollowUpMessage(lead: Lead, name: string, client: ClientRow | null): string {
  const first = name.split(" ")[0];
  const trade = client?.trade ? client.trade.toLowerCase() : null;
  const job = lead.job_type ? lead.job_type.toLowerCase() : (trade ?? "this");
  const area = lead.area ? ` in ${lead.area}` : "";
  const timeHint = lead.preferred_time ? ` You mentioned ${lead.preferred_time}, does that still work?` : " Are you available today or tomorrow?";
  return `Hi ${first}, got your message about the ${job}${area}. When can I come have a look?${timeHint}`;
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
  no_show:       { label: "No-show",   cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  closed:        { label: "Done",      cls: "bg-ink/[0.05] text-ink-500 border-ink/[0.08]" },
  escalated:     { label: "Needs you", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  suggest_other: { label: "Suggest",   cls: "bg-ink/[0.05] text-ink-500 border-ink/[0.08]" },
};

const FILTER_STATUSES = ["new", "confirmed", "no_show", "closed", "escalated"];

const LOST_REASONS = [
  "Price too high",
  "Went elsewhere",
  "No response from customer",
  "Not ready yet",
  "Outside service area",
  "Other",
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-ink/[0.05] border-l-4 border-l-ink/10">
      <div className="w-9 h-9 rounded-full bg-ink/[0.07] animate-pulse shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="h-3.5 w-28 bg-ink/[0.07] rounded animate-pulse" />
        <div className="h-2.5 w-40 bg-ink/[0.05] rounded animate-pulse" />
        <div className="h-2.5 w-24 bg-ink/[0.04] rounded animate-pulse" />
      </div>
      <div className="h-5 w-14 rounded-lg bg-ink/[0.05] animate-pulse shrink-0" />
    </div>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  isSelected,
  isBulkChecked,
  onSelect,
  onBulkToggle,
}: {
  lead: Lead;
  isSelected: boolean;
  isBulkChecked: boolean;
  onSelect: () => void;
  onBulkToggle: () => void;
}) {
  const s = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
  const displayName = getDisplayName(lead);
  const displayPhone = getDisplayPhone(lead);
  const initial = displayName.charAt(0).toUpperCase();
  const avatarCls = avatarColor(displayName);
  const overdue = isLeadOverdue(lead);
  const ageColor = getAgeColor(lead);
  const borderColor = getStatusBorderColor(lead.status);
  const followUpDue = !!lead.follow_up_at && new Date(lead.follow_up_at) < new Date() && lead.status !== "closed";

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3.5 border-b border-ink/[0.05] border-l-[3px] transition-all duration-150 cursor-pointer",
        borderColor,
        isSelected ? "bg-brand/[0.05]" : "hover:bg-ink/[0.02]"
      )}
      onClick={onSelect}
    >
      {/* Bulk checkbox */}
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onBulkToggle(); }}
      >
        <input
          type="checkbox"
          checked={isBulkChecked}
          onChange={onBulkToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-3 h-3 rounded accent-ink cursor-pointer"
        />
      </div>

      {/* Avatar */}
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-small font-bold text-white mt-0.5", avatarCls)}>
        {initial}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-small font-semibold text-ink leading-tight">{displayName}</p>
          {lead.booking_intent && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-ember/10 text-ember border border-ember/20">
              <Flame className="w-2.5 h-2.5" /> Hot
            </span>
          )}
          {overdue && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
          {followUpDue && <Bell className="w-3 h-3 text-amber-500 shrink-0" />}
        </div>

        {/* Job need — the most important info */}
        {(lead.job_type || lead.area) && (
          <p className="text-tiny text-ink-600 font-medium mt-0.5 truncate">
            {[lead.job_type, lead.area && `· ${lead.area}`].filter(Boolean).join(" ")}
          </p>
        )}

        {/* Phone — visible directly */}
        {displayPhone && (
          <p className="text-[11px] text-ink-400 mt-0.5 font-mono">{displayPhone}</p>
        )}

        {/* Bottom row */}
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-[10px] font-medium", ageColor)}>{timeAgo(lead.created_at)}</span>
          {lead.preferred_time && (
            <span className="text-[10px] text-ink-300 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> {lead.preferred_time}
            </span>
          )}
          {lead.assigned_to && (
            <span className="text-[10px] text-ink-400 truncate max-w-[70px]">→ {lead.assigned_to}</span>
          )}
        </div>
      </div>

      {/* Status + value */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", s.cls)}>
          {s.label}
        </span>
        {lead.job_value ? (
          <span className="text-[10px] text-green-700 font-bold">R{lead.job_value.toLocaleString()}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  lead,
  client,
  onClose,
  onStatusChange,
  onLeadUpdate,
  isMobile,
}: {
  lead: Lead;
  client: ClientRow | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onLeadUpdate: (id: string, updates: Partial<Lead>) => void;
  isMobile: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [pastJobs, setPastJobs] = useState<PastJob[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const [jobValue, setJobValue] = useState(lead.job_value?.toString() ?? "");
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? "");
  const [followUpAt, setFollowUpAt] = useState(lead.follow_up_at ? lead.follow_up_at.slice(0, 16) : "");
  const [appointmentAt, setAppointmentAt] = useState(lead.appointment_at ? lead.appointment_at.slice(0, 16) : "");

  const [closingOpen, setClosingOpen] = useState(false);
  const [closingOutcome, setClosingOutcome] = useState<"won" | "lost">("won");
  const [closingReason, setClosingReason] = useState(LOST_REASONS[0]);
  const [closingValue, setClosingValue] = useState(lead.job_value?.toString() ?? "");

  const displayName = getDisplayName(lead);
  const displayPhone = getDisplayPhone(lead);
  const initial = displayName.charAt(0).toUpperCase();
  const avatarCls = avatarColor(displayName);
  const s = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
  const isNew = lead.status === "new" || lead.status === "lead";
  const isDone = lead.status === "closed";
  const overdue = isLeadOverdue(lead);
  const followUpOverdue = !!lead.follow_up_at && new Date(lead.follow_up_at) < new Date() && !isDone;
  const ageColor = getAgeColor(lead);

  const waPhone = displayPhone ? displayPhone.replace(/[^0-9]/g, "").replace(/^0/, "27") : null;
  const followUpMessage = buildFollowUpMessage(lead, displayName, client);
  const nextStep = getNextStep(lead, client);

  const reviewLink = client?.business_name
    ? `https://www.google.com/search?q=${encodeURIComponent(client.business_name + " reviews")}`
    : "https://www.google.com/maps";

  const waTemplates = waPhone ? [
    { label: "On my way", text: `Hi ${displayName.split(" ")[0]}, I am on my way and will be with you shortly!` },
    { label: "When works?", text: `Hi ${displayName.split(" ")[0]}, when can I come have a look? Are you available today or tomorrow?` },
    { label: "Reschedule", text: `Hi ${displayName.split(" ")[0]}, we missed each other. When can I come back? What time works for you this week?` },
  ] : [];

  const conversationSummary = buildConversationSummary(messages, lead, client);

  useEffect(() => {
    let alive = true;
    setMessages([]);
    setMessagesLoading(true);
    (async () => {
      const { data } = await supabase
        .from("messages_log")
        .select("id,role,content,created_at")
        .eq("conversation_id", lead.id)
        .order("created_at");
      if (alive) { setMessages((data as Message[]) ?? []); setMessagesLoading(false); }
    })();
    return () => { alive = false; };
  }, [lead.id]);

  useEffect(() => {
    let alive = true;
    setNotes([]);
    setNotesLoading(true);
    (async () => {
      const { data } = await supabase
        .from("lead_notes")
        .select("id,conversation_id,content,created_at")
        .eq("conversation_id", lead.id)
        .order("created_at", { ascending: false });
      if (alive) { setNotes((data as Note[]) ?? []); setNotesLoading(false); }
    })();
    return () => { alive = false; };
  }, [lead.id]);

  useEffect(() => {
    if (!displayPhone) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id,job_type,status,created_at,area")
        .eq("customer_phone", displayPhone)
        .neq("id", lead.id)
        .eq("is_lead", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (alive) setPastJobs((data as PastJob[]) ?? []);
    })();
    return () => { alive = false; };
  }, [lead.id, displayPhone]);

  async function updateStatus(status: string) {
    setStatusUpdating(true);
    await supabase.from("conversations").update({ status }).eq("id", lead.id);
    setStatusUpdating(false);
    onStatusChange(lead.id, status);
  }

  async function confirmClose() {
    setStatusUpdating(true);
    const reason = closingOutcome === "won" ? "won" : closingReason;
    const val = parseInt(closingValue);
    const updates: Record<string, unknown> = { status: "closed", closed_reason: reason };
    if (!isNaN(val) && val > 0) updates.job_value = val;
    await supabase.from("conversations").update(updates).eq("id", lead.id);
    setStatusUpdating(false);
    setClosingOpen(false);
    onStatusChange(lead.id, "closed");
    onLeadUpdate(lead.id, {
      closed_reason: reason,
      ...(updates.job_value !== undefined ? { job_value: updates.job_value as number } : {}),
    });
  }

  async function saveField(field: keyof Lead, value: string | number | null) {
    const v = value === "" ? null : value;
    await supabase.from("conversations").update({ [field]: v }).eq("id", lead.id);
    onLeadUpdate(lead.id, { [field]: v } as Partial<Lead>);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { data } = await supabase
      .from("lead_notes")
      .insert({ conversation_id: Number(lead.id), content: newNote.trim() })
      .select("id,conversation_id,content,created_at")
      .single();
    if (data) setNotes((prev) => [data as Note, ...prev]);
    setNewNote("");
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    await supabase.from("lead_notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  async function copyPhone() {
    if (!displayPhone) return;
    await navigator.clipboard.writeText(displayPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(followUpMessage);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2500);
  }

  return (
    <div className={cn(
      isMobile
        ? "fixed inset-0 z-40 bg-white overflow-y-auto overflow-x-hidden overscroll-contain pb-20"
        : "flex flex-col h-full bg-white border-l border-ink/[0.08] overflow-y-auto overflow-x-hidden"
    )}>

      {/* Mobile back bar */}
      {isMobile && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 h-12 bg-white/95 backdrop-blur border-b border-ink/[0.08]">
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-small font-semibold text-ember cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to leads
          </button>
        </div>
      )}

      {/* ══ ZONE 1: IDENTITY ══════════════════════════════════════ */}
      <div className={cn("px-5 pt-4 pb-3 border-b border-ink/[0.06] border-l-4", getStatusBorderColor(lead.status))}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-body font-bold text-white", avatarCls)}>
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-ink leading-tight">{displayName}</h2>
                {lead.booking_intent && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-ember/10 text-ember border border-ember/20">
                    <Flame className="w-2.5 h-2.5" /> Hot
                  </span>
                )}
                {overdue && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                    <AlertCircle className="w-2.5 h-2.5" /> Overdue
                  </span>
                )}
                {pastJobs.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-200">
                    <History className="w-2.5 h-2.5" /> Returning
                  </span>
                )}
              </div>
              {/* What they need — prominent */}
              {(lead.job_type || lead.area) && (
                <p className="text-small font-semibold text-ink-600 mt-0.5">
                  {[lead.job_type, lead.area && `in ${lead.area}`].filter(Boolean).join(" ")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", s.cls)}>{s.label}</span>
                <span className={cn("text-[10px] font-medium", ageColor)}>{timeAgo(lead.created_at)}</span>
                {lead.preferred_time && (
                  <span className="text-[10px] text-ink-400 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {lead.preferred_time}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isMobile && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink/[0.05] text-ink-400 hover:text-ink transition-colors cursor-pointer shrink-0" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Contact info — always visible, prominent */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {displayPhone ? (
            <a href={`tel:${displayPhone}`} className="flex items-center gap-1.5 text-small font-semibold text-ink hover:text-brand transition-colors cursor-pointer">
              <Phone className="w-3.5 h-3.5 text-ink-400" />
              {displayPhone}
            </a>
          ) : (
            <span className="flex items-center gap-1.5 text-tiny text-ink-300 italic">
              <Phone className="w-3.5 h-3.5" /> No phone captured
            </span>
          )}
          {lead.customer_email && (
            <a href={`mailto:${lead.customer_email}`} className="flex items-center gap-1.5 text-small font-semibold text-ink hover:text-brand transition-colors cursor-pointer truncate max-w-[180px]">
              <Mail className="w-3.5 h-3.5 text-ink-400 shrink-0" />
              <span className="truncate">{lead.customer_email}</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-2.5 flex gap-2">
          {displayPhone && (
            <a href={`tel:${displayPhone}`}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-ink text-white text-tiny font-bold hover:bg-ink/90 transition-colors cursor-pointer">
              <Phone className="w-3.5 h-3.5" /> Call now
            </a>
          )}
          {waPhone && (
            <a href={`https://wa.me/${waPhone}?text=Hi+${encodeURIComponent(displayName.split(" ")[0])}%2C+thanks+for+reaching+out!`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#25D366] text-white text-tiny font-bold hover:opacity-90 transition-opacity cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {lead.customer_email && (
            <a href={`mailto:${lead.customer_email}`}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-ink/[0.12] text-ink text-tiny font-medium hover:bg-ink/[0.03] transition-colors cursor-pointer">
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {displayPhone && (
            <button type="button" onClick={copyPhone}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-ink/[0.12] text-ink-400 hover:text-ink transition-colors cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* ══ ZONE 2: INSIGHT CARD ══════════════════════════════════ */}
      <div className="px-4 py-3 border-b border-ink/[0.06] space-y-2.5">

        {/* What they said */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-3">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" /> Summary
          </p>
          {messagesLoading ? (
            <div className="flex items-center gap-2 text-tiny text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : (
            <p className="text-tiny text-blue-900 leading-relaxed">
              {conversationSummary}
            </p>
          )}
        </div>

        {/* Next step */}
        <div className={cn(
          "rounded-xl border px-3.5 py-2.5",
          isDone ? "bg-ink/[0.02] border-ink/[0.08]"
          : isLeadOverdue(lead) ? "bg-red-50 border-red-100"
          : lead.status === "escalated" ? "bg-red-50 border-red-100"
          : lead.status === "confirmed" ? "bg-green-50 border-green-100"
          : "bg-amber-50 border-amber-100"
        )}>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5",
            isDone ? "text-ink-400"
            : isLeadOverdue(lead) || lead.status === "escalated" ? "text-red-500"
            : lead.status === "confirmed" ? "text-green-600"
            : "text-amber-600"
          )}>
            <Zap className="w-3 h-3" /> Next step
          </p>
          <p className={cn(
            "text-tiny leading-relaxed",
            isDone ? "text-ink-500"
            : isLeadOverdue(lead) || lead.status === "escalated" ? "text-red-700"
            : lead.status === "confirmed" ? "text-green-700"
            : "text-amber-800"
          )}>
            {nextStep}
          </p>
        </div>

        {/* Copy & send message */}
        {!isDone && (
          <div className="rounded-xl border border-ink/[0.10] bg-ink/[0.02] px-3.5 py-3">
            <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Send className="w-3 h-3" /> Ready to send
            </p>
            <p className="text-tiny text-ink-600 leading-relaxed mb-2.5 italic">
              "{followUpMessage}"
            </p>
            <div className="flex gap-1.5">
              <button type="button" onClick={copyMessage}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-ink/[0.12] text-tiny font-semibold text-ink hover:bg-ink/[0.04] transition-colors cursor-pointer">
                {msgCopied ? <><Check className="w-3 h-3 text-green-500" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy message</>}
              </button>
              {waPhone && (
                <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(followUpMessage)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-[#25D366] text-white text-tiny font-semibold hover:opacity-90 transition-opacity cursor-pointer">
                  <MessageSquare className="w-3 h-3" /> Send via WA
                </a>
              )}
            </div>
          </div>
        )}

        {/* Review request — when done */}
        {isDone && waPhone && (
          <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${displayName.split(" ")[0]}, really appreciate you choosing us. If you were happy with the work, a quick Google review would mean the world to us. It only takes 30 seconds: ${reviewLink}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-8 rounded-xl bg-[#25D366]/10 text-[#128C4A] border border-[#25D366]/20 text-tiny font-semibold hover:bg-[#25D366]/20 transition-colors cursor-pointer">
            <Star className="w-3.5 h-3.5" /> Request Google review
          </a>
        )}
      </div>

      {/* ══ ZONE 3: ACTIONS ══════════════════════════════════════ */}
      <div className="px-4 py-3 border-b border-ink/[0.06] space-y-2">

        {!isDone && !closingOpen && (
          <button type="button" onClick={() => setClosingOpen(true)} disabled={statusUpdating}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-green-600 text-white text-small font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-60 shadow-sm">
            <CheckCircle2 className="w-4 h-4" /> Mark as done
          </button>
        )}

        {closingOpen && (
          <div className="rounded-xl border border-ink/[0.10] bg-ink/[0.02] p-3 space-y-2">
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setClosingOutcome("won")}
                className={cn("flex-1 h-7 rounded-lg text-tiny font-semibold border transition-colors cursor-pointer",
                  closingOutcome === "won" ? "bg-green-600 text-white border-green-600" : "border-ink/[0.12] text-ink-500 hover:bg-ink/[0.04]")}>
                Won ✓
              </button>
              <button type="button" onClick={() => setClosingOutcome("lost")}
                className={cn("flex-1 h-7 rounded-lg text-tiny font-semibold border transition-colors cursor-pointer",
                  closingOutcome === "lost" ? "bg-red-50 text-red-600 border-red-200" : "border-ink/[0.12] text-ink-500 hover:bg-ink/[0.04]")}>
                Lost ✗
              </button>
            </div>
            {closingOutcome === "lost" && (
              <select value={closingReason} onChange={(e) => setClosingReason(e.target.value)}
                className="w-full h-7 px-2 rounded-lg border border-ink/[0.12] text-tiny text-ink focus:outline-none bg-white cursor-pointer">
                {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-tiny text-ink-400">R</span>
              <input type="number" value={closingValue} onChange={(e) => setClosingValue(e.target.value)}
                placeholder="Job value (optional)"
                className="flex-1 h-7 px-2 rounded-lg border border-ink/[0.12] text-tiny text-ink placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-brand/30" />
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={confirmClose} disabled={statusUpdating}
                className="flex-1 h-7 rounded-lg bg-green-600 text-white text-tiny font-semibold hover:bg-green-700 cursor-pointer disabled:opacity-60">
                {statusUpdating ? "Saving…" : "Confirm"}
              </button>
              <button type="button" onClick={() => setClosingOpen(false)}
                className="flex-1 h-7 rounded-lg border border-ink/[0.12] text-ink-500 text-tiny font-semibold hover:bg-ink/[0.04] cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1.5">
          {isNew && (
            <button type="button" onClick={() => updateStatus("confirmed")} disabled={statusUpdating}
              className="flex-1 h-8 rounded-xl border border-green-500/40 text-green-700 text-tiny font-semibold hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-60">
              Confirm booking
            </button>
          )}
          {lead.status === "confirmed" && (
            <button type="button" onClick={() => updateStatus("no_show")} disabled={statusUpdating}
              className="flex-1 h-8 rounded-xl border border-ink/[0.12] text-ink-500 text-tiny font-semibold hover:bg-ink/[0.04] transition-colors cursor-pointer disabled:opacity-60">
              No-show
            </button>
          )}
          {!isDone && (
            <button type="button" onClick={() => updateStatus("escalated")} disabled={statusUpdating}
              className={cn("flex-1 h-8 rounded-xl border text-tiny font-semibold transition-colors cursor-pointer disabled:opacity-60",
                lead.status === "escalated" ? "bg-red-50 text-red-600 border-red-200" : "border-ink/[0.12] text-ink-500 hover:bg-ink/[0.04]")}>
              Needs you
            </button>
          )}
          {isDone && (
            <button type="button" onClick={() => updateStatus("new")} disabled={statusUpdating}
              className="flex-1 h-8 rounded-xl border border-ink/[0.12] text-ink-500 text-tiny font-semibold hover:bg-ink/[0.04] transition-colors cursor-pointer disabled:opacity-60">
              Reopen
            </button>
          )}
        </div>

        {isDone && lead.closed_reason && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-ink-400">Outcome:</span>
            {lead.closed_reason === "won"
              ? <span className="text-[10px] text-green-600 font-bold">Won</span>
              : <span className="text-[10px] text-ink-500">{lead.closed_reason}</span>}
            {lead.job_value ? <span className="ml-auto text-[10px] text-green-700 font-bold">R{lead.job_value.toLocaleString()}</span> : null}
          </div>
        )}
      </div>

      {/* ══ ZONE 4: DETAILS GRID + NOTE ══════════════════════════ */}
      <div className="px-4 py-3 border-b border-ink/[0.06]">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Banknote className="w-2.5 h-2.5" /> Value
            </label>
            <div className="flex items-center gap-1">
              <span className="text-tiny text-ink-400">R</span>
              <input type="number" value={jobValue}
                onChange={(e) => setJobValue(e.target.value)}
                onBlur={() => saveField("job_value", jobValue ? parseInt(jobValue) : null)}
                placeholder="0"
                className="flex-1 h-7 px-2 rounded-lg border border-ink/[0.12] text-tiny text-ink focus:outline-none focus:ring-1 focus:ring-brand/30 w-full" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Calendar className="w-2.5 h-2.5" /> Appointment
            </label>
            <input type="datetime-local" value={appointmentAt}
              onChange={(e) => { setAppointmentAt(e.target.value); saveField("appointment_at", e.target.value || null); }}
              className="w-full h-7 px-2 rounded-lg border border-ink/[0.12] text-tiny text-ink focus:outline-none focus:ring-1 focus:ring-brand/30" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <User className="w-2.5 h-2.5" /> Assign to
            </label>
            <input type="text" value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              onBlur={() => saveField("assigned_to", assignedTo || null)}
              placeholder="Team member"
              className="w-full h-7 px-2 rounded-lg border border-ink/[0.12] text-tiny text-ink placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-brand/30" />
          </div>
          <div>
            <label className={cn("text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 mb-1",
              followUpOverdue ? "text-red-500" : "text-ink-400")}>
              <Bell className="w-2.5 h-2.5" />
              Follow-up {followUpOverdue && <span className="text-red-500">!</span>}
            </label>
            <input type="datetime-local" value={followUpAt}
              onChange={(e) => { setFollowUpAt(e.target.value); saveField("follow_up_at", e.target.value || null); }}
              className={cn("w-full h-7 px-2 rounded-lg border text-tiny text-ink focus:outline-none focus:ring-1",
                followUpOverdue ? "border-red-300 focus:ring-red-200" : "border-ink/[0.12] focus:ring-brand/30")} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StickyNote className="w-3 h-3 text-ink-300 shrink-0" />
          <input type="text" value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }}
            placeholder="Add a note… (Enter to save)"
            className="flex-1 h-7 px-2.5 rounded-lg border border-ink/[0.12] text-tiny text-ink placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-brand/30" />
          <button type="button" onClick={addNote} disabled={savingNote || !newNote.trim()}
            className="h-7 px-2.5 rounded-lg bg-ink text-white text-tiny font-semibold hover:bg-ink/80 cursor-pointer disabled:opacity-40 shrink-0">
            {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>

      {/* ══ ZONE 5: NOTES, CONVERSATION, EXTRAS ═════════════════ */}
      <div>

        {/* Notes list */}
        {!notesLoading && notes.length > 0 && (
          <div className="px-4 py-3 border-b border-ink/[0.06]">
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" /> Notes ({notes.length})
            </p>
            <div className="space-y-1.5">
              {notes.map((note) => (
                <div key={note.id} className="group flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-tiny text-amber-900 leading-relaxed">{note.content}</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">{timeAgo(note.created_at)}</p>
                  </div>
                  <button type="button" onClick={() => deleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-amber-400 hover:text-red-500 transition-all cursor-pointer shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2.5 text-tiny text-ink-400 font-medium border-b border-ink/[0.04]">
            <MessageSquare className="w-3.5 h-3.5" />
            Full conversation
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-ink/[0.07] text-[10px] font-bold text-ink-500">{messages.length} messages</span>
            )}
          </div>
          <div className="px-4 pb-4 pt-3">
            {messagesLoading ? (
              <div className="flex items-center gap-2 text-tiny text-ink-400 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation…
              </div>
            ) : messages.length === 0 ? (
              <p className="text-tiny text-ink-300 italic py-4 text-center">No messages yet</p>
            ) : (
              <div className="space-y-2.5">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-0.5">
                    <div className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-tiny leading-relaxed",
                      msg.role === "assistant" ? "bg-ink/[0.05] text-ink rounded-tl-sm mr-auto"
                      : msg.role === "owner" ? "bg-ink text-white rounded-tr-sm ml-auto"
                      : "bg-blue-50 text-blue-900 border border-blue-100 rounded-tr-sm ml-auto"
                    )}>
                      {msg.content}
                    </div>
                    <p className={cn("text-[10px] text-ink-300 px-1", msg.role !== "assistant" && "text-right")}>
                      {msg.role === "customer" ? "Customer" : msg.role === "owner" ? "You" : "Assistant"} · {timeAgo(msg.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick replies */}
        {waPhone && waTemplates.length > 0 && (
          <div className="px-4 py-3 border-t border-ink/[0.06]">
            <button type="button" onClick={() => setTemplatesOpen((o) => !o)}
              className="flex items-center justify-between w-full text-[10px] font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-ink transition-colors">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Quick replies</span>
              {templatesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {templatesOpen && (
              <div className="mt-2 space-y-1.5">
                {waTemplates.map((t) => (
                  <a key={t.label}
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(t.text)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#25D366]/30 text-tiny text-ink hover:bg-[#25D366]/[0.06] transition-colors cursor-pointer">
                    <span className="font-medium">{t.label}</span>
                    <ExternalLink className="w-3 h-3 text-ink-300 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customer history */}
        {pastJobs.length > 0 && (
          <div className="px-4 py-3 border-t border-ink/[0.06]">
            <button type="button" onClick={() => setHistoryOpen((o) => !o)}
              className="flex items-center justify-between w-full text-[10px] font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-ink transition-colors">
              <span className="flex items-center gap-1.5"><History className="w-3 h-3" /> History ({pastJobs.length} prev {pastJobs.length === 1 ? "job" : "jobs"})</span>
              {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {historyOpen && (
              <div className="mt-2 space-y-1.5">
                {pastJobs.map((job) => {
                  const st = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.new;
                  return (
                    <div key={job.id} className="flex items-center gap-2 p-2 rounded-lg bg-ink/[0.02] border border-ink/[0.06]">
                      <div className="flex-1 min-w-0">
                        <p className="text-tiny text-ink font-medium truncate">{job.job_type ?? "Unknown"}{job.area ? ` · ${job.area}` : ""}</p>
                        <p className="text-[10px] text-ink-400">{timeAgo(job.created_at)}</p>
                      </div>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0", st.cls)}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ leads }: { leads: Lead[] }) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const newToday = leads.filter(l => new Date(l.created_at) >= todayStart && (l.status === "new" || l.status === "lead")).length;
  const confirmed = leads.filter(l => l.status === "confirmed").length;
  const pipeline = leads.filter(l => l.status !== "closed" && l.job_value).reduce((s, l) => s + (l.job_value ?? 0), 0);
  const total = leads.length;

  const stats = [
    { label: "Total leads", value: total, icon: <Users className="w-3.5 h-3.5" />, color: "text-ink" },
    { label: "New today", value: newToday, icon: <TrendingUp className="w-3.5 h-3.5" />, color: newToday > 0 ? "text-blue-600" : "text-ink-400" },
    { label: "Confirmed", value: confirmed, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: confirmed > 0 ? "text-green-600" : "text-ink-400" },
    { label: "Pipeline", value: pipeline > 0 ? `R${pipeline.toLocaleString()}` : "R0", icon: <Banknote className="w-3.5 h-3.5" />, color: pipeline > 0 ? "text-green-600" : "text-ink-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-ink/[0.08] px-3.5 py-3">
          <div className={cn("flex items-center gap-1.5 mb-1", s.color)}>
            {s.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{s.label}</span>
          </div>
          <p className={cn("text-lg font-bold leading-tight", s.color)}>{s.value}</p>
        </div>
      ))}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile && selectedId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, selectedId]);

  const tier = resolvePlan(client?.plan);
  const config = PLAN_CONFIG[tier];
  const canExport = config.csvExport;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("conversations")
      .select("id,customer_name,customer_phone,customer_email,job_type,status,created_at,updated_at,preferred_time,area,booking_intent,job_value,closed_reason,appointment_at,follow_up_at,assigned_to")
      .eq("is_lead", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter === "new") q = q.in("status", ["new", "lead"]);
    else if (statusFilter !== "all") q = q.eq("status", statusFilter);

    const { data, error } = await q;
    if (error) console.error("[leads] query error:", error.message);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  function handleStatusChange(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  function handleLeadUpdate(id: string, updates: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  function toggleBulkSelect(id: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkMarkDone() {
    if (bulkSelected.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(bulkSelected);
    await supabase.from("conversations").update({ status: "closed" }).in("id", ids);
    setLeads((prev) => prev.map((l) => (bulkSelected.has(l.id) ? { ...l, status: "closed" } : l)));
    setBulkSelected(new Set());
    setBulkUpdating(false);
  }

  async function exportCSV() {
    setExportLoading(true);
    try {
      const rows = leads.map((l) => ({
        Name: getDisplayName(l), Phone: getDisplayPhone(l) ?? "",
        Email: l.customer_email ?? "", Need: l.job_type ?? "",
        Area: l.area ?? "", "Preferred time": l.preferred_time ?? "",
        Status: STATUS_CONFIG[l.status]?.label ?? l.status,
        "Booking intent": l.booking_intent ? "Yes" : "No",
        "Job value": l.job_value ? `R${l.job_value}` : "",
        "Closed reason": l.closed_reason ?? "",
        "Assigned to": l.assigned_to ?? "",
        Captured: formatDateTime(l.created_at),
      }));
      const header = Object.keys(rows[0] ?? {}).join(",");
      const body = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([header + "\n" + body], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `qwikly-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } finally { setExportLoading(false); }
  }

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.customer_name ?? "").toLowerCase().includes(q) ||
      (l.customer_phone ?? "").toLowerCase().includes(q) ||
      (l.job_type ?? "").toLowerCase().includes(q) ||
      (l.area ?? "").toLowerCase().includes(q)
    );
  });

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;
  const anyBulkSelected = bulkSelected.size > 0;

  return (
    <div className="animate-fade-in">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Leads Inbox</h1>
          <p className="text-tiny text-ink-500 mt-0.5">Every visitor captured by your assistant</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport ? (
            <button type="button" onClick={exportCSV} disabled={exportLoading || leads.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white border border-ink/[0.12] text-small font-medium text-ink-600 hover:text-ink hover:border-ink/[0.22] transition-all cursor-pointer disabled:opacity-50">
              {exportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export CSV
            </button>
          ) : (
            <Link href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white border border-ink/[0.12] text-small font-medium text-ink-400 hover:text-ink hover:border-ink/[0.22] transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Export CSV
              <span className="text-[10px] font-bold text-ember ml-1">Pro</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && leads.length > 0 && <StatsBar leads={leads} />}

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, or job type…"
          className="w-full h-9 pl-9 pr-3 rounded-xl border border-ink/[0.10] bg-white text-small text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-colors" />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-300 hover:text-ink cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(["all", ...FILTER_STATUSES] as string[]).map((st) => (
          <button key={st} type="button" onClick={() => setStatusFilter(st)}
            className={cn("px-3.5 py-1.5 rounded-full text-tiny font-medium transition-colors duration-150 cursor-pointer border",
              statusFilter === st ? "bg-ink text-paper border-ink" : "bg-white text-ink-500 border-ink/[0.10] hover:border-ink/[0.22] hover:text-ink")}>
            {st === "all" ? "All" : STATUS_CONFIG[st]?.label ?? st}
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {anyBulkSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-ink text-white">
          <span className="text-tiny font-medium flex-1">{bulkSelected.size} lead{bulkSelected.size > 1 ? "s" : ""} selected</span>
          <button type="button" onClick={bulkMarkDone} disabled={bulkUpdating}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-green-500 text-white text-tiny font-semibold hover:bg-green-400 cursor-pointer disabled:opacity-60">
            {bulkUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Mark done
          </button>
          <button type="button" onClick={() => setBulkSelected(new Set())}
            className="p-1 rounded text-white/60 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main layout */}
      <div
        className={cn("rounded-2xl border border-ink/[0.08] overflow-hidden shadow-[0_1px_4px_rgba(14,14,12,0.05)]",
          selectedLead ? "lg:grid lg:grid-cols-[1fr_440px]" : "")}
        style={selectedLead && !isMobile ? { height: "calc(100vh - 220px)", maxHeight: "calc(100vh - 220px)" } : {}}
      >
        {/* Lead list */}
        <div className={cn("bg-white", selectedLead ? "hidden lg:block lg:overflow-y-auto" : "")}>
          {loading ? (
            [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-ink/[0.05] flex items-center justify-center">
                <Users className="w-5 h-5 text-ink-300" />
              </div>
              <div>
                <p className="text-small font-medium text-ink">
                  {searchQuery ? "No matching leads" : "No leads yet"}
                </p>
                <p className="text-tiny text-ink-400 mt-1 max-w-xs leading-relaxed">
                  {searchQuery ? `No leads match "${searchQuery}".`
                    : statusFilter === "all" ? "Once your widget captures a visitor, they'll appear here."
                    : `No leads with status "${STATUS_CONFIG[statusFilter]?.label ?? statusFilter}".`}
                </p>
              </div>
              {(statusFilter !== "all" || searchQuery) && (
                <button type="button" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}
                  className="text-tiny text-ember font-medium hover:underline cursor-pointer">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={selectedId === lead.id}
                isBulkChecked={bulkSelected.has(lead.id)}
                onSelect={() => {
                  const next = selectedId === lead.id ? null : lead.id;
                  setSelectedId(next);
                  router.replace(`/dashboard/leads${next ? `?id=${next}` : ""}`, { scroll: false });
                }}
                onBulkToggle={() => toggleBulkSelect(lead.id)}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedLead && (
          <DetailPanel
            lead={selectedLead}
            client={client}
            onClose={() => { setSelectedId(null); router.replace("/dashboard/leads", { scroll: false }); }}
            onStatusChange={handleStatusChange}
            onLeadUpdate={handleLeadUpdate}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Upgrade prompt */}
      {!canExport && leads.length >= 5 && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-ember/[0.20] bg-ember/[0.04]">
          <AlertTriangle className="w-4 h-4 text-ember mt-0.5 shrink-0" />
          <p className="text-tiny text-ink-600 leading-relaxed">
            You have {leads.length} leads.{" "}
            <Link href="/dashboard/billing" className="font-semibold text-ember hover:underline cursor-pointer">Upgrade to Pro</Link>{" "}
            to export your lead list as CSV.
          </p>
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
