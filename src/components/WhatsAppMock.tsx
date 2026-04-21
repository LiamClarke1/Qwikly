"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, CheckCheck, Phone, Video, ChevronLeft, ChevronRight } from "lucide-react";

interface Message {
  text: string;
  sender: "customer" | "ai";
  time: string;
  delivered?: boolean;
  read?: boolean;
}

interface Conversation {
  businessName: string;
  initials: string;
  accentColor: string;
  messages: Message[];
}

const conversations: Conversation[] = [
  {
    businessName: "ArcticCool Aircon",
    initials: "AC",
    accentColor: "#3B82F6",
    messages: [
      { text: "Hi, my aircon is blowing warm air. It's a Daikin, about 5 years old.", sender: "customer", time: "10:14", delivered: true, read: true },
      { text: "Warm air on a 5-year Daikin is almost always a gas recharge or blocked filter — both quick fixes. We're in Bryanston today.\n\nJust reply with:\n• Your name\n• Suburb\n• Best time to come out", sender: "ai", time: "10:14", delivered: true, read: true },
      { text: "Zanele Dlamini. Bryanston. Any time today works.", sender: "customer", time: "10:16", delivered: true, read: true },
      { text: "Gas check + service on a Daikin is R850–R1,100 all-in. I've got 1pm or 4pm today in Bryanston. Which works?", sender: "ai", time: "10:16", delivered: true, read: true },
      { text: "1pm please", sender: "customer", time: "10:17", delivered: true, read: true },
      { text: "Confirmed Zanele. 1pm in Bryanston today. Technician will call 20 min before arrival.", sender: "ai", time: "10:17", delivered: true, read: false },
    ],
  },
  {
    businessName: "ClearPool Services",
    initials: "CP",
    accentColor: "#06B6D4",
    messages: [
      { text: "Hi, how much do you charge for weekly pool cleaning?", sender: "customer", time: "09:03", delivered: true, read: true },
      { text: "Weekly cleaning is R650/month — includes chemicals, brushing, and skimming. No lock-in contracts.\n\nWhich area are you in?", sender: "ai", time: "09:03", delivered: true, read: true },
      { text: "Fourways. It's a standard 8x4m pool, been a bit neglected lately.", sender: "customer", time: "09:05", delivered: true, read: true },
      { text: "Fourways, no problem. For a slightly neglected pool we'd do a once-off deep clean first (R450), then weekly from there. First month is half price.\n\nWant to lock in a day?", sender: "ai", time: "09:05", delivered: true, read: true },
      { text: "Yes, Thursdays would work well", sender: "customer", time: "09:06", delivered: true, read: true },
      { text: "Thursdays it is. Deep clean this Thursday, then weekly from next week. Reply with your name and address to confirm.", sender: "ai", time: "09:06", delivered: true, read: false },
    ],
  },
  {
    businessName: "ProGuard Security",
    initials: "PG",
    accentColor: "#EF4444",
    messages: [
      { text: "Someone tried to break in tonight through the kitchen window. I need security bars urgently.", sender: "customer", time: "23:11", delivered: true, read: true },
      { text: "That's frightening — glad you're okay. Lock all entry points tonight and keep lights on outside.\n\nWe can get an assessor to you first thing tomorrow. Reply with:\n• Your name\n• Area\n• Number of windows needing bars", sender: "ai", time: "23:11", delivered: true, read: true },
      { text: "Mpho Sithole. Midrand. About 6 windows and the kitchen door.", sender: "customer", time: "23:13", delivered: true, read: true },
      { text: "Priority booking confirmed Mpho. Assessor at your door tomorrow 7:30am in Midrand. He'll quote on the spot and can start fitting same day if you approve.", sender: "ai", time: "23:13", delivered: true, read: false },
    ],
  },
  {
    businessName: "BrightBuild Painting",
    initials: "BB",
    accentColor: "#A855F7",
    messages: [
      { text: "Another company quoted me R6,000 less for the same exterior paint job. Why are you more expensive?", sender: "customer", time: "14:32", delivered: true, read: true },
      { text: "Fair question — that's a big gap. A few things worth checking:\n• Do they include a 2-coat system?\n• Is their paint Plascon or a budget brand?\n• Do they give a written 3-year warranty?\n\nWe include all three. What matters most to you?", sender: "ai", time: "14:32", delivered: true, read: true },
      { text: "Honestly the warranty. I had a painter flake on me last year and had to redo it 8 months later.", sender: "customer", time: "14:34", delivered: true, read: true },
      { text: "That's exactly why we put it in writing. Our 3-year guarantee covers peeling, blistering, and callbacks — no charge. Want to book a free quote so you can compare like-for-like?", sender: "ai", time: "14:35", delivered: true, read: true },
      { text: "Yes let's do that", sender: "customer", time: "14:35", delivered: true, read: true },
      { text: "Great. What area are you in and which days work for you? I'll get a slot locked in.", sender: "ai", time: "14:35", delivered: true, read: false },
    ],
  },
  {
    businessName: "GreenCut Landscaping",
    initials: "GC",
    accentColor: "#22C55E",
    messages: [
      { text: "Hi, do you do once-off garden cleanups? Not looking for a monthly contract.", sender: "customer", time: "08:50", delivered: true, read: true },
      { text: "Yes, absolutely — no contracts needed. Once-off includes cutting, edging, trimming, and full waste removal. Most standard gardens come in at R950–R1,400.\n\nWhich area are you in?", sender: "ai", time: "08:50", delivered: true, read: true },
      { text: "Tableview, Cape Town. Garden's been ignored for about 3 months.", sender: "customer", time: "08:52", delivered: true, read: true },
      { text: "Tableview's covered. For 3 months of growth, budget R1,200–R1,500 — we quote on arrival, no surprises. This weekend (Sat or Sun) work for you?", sender: "ai", time: "08:52", delivered: true, read: true },
      { text: "Saturday please", sender: "customer", time: "08:53", delivered: true, read: true },
      { text: "Saturday is yours. Reply with your name and address and I'll send the confirmation now.", sender: "ai", time: "08:53", delivered: true, read: false },
    ],
  },
];

