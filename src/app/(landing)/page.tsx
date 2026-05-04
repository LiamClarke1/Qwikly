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
   DATA
   ───────────────────────────────────────────────────────────── */

const businessLogos = [
  {
    name: "Restaurants",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="2" x2="8" y2="22" /><line x1="12" y1="2" x2="12" y2="10" /><line x1="16" y1="2" x2="16" y2="10" />
        <path d="M8 10c0 2.2 1.8 4 4 4s4-1.8 4-4" />
      </svg>
    ),
  },
  {
    name: "Hair Salons",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    name: "Law Firms",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    name: "Dental Clinics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c-3.5 0-6 2.5-6 6 0 2 .5 3.5 1 5l1 5c.2 1 .8 2 2 2s1.8-1 2-2l1-3 1 3c.2 1 .8 2 2 2s1.8-1 2-2l1-5c.5-1.5 1-3 1-5 0-3.5-2.5-6-6-6z" />
      </svg>
    ),
  },
  {
    name: "Gyms",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="4" cy="12" r="2.5" /><circle cx="20" cy="12" r="2.5" />
        <line x1="6.5" y1="12" x2="17.5" y2="12" />
        <line x1="4" y1="9" x2="4" y2="15" /><line x1="8" y1="9" x2="8" y2="15" />
        <line x1="20" y1="9" x2="20" y2="15" /><line x1="16" y1="9" x2="16" y2="15" />
      </svg>
    ),
  },
  {
    name: "Contractors",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    name: "Photographers",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    name: "Medical Clinics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    name: "Tutors",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    name: "Cafes",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    name: "Cleaning Services",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: "Beauty Spas",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    name: "Estate Agents",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <rect x="9" y="14" width="6" height="7" />
      </svg>
    ),
  },
  {
    name: "Plumbers",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6m0 0a4 4 0 100 8 4 4 0 000-8zm0 8v6" />
        <path d="M8 8H4a2 2 0 000 4h4m8-4h4a2 2 0 010 4h-4" />
      </svg>
    ),
  },
  {
    name: "Electricians",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    name: "Accountants",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        <line x1="6" y1="8" x2="10" y2="8" /><line x1="6" y1="11" x2="10" y2="11" /><line x1="14" y1="8" x2="18" y2="8" /><line x1="14" y1="11" x2="18" y2="11" />
      </svg>
    ),
  },
  {
    name: "Physiotherapists",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v6m0 0l-3 4m3-4l3 4" />
        <path d="M9 13H6m12 0h-3" />
      </svg>
    ),
  },
  {
    name: "Optometrists",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    name: "Veterinarians",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
        <path d="M8 14v.5A3.5 3.5 0 0011.5 18h1a3.5 3.5 0 003.5-3.5V14" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    name: "Driving Schools",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    name: "Car Washes",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16.5c0 1.38 1.12 2.5 2.5 2.5h5c1.38 0 2.5-1.12 2.5-2.5V14H7v2.5z" />
        <path d="M17 14l1.5-5H5.5L7 14" />
        <path d="M9 7c0-1.1.9-2 2-2h2a2 2 0 012 2" />
        <line x1="5" y1="3" x2="5" y2="5" /><line x1="9" y1="2" x2="9" y2="4" /><line x1="13" y1="3" x2="13" y2="5" />
      </svg>
    ),
  },
  {
    name: "Mechanics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    name: "Florists",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12m0 0c0-4 3-7 6-7-1 4-3 7-6 7zm0 0c0-4-3-7-6-7 1 4 3 7 6 7z" />
        <circle cx="12" cy="8" r="3" />
      </svg>
    ),
  },
  {
    name: "Jewellers",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    name: "Pest Control",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="11" r="3" />
        <path d="M12 8V5m0 9v3M9.5 9.5L7 7m9.5 2.5L19 7M9.5 12.5L7 15m9.5-2.5L19 15" />
        <path d="M8 5h8" />
      </svg>
    ),
  },
  {
    name: "Security",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    name: "Travel Agents",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    name: "Event Planners",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    name: "Yoga Studios",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4" r="2" />
        <path d="M12 6v4m-4 2c1.5 0 3-.5 4-2 1 1.5 2.5 2 4 2" />
        <path d="M8 12l-3 6m14-6l-3 6" />
        <line x1="6" y1="18" x2="10" y2="18" /><line x1="14" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
  {
    name: "Nutritionists",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    name: "Pet Groomers",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <path d="M16 3.13a4 4 0 010 7.75" />
        <path d="M21 21v-2a4 4 0 00-3-3.87" />
      </svg>
    ),
  },
];

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
    name: "Free Trial",
    price: "Free",
    period: "14 days",
    tagline: "No bank account required",
    highlight: false,
    isTrial: true,
    features: [
      "75 qualified leads/month",
      "Full Pro features — identical",
      "Custom branding + questions",
      "No bank account needed",
      "Upgrade anytime",
    ],
    cta: "Start Free Trial",
    href: "/signup?plan=trial",
    variant: "primary" as const,
  },
  {
    name: "Pro",
    price: "R999",
    period: "/month",
    tagline: "For businesses getting started",
    highlight: false,
    isTrial: false,
    features: [
      "75 qualified leads/month",
      "Digital assistant platform",
      "Email lead delivery",
      '"Powered by Qwikly" branding',
      "Email support",
    ],
    cta: "Start with Pro",
    href: "/signup?plan=pro",
    variant: "outline" as const,
  },
  {
    name: "Premium",
    price: "R1,999",
    period: "/month",
    tagline: "Most popular",
    highlight: true,
    isTrial: false,
    features: [
      "250 qualified leads/month",
      "Custom branding (your logo)",
      "Custom greeting & questions",
      "Lead exports (CSV)",
      "Priority email support",
    ],
    cta: "Start with Premium",
    href: "/signup?plan=premium",
    variant: "solid" as const,
  },
  {
    name: "Billions",
    price: "R2,999",
    period: "/month",
    tagline: "Maximum leads, full control",
    highlight: false,
    isTrial: false,
    features: [
      "1,000 qualified leads/month",
      "Everything in Premium",
      "Calendar integration (coming soon)",
      "API access + dedicated support",
    ],
    cta: "Start with Billions",
    href: "/signup?plan=billions",
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
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">

          {/* Top meta row */}
          <div className="flex items-center justify-between text-[0.7rem] text-ink-500 mb-16 md:mb-20 reveal-up">
            <div className="eyebrow flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-ember tick" />
              Live · Capturing leads now
            </div>
            <div className="eyebrow hidden sm:flex items-center gap-3">
              <span>Johannesburg</span>
              <span className="text-ink-300">/</span>
              <LiveClock />
            </div>
          </div>

          {/* Headline */}
          <div className="reveal-words visible">
            <h1 className="display-huge text-ink max-w-[20ch]">
              The digital assistant{" "}
              <em className="italic font-light">platform for your business</em>.
            </h1>
          </div>

          {/* Subhead + CTAs */}
          <div className="mt-10 md:mt-14 reveal-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <p className="text-lg md:text-xl text-ink-700 leading-relaxed max-w-lg">
                Captures every enquiry, qualifies it, and sends it to your inbox. Even when you&rsquo;re asleep.
                Live in under 10 minutes.
              </p>
              <div className="flex flex-col gap-4 lg:items-end lg:text-right">
                <div className="flex flex-wrap gap-4 lg:justify-end">
                  <CTAButton size="lg" variant="primary" href="/signup?plan=trial">
                    Start Free Trial
                  </CTAButton>
                  <CTAButton size="lg" variant="outline" href="#how-it-works" withArrow={false}>
                    See how it works
                  </CTAButton>
                </div>
                <p className="text-sm text-ink-500">
                  14-day free trial. No bank account required. No card needed. Upgrade when you&apos;re ready.
                </p>
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="mt-20 md:mt-28 reveal-scale">
            <BrowserWidgetMockup />
          </div>

        </div>
      </section>

      {/* ═══════ 02 · SOCIAL PROOF MARQUEE ══════════════════════ */}
      <section className="py-12 relative">
        <div className="absolute top-0 inset-x-0 shimmer-line" />
        <p className="eyebrow text-center text-ink-400 mb-8 px-6">Built for South African businesses</p>
        <div className="relative overflow-hidden ticker-pause">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #F4EEE4, transparent)" }} />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #F4EEE4, transparent)" }} />

          <div className="ticker-scroll flex items-center w-max">
            {[...businessLogos, ...businessLogos].map((b, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border border-ink/[0.09] rounded-xl shadow-sm flex-shrink-0 whitespace-nowrap mr-3"
              >
                <div className="w-7 h-7 rounded-lg bg-ink/[0.04] border border-ink/[0.07] flex items-center justify-center text-ink/45 flex-shrink-0">
                  {b.icon}
                </div>
                <span className="text-sm font-medium text-ink/55 tracking-tight">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 shimmer-line" />
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
      <section className="relative py-28 md:py-40 overflow-hidden grain">
        <div className="dot-grid-ink absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20 md:mb-28">
            <div className="md:col-span-5">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">What it does</p>
              <h2 className="display-lg text-ink reveal-up">
                Everything your{" "}
                <em className="italic font-light">front desk would do</em>.
              </h2>
            </div>
            <div className="md:col-span-6 md:col-start-7 md:pt-2 reveal-up">
              <p className="text-lg text-ink-700 leading-relaxed">
                Qwikly handles every incoming enquiry on your behalf. It qualifies, books, and delivers warm leads to your inbox. Around the clock.
              </p>
            </div>
          </div>

          {/* Feature rows — chain reveal */}
          <div className="reveal-chain">
            {features.map((f, i) => (
              <div key={f.title} className="relative group border-t border-ink/[0.08] py-10 overflow-hidden cursor-default">
                {/* Ember line draws across bottom on reveal */}
                <div className="feature-draw-line absolute bottom-0 left-0 h-px bg-gradient-to-r from-ember/50 via-ember/15 to-transparent" />

                <div className="flex items-center gap-6 md:gap-10">
                  {/* Ghost step number */}
                  <span
                    className="font-display italic shrink-0 leading-none select-none text-ink/[0.07] group-hover:text-ember/25 transition-colors duration-700"
                    style={{ fontSize: "clamp(4rem, 9vw, 8rem)" }}
                  >
                    0{i + 1}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-2xl md:text-3xl lg:text-[2.25rem] text-ink mb-2.5 leading-tight group-hover:text-ember transition-colors duration-500">
                      {f.title}
                    </h3>
                    <p className="text-ink-700 text-sm md:text-base leading-relaxed max-w-[52ch]">
                      {f.body}
                    </p>
                  </div>

                  {/* Icon badge */}
                  <div className="shrink-0 hidden sm:flex w-14 h-14 rounded-2xl border border-ink/[0.10] group-hover:border-ember/35 group-hover:bg-ember/[0.06] items-center justify-center text-ink/30 group-hover:text-ember transition-all duration-500">
                    {f.icon}
                  </div>
                </div>
              </div>
            ))}
            {/* Final closing line */}
            <div className="border-t border-ink/[0.08]" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch reveal-stagger">
            {teaserTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col ${
                  tier.isTrial
                    ? "rounded-2xl p-8 border-2 border-emerald-200 bg-emerald-50"
                    : tier.highlight
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
                {tier.isTrial && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="eyebrow bg-emerald-600 text-white px-4 py-1.5 rounded-full whitespace-nowrap">
                      No card required
                    </span>
                  </div>
                )}

                <p className={`eyebrow mb-1 mt-2 ${tier.isTrial ? "text-emerald-700" : tier.highlight ? "text-ember" : "text-ink-500"}`}>
                  {tier.name}
                </p>
                <p className={`text-sm leading-snug mb-6 ${tier.isTrial ? "text-emerald-600" : tier.highlight ? "text-paper/60" : "text-ink-700"}`}>
                  {tier.tagline}
                </p>

                <div className="mb-8">
                  <span
                    className={`font-display font-medium leading-none ${tier.isTrial ? "text-emerald-700" : tier.highlight ? "text-paper" : "text-ink"}`}
                    style={{ fontSize: "clamp(2.4rem, 4vw, 3rem)" }}
                  >
                    {tier.price}
                  </span>
                  <span className={`text-sm ml-1 ${tier.isTrial ? "text-emerald-600" : tier.highlight ? "text-paper/50" : "text-ink-500"}`}>
                    {tier.period}
                  </span>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {tier.features.map((feat) => (
                    <li
                      key={feat}
                      className={`flex items-start gap-3 text-sm leading-relaxed ${
                        tier.isTrial ? "text-emerald-700" : tier.highlight ? "text-paper/80" : "text-ink-700"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.isTrial ? "text-emerald-500" : "text-ember"}`}
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
                  variant={tier.isTrial ? "primary" : tier.variant}
                  size="md"
                  className={`w-full justify-center ${tier.isTrial ? "!bg-emerald-600 !text-white hover:!bg-emerald-700" : ""}`}
                >
                  {tier.cta}
                </CTAButton>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 reveal-up">
            <p className="text-sm text-ink-500">
              Save 15% with annual billing · Top-ups at R20/extra lead · All prices excl. VAT
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

      {/* ═══════ 07b · FOR YOUR WEBSITE ════════════════════════ */}
      <section className="relative py-28 md:py-36 bg-paper overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

            {/* Text */}
            <div className="reveal-up">
              <p className="eyebrow text-ink-500 mb-6">For your website</p>
              <h2 className="display-lg text-ink mb-6">
                Already have a website?{" "}
                <em className="italic font-light">Add Qwikly in 5 minutes.</em>
              </h2>
              <p className="text-ink-700 text-lg leading-relaxed mb-8 max-w-[42ch]">
                Paste one line of code into Wix, WordPress, Squarespace, or any custom site. Your digital assistant goes live instantly — no developer needed.
              </p>
              <CTAButton href="/connect-your-website" size="lg">
                See how it works
              </CTAButton>
            </div>

            {/* Browser + widget mockup */}
            <div className="reveal-up flex justify-center md:justify-end">
              <div className="relative">
                <div className="w-72 bg-white rounded-2xl shadow-xl border border-ink/[0.08] overflow-hidden">
                  {/* Browser chrome */}
                  <div className="bg-[#F1F3F4] px-3 py-2.5 flex items-center gap-2 border-b border-ink/[0.06]">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    </div>
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-ink/30 border border-ink/[0.08]">
                      yoursite.co.za
                    </div>
                  </div>
                  {/* Page body */}
                  <div className="px-5 py-6 bg-gray-50 min-h-[130px] relative">
                    <div className="space-y-2 mb-4">
                      <div className="h-2.5 bg-ink/8 rounded w-3/4" />
                      <div className="h-2 bg-ink/5 rounded w-full" />
                      <div className="h-2 bg-ink/5 rounded w-5/6" />
                    </div>
                    {/* Widget launcher */}
                    <div className="absolute bottom-4 right-4">
                      <div className="inline-flex items-center gap-1.5 bg-ember text-white text-[10px] font-bold px-3.5 py-2 rounded-full shadow-lg shadow-ember/30">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        Reply in 30s
                      </div>
                    </div>
                  </div>
                </div>
                {/* Badge */}
                <div className="absolute -top-3 -right-3 bg-ember text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md shadow-ember/30 whitespace-nowrap">
                  5 min setup
                </div>
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
            <CTAButton size="lg" variant="solid" href="/signup?plan=trial">
              Start Free Trial
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
