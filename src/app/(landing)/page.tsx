"use client";

import { useEffect, useState } from "react";
import CTAButton from "@/components/CTAButton";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { LiveCounter } from "@/components/landing/LiveCounter";
import { TwoServicesSection } from "@/components/landing/two-services/TwoServicesSection";

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
   BROWSER WIDGET MOCKUP (used inside hero)
   ───────────────────────────────────────────────────────────── */

function PhoneWidgetMockup() {
  return (
    <div
      className="relative w-[224px] flex-shrink-0"
      style={{
        filter:
          "drop-shadow(0 40px 60px rgba(14,14,12,0.30)) drop-shadow(0 12px 20px rgba(14,14,12,0.18))",
      }}
    >
      {/* Phone frame: rounded bezel */}
      <div
        className="relative rounded-[40px] bg-[#0E0E0C] p-[6px]"
        style={{ boxShadow: "0 0 0 1px rgba(14,14,12,0.6)" }}
      >
        {/* Inner screen */}
        <div className="relative rounded-[34px] overflow-hidden bg-white" style={{ aspectRatio: "9 / 19.5" }}>
          {/* Notch / dynamic island */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 w-20 h-5 rounded-full bg-[#0E0E0C]" />

          {/* iOS-ish status bar */}
          <div className="relative z-10 px-4 pt-1.5 pb-1 flex items-center justify-between text-[8px] font-medium text-ink">
            <span className="font-mono">9:41</span>
            <div className="flex items-center gap-1 opacity-80">
              <svg viewBox="0 0 18 12" className="w-3 h-2.5" fill="currentColor">
                <rect x="0"  y="8" width="2" height="4" rx="0.5" />
                <rect x="4"  y="6" width="2" height="6" rx="0.5" />
                <rect x="8"  y="3" width="2" height="9" rx="0.5" />
                <rect x="12" y="0" width="2" height="12" rx="0.5" />
              </svg>
              <svg viewBox="0 0 22 12" className="w-3.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="18" height="11" rx="2" />
                <rect x="2"   y="2"   width="14" height="8"  rx="1" fill="currentColor" />
                <rect x="20"  y="4"   width="1.5" height="4" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Mobile address bar */}
          <div className="relative z-10 px-4 pt-1.5 pb-2">
            <div className="flex items-center gap-2 bg-ink/[0.06] rounded-full h-6 px-3">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-[9px] text-ink/50 font-mono truncate">salon-luxe.co.za</span>
            </div>
          </div>

          {/* Faux salon site */}
          <div
            className="relative px-4 pt-3 pb-4"
            style={{ background: "linear-gradient(160deg, #1f1110 0%, #4a1d1a 60%, #8a3b2a 100%)" }}
          >
            <div className="text-paper space-y-1.5">
              <p className="text-[9px] uppercase tracking-[0.2em] text-paper/55 font-medium">Salon Luxe</p>
              <p className="text-[14px] font-display font-medium leading-tight">
                Cuts, colour <em className="italic font-light">+ care.</em>
              </p>
              <div className="flex gap-1 pt-2">
                <div className="px-2.5 py-1 rounded-full bg-paper text-[8px] text-ink font-medium">Book now</div>
                <div className="px-2.5 py-1 rounded-full border border-paper/30 text-[8px] text-paper/85">Services</div>
              </div>
            </div>
          </div>

          {/* Body skeleton */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="w-full h-1.5 bg-ink/10 rounded" />
            <div className="w-4/5 h-1.5 bg-ink/10 rounded" />
            <div className="w-3/5 h-1.5 bg-ink/[0.07] rounded" />
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <div className="h-12 bg-ink/[0.05] rounded-md" />
              <div className="h-12 bg-ink/[0.05] rounded-md" />
            </div>
          </div>

          {/* In-context Qwikly widget (mini expanded panel) */}
          <div className="absolute left-2 right-2 bottom-2">
            <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 18px 32px -8px rgba(14,14,12,0.28), 0 0 0 1px rgba(14,14,12,0.06)" }}>
              <div className="bg-ink px-3 py-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-ember flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-paper" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-paper text-[8px] font-semibold leading-none">Qwikly Assistant</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-green-400" />
                    <p className="text-paper/50 text-[7px] leading-none">Online now</p>
                  </div>
                </div>
              </div>
              <div className="p-2 space-y-1.5 bg-[#F9F6F2]">
                <div className="bg-white rounded-lg rounded-tl-sm px-2 py-1.5 max-w-[92%] border border-ink/[0.06]">
                  <p className="text-ink text-[8px] leading-snug">Hi! Looking to book a cut for the weekend?</p>
                </div>
                <div className="bg-ember rounded-lg rounded-tr-sm px-2 py-1.5 max-w-[68%] ml-auto">
                  <p className="text-paper text-[8px]">Saturday 2pm?</p>
                </div>
              </div>
              <div className="border-t border-ink/[0.06] px-2.5 py-1.5 bg-white flex items-center gap-2">
                <div className="flex-1 bg-[#F4EEE4] rounded-md h-4 px-1.5 flex items-center">
                  <span className="text-ink/30 text-[7px]">Type a message…</span>
                </div>
                <div className="w-4 h-4 rounded-full bg-ember flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-2 h-2 text-paper" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-0.5 rounded-full bg-ink/30" />
        </div>
      </div>
    </div>
  );
}

function BrowserWidgetMockup() {
  return (
    <div className="relative w-full max-w-[760px] mx-auto">
      {/* Warm glow behind the screen */}
      <div className="ember-blob w-[420px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />

      {/* Premium dark browser shell */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          boxShadow:
            "0 2px 0 rgba(255,255,255,0.05) inset," +
            "0 80px 160px -40px rgba(14,14,12,0.55)," +
            "0 30px 60px -20px rgba(14,14,12,0.25)," +
            "0 0 0 1px rgba(14,14,12,0.18)",
        }}
      >
        {/* Chrome bar — macOS dark */}
        <div className="bg-[#2C2C2E] px-4 py-3 flex items-center gap-3 border-b border-black/20">
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center bg-black/30 rounded-md h-7 px-3 gap-2 w-full max-w-[260px]">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white/25 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-[10px] text-white/35 font-mono tracking-tight">yourbusiness.co.za</span>
            </div>
          </div>
        </div>

        {/* ── Website interior ─────────────────────────────────── */}
        <div className="relative bg-white" style={{ minHeight: "348px" }}>

          {/* Realistic nav bar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#92400E] flex items-center justify-center">
                <div className="w-4 h-4 rounded-sm bg-white/30" />
              </div>
              <div className="w-22 h-2.5 bg-gray-800/55 rounded-sm" />
            </div>
            <div className="flex items-center gap-5">
              <div className="w-9 h-2 bg-gray-200 rounded-sm" />
              <div className="w-12 h-2 bg-gray-200 rounded-sm" />
              <div className="w-9 h-2 bg-gray-200 rounded-sm" />
              <div className="w-16 h-7 bg-[#92400E] rounded-full" />
            </div>
          </div>

          {/* Rich hero band — warm brown gradient simulating a real business site */}
          <div
            className="relative px-6 py-8 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3c1407 0%, #78350f 55%, #a16207 100%)" }}
          >
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, rgba(255,255,255,0.6) 0%, transparent 60%)" }} />
            <div className="max-w-[52%] space-y-2.5 relative">
              <div className="w-full h-4 bg-white/45 rounded-sm" />
              <div className="w-4/5 h-4 bg-white/35 rounded-sm" />
              <div className="w-3/5 h-2.5 bg-white/22 rounded-sm mt-0.5" />
              <div className="flex gap-2.5 mt-4">
                <div className="w-20 h-7 bg-white/30 rounded-full" />
                <div className="w-16 h-7 border border-white/30 rounded-full" />
              </div>
            </div>
          </div>

          {/* Body skeleton */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="flex gap-3 items-center">
              <div className="w-full h-2.5 bg-gray-100 rounded" />
            </div>
            <div className="w-4/5 h-2.5 bg-gray-100 rounded" />
            <div className="w-3/5 h-2 bg-gray-50 rounded" />
          </div>

          {/* ── Qwikly chat widget ───────────────────────────── */}
          <div className="absolute bottom-4 right-4 w-[228px]">
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                boxShadow:
                  "0 28px 64px -12px rgba(14,14,12,0.32)," +
                  "0 0 0 1px rgba(14,14,12,0.07)",
              }}
            >
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

              {/* Message thread */}
              <div className="p-3 space-y-2 bg-[#F9F6F2]">
                <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%] border border-ink/[0.06]">
                  <p className="text-ink text-[9px] leading-relaxed">Hi! Looking to book, get a quote, or just have a question?</p>
                </div>
                <div className="bg-ember rounded-xl rounded-tr-sm px-3 py-2 max-w-[70%] ml-auto">
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
            <div className="inline-flex items-center gap-2 bg-ink text-paper px-3 py-1.5 rounded-lg text-[9px] font-mono shadow-lg">
              <span className="text-ember">&lt;script&gt;</span>
              <span className="text-paper/55">Paste once. Done.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STRUCTURED DATA
   ───────────────────────────────────────────────────────────── */

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.qwikly.co.za/#service",
  name: "Qwikly Digital Assistant Platform",
  serviceType: "Digital assistant for service business websites",
  description:
    "A digital assistant that lives on your website, replies to every visitor in under 60 seconds, qualifies the lead, and emails the full lead to the business owner 24/7. POPIA compliant, hosted in South Africa, no setup fees, no per-job fees.",
  provider: { "@id": "https://www.qwikly.co.za/#organization" },
  areaServed: { "@type": "Country", name: "South Africa" },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "South African service businesses, tradespeople, clinics, salons, restaurants, contractors, and any local business that takes enquiries through its website.",
  },
  termsOfService: "https://www.qwikly.co.za/legal/terms",
  url: "https://www.qwikly.co.za",
};

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */

