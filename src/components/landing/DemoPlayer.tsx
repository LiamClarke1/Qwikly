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
  { id: "direct",   label: "Direct & efficient", sub: "No fluff, just results" },
  { id: "professional", label: "Professional", sub: "Formal and polished" },
  { id: "casual",   label: "Laid-back", sub: "Conversational, easy-going" },
];

const toneMessages: Record<ToneId, DemoMessage[]> = {
  friendly: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Hi! Happy to help. Is it a constant drip or does it only run when you use the tap?", delay: 1400 },
    { sender: "customer", text: "It's a constant drip. Getting worse.", delay: 2800 },
    { sender: "ai", text: "That's usually a worn washer — a quick fix. Which suburb are you in?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "Got it. What's your email so I can send your details through to the team? They'll reach out to confirm a time.", delay: 7000 },
    { sender: "customer", text: "john@gmail.com", delay: 8400 },
    { sender: "ai", text: "Done! Your details are with the team. You'll hear from them shortly.", delay: 9800 },
  ],
  direct: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Hi. Constant drip or only when in use?", delay: 1400 },
    { sender: "customer", text: "Constant drip.", delay: 2800 },
    { sender: "ai", text: "Worn washer. Easy job. Suburb?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "Email address so the team can reach you?", delay: 7000 },
    { sender: "customer", text: "john@gmail.com", delay: 8400 },
    { sender: "ai", text: "Sent. Team will be in touch to confirm a time.", delay: 9800 },
  ],
  professional: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Good day. Is the leak continuous or does it only occur when the tap is in use?", delay: 1400 },
    { sender: "customer", text: "It's continuous.", delay: 2800 },
    { sender: "ai", text: "That typically indicates a worn washer or cartridge. May I confirm your suburb?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "Thank you. Could you share your email address so the team can reach you to confirm availability?", delay: 7000 },
    { sender: "customer", text: "john@gmail.com", delay: 8400 },
    { sender: "ai", text: "Your enquiry has been logged. The team will be in touch shortly to arrange a suitable time.", delay: 9800 },
  ],
  casual: [
    { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
    { sender: "ai", text: "Hey! Sure, what's going on with it — dripping all the time or just when you use it?", delay: 1400 },
    { sender: "customer", text: "All the time. Getting annoying.", delay: 2800 },
    { sender: "ai", text: "Yeah sounds like just a washer, easy fix. What area are you in?", delay: 4200 },
    { sender: "customer", text: "Midrand.", delay: 5600 },
    { sender: "ai", text: "Nice, what's your email? I'll send your details across and the team will reach out to lock in a time.", delay: 7000 },
    { sender: "customer", text: "john@gmail.com", delay: 8400 },
    { sender: "ai", text: "Sorted! You'll hear from them soon.", delay: 9800 },
  ],
};

const otherScenarios: { id: string; label: string; messages: DemoMessage[] }[] = [
  {
    id: "after-hours",
    label: "After-hours emergency",
    messages: [
      { sender: "customer", text: "URGENT. My geyser just burst. It's 11pm. Is anyone available?", delay: 0 },
      { sender: "ai", text: "On it. First — shut off your mains water now if you haven't already. Which area are you in?", delay: 1400 },
      { sender: "customer", text: "Bryanston. Mains is off.", delay: 2800 },
      { sender: "ai", text: "Good. What's your email or number so the team can reach you right away?", delay: 4200 },
      { sender: "customer", text: "john@gmail.com", delay: 5600 },
      { sender: "ai", text: "Your emergency has been flagged as urgent. The team will contact you now. Stay safe.", delay: 7000 },
    ],
  },
  {
    id: "quote-request",
    label: "Customer asking for a quote",
    messages: [
      { sender: "customer", text: "How much would it cost to install solar panels on a 3-bedroom house?", delay: 0 },
      { sender: "ai", text: "Good question. It depends on a few things — are you looking to stay grid-tied or go fully off-grid?", delay: 1400 },
      { sender: "customer", text: "Grid-tied. I just want to cut my Eskom bill.", delay: 2800 },
      { sender: "ai", text: "Grid-tied is the most popular option. A free site assessment gives you an exact number. Which area are you in?", delay: 4200 },
      { sender: "customer", text: "Cape Town.", delay: 5600 },
      { sender: "ai", text: "Got it. What's your email so the team can reach you to set up the assessment?", delay: 7000 },
      { sender: "customer", text: "jane@gmail.com", delay: 8400 },
      { sender: "ai", text: "Details sent through. The team will be in touch to arrange a convenient time.", delay: 9800 },
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
              Leaking tap enquiry
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
                {s.label === "After-hours emergency" ? "After-hours emergency" : "Customer asking for a quote"}
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
            Your assistant uses <span className="font-semibold text-ink-700">{activeToneLabel}</span> tone, set once during setup and applied to every conversation automatically.
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
              <p className="text-white text-sm font-medium truncate">Qwikly · {activeToneLabel}</p>
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
              <span className="text-[#8696a0] text-[11px]">Handled automatically. No input needed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
