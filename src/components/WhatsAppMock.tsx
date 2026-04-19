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
      { text: "Hi! Thanks for reaching out. I can definitely help with that. Just a few quick questions to get you sorted.", sender: "ai", time: "19:02", delivered: true, read: true },
      { text: "Sure", sender: "customer", time: "19:03", delivered: true, read: true },
      { text: "What\u2019s the best name for the booking?", sender: "ai", time: "19:03", delivered: true, read: true },
      { text: "Sarah Nkosi", sender: "customer", time: "19:03", delivered: true, read: true },
      { text: "Thanks Sarah. And what\u2019s the address in Sandton?", sender: "ai", time: "19:03", delivered: true, read: true },
      { text: "22 Rivonia Road, Sandhurst", sender: "customer", time: "19:04", delivered: true, read: true },
      { text: "Got it. Is the tripping happening on specific circuits or the whole board?", sender: "ai", time: "19:04", delivered: true, read: true },
      { text: "The whole board trips when we use the oven and geyser at the same time", sender: "customer", time: "19:05", delivered: true, read: true },
      { text: "That sounds like it could be an overload issue. Fairly common fix. How urgent is this, can it wait a day or two?", sender: "ai", time: "19:05", delivered: true, read: true },
      { text: "Tomorrow would be ideal if possible", sender: "customer", time: "19:05", delivered: true, read: true },
      { text: "I\u2019ve got a slot tomorrow morning at 9am. Shall I book that in for you?", sender: "ai", time: "19:05", delivered: true, read: true },
      { text: "Yes please!", sender: "customer", time: "19:06", delivered: true, read: true },
      { text: "All sorted Sarah! You\u2019re booked for tomorrow at 9am at 22 Rivonia Road. You\u2019ll get a confirmation message shortly. If anything changes, just message here.", sender: "ai", time: "19:06", delivered: true, read: false },
    ],
  },
  {
    businessName: "QuickFlow Plumbing",
    initials: "QP",
    accentColor: "#3B82F6",
    messages: [
      { text: "Hi, I\u2019ve got a burst geyser in Centurion. Water everywhere.", sender: "customer", time: "08:14", delivered: true, read: true },
      { text: "That sounds urgent! Let me get someone out to you as fast as possible. Can I get your name?", sender: "ai", time: "08:14", delivered: true, read: true },
      { text: "James Botha", sender: "customer", time: "08:15", delivered: true, read: true },
      { text: "James, where exactly are you in Centurion?", sender: "ai", time: "08:15", delivered: true, read: true },
      { text: "14 Maple Drive, Eldoraigne", sender: "customer", time: "08:15", delivered: true, read: true },
      { text: "Got it. Is the water still running or have you managed to shut the valve?", sender: "ai", time: "08:15", delivered: true, read: true },
      { text: "I shut the main valve but there\u2019s water all over the ceiling", sender: "customer", time: "08:16", delivered: true, read: true },
      { text: "Good call shutting the valve. Is this an electric or gas geyser?", sender: "ai", time: "08:16", delivered: true, read: true },
      { text: "Electric, it\u2019s in the roof", sender: "customer", time: "08:16", delivered: true, read: true },
      { text: "No stress. We\u2019ve got an emergency slot this morning. A plumber can be there within 2 hours. Does that work?", sender: "ai", time: "08:16", delivered: true, read: true },
      { text: "Yes please, the sooner the better", sender: "customer", time: "08:17", delivered: true, read: true },
      { text: "Sorted James. Plumber booked for this morning at 14 Maple Drive. You\u2019ll get a confirmation with the plumber\u2019s name and number shortly. Keep that valve off until they arrive.", sender: "ai", time: "08:17", delivered: true, read: false },
    ],
  },
  {
    businessName: "SunPower Solar",
    initials: "SS",
    accentColor: "#F97316",
    messages: [
      { text: "Hi, I\u2019m interested in solar panels. My electricity bill is R4,200/month.", sender: "customer", time: "10:30", delivered: true, read: true },
      { text: "Hi! That\u2019s a solid bill, solar can make a big dent in that. What area are you in?", sender: "ai", time: "10:30", delivered: true, read: true },
      { text: "Fourways, Johannesburg", sender: "customer", time: "10:31", delivered: true, read: true },
      { text: "Perfect, we cover Fourways. Can I get your name?", sender: "ai", time: "10:31", delivered: true, read: true },
      { text: "Mike van der Merwe", sender: "customer", time: "10:31", delivered: true, read: true },
      { text: "Thanks Mike. Just a couple more questions. Is this for a house or a business?", sender: "ai", time: "10:31", delivered: true, read: true },
      { text: "House, 4 bedroom", sender: "customer", time: "10:32", delivered: true, read: true },
      { text: "And are you looking at solar with or without battery backup?", sender: "ai", time: "10:32", delivered: true, read: true },
      { text: "With battery, we want to be covered during load shedding", sender: "customer", time: "10:32", delivered: true, read: true },
      { text: "Makes sense. For a 4 bed home at R4,200/month, you\u2019d typically be looking at a 5-8kW system. Our assessor can give you exact specs and pricing after a site visit.", sender: "ai", time: "10:33", delivered: true, read: true },
      { text: "How much does the assessment cost?", sender: "customer", time: "10:33", delivered: true, read: true },
      { text: "Completely free, no obligation. I\u2019ve got Saturday morning or Tuesday afternoon. Which works better?", sender: "ai", time: "10:33", delivered: true, read: true },
      { text: "Saturday morning please", sender: "customer", time: "10:34", delivered: true, read: true },
      { text: "Done Mike! Saturday at 9am in Fourways. Our assessor will call you 30 minutes before to confirm. They\u2019ll measure your roof, check your usage, and give you a full quote on the spot.", sender: "ai", time: "10:34", delivered: true, read: false },
    ],
  },
  {
    businessName: "SafeGuard Pest",
    initials: "SG",
    accentColor: "#22C55E",
    messages: [
      { text: "Hi, I\u2019ve got rats in my roof. It\u2019s getting worse at night.", sender: "customer", time: "21:45", delivered: true, read: true },
      { text: "Sorry to hear that! I understand, that\u2019s not something you want to leave. How long has this been going on?", sender: "ai", time: "21:45", delivered: true, read: true },
      { text: "About a week, we can hear them scratching and running around at night", sender: "customer", time: "21:46", delivered: true, read: true },
      { text: "A week is still early, which is good. Can I get your name and area?", sender: "ai", time: "21:46", delivered: true, read: true },
      { text: "Priya Naidoo, I\u2019m in Randburg", sender: "customer", time: "21:46", delivered: true, read: true },
      { text: "Thanks Priya. Have you noticed any droppings or damage to cables/insulation?", sender: "ai", time: "21:46", delivered: true, read: true },
      { text: "Yes there are droppings in the garage and near the roof hatch", sender: "customer", time: "21:47", delivered: true, read: true },
      { text: "That confirms it. The good news is we catch this early, one treatment usually sorts it out. Do you have any pets or small children?", sender: "ai", time: "21:47", delivered: true, read: true },
      { text: "We have a dog", sender: "customer", time: "21:48", delivered: true, read: true },
      { text: "Noted, the technician will use pet-safe methods. I can get someone out tomorrow morning at 8am. They\u2019ll assess, treat, and seal the entry points same day.", sender: "ai", time: "21:48", delivered: true, read: true },
      { text: "That would be amazing, thank you", sender: "customer", time: "21:48", delivered: true, read: true },
      { text: "All booked Priya! Tomorrow at 8am in Randburg. The technician will call you 30 minutes before. Keep pets inside during treatment, they\u2019ll let you know when it\u2019s safe.", sender: "ai", time: "21:48", delivered: true, read: false },
    ],
  },
  {
    businessName: "TopCover Roofing",
    initials: "TC",
    accentColor: "#EF4444",
    messages: [
      { text: "Hi, I\u2019ve got a few cracked tiles and it leaks when it rains. Getting worse.", sender: "customer", time: "14:20", delivered: true, read: true },
      { text: "Sorry to hear that! Leaks definitely get worse if left. Let me get someone out to take a look. What\u2019s your name?", sender: "ai", time: "14:20", delivered: true, read: true },
      { text: "Willem Pretorius", sender: "customer", time: "14:21", delivered: true, read: true },
      { text: "Thanks Willem. What area are you in?", sender: "ai", time: "14:21", delivered: true, read: true },
      { text: "Durbanville, Cape Town", sender: "customer", time: "14:21", delivered: true, read: true },
      { text: "We cover Durbanville. Is this a tiled or IBR roof?", sender: "ai", time: "14:21", delivered: true, read: true },
      { text: "Tiled, concrete tiles", sender: "customer", time: "14:22", delivered: true, read: true },
      { text: "And roughly how many tiles are cracked? Just the area around the leak or more widespread?", sender: "ai", time: "14:22", delivered: true, read: true },
      { text: "Looks like 3-4 tiles from what I can see. The leak is in the main bedroom ceiling", sender: "customer", time: "14:23", delivered: true, read: true },
      { text: "3-4 tiles is usually a straightforward repair. The roofer will do a full inspection to make sure there\u2019s nothing else hiding up there.", sender: "ai", time: "14:23", delivered: true, read: true },
      { text: "How much does that usually cost?", sender: "customer", time: "14:23", delivered: true, read: true },
      { text: "Tile repairs typically range from R2,000 to R5,000 depending on access and damage. The roofer will quote on the spot after inspecting. I\u2019ve got Thursday afternoon or Friday morning, which works?", sender: "ai", time: "14:24", delivered: true, read: true },
      { text: "Friday morning please", sender: "customer", time: "14:24", delivered: true, read: true },
      { text: "Done Willem! Friday at 9am in Durbanville. The roofer will do a full inspection, show you exactly what needs fixing, and give you a quote right there. No obligation.", sender: "ai", time: "14:24", delivered: true, read: false },
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
              className="px-2.5 py-3 space-y-1.5 h-[420px] overflow-y-auto bg-[#0b141a] transition-all duration-300 ease-in-out scrollbar-thin"
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
                    <p>{msg.text}</p>
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
                  ? "w-6 h-2 bg-cta"
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
