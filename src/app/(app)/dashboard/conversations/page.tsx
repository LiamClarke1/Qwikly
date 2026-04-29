"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  Send,
  Bot,
  User,
  Pause,
  Play,
  StickyNote,
  Phone,
  Mail,
  Sparkles,
  CheckCheck,
  Loader2,
  Inbox,
  ChevronLeft,
  Globe,
  Trash2,
  AlertTriangle,
  X,
  RotateCcw,
  Zap,
  Target,
  GripVertical,
  Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatPhone, formatDateTime, timeAgo, initials } from "@/lib/format";

interface Convo {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  customer_email?: string | null;
  channel?: "whatsapp" | "email" | "web_chat" | null;
  status: "active" | "completed" | "escalated";
  ai_paused?: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Analysis {
  customer_name: string | null;
  intent: string | null;
  requirements: string[];
  concerns: string[];
  lead_status: "new" | "qualified" | "follow_up" | "closed";
  next_action: string | null;
}

const TEMPLATES = [
  { title: "On my way", body: "Hi! I'm on my way and should be with you in about 20 minutes." },
  { title: "Quote ready", body: "Hey, I've put a quote together for you. Want me to WhatsApp it through?" },
  { title: "Confirm appt", body: "Just confirming our appointment. Reply YES to lock it in or suggest a new time." },
  { title: "Follow up", body: "Hi, following up on your enquiry. Still keen for me to come through?" },
  { title: "Email quote", body: "Hi, thanks for your enquiry. I've attached a quote for you to review. Please reply if you'd like to go ahead or have any questions." },
  { title: "Email confirm", body: "Hi, just confirming your appointment. Please reply to confirm or let me know if you need to reschedule." },
];

function channelLabel(channel?: string | null) {
  if (channel === "web_chat") return "Website";
  if (channel === "email") return "Email";
  return "WhatsApp";
}

function ChannelIcon({ channel, className }: { channel?: string | null; className?: string }) {
  if (channel === "web_chat") return <Globe className={cn("w-2.5 h-2.5", className)} />;
  if (channel === "email") return <Mail className={cn("w-2.5 h-2.5", className)} />;
  return <MessageSquare className={cn("w-2.5 h-2.5", className)} />;
}

function channelColor(channel?: string | null) {
  if (channel === "web_chat") return "text-violet-600";
  if (channel === "email") return "text-sky-600";
  return "text-[#128c7e]";
}

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "New lead",
  qualified: "Qualified",
  follow_up: "Follow up",
  closed: "Closed",
};

const LEAD_STATUS_TONE: Record<string, "neutral" | "brand" | "success" | "warning"> = {
  new: "neutral",
  qualified: "success",
  follow_up: "warning",
  closed: "neutral",
};

