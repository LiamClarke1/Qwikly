"use client";

import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      const s = d.getSeconds().toString().padStart(2, "0");
      setTime(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{time || "00:00:00"}</span>;
}

/* ─────────────────────────────────────────────────────────────
   BROWSER WIDGET MOCKUP
   ───────────────────────────────────────────────────────────── */

function BrowserWidgetMockup() {
  return (
    <div className="relative w-full max-w-[720px] mx-auto">
      <div className="ember-blob w-[350px] h-[350px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />

      {/* Browser frame */}
      <div className="relative bg-[#E4DDD4] rounded-2xl shadow-2xl overflow-hidden border border-ink/[0.12]">

        {/* Browser chrome */}
        <div className="bg-[#D5CEC6] px-4 py-3 flex items-center gap-3 border-b border-ink/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex items-center bg-white/50 rounded-lg h-7 px-3 gap-2">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-ink/40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-[10px] text-ink/50 font-mono">yourbusiness.co.za</span>
          </div>
        </div>

        {/* Website content */}
        <div className="relative bg-[#F7F3EE] p-5 min-h-[340px]">

          {/* Placeholder nav */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-ink/15" />
              <div className="w-20 h-3 bg-ink/20 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-2.5 bg-ink/10 rounded" />
              <div className="w-12 h-2.5 bg-ink/10 rounded" />
              <div className="w-16 h-6 bg-ink/15 rounded-lg" />
            </div>
          </div>

          {/* Placeholder hero copy */}
          <div className="space-y-2.5 max-w-[55%]">
            <div className="w-full h-5 bg-ink/20 rounded" />
            <div className="w-4/5 h-5 bg-ink/15 rounded" />
            <div className="mt-3 space-y-1.5">
              <div className="w-full h-3 bg-ink/10 rounded" />
              <div className="w-3/4 h-3 bg-ink/10 rounded" />
            </div>
            <div className="mt-4 flex gap-3">
              <div className="w-24 h-8 bg-ink/20 rounded-lg" />
              <div className="w-20 h-8 bg-ink/10 rounded-lg border border-ink/20" />
            </div>
          </div>

          {/* Qwikly digital assistant, bottom right */}
          <div className="absolute bottom-4 right-4 w-[215px]">
            <div className="bg-white rounded-2xl overflow-hidden border border-ink/[0.08]" style={{ boxShadow: "0 20px 40px rgba(14,14,12,0.18)" }}>

              {/* Widget header */}
              <div className="bg-ink px-4 py-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-ember flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-paper" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-paper text-[10px] font-semibold leading-none">Qwikly Assistant</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <p className="text-paper/50 text-[8px] leading-none">Online now</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-3 space-y-2 bg-[#F9F6F2]">
                <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%] border border-ink/[0.06]">
                  <p className="text-ink text-[9px] leading-relaxed">Hi! Looking to book, get a quote, or just have a question?</p>
                </div>
                <div className="bg-ember rounded-xl rounded-tr-sm px-3 py-2 max-w-[72%] ml-auto">
                  <p className="text-paper text-[9px]">Book for Friday?</p>
                </div>
                <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%] border border-ink/[0.06]">
                  <p className="text-ink text-[9px] leading-relaxed">Friday works! What time, and how many?</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5 bg-white rounded-full px-2 py-1.5 border border-ink/[0.06]">
                    <span className="w-1 h-1 rounded-full bg-ink/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-ink/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 rounded-full bg-ink/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-ink/40 text-[8px]">Typing…</p>
                </div>
              </div>

              {/* Input row */}
              <div className="border-t border-ink/[0.06] px-3 py-2.5 flex items-center gap-2 bg-white">
                <div className="flex-1 bg-[#F4EEE4] rounded-lg h-6 px-2 flex items-center">
                  <span className="text-ink/30 text-[9px]">Type a message…</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-ember flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-paper" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Script tag badge */}
          <div className="absolute bottom-4 left-5">
            <div className="inline-flex items-center gap-2 bg-ink text-paper px-3 py-1.5 rounded-lg text-[9px] font-mono shadow-md">
              <span className="text-ember">&lt;script&gt;</span>
              <span className="text-paper/60">Paste once. Done.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────── */

const howSteps = [
  {
    stamp: "i.",
    title: "Sign up and tell us about your business.",
    body: "Create your account in under 2 minutes. Tell us your business name, industry, and the services you offer.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    stamp: "ii.",
    title: "We scan your entire website automatically.",
    body: "Our tool reads your site from top to bottom. Services, pricing, FAQs, contact details. Everything your customers ask about.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
        <line x1="11" y1="8" x2="11" y2="14" />
      </svg>
    ),
  },
  {
    stamp: "iii.",
    title: "You review and confirm the details.",
    body: "We show you a summary of everything we found. Correct it, fill in gaps, or add services we missed. Done in minutes.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    stamp: "iv.",
    title: "Your digital assistant is configured.",
    body: "Based on your confirmed details, your assistant is ready. It knows your services, pricing, and how to qualify a real lead.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
  {
    stamp: "v.",
    title: "Paste one script tag onto your website.",
    body: "Copy a single line of code into your site. Works with Wix, Squarespace, WordPress, Webflow, Shopify, or any custom site.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    stamp: "vi.",
    title: "Leads land in your inbox from day one.",
    body: "Your digital assistant greets visitors, answers questions using your content, qualifies them, and sends confirmed leads straight to your inbox.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
      </svg>
    ),
  },
];

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "24/7 lead capture",
    body: "Your website never sleeps. Every visitor, every hour, every day. No lead slips through because you were busy or offline.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
    title: "Smart qualification",
    body: "The assistant asks your questions: service type, location, budget, urgency. Only warm, ready-to-buy leads reach your inbox.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Instant booking requests",
    body: "Qualified leads can request a booking time directly in the chat. You get notified the moment they do. No forms, no back-and-forth emails.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.27 1.2 2 2 0 012.24 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.62-.62a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
      </svg>
    ),
    title: "One-click confirmation",
    body: "Leads are emailed to you with a single confirmation button. Accept a booking in seconds, from anywhere, on any device.",
  },
];

