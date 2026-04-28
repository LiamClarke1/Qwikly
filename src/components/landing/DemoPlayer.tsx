"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface DemoMessage {
  sender: "customer" | "ai";
  text: string;
  delay: number;
}

interface Scenario {
  id: string;
  label: string;
  description: string;
  messages: DemoMessage[];
}

const scenarios: Scenario[] = [
  {
    id: "leaking-tap",
    label: "Leaking tap booking",
    description: "Show me a leaking-tap booking",
    messages: [
      { sender: "customer", text: "Hi, I have a leaking tap in the kitchen. Can someone come tomorrow?", delay: 0 },
      { sender: "ai", text: "Hi! Yes, we can definitely sort that out. Is it a constant drip or does it run when you use the tap?", delay: 1400 },
      { sender: "customer", text: "It's a constant drip. Getting worse.", delay: 2800 },
      { sender: "ai", text: "That's usually a washer or cartridge — quick fix. What suburb are you in?", delay: 4200 },
      { sender: "customer", text: "Midrand.", delay: 5600 },
      { sender: "ai", text: "We're in Midrand tomorrow. I have 9am or 1pm available. Which works for you?", delay: 7000 },
      { sender: "customer", text: "9am please", delay: 8400 },
      { sender: "ai", text: "Done! Booked for 9am tomorrow in Midrand. You'll get a confirmation now and a reminder in the morning. What's your name?", delay: 9800 },
    ],
  },
  {
    id: "after-hours",
    label: "After-hours emergency",
    description: "Show me an after-hours emergency",
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
    description: "Show me a customer asking for a quote",
    messages: [
      { sender: "customer", text: "How much would it cost to install solar panels on a 3-bedroom house?", delay: 0 },
      { sender: "ai", text: "Great question. A standard 3-bed setup with 6 panels and a 5kWh battery runs R85,000 to R110,000 installed. That's typically paid back in 4–5 years. Are you grid-tied or looking for full off-grid?", delay: 1400 },
      { sender: "customer", text: "Grid-tied would be fine. I just want to reduce my Eskom bill.", delay: 2800 },
      { sender: "ai", text: "Grid-tied is the sweet spot for most homes. We can do a free site assessment and give you an exact quote. Which area are you in and when works for a visit?", delay: 4200 },
      { sender: "customer", text: "Cape Town. Next week sometime.", delay: 5600 },
      { sender: "ai", text: "Perfect. I've got Tuesday or Thursday next week for a free assessment. Which day works?", delay: 7000 },
      { sender: "customer", text: "Thursday", delay: 8400 },
      { sender: "ai", text: "Locked in. Thursday assessment confirmed. What's your name so I can send the details?", delay: 9800 },
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
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const [visibleMessages, setVisibleMessages] = useState<DemoMessage[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scenario = scenarios.find((s) => s.id === activeId)!;

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const play = (s: Scenario) => {
    clearTimeouts();
    setVisibleMessages([]);
    setShowTyping(false);
    setPlaying(true);

    s.messages.forEach((msg, i) => {
      const isAi = msg.sender === "ai";

      if (isAi) {
        const typingStart = timeoutsRef.current.push(
          setTimeout(() => setShowTyping(true), msg.delay)
        );
        void typingStart;
        timeoutsRef.current.push(
          setTimeout(() => {
            setShowTyping(false);
            setVisibleMessages((prev) => [...prev, msg]);
          }, msg.delay + 900)
        );
      } else {
        timeoutsRef.current.push(
          setTimeout(() => {
            setVisibleMessages((prev) => [...prev, msg]);
          }, msg.delay)
        );
      }

      if (i === s.messages.length - 1) {
        timeoutsRef.current.push(
          setTimeout(() => setPlaying(false), msg.delay + 1200)
        );
      }
    });
  };

  useEffect(() => {
    play(scenario);
    return clearTimeouts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages, showTyping]);

  const handleScenario = (id: string) => {
    setActiveId(id);
    const s = scenarios.find((sc) => sc.id === id)!;
    play(s);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Scenario buttons */}
      <div className="lg:col-span-4 space-y-2">
        <p className="eyebrow text-ink-500 mb-4">Choose a scenario</p>
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => handleScenario(s.id)}
            className={cn(
              "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-300",
              activeId === s.id
                ? "bg-ink text-paper border-ink shadow-ink"
                : "bg-white/60 text-ink-700 border-ink/12 hover:border-ink/25 hover:bg-white"
            )}
          >
            {s.description}
          </button>
        ))}

        <button
          onClick={() => play(scenario)}
          disabled={playing}
          className="w-full mt-2 px-4 py-3 rounded-xl border border-ember/30 text-ember text-sm font-medium cursor-pointer hover:bg-ember/5 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {playing ? "Playing…" : "↺ Replay"}
        </button>

        <div className="mt-4 p-4 bg-ink/4 rounded-xl border border-ink/8">
          <p className="text-xs text-ink-500 leading-relaxed">
            This is how Qwikly replies to real customers — in your business voice, with your prices, 24 hours a day.
          </p>
        </div>
      </div>

      {/* Chat player */}
      <div className="lg:col-span-8">
        <div className="bg-[#0b141a] rounded-[1.75rem] overflow-hidden shadow-2xl shadow-black/25">
          {/* Header */}
          <div className="bg-[#1f2c34] px-4 pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#00a884] text-xs font-bold">Q</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Qwikly — {scenario.label.split(" ")[0]} demo</p>
              <p className="text-[#8696a0] text-[10px]">
                {playing ? "Replying…" : "online · replies in 30s"}
              </p>
            </div>
            <div className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors duration-300",
              playing ? "bg-[#00a884]/15 text-[#00a884]" : "bg-white/5 text-[#8696a0]"
            )}>
              {playing ? "● live" : "ready"}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="px-3 py-4 space-y-2 h-[380px] overflow-y-auto scrollbar-thin"
          >
            {visibleMessages.length === 0 && !playing && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#8696a0] text-sm">Select a scenario to watch it play</p>
              </div>
            )}

            <div className="flex justify-center mb-1">
              {visibleMessages.length > 0 && (
                <span className="bg-[#00a884]/10 text-[#00a884] text-[10px] px-3 py-1 rounded-full border border-[#00a884]/20 font-medium">
                  Replied in 28 seconds
                </span>
              )}
            </div>

            {visibleMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[82%] px-3 py-2.5 rounded-xl text-[12px] leading-[1.5] ${
                    msg.sender === "customer"
                      ? "bg-[#005c4b] text-white"
                      : "bg-[#1f2c34] text-[#e9edef]"
                  }`}
                >
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
