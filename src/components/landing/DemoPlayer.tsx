"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface DemoMessage {
  sender: "customer" | "ai";
  text: string;
  delay: number;
}

type ToneId = "friendly" | "direct" | "professional" | "casual";

const tones: { id: ToneId; label: string; sub: string }[] = [
  { id: "friendly", label: "Friendly & warm", sub: "Like your best employee" },
  { id: "direct",   label: "Direct & efficient", sub: "No fluff, just booked" },
  { id: "professional", label: "Professional", sub: "Formal and polished" },
  { id: "casual",   label: "Laid-back", sub: "Conversational, easy-going" },
];

const toneMessages: Record<ToneId, DemoMessage[]> = {
  friendly: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Hi! Yes, we can definitely sort that out. Is it a constant drip or does it run when you use the tap?", delay: 1400 },
    { sender: "customer", text: "It's a constant drip. Getting worse.", delay: 2800 },
    { sender: "ai", text: "That's usually a washer or cartridge — quick fix. What suburb are you in?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "We're in Midrand tomorrow. I have 9am or 1pm available. Which works for you?", delay: 7000 },
    { sender: "customer", text: "9am please", delay: 8400 },
    { sender: "ai", text: "Done! Booked for 9am tomorrow in Midrand. You'll get a confirmation now and a reminder in the morning. What's your name?", delay: 9800 },
  ],
  direct: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Hi. Constant drip or only when you use the tap?", delay: 1400 },
    { sender: "customer", text: "Constant drip.", delay: 2800 },
    { sender: "ai", text: "Washer or cartridge — straightforward job. Suburb?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "Midrand: 9am or 1pm tomorrow. Which?", delay: 7000 },
    { sender: "customer", text: "9am", delay: 8400 },
    { sender: "ai", text: "9am booked. Confirmation on its way. Your name?", delay: 9800 },
  ],
  professional: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Good day. Thank you for reaching out. Is the leak continuous or does it occur when the tap is in use?", delay: 1400 },
    { sender: "customer", text: "It's continuous.", delay: 2800 },
    { sender: "ai", text: "That typically indicates a worn washer or cartridge — a minor repair. May I confirm your suburb?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "We have availability in Midrand tomorrow at 9:00am or 1:00pm. Which time would suit you?", delay: 7000 },
    { sender: "customer", text: "9am please", delay: 8400 },
    { sender: "ai", text: "Your appointment is confirmed for 9:00am tomorrow in Midrand. You will receive a booking confirmation shortly. May I take your name?", delay: 9800 },
  ],
  casual: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Hey! Sure thing, we can sort that no problem. Is it dripping all the time or just when you turn it on?", delay: 1400 },
    { sender: "customer", text: "All the time. Getting annoying.", delay: 2800 },
    { sender: "ai", text: "Yeah that's probably just a washer — easy fix honestly. What area are you in?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "Cool, we're in Midrand tomorrow! Morning slot at 9 or afternoon at 1 — which works better for you?", delay: 7000 },
    { sender: "customer", text: "9am works", delay: 8400 },
    { sender: "ai", text: "Sorted! See you at 9am tomorrow in Midrand. I'll send you a confirmation now and ping you in the morning. What's your name?", delay: 9800 },
  ],
};

const otherScenarios: { id: string; label: string; messages: DemoMessage[] }[] = [
  {
    id: "after-hours",
    label: "After-hours emergency",
    messages: [
      { sender: "customer", text: "URGENT — my geyser just burst. It's 11pm. Is anyone available?", delay: 0 },
      { sender: "ai", text: "Sorry to hear that — turn off the mains water now if you haven't. We have an emergency callout available. Which area?", delay: 1400 },
      { sender: "customer", text: "Bryanston. Mains is off.", delay: 2800 },
      { sender: "ai", text: "Good. Our tech can be there in about 45 minutes. Emergency callout is R1,200 + parts. Want me to book it?", delay: 4200 },
      { sender: "customer", text: "Yes please, as soon as possible", delay: 5600 },
      { sender: "ai", text: "Booked. Tech is on his way. You'll get his number so you can track him. ETA 11:45pm. Stay dry!", delay: 7000 },
    ],
  },
  {
    id: "quote-request",
    label: "Customer asking for a quote",
    messages: [
      { sender: "customer", text: "How much would it cost to install solar panels on a 3-bedroom house?", delay: 0 },
      { sender: "ai", text: "Great question. A standard 3-bed setup with 6 panels and a 5kWh battery runs R85,000 to R110,000 installed. That's typically paid back in 4–5 years. Are you grid-tied or looking for full off-grid?", delay: 1400 },
      { sender: "customer", text: "Grid-tied would be fine. I just want to reduce my Eskom bill.", delay: 2800 },
      { sender: "ai", text: "Grid-tied is the sweet spot for most homes. We can do a free site assessment and give you an exact quote. Which area are you in and when works for a visit?", delay: 4200 },
      { sender: "customer", text: "Cape Town. Next week sometime.", delay: 5600 },
      { sender: "ai", text: "I've got Tuesday or Thursday next week for a free assessment. Which day works?", delay: 7000 },
      { sender: "customer", text: "Thursday", delay: 8400 },
      { sender: "ai", text: "Locked in. Thursday assessment confirmed in Cape Town. What's your name so I can send the details?", delay: 9800 },
    ],
  },
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#1f2c34] px-4 py-3 rounded-xl flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#8696a0]" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#8696a0]" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#8696a0]" />
      </div>
    </div>
  );
}

