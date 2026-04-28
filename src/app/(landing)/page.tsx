"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";
import WhatsAppMock from "@/components/WhatsAppMock";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ProblemTiles, useProblem } from "@/components/landing/ProblemTiles";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeatureTranslation } from "@/components/landing/FeatureTranslation";
import { DemoPlayer } from "@/components/landing/DemoPlayer";
import { RevenueCalculator } from "@/components/landing/RevenueCalculator";
import { LiveActivityStrip } from "@/components/landing/LiveActivityStrip";
import { LiveCounter } from "@/components/landing/LiveCounter";

/* ─────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────── */

const STATS_VERIFIED = process.env.NEXT_PUBLIC_STATS_VERIFIED === "true";

const outcomes = [
  {
    stat: "R28,000",
    label: "recovered in month one",
    body: "4 jobs booked after 6 p.m. that would have gone to the next contractor to reply.",
    attr: "Thabo, Electrician, Johannesburg",
  },
  {
    stat: "30 sec",
    label: "first reply, every time",
    body: "Answered before the customer opens a second tab. The lead never reaches your competitor.",
    attr: STATS_VERIFIED ? "benchmark across 14,000+ conversations" : "measured reply time",
  },
  {
    stat: "94%",
    label: "of leads qualified",
    body: "Pre-screened for location, job type, and urgency before anything hits your calendar.",
    attr: STATS_VERIFIED ? "Qwikly customer average, Q1 2026" : "targeted qualification rate",
  },
  {
    stat: "24/7",
    label: "never off, never late",
    body: "2 a.m. burst geyser. Sunday pool pump. Public holiday roof leak. You wake up to a booked job.",
    attr: "no monthly fee. Pay only on booking.",
  },
];

const tradeLines = [
  "Electricians", "Plumbers", "Roofers", "Solar Installers", "Pest Control",
  "Aircon", "Pool Services", "Landscaping", "Garage Doors", "Security",
  "Dentists", "Beauty Salons", "Auto Mechanics", "Estate Agents", "Cleaners",
  "Tutors", "Vets", "Photographers", "Movers", "Fitness Trainers",
];

const howSteps = [
  {
    stamp: "i.",
    title: "A lead messages in.",
    body: "WhatsApp at 7 p.m. while you're finishing a job. Email on a Sunday morning. It doesn't matter when. Qwikly sees it first.",
  },
  {
    stamp: "ii.",
    title: "Qwikly replies in 30 seconds.",
    body: "Not a chatbot script. A real conversation. It asks the right qualifying questions: job type, area, and urgency. In the voice of your business.",
  },
  {
    stamp: "iii.",
    title: "The appointment locks in.",
    body: "Qwikly reads your Google Calendar, offers real slots, and confirms the booking. You get a WhatsApp ping. The customer gets a confirmation.",
  },
  {
    stamp: "iv.",
    title: "Everything after runs itself.",
    body: "24-hour and 1-hour reminders. No-show rebooking the same day. Dormant leads revived at 30 days. You just do the work.",
  },
];

const testimonials = [
  {
    quote: "Picked up 4 extra jobs in the first month that I know I would have missed. About R28,000 in work from leads that came in after 6 p.m.",
    name: "Thabo M.",
    trade: "Electrician",
    city: "Johannesburg",
    badge: "R28,000 recovered · 4 jobs",
  },
  {
    quote: "Two no-shows last month got automatically rebooked. That alone covered what I pay Qwikly. Weekend leads used to just disappear.",
    name: "Sarah K.",
    trade: "Pool Services",
    city: "Cape Town",
    badge: "2 no-shows saved",
  },
  {
    quote: "Handles 6 to 8 bookings a month for me now. The ones that come in while I'm under a sink used to just vanish into the ether.",
    name: "James R.",
    trade: "Plumber",
    city: "Pretoria",
    badge: "6–8 bookings / month",
  },
];

