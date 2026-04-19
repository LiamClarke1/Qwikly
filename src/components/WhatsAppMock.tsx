"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, CheckCheck, Phone, Video, ChevronLeft } from "lucide-react";

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
      { text: "Hi! Thanks for reaching out. I can help with that. A few quick questions to get you sorted.", sender: "ai", time: "19:02", delivered: true, read: true },
      { text: "What\u2019s the best name for the booking?", sender: "ai", time: "19:02", delivered: true, read: true },
      { text: "Sarah", sender: "customer", time: "19:03", delivered: true, read: true },
      { text: "Thanks Sarah! I\u2019ve got a slot available tomorrow morning at 9am. Shall I book that in?", sender: "ai", time: "19:03", delivered: true, read: false },
    ],
  },
  {
    businessName: "QuickFlow Plumbing",
    initials: "QP",
    accentColor: "#3B82F6",
    messages: [
      { text: "Hi, I\u2019ve got a burst geyser in Centurion. Water everywhere.", sender: "customer", time: "08:14", delivered: true, read: true },
      { text: "That sounds urgent! Let me get someone out to you ASAP. Can I get your name?", sender: "ai", time: "08:14", delivered: true, read: true },
      { text: "James Botha", sender: "customer", time: "08:15", delivered: true, read: true },
      { text: "James, we\u2019ve got an emergency slot in the next 2 hours. What\u2019s your address?", sender: "ai", time: "08:15", delivered: true, read: true },
      { text: "14 Maple Drive, Centurion", sender: "customer", time: "08:16", delivered: true, read: true },
      { text: "Sorted. A plumber is booked for today. You\u2019ll get a confirmation shortly.", sender: "ai", time: "08:16", delivered: true, read: false },
    ],
  },
  {
    businessName: "SunPower Solar",
    initials: "SS",
    accentColor: "#F97316",
    messages: [
      { text: "Hi, I\u2019m interested in solar panels. My electricity bill is R4,200/month.", sender: "customer", time: "10:30", delivered: true, read: true },
      { text: "Great timing! We can definitely help bring that down. What area are you in?", sender: "ai", time: "10:30", delivered: true, read: true },
      { text: "Fourways, Johannesburg", sender: "customer", time: "10:31", delivered: true, read: true },
      { text: "Perfect, we cover Fourways. I\u2019ll book a free site assessment. What day works best?", sender: "ai", time: "10:31", delivered: true, read: true },
      { text: "Saturday morning?", sender: "customer", time: "10:32", delivered: true, read: true },
      { text: "Done! Saturday at 9am. Our assessor will call you 30 minutes before.", sender: "ai", time: "10:32", delivered: true, read: false },
    ],
  },
  {
    businessName: "SafeGuard Pest",
    initials: "SG",
    accentColor: "#22C55E",
    messages: [
      { text: "Hi, I\u2019ve got rats in my roof. It\u2019s getting worse at night.", sender: "customer", time: "21:45", delivered: true, read: true },
      { text: "I understand, that\u2019s not something you want to leave. How long has this been going on?", sender: "ai", time: "21:45", delivered: true, read: true },
      { text: "About a week, we can hear them scratching", sender: "customer", time: "21:46", delivered: true, read: true },
      { text: "I can get someone out tomorrow morning. Are you in the Randburg area?", sender: "ai", time: "21:46", delivered: true, read: true },
      { text: "Yes, Randburg", sender: "customer", time: "21:47", delivered: true, read: true },
      { text: "Booked for tomorrow at 8am. The technician will assess and treat the same day.", sender: "ai", time: "21:47", delivered: true, read: false },
    ],
  },
  {
    businessName: "TopCover Roofing",
    initials: "TC",
    accentColor: "#EF4444",
    messages: [
      { text: "Hi, I\u2019ve got a few cracked tiles and it leaks when it rains.", sender: "customer", time: "14:20", delivered: true, read: true },
      { text: "Sorry to hear that! Leaks only get worse. Let me book someone to come take a look. What area?", sender: "ai", time: "14:20", delivered: true, read: true },
      { text: "Durbanville, Cape Town", sender: "customer", time: "14:21", delivered: true, read: true },
      { text: "We cover Durbanville. I\u2019ve got Thursday afternoon or Friday morning. Which works?", sender: "ai", time: "14:21", delivered: true, read: true },
      { text: "Friday morning please", sender: "customer", time: "14:22", delivered: true, read: true },
      { text: "Done, Friday at 9am. The roofer will do a full inspection and quote on the spot.", sender: "ai", time: "14:22", delivered: true, read: false },
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

  const rotateConversation = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % conversations.length);
      setVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(rotateConversation, 5000);
    return () => clearInterval(interval);
  }, [rotateConversation]);

  const convo = conversations[activeIndex];

  return (
    <div className="animate-phone-float">
      {/* Phone frame */}
      <div className="relative w-[300px] sm:w-[340px] mx-auto">
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
              className="px-2.5 py-3 space-y-1.5 min-h-[340px] bg-[#0b141a] transition-all duration-300 ease-in-out"
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
                  setVisible(false);
                  setTimeout(() => {
                    setActiveIndex(i);
                    setVisible(true);
                  }, 300);
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
