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
    businessName: "Spark Electrical",
    initials: "SE",
    accentColor: "#EAB308",
    messages: [
      { text: "Hi, I need an electrician in Sandton. My DB board keeps tripping.", sender: "customer", time: "19:02", delivered: true, read: true },
      { text: "Hi, sounds like an overload issue, fairly common fix.\n\nTo book you in, I just need:\n• Your name\n• Full address in Sandton\n• When the tripping happens (specific appliance or all the time)", sender: "ai", time: "19:02", delivered: true, read: true },
      { text: "Sarah Nkosi. 22 Rivonia Road, Sandhurst. Trips when we use the oven and geyser at the same time.", sender: "customer", time: "19:04", delivered: true, read: true },
      { text: "Perfect, that confirms it's an overload. I've got a slot tomorrow at 9am or Wednesday at 11am. Which works?", sender: "ai", time: "19:04", delivered: true, read: true },
      { text: "Tomorrow 9am please", sender: "customer", time: "19:04", delivered: true, read: true },
      { text: "All sorted Sarah. Booked for tomorrow at 9am at 22 Rivonia Road. Confirmation incoming.", sender: "ai", time: "19:04", delivered: true, read: false },
    ],
  },
  {
    businessName: "QuickFlow Plumbing",
    initials: "QP",
    accentColor: "#3B82F6",
    messages: [
      { text: "Hi, I've got a burst geyser in Centurion. Water everywhere.", sender: "customer", time: "08:14", delivered: true, read: true },
      { text: "That's urgent, let's get someone out fast. First, shut your main water valve if you haven't already.\n\nTo dispatch a plumber, reply with:\n• Your name\n• Full address in Centurion\n• Electric or gas geyser", sender: "ai", time: "08:14", delivered: true, read: true },
      { text: "James Botha. 14 Maple Drive, Eldoraigne. Electric, it's in the roof. Valve is already shut.", sender: "customer", time: "08:15", delivered: true, read: true },
      { text: "Good call on the valve. Emergency plumber booked, arriving within 2 hours at 14 Maple Drive. You'll get his name and number in the next minute.", sender: "ai", time: "08:15", delivered: true, read: false },
    ],
  },
  {
    businessName: "SunPower Solar",
    initials: "SS",
    accentColor: "#F97316",
    messages: [
      { text: "Hi, I'm interested in solar panels. My electricity bill is R4,200/month.", sender: "customer", time: "10:30", delivered: true, read: true },
      { text: "At R4,200/month, solar makes serious sense. We offer a free site assessment (no obligation) where we measure your roof, check usage, and quote on the spot.\n\nTo book it, reply with:\n• Your name\n• Suburb / city\n• House or business\n• With or without battery backup", sender: "ai", time: "10:30", delivered: true, read: true },
      { text: "Mike van der Merwe. Fourways, Johannesburg. 4 bedroom house. With battery, for load shedding cover.", sender: "customer", time: "10:32", delivered: true, read: true },
      { text: "Perfect, you're looking at a 5-8kW system with battery. We cover Fourways. I've got Saturday 9am or Tuesday 2pm for the assessment. Which suits?", sender: "ai", time: "10:32", delivered: true, read: true },
      { text: "Saturday 9am", sender: "customer", time: "10:32", delivered: true, read: true },
      { text: "Booked Mike. Saturday at 9am in Fourways. Our assessor will call 30 min before to confirm.", sender: "ai", time: "10:33", delivered: true, read: false },
    ],
  },
  {
    businessName: "SafeGuard Pest",
    initials: "SG",
    accentColor: "#22C55E",
    messages: [
      { text: "Hi, I've got rats in my roof. It's getting worse at night.", sender: "customer", time: "21:45", delivered: true, read: true },
      { text: "Rats spread fast, good that you're sorting it now. One treatment usually fixes it if caught early.\n\nTo book, reply with:\n• Your name\n• Suburb\n• How long you've heard them\n• Any pets or small children (for treatment choice)", sender: "ai", time: "21:45", delivered: true, read: true },
      { text: "Priya Naidoo. Randburg. About a week now. One dog.", sender: "customer", time: "21:47", delivered: true, read: true },
      { text: "Caught early, that's good. We'll use pet-safe methods for your dog. Technician booked for tomorrow 8am in Randburg. He'll assess, treat, and seal entry points same day.", sender: "ai", time: "21:47", delivered: true, read: false },
    ],
  },
  {
    businessName: "TopCover Roofing",
    initials: "TC",
    accentColor: "#EF4444",
    messages: [
      { text: "Hi, I've got a few cracked tiles and it leaks when it rains. Getting worse.", sender: "customer", time: "14:20", delivered: true, read: true },
      { text: "Leaks only get worse, let's sort it. Tile repairs typically range R2,000-5,000 depending on access. We do a full inspection and quote on the spot.\n\nTo book, reply with:\n• Your name\n• Area\n• Roof type (tiled / IBR / other)\n• Rough number of cracked tiles", sender: "ai", time: "14:20", delivered: true, read: true },
      { text: "Willem Pretorius. Durbanville, Cape Town. Concrete tiled roof. Looks like 3-4 tiles, leak is in the main bedroom ceiling.", sender: "customer", time: "14:22", delivered: true, read: true },
      { text: "3-4 tiles is a straightforward repair. Thursday 2pm or Friday 9am, which works?", sender: "ai", time: "14:22", delivered: true, read: true },
      { text: "Friday 9am please", sender: "customer", time: "14:22", delivered: true, read: true },
      { text: "Done Willem. Friday 9am in Durbanville. Full inspection and quote on the spot, no obligation.", sender: "ai", time: "14:23", delivered: true, read: false },
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
      </div>
    </div>
  );
}