export default function Home() {
  useScrollReveal();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* ═══════ 01 · HERO ═══════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">

          {/* Top meta row */}
          <div className="flex items-center justify-between text-[0.7rem] text-ink-500 mb-10 md:mb-14 reveal-up">
            <div className="eyebrow flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-ember tick" />
              Live · Capturing leads now
            </div>
            <div className="eyebrow hidden sm:flex items-center gap-3">
              <span>Cape Town</span>
              <span className="text-ink-300">/</span>
              <LiveClock />
            </div>
          </div>

          {/* Eyebrow */}
          <p className="eyebrow text-ink-500 mb-6 reveal-up">
            Two products. No setup fees.
          </p>

          {/* Headline */}
          <div className="reveal-words visible">
            <h1 className="display-huge text-ink max-w-[20ch]">
              Reply to every website visitor, and find{" "}
              <em className="italic font-light">new clients</em> every day.
            </h1>
          </div>

          {/* Subhead + CTAs */}
          <div className="mt-10 md:mt-14 reveal-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <p className="text-lg md:text-xl text-ink-700 leading-relaxed max-w-lg">
                A digital assistant on your website that replies to visitors in under 60 seconds and emails you each new lead. Plus a daily list of hand-picked prospects matching your target client, delivered to your dashboard. That&rsquo;s it.
              </p>
              <div className="flex flex-col gap-4 lg:items-end lg:text-right">
                <div className="flex flex-wrap gap-4 lg:justify-end items-center">
                  <CTAButton
                    size="lg"
                    variant="solid"
                    href="/digital-assistant"
                    className="px-9 py-[1.2rem] text-[1.05rem] font-semibold shadow-[0_18px_36px_-18px_rgba(232,90,44,0.6)]"
                  >
                    See Digital Assistant
                  </CTAButton>
                  <CTAButton size="lg" variant="outline" href="/pipeline">
                    See Pipeline
                  </CTAButton>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 lg:justify-end items-center text-xs eyebrow text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-ember" />
                    POPIA compliant
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-ember" />
                    Hosted in South Africa
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-ember" />
                    ZAR pricing
                  </span>
                </div>
                <p className="text-sm text-ink-500">
                  Need a hand getting started?{" "}
                  <a href="/contact" className="text-ember underline transition-colors">
                    Get in touch
                  </a>{" "}
                  and we&rsquo;ll walk you through it.
                </p>
              </div>
            </div>
          </div>

          {/* Hero visual: same widget in two contexts (desktop site + phone) */}
          <div className="mt-20 md:mt-28 reveal-scale">
            <div className="relative w-full max-w-[760px] mx-auto">
              <BrowserWidgetMockup />
              {/* Phone perched at the bottom-right of the browser, slightly rotated.
                  Hidden on small viewports, the user is already on a phone, so a
                  miniature phone-in-a-phone reads as noise. */}
              <div
                className="hidden md:block absolute -right-10 lg:-right-14 -bottom-10 lg:-bottom-14"
                style={{ transform: "rotate(4deg)" }}
              >
                <PhoneWidgetMockup />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════ 02 · OUTCOMES ══════════════════════════════════ */}
      <section
        id="outcomes"
        className="relative py-28 md:py-40 overflow-hidden grain scroll-mt-24"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">

          {/* Eyebrow + heading */}
          <div className="text-center mb-16 md:mb-20 reveal-up">
            <p className="eyebrow text-ink-500 mb-6">The outcome</p>
            <h2 className="display-lg text-ink max-w-[22ch] mx-auto">
              Every visitor answered.{" "}
              <em className="italic font-light">Every lead in your inbox.</em>
            </h2>
          </div>

          {/* Live counter, centre stage */}
          <div className="reveal-scale mb-20 md:mb-28">
            <LiveCounter />
          </div>

          {/* Three numeric stats — premium cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal-stagger">
            <div className="rounded-2xl border border-ink/[0.08] bg-white/60 px-8 py-8 flex flex-col gap-4">
              <p className="display-xl text-ink leading-none">
                &lt;60<span className="text-ember">s</span>
              </p>
              <div>
                <p className="eyebrow text-ink-500">Reply time, every visitor</p>
                <p className="text-sm text-ink-600 mt-2 leading-relaxed">
                  Your digital assistant responds before a visitor can even think to leave.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-ink/[0.08] bg-white/60 px-8 py-8 flex flex-col gap-4">
              <p className="display-xl text-ink leading-none">
                24<span className="text-ember">/</span>7
              </p>
              <div>
                <p className="eyebrow text-ink-500">Coverage, no days off</p>
                <p className="text-sm text-ink-600 mt-2 leading-relaxed">
                  Weekends, public holidays, after hours — every lead captured, no exceptions.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-ink/[0.08] bg-white/60 px-8 py-8 flex flex-col gap-4">
              <p className="display-xl text-ink leading-none">
                100<span className="text-ember">%</span>
              </p>
              <div>
                <p className="eyebrow text-ink-500">POPIA compliant, hosted in SA</p>
                <p className="text-sm text-ink-600 mt-2 leading-relaxed">
                  Built for South African businesses. Data stays in South Africa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 03 · TWO SERVICES ══════════════════════════════ */}
      <TwoServicesSection />

      {/* ═══════ 04 · FINAL CTA ══════════════════════════════════ */}
      <section className="relative py-32 md:py-44 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[900px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <p className="eyebrow text-paper/60 mb-10 reveal-up">Your move</p>
          <h2 className="display-huge text-paper reveal-up max-w-[20ch] mx-auto">
            Ready to reply to{" "}
            <em className="italic font-light text-ember">every visitor</em>.
          </h2>
          <div className="mt-14 flex items-center justify-center reveal-up">
            <CTAButton size="lg" variant="solid" href="/contact">
              Book a setup call
            </CTAButton>
          </div>
        </div>
      </section>
    </>
  );
}
