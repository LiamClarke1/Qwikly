"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
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
  Sparkles,
  CheckCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Mail,
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
  channel?: "whatsapp" | "email" | null;
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

const FILTERS = [
  { id: "all", label: "All" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "needs", label: "Needs reply" },
  { id: "active", label: "Active" },
  { id: "escalated", label: "Escalated" },
  { id: "completed", label: "Done" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const TEMPLATES = [
  { title: "On my way", body: "Hi! I'm on my way and should be with you in about 20 minutes.", channel: "whatsapp" },
  { title: "Quote ready", body: "Hey, I've put a quote together for you. Want me to WhatsApp it through?", channel: "whatsapp" },
  { title: "Confirm appt", body: "Just confirming our appointment. Reply YES to lock it in or suggest a new time.", channel: "both" },
  { title: "Follow up", body: "Hi, following up on your enquiry. Still keen for me to come through?", channel: "both" },
  { title: "Email quote", body: "Hi, thanks for your enquiry. I've attached a quote for you to review. Please reply if you'd like to go ahead or have any questions.", channel: "email" },
  { title: "Email confirm", body: "Hi, just confirming your appointment. Please reply to confirm or let me know if you need to reschedule.", channel: "email" },
];

export default function ConversationsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialId = sp.get("id");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

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
      if (!activeId && enriched.length) setActiveId(enriched[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    (async () => {
      const { data } = await supabase
        .from("messages_log")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) ?? []);
      setLoadingMsgs(false);
      setTimeout(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
      }, 50);
    })();
    const c = convos.find((x) => x.id === activeId);
    setNoteDraft(c?.notes ?? "");
  }, [activeId]);

  const active = useMemo(() => convos.find((c) => c.id === activeId) ?? null, [convos, activeId]);

  const filtered = useMemo(() => {
    let list = convos;
    if (filter === "whatsapp") list = list.filter((c) => !c.channel || c.channel === "whatsapp");
    else if (filter === "email") list = list.filter((c) => c.channel === "email");
    else if (filter === "needs") list = list.filter((c) => c.status === "escalated" || c.ai_paused);
    else if (filter !== "all") list = list.filter((c) => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.customer_name ?? "").toLowerCase().includes(q) ||
          c.customer_phone.includes(q) ||
          (c.last_message ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [convos, filter, search]);

  const counts = useMemo(() => ({
    all: convos.length,
    whatsapp: convos.filter((c) => !c.channel || c.channel === "whatsapp").length,
    email: convos.filter((c) => c.channel === "email").length,
    needs: convos.filter((c) => c.status === "escalated" || c.ai_paused).length,
    active: convos.filter((c) => c.status === "active").length,
    escalated: convos.filter((c) => c.status === "escalated").length,
    completed: convos.filter((c) => c.status === "completed").length,
  }), [convos]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!active || !composerText.trim() || sending) return;
    setSending(true);
    const body = composerText.trim();
    setComposerText("");
    const optimistic: Message = { id: `tmp-${Date.now()}`, conversation_id: active.id, role: "owner", content: body, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setTimeout(() => transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" }), 30);
    try {
      const r = await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: active.id, content: body }) });
      const j = await r.json();
      if (!r.ok || j.error) console.error(j);
    } finally {
      setSending(false);
    }
  };

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

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Every chat, every channel. Reply manually whenever you want to step in."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_260px] gap-3 h-[calc(100vh-200px)] min-h-[560px]">
        {/* List pane */}
        <div className="panel flex flex-col overflow-hidden !p-0">
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-line space-y-2">
            <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-ink-800 border border-line">
              <Search className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-transparent outline-none text-tiny text-fg placeholder:text-fg-faint flex-1"
              />
            </div>
            {/* Filter chips — scrollable row */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "shrink-0 px-2.5 h-6 rounded-md text-[11px] font-semibold cursor-pointer transition-colors duration-150 flex items-center gap-1",
                    filter === f.id ? "bg-brand text-white" : "bg-white/[0.04] text-fg-muted hover:text-fg hover:bg-white/[0.07]"
                  )}
                >
                  {f.label}
                  {counts[f.id] > 0 && (
                    <span className={cn("text-[10px] font-medium px-1 rounded", filter === f.id ? "bg-white/20" : "text-fg-faint")}>
                      {counts[f.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="p-3 space-y-1.5">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Inbox} title="No conversations" description="Try a different filter." />
            ) : (
              <ul>
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setActiveId(c.id);
                        router.replace(`/dashboard/conversations?id=${c.id}`, { scroll: false });
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 border-l-2 cursor-pointer transition-colors duration-100 flex gap-2.5",
                        activeId === c.id ? "bg-white/[0.04] border-brand" : "border-transparent hover:bg-white/[0.02]"
                      )}
                    >
                      <Avatar name={c.customer_name ?? c.customer_phone} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-small font-semibold text-fg truncate">
                            {c.customer_name ?? formatPhone(c.customer_phone)}
                          </p>
                          <span className="text-[10px] text-fg-subtle shrink-0 num">
                            {timeAgo(c.last_message_time ?? c.updated_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-fg-muted truncate leading-snug">{c.last_message ?? "No messages yet"}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {c.channel === "email"
                            ? <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 font-medium"><Mail className="w-2.5 h-2.5" /> Email</span>
                            : <span className="inline-flex items-center gap-0.5 text-[10px] text-[#00a884] font-medium"><MessageSquare className="w-2.5 h-2.5" /> WhatsApp</span>
                          }
                          {c.ai_paused && <Badge tone="warning">Manual</Badge>}
                          {c.status === "escalated" && <Badge tone="warning" dot>Escalated</Badge>}
                          {c.status === "active" && !c.ai_paused && <Badge tone="brand" dot>Active</Badge>}
                          {c.status === "completed" && <Badge tone="neutral"><CheckCheck className="w-3 h-3 mr-0.5" />Done</Badge>}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Transcript pane */}
        <div className="panel flex flex-col overflow-hidden !p-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose one from the list to read and reply." />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-line flex items-center gap-2.5">
                <Avatar name={active.customer_name ?? active.customer_phone} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-semibold text-fg truncate">
                    {active.customer_name ?? formatPhone(active.customer_phone)}
                  </p>
                  <p className="text-[10px] text-fg-muted flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" /> {formatPhone(active.customer_phone)}
                  </p>
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
                  className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer", showNotes ? "text-brand bg-brand/10" : "text-fg-subtle hover:text-fg hover:bg-white/[0.04]")}
                >
                  <StickyNote className="w-4 h-4" />
                </button>
                <select
                  value={active.status}
                  onChange={(e) => updateStatus(e.target.value as Convo["status"])}
                  className="h-7 text-[11px] font-semibold rounded-lg bg-ink-800 border border-line-strong text-fg px-2 cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="escalated">Escalated</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Notes */}
              {showNotes && (
                <div className="px-4 py-2.5 border-b border-line bg-warning/[0.06]">
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

              {/* Messages */}
              <div ref={transcriptRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-2.5 bg-ink-950">
                {loadingMsgs ? (
                  <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}</div>
                ) : messages.length === 0 ? (
                  <EmptyState icon={MessageSquare} title="No messages yet" description="Type below to start the conversation." />
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
                            "max-w-[72%] px-3 py-2 rounded-2xl text-small leading-relaxed",
                            isCustomer && "bg-ink-700 text-fg rounded-bl-sm",
                            isAI && "bg-ink-600 border border-line text-fg rounded-br-sm",
                            isOwner && "bg-brand text-white rounded-br-sm"
                          )}
                        >
                          {!grouped && (
                            <p className="text-[10px] font-semibold opacity-70 mb-0.5 flex items-center gap-1">
                              {isAI && <Bot className="w-2.5 h-2.5" />}
                              {isOwner && <Sparkles className="w-2.5 h-2.5" />}
                              {isCustomer && <User className="w-2.5 h-2.5" />}
                              {isAI ? "Assistant" : isOwner ? "You" : (active.customer_name ?? initials(active.customer_name ?? "C"))}
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

              {/* Composer */}
              <form onSubmit={handleSend} className="border-t border-line p-2.5 bg-ink-900">
                {showTemplates && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.title}
                        type="button"
                        onClick={() => { setComposerText(t.body); setShowTemplates(false); }}
                        className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.04] border border-line text-fg-muted hover:text-fg hover:border-line-strong cursor-pointer"
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 bg-ink-800 border border-line-strong rounded-xl p-1.5 focus-within:border-brand/50">
                  <button
                    type="button"
                    onClick={() => setShowTemplates((s) => !s)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-white/[0.04] cursor-pointer shrink-0"
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
                    placeholder={active.ai_paused ? "Type your reply…" : "Type to take over, or let the AI continue…"}
                    rows={1}
                    className="flex-1 bg-transparent outline-none text-small text-fg placeholder:text-fg-faint resize-none max-h-28 leading-relaxed py-1.5"
                    style={{ minHeight: "32px" }}
                  />
                  <button
                    type="submit"
                    disabled={!composerText.trim() || sending}
                    className="h-8 w-8 rounded-lg bg-brand text-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 hover:bg-brand-hover transition-colors"
                    title="Send (⌘↵)"
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-fg-subtle mt-1 px-1">Via WhatsApp · ⌘↵ to send</p>
              </form>
            </>
          )}
        </div>

        {/* Profile pane */}
        {active && (
          <div className="panel hidden xl:flex flex-col overflow-hidden !p-0">
            <div className="p-4 border-b border-line text-center">
              <Avatar name={active.customer_name ?? active.customer_phone} size={52} className="mx-auto mb-2" />
              <p className="text-small font-semibold text-fg">{active.customer_name ?? "Unknown"}</p>
              <p className="text-[11px] text-fg-muted mt-0.5">{formatPhone(active.customer_phone)}</p>
              <div className="mt-3 flex justify-center gap-2">
                <a href={`tel:${active.customer_phone.replace(/[^0-9+]/g, "")}`} className="h-8 px-3 rounded-lg bg-white/[0.04] border border-line text-[11px] font-medium text-fg hover:bg-white/[0.08] cursor-pointer flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Call
                </a>
                <a href={`https://wa.me/${active.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-lg bg-brand/15 border border-brand/30 text-[11px] font-medium text-brand hover:bg-brand/20 cursor-pointer flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              <InfoRow label="Status">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={active.status === "active" ? "brand" : active.status === "escalated" ? "warning" : "neutral"} dot>{active.status}</Badge>
                  {active.ai_paused && <Badge tone="warning">AI paused</Badge>}
                </div>
              </InfoRow>
              <InfoRow label="First contact">
                <p className="text-small text-fg num">{formatDateTime(active.created_at)}</p>
              </InfoRow>
              <InfoRow label="Last active">
                <p className="text-small text-fg num">{formatDateTime(active.updated_at)}</p>
              </InfoRow>
              <InfoRow label="Messages">
                <p className="text-small text-fg num">{messages.length}</p>
              </InfoRow>
              {active.notes && (
                <InfoRow label="Notes">
                  <p className="text-small text-fg whitespace-pre-wrap">{active.notes}</p>
                </InfoRow>
              )}
            </div>
          </div>
        )}
      </div>
    </>
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
