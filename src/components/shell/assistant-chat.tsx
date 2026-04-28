"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, ArrowUp, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "How do I connect my WhatsApp number?",
  "How do automations work?",
  "How do I send a campaign?",
  "What does the AI on/off toggle do?",
];

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hey! I'm your Qwikly assistant. Ask me anything — setup, features, how something works. I've got you.",
        },
      ]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? "Something went wrong. Try again.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Connection error. Check your network and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showStarters = messages.length === 1 && messages[0].role === "assistant" && !loading;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className={cn(
          "fixed bottom-6 right-6 z-50 group w-13 h-13 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-200 cursor-pointer",
          "w-12 h-12 bg-[#0D111A] border border-white/[0.1] hover:border-brand/50 hover:shadow-[0_4px_24px_rgba(232,90,44,0.25)]",
          open && "pointer-events-none opacity-0"
        )}
      >
        <MessageSquare className="w-5 h-5 text-fg-muted group-hover:text-brand transition-colors duration-200" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand border-2 border-[#111827]" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex flex-col",
            "w-[380px] max-w-[calc(100vw-24px)]",
            "h-[540px] max-h-[calc(100vh-48px)]",
            "rounded-2xl overflow-hidden",
            "bg-[#080C14] border border-white/[0.07]",
            "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)]",
            "motion-safe:animate-[slideUp_180ms_ease-out]"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] shrink-0">
            <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-brand" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-small font-semibold text-fg leading-none">Platform Assistant</p>
              <p className="text-tiny text-fg-subtle mt-0.5">Qwikly · Always on</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-white/[0.05] transition-all duration-150 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[82%] px-3.5 py-2.5 text-small leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-brand text-white rounded-2xl rounded-br-md"
                      : "bg-white/[0.05] text-fg rounded-2xl rounded-bl-md border border-white/[0.04]"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] border border-white/[0.04] rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle motion-safe:animate-[bounce_1.2s_ease-in-out_infinite_0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle motion-safe:animate-[bounce_1.2s_ease-in-out_infinite_200ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle motion-safe:animate-[bounce_1.2s_ease-in-out_infinite_400ms]" />
                </div>
              </div>
            )}

            {/* Starter prompts */}
            {showStarters && (
              <div className="pt-2 grid grid-cols-1 gap-1.5">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-small text-fg-muted hover:text-fg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-150 cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] shrink-0">
            <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 focus-within:border-brand/30 transition-colors duration-150">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                disabled={loading}
                rows={1}
                className="flex-1 bg-transparent outline-none text-small text-fg placeholder:text-fg-faint resize-none leading-relaxed disabled:opacity-50 min-h-[20px]"
                style={{ height: "20px" }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 transition-opacity duration-150 cursor-pointer shrink-0 mb-0.5"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-tiny text-fg-subtle text-center mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  );
}