export function DemoPlayer() {
  const [activeTone, setActiveTone] = useState<ToneId>("friendly");
  const [activeScenario, setActiveScenario] = useState<string>("leaking-tap");
  const [visibleMessages, setVisibleMessages] = useState<DemoMessage[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const play = (messages: DemoMessage[]) => {
    clearTimeouts();
    setVisibleMessages([]);
    setShowTyping(false);
    setPlaying(true);

    messages.forEach((msg, i) => {
      if (msg.sender === "ai") {
        timeoutsRef.current.push(setTimeout(() => setShowTyping(true), msg.delay));
        timeoutsRef.current.push(
          setTimeout(() => {
            setShowTyping(false);
            setVisibleMessages((prev) => [...prev, msg]);
          }, msg.delay + 900)
        );
      } else {
        timeoutsRef.current.push(
          setTimeout(() => setVisibleMessages((prev) => [...prev, msg]), msg.delay)
        );
      }
      if (i === messages.length - 1) {
        timeoutsRef.current.push(setTimeout(() => setPlaying(false), msg.delay + 1200));
      }
    });
  };

  const getMessages = (scenario: string, tone: ToneId): DemoMessage[] => {
    if (scenario === "leaking-tap") return toneMessages[tone];
    return otherScenarios.find((s) => s.id === scenario)?.messages ?? toneMessages[tone];
  };

  useEffect(() => {
    play(getMessages(activeScenario, activeTone));
    return clearTimeouts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, showTyping]);

  const handleTone = (tone: ToneId) => {
    setActiveTone(tone);
    if (activeScenario === "leaking-tap") play(toneMessages[tone]);
  };

  const handleScenario = (id: string) => {
    setActiveScenario(id);
    play(getMessages(id, activeTone));
  };

  const activeToneLabel = tones.find((t) => t.id === activeTone)?.label ?? "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left panel */}
      <div className="lg:col-span-4 space-y-5">

        {/* Tone selector */}
        <div>
          <p className="eyebrow text-ink-500 mb-3">Voice &amp; tone</p>
          <div className="grid grid-cols-2 gap-2">
            {tones.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTone(t.id)}
                className={cn(
                  "text-left px-3.5 py-3 rounded-xl border text-xs font-medium cursor-pointer transition-all duration-200",
                  activeTone === t.id
                    ? "bg-ink text-paper border-ink"
                    : "bg-white/60 text-ink-700 border-ink/12 hover:border-ink/25 hover:bg-white"
                )}
              >
                <p className="font-semibold leading-snug">{t.label}</p>
                <p className={cn("mt-0.5 leading-snug", activeTone === t.id ? "text-paper/60" : "text-ink-400")}>{t.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario selector */}
        <div>
          <p className="eyebrow text-ink-500 mb-3">Choose a scenario</p>
          <div className="space-y-2">
            <button
              onClick={() => handleScenario("leaking-tap")}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200",
                activeScenario === "leaking-tap"
                  ? "bg-ink text-paper border-ink"
                  : "bg-white/60 text-ink-700 border-ink/12 hover:border-ink/25 hover:bg-white"
              )}
            >
              Show me a leaking-tap booking
            </button>
            {otherScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => handleScenario(s.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200",
                  activeScenario === s.id
                    ? "bg-ink text-paper border-ink"
                    : "bg-white/60 text-ink-700 border-ink/12 hover:border-ink/25 hover:bg-white"
                )}
              >
                {s.label === "After-hours emergency" ? "Show me an after-hours emergency" : "Show me a customer asking for a quote"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => play(getMessages(activeScenario, activeTone))}
          disabled={playing}
          className="w-full px-4 py-3 rounded-xl border border-ember/30 text-ember text-sm font-medium cursor-pointer hover:bg-ember/5 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {playing ? "Playing…" : "↺ Replay"}
        </button>

        <div className="p-4 bg-ink/4 rounded-xl border border-ink/8">
          <p className="text-xs text-ink-500 leading-relaxed">
            Your assistant uses <span className="font-semibold text-ink-700">{activeToneLabel}</span> tone — set once during setup, applied to every conversation automatically.
          </p>
        </div>
      </div>

      {/* Chat player */}
      <div className="lg:col-span-8">
        <div className="bg-[#0b141a] rounded-[1.75rem] overflow-hidden shadow-2xl shadow-black/25">
          {/* Header */}
          <div className="bg-[#1f2c34] px-4 pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center shrink-0">
              <span className="text-[#00a884] text-xs font-bold">Q</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Qwikly — {activeToneLabel}</p>
              <p className="text-[#8696a0] text-[10px]">{playing ? "Replying…" : "online · replies in 30s"}</p>
            </div>
            <div className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors duration-300 shrink-0",
              playing ? "bg-[#00a884]/15 text-[#00a884]" : "bg-white/5 text-[#8696a0]"
            )}>
              {playing ? "● live" : "ready"}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="px-3 py-4 space-y-2 h-[400px] overflow-y-auto scrollbar-thin">
            {visibleMessages.length === 0 && !playing && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#8696a0] text-sm">Select a scenario above to watch it play</p>
              </div>
            )}
            {visibleMessages.length > 0 && (
              <div className="flex justify-center mb-1">
                <span className="bg-[#00a884]/10 text-[#00a884] text-[10px] px-3 py-1 rounded-full border border-[#00a884]/20 font-medium">
                  Replied in 28 seconds
                </span>
              </div>
            )}
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`max-w-[82%] px-3 py-2.5 rounded-xl text-[12px] leading-[1.5] ${
                  msg.sender === "customer" ? "bg-[#005c4b] text-white" : "bg-[#1f2c34] text-[#e9edef]"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {showTyping && <TypingIndicator />}
          </div>

          {/* Input bar */}
          <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
              <span className="text-[#8696a0] text-[11px]">Handled automatically — no input needed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
