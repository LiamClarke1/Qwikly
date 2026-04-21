"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message, Booking } from "@/lib/types";

const STATUS_BADGE: Record<Conversation["status"], string> = {
  active: "bg-green-500/10 text-green-400 border border-green-500/20",
  completed: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  escalated: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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

      const { data: msgs } = await supabase
        .from("messages_log")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (msgs) {
        setMessages(msgs as Message[]);
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
        <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
        <div className="space-y-3 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div className="h-16 w-2/3 bg-slate-800 rounded-xl animate-pulse" />
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
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to conversations
        </Link>
        <p className="text-slate-400 text-center py-16">
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
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to conversations
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">
          {conversation.customer_name || conversation.customer_phone}
        </h1>
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[conversation.status]}`}
        >
          {conversation.status}
        </span>
        <span className="text-slate-500 text-sm ml-auto">
          Started {format(new Date(conversation.created_at), "d MMM yyyy, HH:mm")}
        </span>
      </div>

      {/* Message Thread */}
      <div
        ref={scrollRef}
        className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">
            No messages in this conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isAssistant = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex ${isAssistant ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isAssistant
                      ? "bg-blue-600/20 border border-blue-500/30"
                      : "bg-slate-800"
                  }`}
                >
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
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
        <div className="mt-6 bg-slate-900/60 border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
              <CalendarCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Booking confirmed
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
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
