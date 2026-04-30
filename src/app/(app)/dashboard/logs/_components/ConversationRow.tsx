"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  MessageSquare,
  Mail,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";

export interface LogConversation {
  id: string;
  created_at: string;
  updated_at: string;
  channel: "web_chat" | "whatsapp" | "email" | null;
  customer_phone: string | null;
  visitor_id: string | null;
  page_url: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  lead_captured: boolean | null;
  status: string | null;
  messages_log: { count: number }[];
}

interface MessageLog {
  id: string;
  role: string;
  content: string;
  created_at: string;
  retrieved_sources: { id: string; title: string; similarity?: number }[] | null;
  training_status: "correct" | "needs_fix" | null;
}

interface ConversationRowProps {
  convo: LogConversation;
}

function ChannelBadge({ channel }: { channel: LogConversation["channel"] }) {
  if (channel === "web_chat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
        <Globe className="w-3 h-3" />
        Web
      </span>
    );
  }
  if (channel === "email") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-sky-50 text-sky-700">
        <Mail className="w-3 h-3" />
        Email
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
      <MessageSquare className="w-3 h-3" />
      WhatsApp
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: LogConversation["sentiment"] }) {
  if (sentiment === "positive") {
    return (
      <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-green-50 text-green-700">
        Positive
      </span>
    );
  }
  if (sentiment === "negative") {
    return (
      <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-red-50 text-red-600">
        Negative
      </span>
    );
  }
  if (sentiment === "neutral") {
    return (
      <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-slate-100 text-slate-600">
        Neutral
      </span>
    );
  }
  return (
    <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-slate-50 text-slate-400">
      Unclassified
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "completed") {
    return (
      <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-slate-100 text-slate-600">
        Done
      </span>
    );
  }
  if (status === "escalated") {
    return (
      <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-amber-50 text-amber-700">
        Escalated
      </span>
    );
  }
  return (
    <span className="rounded-full text-xs px-2 py-0.5 font-medium bg-blue-50 text-blue-700">
      Active
    </span>
  );
}

function TrainingButton({
  label,
  active,
  variant,
  onClick,
}: {
  label: string;
  active: boolean;
  variant: "correct" | "needs_fix";
  onClick: () => void;
}) {
  const activeClass =
    variant === "correct"
      ? "bg-green-50 text-green-700 border border-green-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer",
        active ? activeClass : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
      )}
    >
      {label}
    </button>
  );
}

export function ConversationRow({ convo }: ConversationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [trainingStatuses, setTrainingStatuses] = useState<Record<string, "correct" | "needs_fix" | null>>({});

  const messageCount =
    Array.isArray(convo.messages_log) && convo.messages_log.length > 0
      ? (convo.messages_log[0] as { count: number }).count
      : 0;

  const visitorLabel =
    convo.customer_phone ?? convo.visitor_id ?? "Anonymous";

  const truncate = (str: string | null, max = 40) => {
    if (!str) return "—";
    return str.length > max ? str.slice(0, max) + "…" : str;
  };

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (messages.length > 0) return;

    setLoadingMessages(true);
    const { data } = await supabase
      .from("messages_log")
      .select("id, role, content, created_at, retrieved_sources, training_status")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });
    const msgs = (data as MessageLog[]) ?? [];
    setMessages(msgs);
    // Seed local training state from DB
    const initial: Record<string, "correct" | "needs_fix" | null> = {};
    msgs.forEach((m) => { initial[m.id] = m.training_status; });
    setTrainingStatuses(initial);
    setLoadingMessages(false);
  };

  const handleTraining = async (
    messageId: string,
    status: "correct" | "needs_fix"
  ) => {
    // Optimistic update
    setTrainingStatuses((prev) => ({ ...prev, [messageId]: status }));
    await fetch(`/api/logs/${convo.id}/training`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, status }),
    });
  };

  return (
    <div className="border-b border-ink/[0.08] last:border-b-0">
      {/* Row */}
      <button
        onClick={handleExpand}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
      >
        <span className="text-ink-400 shrink-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        {/* Channel */}
        <div className="w-24 shrink-0">
          <ChannelBadge channel={convo.channel} />
        </div>

        {/* Visitor */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink font-medium truncate">
            {truncate(visitorLabel, 30)}
          </p>
          {convo.page_url && (
            <p className="text-[11px] text-ink-400 truncate mt-0.5">
              {truncate(convo.page_url, 50)}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className="w-24 shrink-0 text-right hidden sm:block">
          <p className="text-[11px] text-ink-500 num">{timeAgo(convo.updated_at)}</p>
          <p className="text-[10px] text-ink-400 num">{formatDateTime(convo.created_at)}</p>
        </div>

        {/* Message count */}
        <div className="w-12 shrink-0 text-center hidden md:block">
          <span className="text-xs text-ink-500 num font-medium">{messageCount}</span>
          <p className="text-[10px] text-ink-400">msgs</p>
        </div>

        {/* Lead captured */}
        <div className="w-8 shrink-0 flex justify-center hidden md:flex">
          {convo.lead_captured ? (
            <span title="Lead captured" className="w-2 h-2 rounded-full bg-green-500 block mt-0.5" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-200 block mt-0.5" />
          )}
        </div>

        {/* Sentiment */}
        <div className="w-24 shrink-0 hidden lg:block">
          <SentimentBadge sentiment={convo.sentiment} />
        </div>

        {/* Status */}
        <div className="w-20 shrink-0 hidden lg:block">
          <StatusBadge status={convo.status} />
        </div>
      </button>

      {/* Expanded transcript */}
      {expanded && (
        <div className="border-t border-ink/[0.06] bg-slate-50/60 px-4 pb-5 pt-4">
          {loadingMessages ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-200/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-ink-400 italic">No messages in this conversation.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isUser =
                  msg.role === "customer" || msg.role === "user";
                const isAssistant =
                  msg.role === "assistant" || msg.role === "ai";

                return (
                  <div
                    key={msg.id}
                    className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-ember/10 border border-ember/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-ember" />
                      </div>
                    )}

                    <div className={cn("max-w-[75%] space-y-1.5", isUser && "items-end flex flex-col")}>
                      {/* Bubble */}
                      <div
                        className={cn(
                          "px-3 py-2 rounded-xl text-[12px] leading-relaxed",
                          isUser
                            ? "bg-ink text-white rounded-br-sm"
                            : "bg-white border border-ink/[0.08] text-ink rounded-bl-sm shadow-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1 num",
                            isUser ? "text-white/60 text-right" : "text-ink-400"
                          )}
                        >
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>

                      {/* Retrieved sources (assistant only) */}
                      {isAssistant &&
                        Array.isArray(msg.retrieved_sources) &&
                        msg.retrieved_sources.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {msg.retrieved_sources.map((src) => (
                              <span
                                key={src.id}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium"
                              >
                                {src.title}
                              </span>
                            ))}
                          </div>
                        )}

                      {/* Training buttons (assistant only) */}
                      {isAssistant && (
                        <div className="flex gap-1.5 items-center">
                          <CheckCircle2 className="w-3 h-3 text-ink-400 shrink-0" />
                          <TrainingButton
                            label="Correct"
                            active={trainingStatuses[msg.id] === "correct"}
                            variant="correct"
                            onClick={() => handleTraining(msg.id, "correct")}
                          />
                          <AlertTriangle className="w-3 h-3 text-ink-400 shrink-0" />
                          <TrainingButton
                            label="Needs fix"
                            active={trainingStatuses[msg.id] === "needs_fix"}
                            variant="needs_fix"
                            onClick={() => handleTraining(msg.id, "needs_fix")}
                          />
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3 h-3 text-slate-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