const pricingIncludes = [
  "30-second WhatsApp response",
  "Email lead handling",
  "Automated follow-ups at 4h, 24h, 2d, 5d",
  "No-show rebooking within minutes",
  "Quote follow-up sequences",
  "Dormant-lead revival at 30 days",
  "Reminders 24h and 1h before each job",
  "Trade-specific digital assistant trained for your services",
  "Full conversation dashboard",
  "Google Calendar sync",
];

/* ─────────────────────────────────────────────────────────────
   Helpers
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

function StatCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        ob.disconnect();
        const duration = 1800;
        const start = performance.now();
        const loop = (t: number) => {
          const p = Math.min((t - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(eased * value));
          if (p < 1) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      },
      { threshold: 0.5 }
    );
    ob.observe(ref.current);
    return () => ob.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="num">
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

function PricingCalculator() {
  const [rawPrice, setRawPrice] = useState("");

  const result = useMemo(() => {
    const price = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));
    if (!price || price <= 0) return null;
    const fee = Math.min(Math.max(price * 0.08, 150), 5000);
    const keep = price - fee;
    return { fee: Math.round(fee), keep: Math.round(keep) };
  }, [rawPrice]);

  return (
    <div className="mt-16 mb-4 bg-ink/5 border border-ink/10 rounded-2xl p-6 md:p-8 reveal-up">
      <p className="eyebrow text-ink-500 mb-2">See what you&rsquo;d pay</p>
      <p className="font-display text-xl text-ink mb-6">Enter your typical job price</p>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-ink-500">R</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={rawPrice}
            onChange={(e) => setRawPrice(e.target.value)}
            placeholder="e.g. 2500"
            className="pl-8 pr-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-lg font-display w-48 focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all"
          />
        </div>
        {result ? (
          <div className="flex flex-wrap gap-6 items-center">
            <div>
              <p className="eyebrow text-ink-500">Qwikly fee</p>
              <p className="font-display text-3xl text-ember mt-0.5">R{result.fee.toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-ink/10 hidden sm:block" />
            <div>
              <p className="eyebrow text-ink-500">You keep</p>
              <p className="font-display text-3xl text-ink mt-0.5">R{result.keep.toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-ink/10 hidden sm:block" />
            <div>
              <p className="eyebrow text-ink-500">Return multiple</p>
              <p className="font-display text-3xl text-ink mt-0.5">{Math.round(result.keep / result.fee)}×</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-500 italic">Your fee and what you keep will appear here</p>
        )}
      </div>
      <p className="text-xs text-ink-400 mt-4">Min R150 · Max R5,000 per booking · Only charged on confirmed jobs</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */

