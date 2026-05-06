"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, FileText, Image as ImageIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import type { Conversation, Message, Booking } from "@/lib/types";

interface ConvDoc {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: "business" | "visitor";
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_BADGE: Record<Conversation["status"], string> = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20",
  completed: "bg-ink/[0.06] text-fg-muted border border-ink/[0.12]",
  escalated: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
};

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<(Message & { document?: ConvDoc | null })[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const downloadDoc = async (docId: string) => {
    const r = await fetch(`/api/documents/${docId}/url`);
    if (!r.ok) return;
    const { url } = await r.json();
    if (url) window.open(url, "_blank", "noopener");
  };

  useEffect(() => {
    async function fetchData() {
      const { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (!convo) {
        setLoading(false);
        return;
      }

      setConversation(convo as Conversation);

      const [{ data: msgs }, { data: docsData }] = await Promise.all([
        supabase.from("messages_log").select("*").eq("conversation_id", id).order("created_at", { ascending: true }),
        supabase.from("conversation_documents").select("id, file_name, file_size, file_type, uploaded_by").eq("conversation_id", id).eq("status", "active"),
      ]);

      if (msgs) {
        const docsMap = Object.fromEntries(((docsData ?? []) as ConvDoc[]).map((d) => [d.id, d]));
        setMessages(
          (msgs as (Message & { message_type?: string; attachment_id?: string })[]).map((m) => ({
            ...m,
            document: m.attachment_id ? (docsMap[m.attachment_id] ?? null) : null,
          }))
        );
      }

      const { data: linkedBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("conversation_id", id)
        .limit(1)
        .maybeSingle();

      if (linkedBooking) {
        setBooking(linkedBooking as Booking);
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-5 w-48 bg-ink/[0.08] rounded animate-pulse" />
        <div className="h-8 w-64 bg-ink/[0.08] rounded animate-pulse" />
        <div className="space-y-3 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div className="h-16 w-2/3 bg-ink/[0.08] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link
          href="/dashboard/conversations"
          className="inline-flex items-center gap-2 text-fg-muted hover:text-fg transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to conversations
        </Link>
        <p className="text-fg-subtle text-center py-16">
          Conversation not found.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/conversations"
        className="inline-flex items-center gap-2 text-fg-muted hover:text-fg transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to conversations
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-fg">
          {conversation.customer_name || conversation.customer_phone}
        </h1>
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[conversation.status]}`}
        >
          {conversation.status}
        </span>
        <span className="text-fg-subtle text-sm ml-auto">
          Started {format(new Date(conversation.created_at), "d MMM yyyy, HH:mm")}
        </span>
      </div>

      {/* Message Thread */}
      <div
        ref={scrollRef}
        className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-ink/20 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <p className="text-fg-subtle text-sm text-center py-12">
            No messages in this conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isAssistant = msg.role === "assistant";
            const isOwner = msg.role === "owner";

            if ((msg as { message_type?: string }).message_type === "document" && msg.document) {
              const doc = msg.document;
              const isImg = doc.file_type?.startsWith("image/");
              return (
                <div key={msg.id} className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
                  <div className={cn(
                    "flex items-center gap-3 max-w-[75%] rounded-xl px-3 py-2.5",
                    isOwner ? "bg-brand/10 border border-brand/25" : "bg-surface-input border border-[var(--border)]"
                  )}>
                    <div className="w-8 h-8 rounded-lg bg-surface-hover border border-[var(--border)] flex items-center justify-center shrink-0">
                      {isImg ? <ImageIcon className="w-4 h-4 text-fg-muted" /> : <FileText className="w-4 h-4 text-fg-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg truncate">{doc.file_name}</p>
                      <p className="text-xs text-fg-subtle mt-0.5">
                        {formatBytes(doc.file_size)} · {doc.uploaded_by === "visitor" ? "From visitor" : "Sent by you"}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadDoc(doc.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-hover cursor-pointer transition-colors shrink-0"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isAssistant || isOwner ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isAssistant || isOwner
                      ? "bg-brand/10 border border-brand/25"
                      : "bg-surface-input border border-[var(--border)]"
                  }`}
                >
                  <p className="text-sm text-fg whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <p className="text-xs text-fg-subtle mt-1.5">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Linked Booking */}
      {booking && (
        <div className="mt-6 bg-surface-card border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
              <CalendarCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">
                Booking confirmed
              </p>
              <p className="text-xs text-fg-muted mt-0.5">
                {booking.customer_name} &middot; {booking.job_type} &middot;{" "}
                {booking.booking_datetime ? format(new Date(booking.booking_datetime), "d MMM yyyy, HH:mm") : "TBC"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