export default function ConversationsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialId = sp.get("id");

  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [channelOrder, setChannelOrder] = useState<string[]>(["web", "whatsapp", "email"]);
  const [dragOverChannel, setDragOverChannel] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<{ phone: string; email: string } | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // AI analysis
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const analysisCache = useRef<Record<string, Analysis>>({});

  const transcriptRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<string | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem("qw_ch_order"); if (s) setChannelOrder(JSON.parse(s)); } catch {}
  }, []);

  // ── Load conversation list ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      const list = (data as Convo[]) ?? [];

      const enriched = await Promise.all(
        list.map(async (c) => {
          const { data: msgs } = await supabase
            .from("messages_log")
            .select("content, created_at")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);
          return {
            ...c,
            last_message: msgs?.[0]?.content,
            last_message_time: msgs?.[0]?.created_at ?? c.updated_at,
          };
        })
      );
      setConvos(enriched);
      setLoading(false);
      if (!activeId && enriched.length && typeof window !== "undefined" && window.innerWidth >= 1024) {
        setActiveId(enriched[0].id);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AI analysis fetch ─────────────────────────────────────────────────────
  const fetchAnalysis = useCallback(async (conversationId: string) => {
    if (analysisCache.current[conversationId]) {
      setAnalysis(analysisCache.current[conversationId]);
      return;
    }
    setLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const r = await fetch(`/api/conversations/${conversationId}/analyze`, {
        method: "POST",
      });
      if (r.ok) {
        const data: Analysis = await r.json();
        analysisCache.current[conversationId] = data;
        setAnalysis(data);
        // Back-fill name locally if extracted
        if (data.customer_name) {
          setConvos((cs) =>
            cs.map((c) =>
              c.id === conversationId && !c.customer_name
                ? { ...c, customer_name: data.customer_name }
                : c
            )
          );
        }
      }
    } catch (err) {
      console.error("[fetchAnalysis]", err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const refreshAnalysis = useCallback(() => {
    if (!activeId) return;
    delete analysisCache.current[activeId];
    fetchAnalysis(activeId);
  }, [activeId, fetchAnalysis]);

  // ── Load messages when conversation changes ───────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    setAnalysis(null);
    setSendError(null);
    setContactDraft(null);

    (async () => {
      const { data } = await supabase
        .from("messages_log")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      const msgs = (data as Message[]) ?? [];
      setMessages(msgs);
      setLoadingMsgs(false);
      setTimeout(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
      }, 50);
      if (msgs.length > 0) {
        fetchAnalysis(activeId);
      }
    })();

    const c = convos.find((x) => x.id === activeId);
    setNoteDraft(c?.notes ?? "");
  }, [activeId, fetchAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = useMemo(() => convos.find((c) => c.id === activeId) ?? null, [convos, activeId]);

  // ── Dynamic filter chips ──────────────────────────────────────────────────
  const channelCounts = useMemo(() => ({
    web_chat: convos.filter((c) => c.channel === "web_chat").length,
    whatsapp: convos.filter((c) => c.channel === "whatsapp" || !c.channel).length,
    email: convos.filter((c) => c.channel === "email").length,
  }), [convos]);

  const dynamicFilters = useMemo(() => {
    const defs = [
      { id: "web", label: "Website", count: channelCounts.web_chat },
      { id: "whatsapp", label: "WhatsApp", count: channelCounts.whatsapp },
      { id: "email", label: "Email", count: channelCounts.email },
    ];
    const orderedChannels = channelOrder
      .map(id => defs.find(c => c.id === id))
      .filter((c): c is { id: string; label: string; count: number } => !!c && c.count > 0);
    defs.filter(c => !channelOrder.includes(c.id) && c.count > 0).forEach(c => orderedChannels.push(c));
    return [
      { id: "all", label: "All", count: convos.length },
      ...orderedChannels,
      { id: "needs", label: "Needs me", count: convos.filter((c) => c.status === "escalated" || c.ai_paused).length },
      { id: "done", label: "Done", count: convos.filter((c) => c.status === "completed").length },
    ];
  }, [convos, channelCounts, channelOrder]);

  const filtered = useMemo(() => {
    let list = convos;
    if (filter === "web")          list = list.filter((c) => c.channel === "web_chat");
    else if (filter === "whatsapp") list = list.filter((c) => c.channel === "whatsapp" || !c.channel);
    else if (filter === "email")    list = list.filter((c) => c.channel === "email");
    else if (filter === "needs")    list = list.filter((c) => c.status === "escalated" || c.ai_paused);
    else if (filter === "done")     list = list.filter((c) => c.status === "completed");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.customer_name ?? "").toLowerCase().includes(q) ||
          c.customer_phone.includes(q) ||
          (c.customer_email ?? "").toLowerCase().includes(q) ||
          (c.last_message ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [convos, filter, search]);

  // ── Send reply (channel-aware) ────────────────────────────────────────────
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!active || !composerText.trim() || sending) return;
    setSending(true);
    setSendError(null);
    const body = composerText.trim();
    setComposerText("");
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: active.id,
      role: "owner",
      content: body,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setTimeout(() => transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" }), 30);

    try {
      const r = await fetch(`/api/conversations/${active.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: body }),
      });
      const j = await r.json();
      if (!r.ok) {
        setSendError(j.error ?? "Failed to send");
      } else if (j.error) {
        // Saved to DB but delivery issue (e.g. no email on record)
        setSendError(j.error);
      }
    } catch {
      setSendError("Network error — message saved but may not have been delivered.");
    } finally {
      setSending(false);
    }
  };

  // ── Conversation controls ─────────────────────────────────────────────────
  const togglePause = async () => {
    if (!active) return;
    const next = !active.ai_paused;
    await supabase.from("conversations").update({ ai_paused: next }).eq("id", active.id);
    setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, ai_paused: next } : c)));
  };

  const updateStatus = async (status: Convo["status"]) => {
    if (!active) return;
    await supabase.from("conversations").update({ status }).eq("id", active.id);
    setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, status } : c)));
  };

  const saveNote = async () => {
    if (!active) return;
    setSavingNote(true);
    await supabase.from("conversations").update({ notes: noteDraft }).eq("id", active.id);
    setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, notes: noteDraft } : c)));
    setSavingNote(false);
  };

  const deleteConvo = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (r.ok) {
        setConvos((cs) => cs.filter((c) => c.id !== id));
        if (activeId === id) {
          setActiveId(null);
          router.replace("/dashboard/conversations", { scroll: false });
        }
      } else {
        const j = await r.json().catch(() => ({}));
        setDeleteError(j.error ?? `Delete failed (${r.status})`);
      }
    } catch {
      setDeleteError("Network error — could not delete.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const clearAll = async () => {
    setClearingAll(true);
    setDeleteError(null);
    try {
      const r = await fetch("/api/conversations", { method: "DELETE" });
      if (r.ok) {
        setConvos([]);
        setActiveId(null);
        router.replace("/dashboard/conversations", { scroll: false });
      } else {
        const j = await r.json().catch(() => ({}));
        setDeleteError(j.error ?? `Delete failed (${r.status})`);
      }
    } catch {
      setDeleteError("Network error — could not delete.");
    } finally {
      setClearingAll(false);
      setShowClearAll(false);
    }
  };

  const reorderChannel = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setChannelOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(fromId);
      const to = next.indexOf(toId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, fromId);
      try { localStorage.setItem("qw_ch_order", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const saveContact = async () => {
    if (!active || !contactDraft) return;
    setSavingContact(true);
    const updates: Record<string, string> = {};
    if (contactDraft.phone.trim()) updates.customer_phone = contactDraft.phone.trim();
    if (contactDraft.email.trim()) updates.customer_email = contactDraft.email.trim();
    if (Object.keys(updates).length) {
      await supabase.from("conversations").update(updates).eq("id", active.id);
      setConvos(cs => cs.map(c => c.id === active.id ? { ...c, ...updates } : c));
    }
    setContactDraft(null);
    setSavingContact(false);
  };

  return (
    <>
      <PageHeader
        title="Chats"
        description="Every customer conversation, every channel."
        actions={
          convos.length > 0 ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setShowClearAll(true)}
            >
              Clear all
            </Button>
          ) : undefined
        }
      />

      {/* Delete error banner */}
      {deleteError && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 mb-3 rounded-xl bg-danger/8 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
          <p className="text-small text-danger flex-1">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="text-danger/60 hover:text-danger cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Clear all modal */}
      {showClearAll && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowClearAll(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-surface-card border border-[var(--border)] rounded-2xl shadow-pop p-6 animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-small font-semibold text-fg">Delete all conversations?</p>
                <p className="text-small text-fg-muted mt-1">This permanently deletes all {convos.length} conversations and their messages. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowClearAll(false)}>Cancel</Button>
              <Button variant="danger" className="flex-1" loading={clearingAll} onClick={clearAll}>Delete all</Button>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_280px] gap-3 lg:h-[calc(100vh-200px)] lg:min-h-[560px]">

        {/* ── LEFT: List pane ── */}
        <div className={cn("panel flex flex-col overflow-hidden !p-0 min-h-[calc(100dvh-200px)] lg:min-h-0", active && "hidden lg:flex")}>

          {/* Search + filters */}
          <div className="px-3 pt-3 pb-2.5 border-b border-[var(--border)] space-y-2">
            <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-surface-input border border-[var(--border)]">
              <Search className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, email…"
                className="bg-transparent outline-none text-tiny text-fg placeholder:text-fg-faint flex-1"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-fg-faint hover:text-fg-muted cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter chips — drag channel chips to reorder */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {dynamicFilters.map((f) => {
                const isDraggable = !["all", "needs", "done"].includes(f.id);
                return (
                  <button
                    key={f.id}
                    draggable={isDraggable}
                    onDragStart={isDraggable ? () => { dragRef.current = f.id; } : undefined}
                    onDragOver={isDraggable ? (e) => { e.preventDefault(); setDragOverChannel(f.id); } : undefined}
                    onDragLeave={isDraggable ? () => setDragOverChannel(null) : undefined}
                    onDrop={isDraggable ? (e) => { e.preventDefault(); setDragOverChannel(null); if (dragRef.current) reorderChannel(dragRef.current, f.id); } : undefined}
                    onDragEnd={isDraggable ? () => { dragRef.current = null; setDragOverChannel(null); } : undefined}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "shrink-0 px-2 h-6 rounded-md text-[11px] font-semibold transition-colors duration-150 flex items-center gap-0.5",
                      isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                      isDraggable && dragOverChannel === f.id && filter !== f.id && "ring-1 ring-ember/40",
                      filter === f.id
                        ? "bg-ember text-paper"
                        : "bg-surface-input text-fg-muted hover:text-fg hover:bg-surface-hover"
                    )}
                  >
                    {isDraggable && <GripVertical className="w-2.5 h-2.5 opacity-30 shrink-0" />}
                    {f.label}
                    {f.count > 0 && (
                      <span className={cn("text-[10px] font-medium px-1 rounded", filter === f.id ? "bg-white/20" : "text-fg-faint")}>
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="p-3 space-y-1.5">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : filtered.length === 0 && filter === "all" && !search ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="When customers message through WhatsApp, email, or your website chat, they'll appear here."
              />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing here" description="Try a different filter or search." />
            ) : (
              <ul>
                {filtered.map((c) => (
                  <ConvoRow
                    key={c.id}
                    c={c}
                    isActive={activeId === c.id}
                    confirmDelete={deleteId === c.id}
                    deleting={deleting && deleteId === c.id}
                    onSelect={() => {
                      setActiveId(c.id);
                      router.replace(`/dashboard/conversations?id=${c.id}`, { scroll: false });
                    }}
                    onDeleteRequest={() => setDeleteId(c.id)}
                    onDeleteCancel={() => setDeleteId(null)}
                    onDeleteConfirm={() => deleteConvo(c.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── MIDDLE: Transcript pane ── */}
        <div className={cn("panel flex flex-col overflow-hidden !p-0 min-h-[calc(100dvh-200px)] lg:min-h-0", !active && "hidden lg:flex")}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose one from the list to read and reply."
              />
            </div>
          ) : (
            <>
              {/* Mobile back */}
              <button
                className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--border)] text-fg-muted hover:text-fg text-small cursor-pointer w-full"
                onClick={() => { setActiveId(null); router.replace("/dashboard/conversations", { scroll: false }); }}
              >
                <ChevronLeft className="w-4 h-4" />
                Back to inbox
              </button>

              {/* Thread header */}
              <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2.5 bg-surface-card">
                <Avatar name={active.customer_name ?? active.customer_phone} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-semibold text-fg truncate">
                    {active.customer_name ?? formatPhone(active.customer_phone)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", channelColor(active.channel))}>
                      <ChannelIcon channel={active.channel} />
                      {channelLabel(active.channel)}
                    </span>
                    <span className="text-[10px] text-fg-faint">·</span>
                    <span className="text-[10px] text-fg-muted">{formatPhone(active.customer_phone)}</span>
                    {active.customer_email && (
                      <>
                        <span className="text-[10px] text-fg-faint">·</span>
                        <span className="text-[10px] text-fg-muted truncate max-w-[140px]">{active.customer_email}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant={active.ai_paused ? "secondary" : "outline"}
                  size="sm"
                  onClick={togglePause}
                  icon={active.ai_paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                >
                  {active.ai_paused ? "Resume" : "Take over"}
                </Button>
                <button
                  onClick={() => setShowNotes((s) => !s)}
                  title="Notes"
                  className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer", showNotes ? "text-ember bg-ember/10" : "text-fg-subtle hover:text-fg hover:bg-surface-hover")}
                >
                  <StickyNote className="w-4 h-4" />
                </button>
                <select
                  value={active.status}
                  onChange={(e) => updateStatus(e.target.value as Convo["status"])}
                  className="h-7 text-[11px] font-semibold rounded-lg bg-surface-input border border-[var(--border-strong)] text-fg px-2 cursor-pointer outline-none"
                >
                  <option value="active">Replied</option>
                  <option value="escalated">Needs me</option>
                  <option value="completed">Done</option>
                </select>
                {deleteId === active.id ? (
                  <div className="flex items-center gap-1.5 pl-1">
                    <span className="text-[11px] text-danger font-medium">Delete?</span>
                    <button onClick={() => setDeleteId(null)} className="text-[11px] text-fg-muted hover:text-fg cursor-pointer">Cancel</button>
                    <button
                      onClick={() => deleteConvo(active.id)}
                      disabled={deleting}
                      className="text-[11px] font-semibold text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50"
                    >
                      {deleting ? "…" : "Yes"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(active.id)}
                    title="Delete conversation"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Private notes */}
              {showNotes && (
                <div className="px-4 py-2.5 border-b border-[var(--border)] bg-warning/[0.06]">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-warning">Private notes</p>
                    <button onClick={saveNote} disabled={savingNote} className="text-[11px] font-semibold text-warning hover:underline cursor-pointer disabled:opacity-50">
                      {savingNote ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Notes only you can see…"
                    rows={2}
                    className="w-full bg-transparent text-small text-fg placeholder:text-fg-faint outline-none resize-none"
                  />
                </div>
              )}

              {/* Message transcript */}
              <div ref={transcriptRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1.5 bg-surface">
                {loadingMsgs ? (
                  <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface-input border border-[var(--border)] flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-fg-muted" />
                    </div>
                    <p className="text-small font-semibold text-fg">No messages yet</p>
                    <p className="text-tiny text-fg-muted mt-1 max-w-xs">
                      {active.channel === "web_chat"
                        ? "This visitor opened your website chat but hasn't sent a message yet."
                        : "No messages have been sent in this conversation yet. Type below to start."}
                    </p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isCustomer = m.role === "customer";
                    const isAI = m.role === "assistant" || m.role === "ai";
                    const isOwner = m.role === "owner";
                    const prev = messages[i - 1];
                    const grouped = prev?.role === m.role;
                    return (
                      <div key={m.id} className={cn("flex gap-2", isCustomer ? "justify-start" : "justify-end")}>
                        {isCustomer && !grouped ? (
                          <Avatar name={active.customer_name ?? active.customer_phone} size={24} />
                        ) : isCustomer ? (
                          <div className="w-6" />
                        ) : null}
                        <div
                          className={cn(
                            "max-w-[75%] px-2.5 py-1.5 rounded-xl text-[12px] leading-relaxed",
                            isCustomer && "bg-surface-input text-fg rounded-bl-sm",
                            isAI && "bg-surface-card border border-[var(--border)] text-fg rounded-br-sm",
                            isOwner && "bg-ember text-paper rounded-br-sm"
                          )}
                        >
                          {!grouped && (
                            <p className="text-[10px] font-semibold opacity-60 mb-0.5 flex items-center gap-1">
                              {isAI && <Bot className="w-2.5 h-2.5" />}
                              {isOwner && <Sparkles className="w-2.5 h-2.5" />}
                              {isCustomer && <User className="w-2.5 h-2.5" />}
                              {isAI ? "Qwikly" : isOwner ? "You" : (active.customer_name ?? initials(active.customer_name ?? "C"))}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={cn("text-[10px] mt-0.5 num", isCustomer ? "text-fg-muted" : "opacity-60")}>
                            {formatDateTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send error banner */}
              {sendError && (
                <div className="px-4 py-2 bg-warning/10 border-t border-warning/20 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-warning flex-1">{sendError}</p>
                  <button onClick={() => setSendError(null)} className="text-warning/60 hover:text-warning cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Composer */}
              <form onSubmit={handleSend} className="border-t border-[var(--border)] p-2.5 bg-surface-card">
                {showTemplates && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.title}
                        type="button"
                        onClick={() => { setComposerText(t.body); setShowTemplates(false); }}
                        className="text-[11px] px-2 py-1 rounded-lg bg-surface-input border border-[var(--border)] text-fg-muted hover:text-fg hover:border-[var(--border-strong)] cursor-pointer"
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 bg-surface-input border border-[var(--border-strong)] rounded-xl p-1.5 focus-within:border-ember/50 transition-colors">
                  <button
                    type="button"
                    onClick={() => setShowTemplates((s) => !s)}
                    className={cn("h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-colors", showTemplates ? "text-ember bg-ember/10" : "text-fg-subtle hover:text-fg hover:bg-surface-hover")}
                    title="Saved replies"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSend(e as unknown as FormEvent);
                      }
                    }}
                    placeholder={active.ai_paused ? "Type your reply…" : "Type to take over, or let the digital assistant continue…"}
                    rows={1}
                    className="flex-1 bg-transparent outline-none text-small text-fg placeholder:text-fg-faint resize-none max-h-28 leading-relaxed py-1.5"
                    style={{ minHeight: "32px" }}
                  />
                  <button
                    type="submit"
                    disabled={!composerText.trim() || sending}
                    className="h-8 w-8 rounded-lg bg-ember text-paper flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 hover:bg-ember-deep transition-colors"
                    title="Send (⌘↵)"
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-fg-subtle mt-1 px-1">
                  {active.channel === "email"
                    ? "Via Email"
                    : active.channel === "web_chat"
                    ? "Via Website chat (saves to thread)"
                    : "Via WhatsApp"}{" "}
                  · ⌘↵ to send
                </p>
              </form>
            </>
          )}
        </div>

        {/* ── RIGHT: Customer intelligence panel ── */}
        {active && (
          <div className="panel hidden xl:flex flex-col overflow-hidden !p-0">

            {/* Identity + quick actions */}
            <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={active.customer_name ?? active.customer_phone} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-fg truncate">
                    {active.customer_name ?? "Unknown visitor"}
                  </p>
                  <p className="text-[10px] text-fg-muted">
                    {active.channel === "web_chat" ? "Website visitor" : active.channel === "email" ? "Email contact" : "WhatsApp contact"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={`tel:${active.customer_phone.replace(/[^0-9+]/g, "")}`}
                    className="h-6 px-2 rounded-md bg-surface-input border border-[var(--border)] text-[10px] font-medium text-fg hover:bg-surface-hover cursor-pointer flex items-center gap-1 transition-colors">
                    <Phone className="w-2.5 h-2.5" />Call
                  </a>
                  {active.channel === "email" && active.customer_email ? (
                    <a href={`mailto:${active.customer_email}`}
                      className="h-6 px-2 rounded-md bg-sky-500/10 border border-sky-500/25 text-[10px] font-medium text-sky-600 hover:bg-sky-500/20 cursor-pointer flex items-center gap-1 transition-colors">
                      <Mail className="w-2.5 h-2.5" />Email
                    </a>
                  ) : (
                    <a href={`https://wa.me/${active.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
                      className="h-6 px-2 rounded-md bg-ember/10 border border-ember/25 text-[10px] font-medium text-ember hover:bg-ember/20 cursor-pointer flex items-center gap-1 transition-colors">
                      <MessageSquare className="w-2.5 h-2.5" />WA
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge tone={active.status === "active" ? "brand" : active.status === "escalated" ? "warning" : "neutral"} dot>
                  {active.status === "active" ? "Replied" : active.status === "escalated" ? "Needs me" : "Done"}
                </Badge>
                {active.ai_paused && <Badge tone="warning">Manual</Badge>}
                <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium ml-auto", channelColor(active.channel))}>
                  <ChannelIcon channel={active.channel} className="w-2.5 h-2.5" />
                  {channelLabel(active.channel)}
                </span>
              </div>
            </div>

            {/* Contact capture */}
            <div className="px-3 py-2 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-fg-subtle">Contact</p>
                {!contactDraft && (
                  <button
                    onClick={() => setContactDraft({
                      phone: isRealPhone(active.customer_phone) ? active.customer_phone : "",
                      email: active.customer_email ?? "",
                    })}
                    className="flex items-center gap-0.5 text-[10px] text-ember hover:underline cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    {isRealPhone(active.customer_phone) || active.customer_email ? "Edit" : "Capture"}
                  </button>
                )}
              </div>
              {contactDraft ? (
                <div className="space-y-1.5">
                  <input
                    value={contactDraft.phone}
                    onChange={e => setContactDraft({ ...contactDraft, phone: e.target.value })}
                    placeholder="+27 81 234 5678"
                    className="w-full h-7 px-2 text-[11px] bg-surface-input border border-[var(--border)] rounded-lg outline-none focus:border-ember/50 transition-colors"
                  />
                  <input
                    value={contactDraft.email}
                    onChange={e => setContactDraft({ ...contactDraft, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full h-7 px-2 text-[11px] bg-surface-input border border-[var(--border)] rounded-lg outline-none focus:border-ember/50 transition-colors"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={saveContact} disabled={savingContact}
                      className="flex-1 h-6 text-[10px] font-semibold rounded-md bg-ember text-paper hover:bg-ember/90 cursor-pointer transition-colors disabled:opacity-50">
                      {savingContact ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setContactDraft(null)}
                      className="flex-1 h-6 text-[10px] font-medium rounded-md bg-surface-input border border-[var(--border)] text-fg-muted hover:text-fg cursor-pointer transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-2.5 h-2.5 text-fg-subtle shrink-0" />
                    {isRealPhone(active.customer_phone) ? (
                      <a href={`tel:${active.customer_phone.replace(/[^0-9+]/g, "")}`}
                        className="text-[11px] text-fg num hover:text-ember transition-colors truncate">
                        {formatPhone(active.customer_phone)}
                      </a>
                    ) : (
                      <span className="text-[11px] text-fg-faint italic">No phone — tap Capture</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-2.5 h-2.5 text-fg-subtle shrink-0" />
                    {active.customer_email ? (
                      <a href={`mailto:${active.customer_email}`}
                        className="text-[11px] text-fg hover:text-ember transition-colors truncate">
                        {active.customer_email}
                      </a>
                    ) : (
                      <span className="text-[11px] text-fg-faint italic">No email — tap Capture</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Lead Intelligence — compact, no scroll */}
            <div className="px-3 py-2 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-ember" />
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-fg-subtle">Lead Intelligence</p>
                </div>
                {!loadingAnalysis && messages.length > 0 && (
                  <button onClick={refreshAnalysis} title="Re-analyse"
                    className="w-4 h-4 flex items-center justify-center text-fg-faint hover:text-fg-muted cursor-pointer transition-colors">
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {loadingAnalysis ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-16" /></div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ) : analysis ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-fg-faint font-medium">Status</p>
                    <Badge tone={LEAD_STATUS_TONE[analysis.lead_status] ?? "neutral"}>
                      {LEAD_STATUS_LABEL[analysis.lead_status] ?? analysis.lead_status}
                    </Badge>
                  </div>
                  {analysis.intent && (
                    <p className="text-[11px] text-fg leading-relaxed line-clamp-2">{analysis.intent}</p>
                  )}
                  {analysis.concerns?.slice(0, 2).map((concern, i) => (
                    <p key={i} className="text-[10px] text-fg-muted leading-relaxed flex gap-1 items-start">
                      <span className="text-warning mt-[3px] shrink-0">·</span>{concern}
                    </p>
                  ))}
                  {analysis.next_action && (
                    <div className="bg-ember/5 border border-ember/15 rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Target className="w-2.5 h-2.5 text-ember shrink-0" />
                        <span className="text-[10px] text-ember font-semibold">Next action</span>
                      </div>
                      <p className="text-[11px] text-fg leading-relaxed">{analysis.next_action}</p>
                    </div>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-[11px] text-fg-faint">No messages to analyse yet.</p>
              ) : (
                <p className="text-[11px] text-fg-faint">Analysis unavailable.</p>
              )}
            </div>

            {/* Notes */}
            {active.notes && (
              <div className="px-3 py-2 shrink-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-fg-subtle mb-1">Notes</p>
                <p className="text-[11px] text-fg-muted leading-relaxed line-clamp-3">{active.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function isRealPhone(phone: string) {
  return /^[+\d][\d\s().-]{7,}$/.test(phone);
}

// ── Conversation list row ────────────────────────────────────────────────────

function ConvoRow({
  c,
  isActive,
  confirmDelete,
  deleting,
  onSelect,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  c: Convo;
  isActive: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  return (
    <li className="group">
      {confirmDelete ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/5 border-l-2 border-danger">
          <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
          <p className="text-tiny text-fg flex-1 truncate">Delete <strong>{c.customer_name ?? formatPhone(c.customer_phone)}</strong>?</p>
          <button onClick={onDeleteCancel} className="text-[10px] text-fg-muted hover:text-fg cursor-pointer px-1.5 py-0.5 rounded">Cancel</button>
          <button
            onClick={onDeleteConfirm}
            disabled={deleting}
            className="text-[10px] font-semibold text-danger hover:text-danger/80 cursor-pointer px-1.5 py-0.5 rounded bg-danger/10 disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      ) : (
        <div className={cn("flex gap-2.5 px-3 py-2.5 border-l-2 transition-colors duration-100", isActive ? "bg-surface-hover border-ember" : "border-transparent hover:bg-surface-hover")}>
          <button className="flex-1 min-w-0 flex gap-2.5 text-left cursor-pointer" onClick={onSelect}>
            <Avatar name={c.customer_name ?? c.customer_phone} size={32} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-small font-semibold text-fg truncate">
                  {c.customer_name ?? formatPhone(c.customer_phone)}
                </p>
                <span className="text-[10px] text-fg-subtle shrink-0 num">
                  {timeAgo(c.last_message_time ?? c.updated_at)}
                </span>
              </div>
              <p className="text-[11px] text-fg-muted truncate leading-snug">
                {c.last_message
                  ? c.last_message
                  : c.channel === "web_chat"
                  ? "Opened chat — no message sent"
                  : "No messages yet"}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", channelColor(c.channel))}>
                  <ChannelIcon channel={c.channel} />
                  {channelLabel(c.channel)}
                </span>
                {(c.status === "escalated" || c.ai_paused) && <Badge tone="warning" dot>Needs me</Badge>}
                {c.status === "completed" && <Badge tone="neutral"><CheckCheck className="w-3 h-3 mr-0.5" />Done</Badge>}
              </div>
            </div>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
            title="Delete"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10 cursor-pointer transition-all shrink-0 mt-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-fg-subtle mb-1">{label}</p>
      {children}
    </div>
  );
}