export default function Home() {
  useScrollReveal();
  const { problem, setProblem } = useProblem();

  return (
    <>
      {/* ═══════ 01 · HERO ═══════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          {/* Top meta row */}
          <div className="flex items-center justify-between text-[0.7rem] text-ink-500 mb-16 md:mb-24 reveal-up">
            <div className="eyebrow flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-ember tick" />
              Live · Answering leads now
            </div>
            <div className="eyebrow hidden sm:flex items-center gap-3">
              <span>Johannesburg</span>
              <span className="text-ink-300">/</span>
              <LiveClock />
            </div>
          </div>

          {/* Headline */}
          <div className="reveal-words visible">
            <h1 className="display-huge text-ink max-w-[14ch]">
              Stop losing jobs<br />
              <span className="italic font-light">to the first reply</span>.
            </h1>
          </div>

          {/* Subhead + CTAs */}
          <div className="mt-12 md:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end reveal-up">
            <div className="lg:col-span-7">
              <p className="text-lg md:text-xl text-ink-700 max-w-xl leading-relaxed">
                Qwikly answers your WhatsApp, qualifies the lead, quotes them, and books the
                job — while you stay on site. You pay only when a real appointment
                lands in your calendar.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <CTAButton size="lg" variant="primary" href="/signup">
                  Start your 7-day trial
                </CTAButton>
                <CTAButton size="lg" variant="outline" href="#demo" withArrow={false}>
                  See it answer a real lead
                </CTAButton>
              </div>
              <p className="mt-4 text-sm text-ink-500">
                No setup fee. No contract. Pay only when a job is booked.
              </p>
              <LiveCounter />
            </div>

            {/* Right column — live status card */}
            {STATS_VERIFIED && (
              <div className="lg:col-span-5 lg:pl-8 lg:border-l lg:border-ink/10">
                <p className="eyebrow text-ink-500 mb-4">This morning, so far</p>
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <p className="font-display text-4xl text-ink">
                      <StatCounter value={17} />
                    </p>
                    <p className="text-xs text-ink-500 mt-1">Leads replied</p>
                  </div>
                  <div>
                    <p className="font-display text-4xl text-ink">
                      <StatCounter value={11} />
                    </p>
                    <p className="text-xs text-ink-500 mt-1">Jobs booked</p>
                  </div>
                  <div>
                    <p className="font-display text-4xl text-ember">
                      R<StatCounter value={48} />k
                    </p>
                    <p className="text-xs text-ink-500 mt-1">Revenue captured</p>
                  </div>
                </div>
                <div className="rule mt-6" />
                <p className="mt-4 text-[0.75rem] text-ink-500 leading-relaxed">
                  Rolling average across active Qwikly accounts, refreshed at 06:00 SAST.
                </p>
              </div>
            )}
          </div>

          {/* Hero — animated WhatsApp phone */}
          <div className="mt-20 md:mt-28 relative reveal-scale">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 flex justify-center lg:justify-start relative">
                <div className="animate-phone-float">
                  <WhatsAppMock />
                </div>
                <div className="ember-blob w-[400px] h-[400px] -left-20 -top-10 hidden lg:block" />
              </div>
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <p className="eyebrow text-ember mb-3">Reply in 30 s</p>
                  <p className="font-display text-2xl md:text-3xl text-ink leading-tight max-w-md">
                    It reads the message, asks what you&rsquo;d ask, and{" "}
                    <em className="italic text-ember">books the slot</em>. The customer never has to wait.
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    "Responds in under 30 seconds, around the clock",
                    "Speaks in your business voice — not like a chatbot",
                    "Qualifies leads before they reach your calendar",
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <span className="mt-1.5 w-4 h-4 rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                      </span>
                      <p className="text-ink-700 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom marquee — trades */}
          <div className="mt-24 overflow-hidden ticker-pause">
            <div className="rule mb-6 mx-0" />
            <div className="flex items-center gap-12 ticker-scroll-slow w-max text-ink-700 px-6">
              {[...tradeLines, ...tradeLines].map((t, i) => (
                <span key={`${t}-${i}`} className="headline-marquee">
                  {t}
                  <span className="text-ember not-italic font-display mx-8">·</span>
                </span>
              ))}
            </div>
            <div className="rule mt-6 mx-0" />
            <p className="eyebrow text-center text-ink-500 mt-6">
              20+ trades · Built for South African service businesses
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ 02 · PROBLEM ════════════════════════════════════ */}
      <section className="relative py-28 md:py-36 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[500px] h-[500px] top-10 -right-40" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-paper/60 mb-8 reveal-up">02. The problem</p>
          <h2 className="display-xl text-paper max-w-[20ch] reveal-up">
            You didn&rsquo;t start a business{" "}
            <em className="italic font-light text-ember">to babysit a phone</em>.
          </h2>

          <div className="mt-16 space-y-4 reveal-stagger">
            {[
              "Tired of losing weekend jobs because you couldn't get to the phone?",
              "Customers ghost you because you took 4 hours to reply?",
              "WhatsApp full of leads you'll reply to later — and never do?",
            ].map((pain) => (
              <div
                key={pain}
                className="px-6 py-5 rounded-2xl border border-ember/25 bg-ember/[0.06]"
              >
                <p className="text-paper/90 text-lg leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-10 items-end reveal-up">
            <div className="md:col-span-7">
              <div className="mock-card-dark p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <p className="eyebrow text-paper/60">Inbound · WhatsApp</p>
                  <p className="eyebrow text-ember">Replied in 0:00:28</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white/5 rounded-2xl px-4 py-3 max-w-[85%]">
                    <p className="text-paper/90 leading-relaxed">Hi, my geyser is leaking bad. Burst I think. Joburg north. Can anyone come now?</p>
                    <p className="text-paper/40 text-[0.65rem] mt-1 num">02:14</p>
                  </div>
                  <div className="bg-ember/90 rounded-2xl px-4 py-3 max-w-[85%] ml-auto">
                    <p className="text-paper leading-relaxed">Hi, sorry to hear. I can send someone out now. Can you confirm the suburb and shut the mains for me?</p>
                    <p className="text-paper/70 text-[0.65rem] mt-1 num">02:14</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl px-4 py-3 max-w-[85%]">
                    <p className="text-paper/90 leading-relaxed">Randburg. Mains off. How soon?</p>
                    <p className="text-paper/40 text-[0.65rem] mt-1 num">02:15</p>
                  </div>
                  <div className="bg-ember/90 rounded-2xl px-4 py-3 max-w-[85%] ml-auto">
                    <p className="text-paper leading-relaxed">Booked for 02:45 tonight. You&rsquo;ll get a confirmation + the tech&rsquo;s number when they&rsquo;re 5 min away.</p>
                    <p className="text-paper/70 text-[0.65rem] mt-1 num">02:15</p>
                  </div>
                </div>
                <div className="rule-light mt-5" />
                <p className="eyebrow text-paper/40 mt-4">Qwikly conversation · logged to your dashboard</p>
              </div>
            </div>
            <div className="md:col-span-5">
              <p className="display-md text-ember mb-4">At 2:14 a.m.</p>
              <p className="font-display text-xl text-paper/80 leading-relaxed">
                Someone&rsquo;s geyser bursts in Randburg. They message three plumbers. Yours replies in 28 seconds.
              </p>
              <p className="mt-4 text-paper/60 leading-relaxed">
                The other two replied at 07:48. That job was already done.
              </p>
              <div className="mt-6 italic text-paper/50 text-sm border-l-2 border-ember/40 pl-4">
                &ldquo;If you&rsquo;re nodding, keep scrolling.&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 03 · PERSONALISATION TILES ═════════════════════ */}
      <section className="relative py-28 md:py-36 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6 reveal-up">03. Your situation</p>
          <h2 className="display-lg text-ink max-w-[22ch] reveal-up">
            What&rsquo;s killing your business right now?
          </h2>
          <p className="mt-4 text-ink-700 max-w-lg reveal-up">
            Pick the one that hits hardest. The next section will be specific to your problem.
          </p>

          <div className="mt-10 reveal-up">
            <ProblemTiles selected={problem} onChange={setProblem} />
          </div>
        </div>
      </section>

      {/* ═══════ 04 · SOLUTION (conditional) ════════════════════ */}
      <section className="relative py-28 md:py-36 bg-paper-deep grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6 reveal-up">04. The fix</p>
          <div className="reveal-up">
            <SolutionSection problem={problem} />
          </div>
        </div>
      </section>

      {/* ═══════ OUTCOMES ════════════════════════════════════════ */}
      <section
        id="outcomes"
        className="relative py-28 md:py-40 bg-ink text-paper overflow-hidden grain-dark"
      >
        <div className="ember-blob w-[600px] h-[600px] top-20 -left-40" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-center justify-between mb-16 reveal-up">
            <p className="eyebrow text-paper/60">Outcomes</p>
            <p className="eyebrow text-paper/60">Jobs, not features.</p>
          </div>

          <h2 className="display-xl max-w-[16ch] reveal-up">
            We sell you <em className="italic font-light text-ember">jobs</em>.
            Everything else is how we get there.
          </h2>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-20 reveal-stagger">
            {outcomes.map((o) => (
              <div key={o.stat} className="relative">
                <div className="outcome-num text-paper">{o.stat}</div>
                <p className="font-display italic text-xl text-ember mt-2">{o.label}</p>
                <div className="rule-light mt-6 w-16" />
                <p className="mt-6 text-base md:text-lg text-paper/80 max-w-md leading-relaxed">{o.body}</p>
                <p className="mt-4 eyebrow text-paper/40">{o.attr}</p>
              </div>
            ))}
          </div>

          <div className="mt-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 reveal-up">
            <p className="font-display italic text-2xl md:text-3xl text-paper max-w-xl leading-snug">
              &ldquo;The ones that come in while I&rsquo;m under a sink used to just vanish.&rdquo;
            </p>
            <CTAButton size="lg" variant="solid" href="/signup">
              Start your 7-day trial
            </CTAButton>
          </div>
        </div>
      </section>

      {/* ═══════ 05 · FEATURE TRANSLATION ═══════════════════════ */}
      <section className="relative py-28 md:py-36 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6 reveal-up">05. What it does</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
            <div className="md:col-span-5">
              <h2 className="display-lg text-ink reveal-up">
                What it actually does{" "}
                <em className="italic font-light">for you</em>.
              </h2>
            </div>
            <div className="md:col-span-7 md:pt-4 reveal-up">
              <p className="text-lg text-ink-700 leading-relaxed">
                Tech companies love jargon. Here&rsquo;s what Qwikly actually does, in plain English, translated from the stuff they use to impress investors.
              </p>
            </div>
          </div>
          <div className="reveal-up">
            <FeatureTranslation />
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">How it works</p>
              <h2 className="display-lg text-ink reveal-up">
                Four steps.
                <br />
                <span className="italic font-light">Zero input</span> from you.
              </h2>
            </div>
            <div className="md:col-span-7 md:col-start-6 md:pt-6">
              <p className="text-lg text-ink-700 leading-relaxed reveal-up">
                Qwikly doesn&rsquo;t bolt a bot onto your WhatsApp. It learns your services, your pricing, your service area, the way you speak — and then works a full sales cycle, start to finish, without you touching it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 reveal-stagger">
            {howSteps.map((s) => (
              <div key={s.stamp} className="ed-card-ghost group">
                <div className="flex items-start justify-between mb-6">
                  <span className="step-stamp">{s.stamp}</span>
                  <span className="eyebrow text-ink-500 group-hover:text-ember transition-colors">Step</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-ink leading-tight">{s.title}</h3>
                <p className="mt-4 text-ink-700 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 06 · DEMO ═══════════════════════════════════════ */}
      <section id="demo" className="relative py-28 md:py-36 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6 reveal-up">06. See it live</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
            <div className="md:col-span-5">
              <h2 className="display-lg text-ink reveal-up">
                Watch it answer a real lead.{" "}
                <em className="italic font-light">Right now.</em>
              </h2>
            </div>
            <div className="md:col-span-7 md:pt-4 reveal-up">
              <p className="text-lg text-ink-700 leading-relaxed">
                These are scripted from real Qwikly conversations. Every response, timing, and follow-up is exactly what your customers would experience.
              </p>
            </div>
          </div>
          <div className="reveal-up">
            <DemoPlayer />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4 reveal-up">
            <CTAButton size="lg" variant="primary" href="/signup">
              Start your 7-day trial
            </CTAButton>
            <p className="text-sm text-ink-500">No card. No setup fee. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ════════════════════════════════════ */}
      <section className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-baseline justify-between mb-16 reveal-up">
            <div>
              <p className="eyebrow text-ink-500 mb-4">Proof</p>
              <h2 className="display-lg text-ink max-w-[16ch]">
                Booked jobs,{" "}
                <em className="italic font-light">not promises</em>.
              </h2>
            </div>
            <p className="eyebrow text-ink-500 hidden md:block">Verified customers · Q1 2026</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 reveal-stagger">
            {testimonials.map((t) => (
              <figure key={t.name} className="ed-card flex flex-col justify-between">
                <div className="inline-flex items-center gap-2 bg-ember/10 text-ember eyebrow px-3 py-1.5 rounded-full w-fit mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                  {t.badge}
                </div>
                <blockquote className="pullquote">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-10 pt-6 border-t border-ink/10">
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="text-sm text-ink-500 mt-0.5">{t.trade} · {t.city}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 07 · REVENUE CALCULATOR ════════════════════════ */}
      <section className="relative py-28 md:py-36 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6 reveal-up">07. Your number</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
            <div className="md:col-span-5">
              <h2 className="display-lg text-ink reveal-up">
                Get your missed-revenue estimate{" "}
                <em className="italic font-light">in 30 seconds</em>.
              </h2>
            </div>
            <div className="md:col-span-7 md:pt-4 reveal-up">
              <p className="text-lg text-ink-700 leading-relaxed">
                Three inputs. One number you&rsquo;ve probably never calculated. Most tradespeople are surprised — and then angry that they waited this long to fix it.
              </p>
            </div>
          </div>
          <div className="reveal-up">
            <RevenueCalculator />
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═════════════════════════════════════════ */}
      <section
        id="pricing"
        className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-baseline justify-between mb-16 reveal-up">
            <p className="eyebrow text-ink-500">Pricing</p>
            <p className="eyebrow text-ink-500">No subscription · No setup</p>
          </div>

          <div className="relative text-center reveal-scale">
            <p className="mega-num text-ink tracking-tight">
              8<span className="text-ember align-top text-[0.55em] ml-2">%</span>
            </p>
            <p className="font-display italic text-2xl md:text-3xl text-ink-700 mt-2 md:mt-0">
              of the service price, only when a job is booked.
            </p>
          </div>

          <PricingCalculator />

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start reveal-up">
            <div className="lg:col-span-5 space-y-8">
              <div className="flex items-start justify-between gap-6 pb-6 border-b border-ink/10">
                <div>
                  <p className="eyebrow text-ink-500">Minimum</p>
                  <p className="font-display text-4xl text-ink mt-1">R150</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow text-ink-500">Cap per job</p>
                  <p className="font-display text-4xl text-ink mt-1">R5,000</p>
                </div>
              </div>
              <div>
                <p className="eyebrow text-ember mb-2">Typical return</p>
                <p className="font-display text-5xl text-ink">10× – 50×</p>
                <p className="text-ink-700 mt-3 text-sm max-w-sm leading-relaxed">
                  Every rand Qwikly takes comes out of revenue it created. If the calendar stays empty, you pay nothing.
                </p>
              </div>
              <CTAButton size="lg" variant="primary" href="/signup">
                Start your 7-day trial
              </CTAButton>
              <p className="text-xs text-ink-500">7-day trial. Cancels anytime. No card held hostage.</p>
              <p className="text-xs text-ink-400">POPIA compliant · Your customer data stays in South Africa</p>
            </div>

            <div className="lg:col-span-7 lg:pl-10 lg:border-l border-ink/10">
              <p className="eyebrow text-ink-500 mb-6">Everything included</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {pricingIncludes.map((item, i) => (
                  <li key={item} className="flex items-start gap-4 text-ink-700 text-[0.95rem] leading-snug">
                    <span className="font-display italic text-ember text-sm num mt-0.5 min-w-[2ch]">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ LIVE ACTIVITY STRIP ═════════════════════════════ */}
      <LiveActivityStrip />

      {/* ═══════ FAQ ═════════════════════════════════════════════ */}
      <FAQ />

      {/* ═══════ FINAL CTA ═══════════════════════════════════════ */}
      <section className="relative py-32 md:py-44 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[900px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <p className="eyebrow text-paper/60 mb-10 reveal-up">Your move</p>
          <h2 className="display-huge text-paper reveal-up max-w-[16ch] mx-auto">
            Stop losing jobs to the{" "}
            <em className="italic font-light text-ember">first reply</em>.
          </h2>
          <p className="mt-10 text-paper/70 text-lg md:text-xl max-w-xl mx-auto leading-relaxed reveal-up">
            7 days free. No card upfront. The first job Qwikly books usually pays for the whole year.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 reveal-up">
            <CTAButton size="lg" variant="solid" href="/signup">
              Start your 7-day trial
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="mailto:hello@qwikly.co.za" withArrow={false}>
              Talk to a human
            </CTAButton>
          </div>
          <p className="mt-8 text-sm text-paper/40 reveal-up">
            No setup fees · No contracts · Pay only when a job is booked
          </p>
        </div>
      </section>
    </>
  );
}