const differentiators = [
  {
    num: "01",
    headline: "Live in 5 minutes.",
    body: "No setup calls. No integrations to wire. No developer needed. Paste one script tag and your digital assistant is live. Done.",
  },
  {
    num: "02",
    headline: "No per-job fees. Ever.",
    body: "Flat monthly pricing only. We don't take a cut of your bookings, your jobs, or your revenue. Every rand you earn stays yours.",
  },
  {
    num: "03",
    headline: "Built for SA.",
    body: "POPIA compliant. ZAR pricing. Data hosted in South Africa. Built for the way South African businesses actually operate.",
  },
];

const teaserTiers = [
  {
    name: "Starter",
    price: "R0",
    period: "/month",
    tagline: "Free forever",
    highlight: false,
    features: [
      "25 qualified leads/month",
      "Digital assistant platform",
      "Email lead delivery",
      '"Powered by Qwikly" branding',
      "Email support",
    ],
    cta: "Start Free",
    href: "/signup?plan=starter",
    variant: "primary" as const,
  },
  {
    name: "Pro",
    price: "R599",
    period: "/month",
    tagline: "Most popular",
    highlight: true,
    features: [
      "200 qualified leads/month",
      "Custom branding (your logo)",
      "Custom greeting & questions",
      "Lead exports (CSV)",
      "Priority email support",
    ],
    cta: "Start with Pro",
    href: "/signup?plan=pro",
    variant: "solid" as const,
  },
  {
    name: "Premium",
    price: "R1,299",
    period: "/month",
    tagline: "Unlimited everything",
    highlight: false,
    features: [
      "Unlimited qualified leads",
      "Everything in Pro",
      "WhatsApp routing (coming soon)",
      "Calendar integration (coming soon)",
      "API access + dedicated support",
    ],
    cta: "Get Premium",
    href: "/signup?plan=premium",
    variant: "outline" as const,
  },
];

