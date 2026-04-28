"use client";

import { type Problem } from "./ProblemTiles";

interface SolutionContent {
  headline: string;
  body: string;
  bullets: string[];
  conversation: { sender: "customer" | "ai"; text: string }[];
}

const content: Record<Problem, SolutionContent> = {
  "missing-calls": {
    headline: "Qwikly picks up every time. Even at 11pm on a Sunday.",
    body: "When a customer messages your business WhatsApp, Qwikly replies in under 5 seconds. No missed message, no lost job, no chasing them tomorrow morning.",
    bullets: ["Replies in under 30 seconds, 24/7", "Speaks like you, not like a bot", "Books straight into your Google Calendar"],
    conversation: [
      { sender: "customer", text: "Hi, I need a plumber urgently — burst geyser in Sandton." },
      { sender: "ai", text: "Hi! Sorry to hear that. I can get someone out tonight. What's your address and is the mains off?" },
      { sender: "customer", text: "Morningside. Mains is off now." },
      { sender: "ai", text: "Got it. Tech will be there by 10pm. I'll send a confirmation now." },
    ],
  },
  "slow-reply": {
    headline: "Reply in 30 seconds, even when you're elbow-deep in a geyser.",
    body: "Every WhatsApp gets a thoughtful reply instantly. Customers don't wait. They book. By the time you check your phone at lunch, the job is in your calendar.",
    bullets: ["30-second response, always", "Qualifies the lead so you only deal with real jobs", "You wake up to booked appointments, not unread messages"],
    conversation: [
      { sender: "customer", text: "Do you do aircon servicing? And how much roughly?" },
      { sender: "ai", text: "Yes, we do full services and gas recharges. Service is R950 all-in. Which area are you in?" },
      { sender: "customer", text: "Bryanston. This week if possible." },
      { sender: "ai", text: "We're in Bryanston on Wednesday. 9am or 2pm — which suits?" },
    ],
  },
  "quoting": {
    headline: "Quote a customer before you've put down your tools.",
    body: "Qwikly knows your services and your prices. It quotes the customer, sends a calendar link, and only buzzes you when the job is confirmed and booked.",
    bullets: ["Quotes based on your exact price list", "Handles negotiation and objections naturally", "Sends the confirmation — you just show up"],
    conversation: [
      { sender: "customer", text: "How much for weekly pool cleaning in Fourways?" },
      { sender: "ai", text: "Weekly is R650 a month, no contract. For a neglected pool we usually start with a R450 deep clean. Want to lock in this Thursday?" },
      { sender: "customer", text: "Yes, Thursdays work perfectly." },
      { sender: "ai", text: "Booked. Deep clean this Thursday, then weekly. What's your name and address?" },
    ],
  },
  "ghosting": {
    headline: "We chase them so you don't have to.",
    body: "Follow-ups at 1 hour, 24 hours, 3 days, 7 days. We've seen 1 in 4 silent leads come back when nudged correctly. They didn't ghost you — they got distracted.",
    bullets: ["Automated follow-ups at 4h, 24h, 2d, 5d", "Dormant-lead revival at 30 days", "Switches to email if WhatsApp goes quiet"],
    conversation: [
      { sender: "customer", text: "Hey, what do you charge for electrical COC?" },
      { sender: "ai", text: "COC is R2,500 for a standard property. I can get you booked in this week. When works?" },
      { sender: "customer", text: "Let me check and get back to you." },
      { sender: "ai", text: "No problem! I'll send you a quick note tomorrow in case it helps. Have a great day." },
    ],
  },
};

interface Props {
  problem: Problem | null;
}

export function SolutionSection({ problem }: Props) {
  const active = problem ? content[problem] : content["missing-calls"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      {/* Text side */}
      <div className="lg:col-span-6">
        <h3 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          {active.headline}
        </h3>
        <p className="mt-4 text-lg text-ink-700 leading-relaxed">{active.body}</p>
        <ul className="mt-6 space-y-3">
          {active.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-ink-700">
              <span className="mt-1.5 w-4 h-4 rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-ember" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Mini WhatsApp conversation */}
      <div className="lg:col-span-6 flex justify-center lg:justify-end">
        <div className="w-full max-w-sm bg-[#0b141a] rounded-[1.75rem] overflow-hidden shadow-2xl shadow-black/30">
          {/* Header */}
          <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ember/20 flex items-center justify-center flex-shrink-0">
              <span className="text-ember text-xs font-bold">Q</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Qwikly Assistant</p>
              <p className="text-[#8696a0] text-[10px]">online · replies in 30s</p>
            </div>
          </div>

          {/* Messages */}
          <div className="px-3 py-4 space-y-2">
            <div className="flex justify-center mb-2">
              <span className="bg-[#00a884]/10 text-[#00a884] text-[10px] px-3 py-1 rounded-full border border-[#00a884]/20 font-medium">
                Replied in 28 seconds
              </span>
            </div>
            {active.conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-xl text-[12px] leading-[1.4] ${
                    msg.sender === "customer"
                      ? "bg-[#005c4b] text-white"
                      : "bg-[#1f2c34] text-[#e9edef]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input bar */}
          <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5">
              <span className="text-[#8696a0] text-[11px]">Handled automatically</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
