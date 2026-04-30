"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, ArrowUp, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "How do I see my incoming leads?",
  "How do I customise my digital assistant?",
  "How do I connect my WhatsApp number?",
  "How do bookings get captured automatically?",
];

// Bottom-nav height on mobile (3.5rem = 56px)
const BOTTOM_NAV_PX = 56;

export function AssistantChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // ── Keyboard-aware positioning via visualViewport API ────────────────
  // With interactiveWidget=resizes-visual the layout viewport never
  // shrinks, so position:fixed elements don't auto-move above the
  // keyboard. We track the visual viewport directly and adjust manually.
  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    // On desktop the CSS handles everything; JS only needed on mobile
    if (!vv || window.innerWidth >= 768) return;

    const update = () => {
      const panel = panelRef.current;
      if (!panel) return;
      // How many pixels the keyboard is covering from the bottom
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Panel bottom sits above both the bottom-nav and the keyboard
      const bottomOffset = keyboardHeight + BOTTOM_NAV_PX;
      // Available height between panel top and panel bottom anchor
      const availableHeight = vv.height - BOTTOM_NAV_PX - 8;
      panel.style.bottom    = `${bottomOffset}px`;
      panel.style.maxHeight = `${Math.max(availableHeight, 200)}px`;
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update(); // run once immediately in case keyboard is already open

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      // Reset inline styles when closed so CSS takes over again
      if (panelRef.current) {
        panelRef.current.style.bottom    = "";
        panelRef.current.style.maxHeight = "";
      }
    };
  }, [open]);

  // ── Scroll messages container — never touches page scroll ────────────
  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hey! I'm your Qwikly assistant. Ask me anything — setup, features, how something works. I've got you.",
      }]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 30);
    return () => clearTimeout(t);
  }, [messages, loading, scrollToBottom]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "20px";

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res  = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, {
        role: "assistant",
        content: data.reply ?? "Something went wrong. Try again.",
      }]);
    } catch {
      setMessages([...next, {
        role: "assistant",
        content: "Connection error. Check your network and try again.",
      }]);
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
          "fixed right-4 md:right-6 z-40 group w-12 h-12 rounded-2xl",
          "flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
          "transition-all duration-200 cursor-pointer",
          "bg-[#0D111A] border border-white/[0.12]",
          "hover:border-[#E85A2C]/50 hover:shadow-[0_4px_24px_rgba(232,90,44,0.25)]",
          "bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:[bottom:max(1.5rem,env(safe-area-inset-bottom))]",
          open && "pointer-events-none opacity-0"
        )}
      >
        <MessageSquare className="w-5 h-5 text-slate-300 group-hover:text-[#E85A2C] transition-colors duration-200" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#E85A2C] border-2 border-[#0D111A]" />
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden",
            "bg-[#080C14] border border-white/[0.08]",
            "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)]",
            "motion-safe:animate-[slideUp_180ms_ease-out]",
            // Mobile: full-width sheet, CSS positions it; JS overrides bottom+maxHeight on keyboard open
            "left-0 right-0 rounded-t-2xl",
            "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
            "max-h-[60vh]",
            // Desktop: floating card, purely CSS
            "md:left-auto md:right-6",
            "md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]",
            "md:w-[380px] md:h-[540px] md:max-h-[calc(100vh-48px)] md:rounded-2xl"
          )}
        >
          {/* Header — shrink-0 keeps it always visible at the top */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07] shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#E85A2C]/10 border border-[#E85A2C]/20 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#E85A2C]" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-none">Platform Assistant</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Qwikly · Always on</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages — scrolls independently, page never moves */}
          <div
            ref={messagesRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2"
            style={{ touchAction: "pan-y" }}
          >
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-[#E85A2C] text-white rounded-2xl rounded-br-md"
                    : "bg-white/[0.07] text-slate-100 rounded-2xl rounded-bl-md border border-white/[0.06]"
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.07] border border-white/[0.06] rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 motion-safe:animate-[bounce_1.2s_ease-in-out_infinite_0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 motion-safe:animate-[bounce_1.2s_ease-in-out_infinite_200ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 motion-safe:animate-[bounce_1.2s_ease-in-out_infinite_400ms]" />
                </div>
              </div>
            )}

            {showStarters && (
              <div className="pt-2 grid grid-cols-1 gap-1.5">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.10] transition-all duration-150 cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input — shrink-0 keeps it always visible at the bottom */}
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.07] shrink-0">
            <div className="flex items-end gap-2 bg-white/[0.05] border border-white/[0.09] rounded-xl px-3.5 py-2.5 focus-within:border-[#E85A2C]/40 transition-colors duration-150">
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
                className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 resize-none leading-relaxed disabled:opacity-50 min-h-[20px]"
                style={{ height: "20px", fontSize: "16px" }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="w-7 h-7 rounded-lg bg-[#E85A2C] flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 transition-opacity duration-150 cursor-pointer shrink-0 mb-0.5"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  );
}