const faqTeaser = [
  {
    q: "What counts as a qualified lead?",
    a: "A lead who has provided their contact details and answered your qualifying questions: service type, location, and intent. We only count real contacts, not bounced chats or spam.",
  },
  {
    q: "What happens when I hit my monthly limit?",
    a: "You'll get a heads-up before you hit the cap. You can upgrade, or add extra leads at R20 each. No surprise charges, no automatic billing.",
  },
  {
    q: "Can I use my own logo and colours?",
    a: "Yes. On Pro and Premium plans, your digital assistant uses your branding, not ours. Starter plans show 'Powered by Qwikly'.",
  },
  {
    q: "Do you take a cut of my jobs?",
    a: "Never. Flat monthly fee only. Every rand from every booking stays with your business. That's the whole point.",
  },
];

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */

export default function Home() {
  useScrollReveal();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <>
      {/* ═══════ 01 · HERO ═══════════════════════════════════════ */}
      <section className="relative bg-[#0A0908] overflow-hidden grain-dark">
        {/* Background atmosphere */}
        <div className="ember-blob w-[700px] h-[700px] -top-48 -right-32 opacity-30" />
        <div className="ember-blob w-[400px] h-[400px] bottom-0 -left-32 opacity-15" />
        <div className="dot-grid absolute inset-0 opacity-30" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10 pt-32 pb-20 md:pt-44 md:pb-28">

          {/* Live badge */}
          <div className="mb-12 reveal-up">
            <span className="inline-flex items-center gap-2.5 bg-ember/15 border border-ember/25 text-ember px-5 py-2.5 rounded-full text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-ember tick" />
              Live · Handling enquiries now
            </span>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-16 lg:gap-20 items-center">

            {/* Left: copy */}
            <div>
              <div className="reveal-words visible">
                <h1 className="display-huge text-paper">
                  Your business<br />
                  never misses<br />
                  <em className="italic font-light text-ember">a lead again</em>.
                </h1>
              </div>

              <p className="mt-8 text-lg md:text-xl text-paper/65 leading-relaxed max-w-xl reveal-up">
                Qwikly scans your website, builds a digital assistant that knows your business, and captures every enquiry 24/7. Warm leads land in your inbox. Even while you sleep.
              </p>

              <div className="mt-10 flex flex-wrap gap-4 reveal-up">
                <CTAButton size="lg" variant="solid" href="/signup">
                  Start Free
                </CTAButton>
                <CTAButton size="lg" variant="outline-light" href="#how-it-works" withArrow={false}>
                  See how it works
                </CTAButton>
              </div>
              <p className="mt-5 text-sm text-paper/35 reveal-up">
                No credit card. Free forever on Starter. Upgrade when ready.
              </p>

              {/* Stats row */}
              <div className="mt-14 pt-8 border-t border-paper/[0.08] grid grid-cols-3 gap-6 reveal-up">
                {[
                  { num: "24/7", label: "Always on" },
                  { num: "<10min", label: "To go live" },
                  { num: "R0", label: "To start" },
                ].map((s) => (
                  <div key={s.num}>
                    <p className="font-display text-2xl md:text-3xl text-paper font-bold leading-none num">{s.num}</p>
                    <p className="mt-2 text-xs text-paper/40 uppercase tracking-[0.12em]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: browser mockup */}
            <div className="reveal-scale">
              <BrowserWidgetMockup />
            </div>

          </div>
        </div>
      </section>

      {/* ═══════ 02 · TRUST STRIP ════════════════════════════════ */}
      <section className="py-10 border-b border-ink/[0.06] bg-ink/[0.02]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {[
              { icon: "clock", label: "< 10 min setup" },
              { icon: "shield", label: "POPIA compliant" },
              { icon: "zap", label: "24/7 lead capture" },
              { icon: "tag", label: "No per-job fees" },
              { icon: "globe", label: "Hosted in South Africa" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-ink-500">
                {icon === "clock" && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ember flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                )}
                {icon === "shield" && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ember flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                )}
                {icon === "zap" && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ember flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                )}
                {icon === "tag" && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ember flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                )}
                {icon === "globe" && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ember flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                )}
                <span className="text-sm font-medium text-ink-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 03 · HOW IT WORKS ═══════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">How it works</p>
              <h2 className="display-lg text-ink reveal-up">
                Six steps.
                <br />
                <span className="italic font-light">Zero fuss.</span>
              </h2>
            </div>
            <div className="md:col-span-7 md:col-start-6 md:pt-6">
              <p className="text-lg text-ink-700 leading-relaxed reveal-up">
                Sign up, and in minutes your digital assistant knows your business inside out. It handles every visitor conversation from first hello to
                confirmed booking. No setup calls, no integrations to wire, no ongoing work from you.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 reveal-stagger">
            {howSteps.map((s) => (
              <div key={s.stamp} className="ed-card group">
                <div className="w-10 h-10 rounded-xl bg-ember/10 border border-ember/15 flex items-center justify-center text-ember mb-5">
                  {s.icon}
                </div>
                <div className="flex items-start justify-between mb-4">
                  <span className="step-stamp">{s.stamp}</span>
                  <span className="eyebrow text-ink-500 group-hover:text-ember transition-colors">Step</span>
                </div>
                <h3 className="font-display text-xl md:text-2xl text-ink leading-tight">{s.title}</h3>
                <p className="mt-3 text-ink-700 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 04 · FEATURES ═══════════════════════════════════ */}
      <section className="relative py-28 md:py-36 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
            <div className="md:col-span-5">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">What it does</p>
              <h2 className="display-lg text-ink reveal-up">
                Everything your{" "}
                <em className="italic font-light">front desk would do</em>.
              </h2>
            </div>
            <div className="md:col-span-7 md:pt-4 reveal-up">
              <p className="text-lg text-ink-700 leading-relaxed">
                Qwikly handles every incoming enquiry on your behalf. It qualifies, books, and delivers warm leads to your inbox. Around the clock.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 reveal-stagger">
            {features.map((f) => (
              <div key={f.title} className="ed-card group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-ember/10 border border-ember/15 flex items-center justify-center text-ember mb-6">
                  {f.icon}
                </div>
                <h3 className="font-display text-xl text-ink mb-3">{f.title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 05 · WHY QWIKLY ════════════════════════════════ */}
      <section className="relative py-28 md:py-40 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[500px] h-[500px] top-10 -right-40" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-paper/60 mb-8 reveal-up">Why Qwikly</p>
          <h2 className="display-xl text-paper max-w-[18ch] reveal-up mb-20">
            Why Qwikly vs{" "}
            <em className="italic font-light text-ember">the rest</em>.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paper/[0.06] rounded-2xl overflow-hidden reveal-stagger">
            {differentiators.map((d) => (
              <div key={d.num} className="bg-paper/[0.03] px-7 py-8 flex flex-col gap-4">
                <span className="font-mono text-xs text-ember/60 tracking-widest">{d.num}</span>
                <h3 className="font-display text-2xl md:text-3xl text-paper leading-tight">{d.headline}</h3>
                <p className="text-paper/60 text-sm leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 06 · PRICING TEASER ════════════════════════════ */}
      <section
        id="pricing"
        className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="text-center mb-14 reveal-up">
            <p className="eyebrow text-ink-500 mb-4">Pricing</p>
            <h2 className="display-lg text-ink">
              Start free.{" "}
              <em className="italic font-light text-ember">Scale when you&rsquo;re ready.</em>
            </h2>
            <p className="mt-4 text-ink-700 text-lg max-w-xl mx-auto leading-relaxed">
              No per-job fees. No commissions. Flat monthly pricing in ZAR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch reveal-stagger">
            {teaserTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col ${
                  tier.highlight
                    ? "bg-ink text-paper rounded-2xl p-8 shadow-xl ring-2 ring-ember pt-12"
                    : "ed-card-ghost"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="eyebrow bg-ember text-paper px-4 py-1.5 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                <p className={`eyebrow mb-1 ${tier.highlight ? "text-ember" : "text-ink-500"}`}>
                  {tier.name}
                </p>
                <p className={`text-sm leading-snug mb-6 ${tier.highlight ? "text-paper/60" : "text-ink-700"}`}>
                  {tier.tagline}
                </p>

                <div className="mb-8">
                  <span
                    className={`font-display font-medium leading-none ${tier.highlight ? "text-paper" : "text-ink"}`}
                    style={{ fontSize: "clamp(2.4rem, 4vw, 3rem)" }}
                  >
                    {tier.price}
                  </span>
                  <span className={`text-sm ml-1 ${tier.highlight ? "text-paper/50" : "text-ink-500"}`}>
                    {tier.period}
                  </span>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {tier.features.map((feat) => (
                    <li
                      key={feat}
                      className={`flex items-start gap-3 text-sm leading-relaxed ${
                        tier.highlight ? "text-paper/80" : "text-ink-700"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-ember flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                <CTAButton
                  href={tier.href}
                  variant={tier.variant}
                  size="md"
                  className="w-full justify-center"
                >
                  {tier.cta}
                </CTAButton>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 reveal-up">
            <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3 rounded-2xl">
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <p className="text-sm font-medium">30-day money-back guarantee on Pro and Premium</p>
            </div>
            <p className="text-sm text-ink-500">
              Pay annually and get 2 months free · Top-ups at R20/extra lead
            </p>
            <CTAButton variant="outline" size="md" href="/pricing">
              See full pricing and comparison table
            </CTAButton>
          </div>
        </div>
      </section>

      {/* ═══════ 07 · FAQ TEASER ════════════════════════════════ */}
      <section className="relative py-28 md:py-36 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">Questions</p>
              <h2 className="display-lg text-ink reveal-up">
                Quick
                <br />
                <em className="italic font-light">answers</em>.
              </h2>
            </div>

            <div className="md:col-span-7 md:col-start-6">
              <div className="divide-y divide-ink/10 border-t border-ink/10">
                {faqTeaser.map((item, index) => {
                  const isOpen = openFAQ === index;
                  return (
                    <div key={index}>
                      <button
                        onClick={() => setOpenFAQ(isOpen ? null : index)}
                        className="w-full flex items-start justify-between py-6 text-left gap-6 cursor-pointer group"
                      >
                        <span
                          className={`font-display text-xl leading-snug transition-colors duration-200 ${
                            isOpen ? "text-ember" : "text-ink group-hover:text-ember"
                          }`}
                        >
                          {item.q}
                        </span>
                        <span
                          className={`flex-shrink-0 mt-1 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            isOpen
                              ? "bg-ember border-ember text-paper"
                              : "border-ink/20 text-ink group-hover:border-ember group-hover:text-ember"
                          }`}
                        >
                          {isOpen ? (
                            <Minus className="w-4 h-4" strokeWidth={2} />
                          ) : (
                            <Plus className="w-4 h-4" strokeWidth={2} />
                          )}
                        </span>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          isOpen ? "max-h-64 pb-8" : "max-h-0"
                        }`}
                      >
                        <p className="text-ink-700 text-base leading-relaxed max-w-prose">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 reveal-up">
                <CTAButton variant="outline" size="md" href="/faq">
                  See all frequently asked questions
                </CTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 08 · FINAL CTA ══════════════════════════════════ */}
      <section className="relative py-32 md:py-44 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[900px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <p className="eyebrow text-paper/60 mb-10 reveal-up">Your move</p>
          <h2 className="display-huge text-paper reveal-up max-w-[18ch] mx-auto">
            Get your digital assistant{" "}
            <em className="italic font-light text-ember">live this week</em>.
          </h2>
          <p className="mt-10 text-paper/70 text-lg md:text-xl max-w-xl mx-auto leading-relaxed reveal-up">
            Free to start. Live in 5 minutes. No per-job fees, ever.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 reveal-up">
            <CTAButton size="lg" variant="solid" href="/signup">
              Start Free
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/pricing" withArrow={false}>
              See all plans
            </CTAButton>
          </div>
          <p className="mt-8 text-sm text-paper/40 reveal-up">
            POPIA compliant · Hosted in South Africa · hello@qwikly.co.za
          </p>
        </div>
      </section>
    </>
  );
}