function ReadReceipt({ delivered, read }: { delivered?: boolean; read?: boolean }) {
  if (read) {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  }
  if (delivered) {
    return <CheckCheck className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />;
  }
  return <Check className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />;
}

export default function WhatsAppMock() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    if (index === activeIndex) return;
    setVisible(false);
    setTimeout(() => {
      setActiveIndex(index);
      setVisible(true);
    }, 300);
  }, [activeIndex]);

  const goNext = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % conversations.length);
      setVisible(true);
    }, 300);
  }, []);

  const goPrev = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setActiveIndex((prev) => (prev - 1 + conversations.length) % conversations.length);
      setVisible(true);
    }, 300);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(goNext, 8000);
  }, [goNext]);

  useEffect(() => {
    timerRef.current = setInterval(goNext, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goNext]);

  const convo = conversations[activeIndex];

  return (
    <div className="animate-phone-float">
      {/* Phone frame with navigation arrows */}
      <div className="relative w-[300px] sm:w-[340px] mx-auto">
        {/* Left arrow */}
        <button
          onClick={() => { goPrev(); resetTimer(); }}
          className="absolute left-[-36px] sm:left-[-44px] top-1/2 -translate-y-1/2 z-20 opacity-30 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
          aria-label="Previous conversation"
        >
          <ChevronLeft className="w-7 h-7 text-white" />
        </button>
        {/* Right arrow */}
        <button
          onClick={() => { goNext(); resetTimer(); }}
          className="absolute right-[-36px] sm:right-[-44px] top-1/2 -translate-y-1/2 z-20 opacity-30 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
          aria-label="Next conversation"
        >
          <ChevronRight className="w-7 h-7 text-white" />
        </button>
        {/* Phone outer shell */}
        <div className="bg-[#1a1a1a] rounded-[2.5rem] p-2 shadow-2xl shadow-black/40">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-10" />

          {/* Screen */}
          <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden">
            {/* WhatsApp header */}
            <div className="bg-[#1f2c34] px-3 pt-8 pb-2">
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-5 h-5 text-[#00a884]" />
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: `${convo.accentColor}20` }}
                >
                  <span
                    className="text-xs font-bold transition-colors duration-300"
                    style={{ color: convo.accentColor }}
                  >
                    {convo.initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {convo.businessName}
                  </p>
                  <p className="text-[#8696a0] text-[10px]">online</p>
                </div>
                <div className="flex items-center gap-3">
                  <Video className="w-4 h-4 text-[#aebac1]" />
                  <Phone className="w-4 h-4 text-[#aebac1]" />
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div
              className="px-2.5 py-3 space-y-1.5 h-[420px] overflow-hidden bg-[#0b141a] transition-all duration-300 ease-in-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "scale(1)" : "scale(0.98)",
              }}
            >
              {/* Date chip */}
              <div className="flex justify-center mb-2">
                <span className="bg-[#182229] text-[#8696a0] text-[10px] px-3 py-1 rounded-md">
                  TODAY
                </span>
              </div>

              {/* Response time badge */}
              <div className="flex justify-center mb-1">
                <span className="bg-[#00a884]/10 text-[#00a884] text-[9px] px-2.5 py-0.5 rounded-full font-medium border border-[#00a884]/20">
                  Replied in 30 seconds
                </span>
              </div>

              {convo.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[82%] px-2.5 py-1.5 rounded-lg text-[12px] leading-[1.4] ${
                      msg.sender === "customer"
                        ? "bg-[#005c4b] text-white"
                        : "bg-[#1f2c34] text-[#e9edef]"
                    }`}
                  >
                    {/* Tail */}
                    <div
                      className={`absolute top-0 w-2 h-2 ${
                        msg.sender === "customer"
                          ? "right-[-4px] border-l-[6px] border-l-[#005c4b] border-t-[6px] border-t-transparent"
                          : "left-[-4px] border-r-[6px] border-r-[#1f2c34] border-t-[6px] border-t-transparent"
                      } ${i > 0 && convo.messages[i - 1]?.sender === msg.sender ? "hidden" : ""}`}
                    />
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      <span className="text-[9px] text-white/40">{msg.time}</span>
                      {msg.sender === "customer" && (
                        <ReadReceipt delivered={msg.delivered} read={msg.read} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input bar */}
            <div className="bg-[#1f2c34] px-2 py-2 flex items-center gap-2">
              <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5">
                <span className="text-[#8696a0] text-[11px]">Type a message</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {conversations.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i !== activeIndex) {
                  goTo(i);
                  resetTimer();
                }
              }}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 h-2 bg-accent"
                  : "w-2 h-2 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`View conversation ${i + 1}`}
            />
          ))}
        </div>

        {/* Brand customisation caption */}
        <div className="mt-6 mx-auto max-w-[300px] sm:max-w-[340px] text-center space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            Tune the tone, style, and personality to match your brand — from warm and friendly to direct and professional.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Friendly & warm", "Direct & efficient", "Professional", "Handles objections", "Quotes prices"].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-[11px] font-medium text-text-tertiary bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
