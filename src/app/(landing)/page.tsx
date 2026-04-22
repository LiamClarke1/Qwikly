"use client";

import { useEffect, useRef, useState } from "react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";
import WhatsAppMock from "@/components/WhatsAppMock";
import EmailMock from "@/components/EmailMock";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/* ─────────────────────────────────────────────────────────────
   OUTCOME DATA — sell outcomes, not features
   ───────────────────────────────────────────────────────────── */

const outcomes = [
  {
    stat: "R28,000",
    label: "recovered in month one",
    body:
      "4 jobs booked after 6 p.m. that would have gone to the next contractor to reply.",
    attr: "Thabo — Electrician, Johannesburg",
  },
  {
    stat: "30 sec",
    label: "first reply, every time",
    body:
      "Answered before the customer opens a second tab. The lead never reaches your competitor.",
    attr: "benchmark across 14,000+ conversations",
  },
  {
    stat: "94%",
    label: "of leads qualified",
    body:
      "Pre-screened for location, job type, and urgency before anything hits your calendar.",
    attr: "Qwikly customer average, Q1 2026",
  },
  {
    stat: "24 / 7",
    label: "never off, never late",
    body:
      "2 a.m. burst geyser. Sunday pool pump. Public holiday roof leak. You wake up to a booked job.",
    attr: "no monthly fee — pay only on booking",
  },
];

const tradeLines = [
  "Electricians",
  "Plumbers",
  "Roofers",
  "Solar Installers",
  "Pest Control",
  "Aircon",
  "Pool Services",
  "Landscaping",
  "Garage Doors",
  "Security",
  "Dentists",
  "Beauty Salons",
  "Auto Mechanics",
  "Estate Agents",
  "Cleaners",
  "Tutors",
  "Vets",
  "Photographers",
  "Movers",
  "Fitness Trainers",
];

const howSteps = [
  {
    stamp: "i.",
    title: "A lead messages in.",
    body:
      "WhatsApp at 7 p.m. while you're finishing a job. Email on a Sunday morning. It doesn't matter when — Qwikly sees it first.",
  },
  {
    stamp: "ii.",
    title: "Qwikly replies in 30 seconds.",
    body:
      "Not a chatbot script. A real conversation. It asks the right qualifying questions — job type, area, urgency — in the voice of your business.",
  },
  {
    stamp: "iii.",
    title: "The appointment locks in.",
    body:
      "Qwikly reads your Google Calendar, offers real slots, and confirms the booking. You get a WhatsApp ping. The customer gets a confirmation.",
  },
  {
    stamp: "iv.",
    title: "Everything after runs itself.",
    body:
      "24-hour and 1-hour reminders. No-show rebooking the same day. Dormant leads revived at 30 days. You just do the work.",
  },
];

const testimonials = [
  {
    quote:
      "Picked up 4 extra jobs in the first month that I know I would have missed. About R28,000 in work from leads that came in after 6 p.m.",
    name: "Thabo M.",
    trade: "Electrician",
    city: "Johannesburg",
    badge: "R28,000 recovered · 4 jobs",
  },
  {
    quote:
      "Two no-shows last month got automatically rebooked. That alone covered what I pay Qwikly. Weekend leads used to just disappear.",
    name: "Sarah K.",
    trade: "Pool Services",
    city: "Cape Town",
    badge: "2 no-shows saved",
  },
  {
    quote:
      "Handles 6 to 8 bookings a month for me now. The ones that come in while I'm under a sink used to just vanish into the ether.",
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
  "Trade-specific AI — trained for your services",
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

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */

export default function Home() {
  useScrollReveal();

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
              Never miss
              <br />
              <span className="italic font-light">a lead</span> again.
            </h1>
          </div>

          {/* Subhead + CTAs */}
          <div className="mt-12 md:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end reveal-up">
            <div className="lg:col-span-7">
              <p className="text-lg md:text-xl text-ink-700 max-w-xl leading-relaxed">
                Every WhatsApp. Every email. Answered in{" "}
                <span className="underline-ember">30 seconds</span>, qualified, and
                booked into your calendar — while you stay on the job. You pay
                only when a real appointment is locked in.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <CTAButton size="lg" variant="primary" href="/signup">
                  Start your 7-day trial
                </CTAButton>
                <CTAButton
                  size="lg"
                  variant="outline"
                  href="#how-it-works"
                  withArrow={false}
                >
                  See how it works
                </CTAButton>
              </div>
              <p className="mt-5 text-sm text-ink-500">
                No setup fee. No contract. Pay only when a job is booked.
              </p>
            </div>

            {/* Right column — live status card */}
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
                Rolling average across active Qwikly accounts, refreshed at 06:00
                SAST. Every number is a real conversation on a real phone.
              </p>
            </div>
          </div>

          {/* Hero mocks — editorial collage */}
          <div className="mt-20 md:mt-28 relative reveal-scale">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left — WhatsApp phone, tilted */}
              <div className="lg:col-span-6 flex justify-center lg:justify-start relative">
                <div className="animate-phone-float">
                  <WhatsAppMock />
                </div>
                <div className="ember-blob w-[400px] h-[400px] -left-20 -top-10 hidden lg:block" />
              </div>

              {/* Right — editorial caption + email */}
              <div className="lg:col-span-6 space-y-10">
                <div>
                  <p className="eyebrow text-ember mb-3">Reply — 30 s</p>
                  <p className="font-display text-2xl md:text-3xl text-ink leading-tight max-w-md">
                    It reads the message, asks what you&rsquo;d ask, and{" "}
                    <em className="italic text-ember">books the slot</em>. The
                    customer never has to wait.
                  </p>
                </div>
                <div className="animate-email-float max-w-md ml-auto">
                  <EmailMock />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom marquee — trades */}
        <div className="mt-24 overflow-hidden ticker-pause">
          <div className="rule mb-6 mx-6" />
          <div className="flex items-center gap-12 ticker-scroll-slow w-max text-ink-700 px-6">
            {[...tradeLines, ...tradeLines].map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="headline-marquee"
              >
                {t}
                <span className="text-ember not-italic font-display mx-8">·</span>
              </span>
            ))}
          </div>
          <div className="rule mt-6 mx-6" />
          <p className="eyebrow text-center text-ink-500 mt-6">
            20+ trades · Built for South African service businesses
          </p>
        </div>
      </section>

      {/* ═══════ 02 · OUTCOMES ═══════════════════════════════════ */}
      <section
        id="outcomes"
        className="relative py-28 md:py-40 bg-ink text-paper overflow-hidden grain-dark"
      >
        <div className="ember-blob w-[600px] h-[600px] top-20 -left-40" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-center justify-between mb-16 reveal-up">
            <p className="eyebrow text-paper/60">02 — Outcomes</p>
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
                <p className="font-display italic text-xl text-ember mt-2">
                  {o.label}
                </p>
                <div className="rule-light mt-6 w-16" />
                <p className="mt-6 text-base md:text-lg text-paper/80 max-w-md leading-relaxed">
                  {o.body}
                </p>
                <p className="mt-4 eyebrow text-paper/40">— {o.attr}</p>
              </div>
            ))}
          </div>

          <div className="mt-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 reveal-up">
            <p className="font-display italic text-2xl md:text-3xl text-paper max-w-xl leading-snug">
              “The ones that come in while I&rsquo;m under a sink used to just
              vanish.”
            </p>
            <CTAButton size="lg" variant="solid" href="/signup">
              Stop losing those
            </CTAButton>
          </div>
        </div>
      </section>

      {/* ═══════ 03 · THE 2 A.M. MOMENT (emotional sell) ════════ */}
      <section className="relative py-32 md:py-44 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">
                03 — Every lost lead has a time
              </p>
              <h2 className="display-xl text-ink reveal-up">
                <span className="italic font-light">At</span> 2:14 a.m.
              </h2>
              <p className="display-md text-ink-700 mt-6 reveal-up">
                Someone&rsquo;s geyser bursts in Randburg.
              </p>
              <p className="display-md text-ink-700 mt-2 reveal-up">
                They message three plumbers.
              </p>
              <p className="display-md text-ink italic mt-2 reveal-up">
                Yours replies at 07:48.
              </p>
              <p className="display-md text-ember mt-2 reveal-up">
                They&rsquo;d already booked the one that answered at 2:15.
              </p>
              <div className="rule mt-12 max-w-md reveal-up" />
              <p className="mt-8 text-lg text-ink-700 max-w-xl reveal-up">
                The average SA service business loses{" "}
                <span className="text-ink font-medium">
                  R15,000 to R80,000 a month
                </span>{" "}
                to slow replies. Not to bad work, not to price — to the clock.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="mock-card-dark p-8 reveal-right">
                  <div className="flex items-center justify-between mb-6">
                    <p className="eyebrow text-paper/60">Inbound · WhatsApp</p>
                    <p className="eyebrow text-ember">Replied in 0:00:28</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="bg-white/5 rounded-2xl px-4 py-3 max-w-[85%]">
                      <p className="text-paper/90 leading-relaxed">
                        Hi, my geyser is leaking bad. Burst I think. Joburg north.
                        Can anyone come now?
                      </p>
                      <p className="text-paper/40 text-[0.65rem] mt-1 num">02:14</p>
                    </div>
                    <div className="bg-ember/90 rounded-2xl px-4 py-3 max-w-[85%] ml-auto">
                      <p className="text-paper leading-relaxed">
                        Hi — sorry to hear. I can send someone out now. Can you
                        confirm the suburb and shut the mains for me?
                      </p>
                      <p className="text-paper/70 text-[0.65rem] mt-1 num">
                        02:14
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl px-4 py-3 max-w-[85%]">
                      <p className="text-paper/90 leading-relaxed">
                        Randburg. Mains off. How soon?
                      </p>
                      <p className="text-paper/40 text-[0.65rem] mt-1 num">02:15</p>
                    </div>
                    <div className="bg-ember/90 rounded-2xl px-4 py-3 max-w-[85%] ml-auto">
                      <p className="text-paper leading-relaxed">
                        Booked — 02:45 tonight. You&rsquo;ll get a confirmation
                        SMS + a photo of the tech when they&rsquo;re 5 min away.
                      </p>
                      <p className="text-paper/70 text-[0.65rem] mt-1 num">
                        02:15
                      </p>
                    </div>
                  </div>
                  <div className="rule-light mt-6" />
                  <p className="eyebrow text-paper/40 mt-4">
                    Qwikly conversation · logged to your dashboard
                  </p>
                </div>
                <div className="ember-blob w-[350px] h-[350px] -right-20 -bottom-20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 04 · HOW IT WORKS (editorial 4-step) ═══════════ */}
      <section
        id="how-it-works"
        className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-6 reveal-up">04 — The work</p>
              <h2 className="display-lg text-ink reveal-up">
                Four steps.
                <br />
                <span className="italic font-light">Zero input</span> from you.
              </h2>
            </div>
            <div className="md:col-span-7 md:col-start-6 md:pt-6">
              <p className="text-lg text-ink-700 leading-relaxed reveal-up">
                Qwikly doesn&rsquo;t bolt a bot onto your WhatsApp. It learns your
                services, your pricing, your service area, the way you speak — and
                then it works a full sales cycle, start to finish, without you
                touching it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 reveal-stagger">
            {howSteps.map((s) => (
              <div key={s.stamp} className="ed-card-ghost group">
                <div className="flex items-start justify-between mb-6">
                  <span className="step-stamp">{s.stamp}</span>
                  <span className="eyebrow text-ink-500 group-hover:text-ember transition-colors">
                    Step
                  </span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-ink leading-tight">
                  {s.title}
                </h3>
                <p className="mt-4 text-ink-700 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 05 · WHILE YOU WORK (full-bleed ink) ════════════ */}
      <section className="relative py-36 md:py-52 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[700px] h-[700px] -bottom-40 -right-40" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-paper/60 mb-10 reveal-up">
            05 — While you work
          </p>
          <div className="space-y-2 reveal-up">
            <p className="display-xl text-paper">At 07:48</p>
            <p className="display-xl italic font-light text-paper/70">
              you&rsquo;re under a sink.
            </p>
          </div>
          <div className="space-y-2 mt-10 reveal-up">
            <p className="display-xl text-paper">At 14:22</p>
            <p className="display-xl italic font-light text-paper/70">
              you&rsquo;re on a roof.
            </p>
          </div>
          <div className="space-y-2 mt-10 reveal-up">
            <p className="display-xl text-paper">At 22:05</p>
            <p className="display-xl italic font-light text-paper/70">
              you&rsquo;re with your family.
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-12 gap-10 items-end reveal-up">
            <div className="md:col-span-7">
              <p className="display-md text-ember">
                Qwikly replied, qualified, and booked.
              </p>
              <p className="mt-6 text-paper/70 text-lg max-w-xl leading-relaxed">
                You&rsquo;ll see 11 booked jobs when you check your phone at
                lunch. None of them needed you.
              </p>
            </div>
            <div className="md:col-span-5 flex md:justify-end">
              <CTAButton size="lg" variant="solid" href="/signup">
                Put it to work
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 06 · TESTIMONIALS (editorial pullquotes) ════════ */}
      <section className="relative py-28 md:py-40 overflow-hidden grain">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-baseline justify-between mb-16 reveal-up">
            <div>
              <p className="eyebrow text-ink-500 mb-4">06 — Proof</p>
              <h2 className="display-lg text-ink max-w-[16ch]">
                Booked jobs,{" "}
                <em className="italic font-light">not promises</em>.
              </h2>
            </div>
            <p className="eyebrow text-ink-500 hidden md:block">
              Verified customers · Q1 2026
            </p>
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
                  <p className="text-sm text-ink-500 mt-0.5">
                    {t.trade} · {t.city}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 07 · PRICING (giant 8%) ═════════════════════════ */}
      <section
        id="pricing"
        className="relative py-28 md:py-40 bg-paper-deep grain overflow-hidden"
      >
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-baseline justify-between mb-16 reveal-up">
            <p className="eyebrow text-ink-500">07 — Pricing</p>
            <p className="eyebrow text-ink-500">No subscription · No setup</p>
          </div>

          <div className="relative text-center reveal-scale">
            <p className="mega-num text-ink leading-none tracking-tight">
              8<span className="text-ember align-top text-[0.55em] ml-2">%</span>
            </p>
            <p className="font-display italic text-2xl md:text-3xl text-ink-700 -mt-6 md:-mt-10">
              of the service price, only when a job is booked.
            </p>
          </div>

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
                  Every rand Qwikly takes comes out of revenue it created. If the
                  calendar stays empty, you pay nothing.
                </p>
              </div>
              <CTAButton size="lg" variant="primary" href="/signup">
                Claim your first booking
              </CTAButton>
              <p className="text-xs text-ink-500">
                7-day trial. Cancels anytime. No card held hostage.
              </p>
            </div>

            <div className="lg:col-span-7 lg:pl-10 lg:border-l border-ink/10">
              <p className="eyebrow text-ink-500 mb-6">Everything included</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {pricingIncludes.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-start gap-4 text-ink-700 text-[0.95rem] leading-snug"
                  >
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

      {/* ═══════ 08 · FAQ ════════════════════════════════════════ */}
      <FAQ />

      {/* ═══════ 09 · FINAL CTA ══════════════════════════════════ */}
      <section className="relative py-32 md:py-44 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[900px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <p className="eyebrow text-paper/60 mb-10 reveal-up">09 — Your move</p>
          <h2 className="display-huge text-paper reveal-up max-w-[16ch] mx-auto">
            Stop losing jobs to the{" "}
            <em className="italic font-light text-ember">first reply</em>.
          </h2>
          <p className="mt-10 text-paper/70 text-lg md:text-xl max-w-xl mx-auto leading-relaxed reveal-up">
            7 days free. No card upfront. The first job Qwikly books usually pays
            for the whole year.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 reveal-up">
            <CTAButton size="lg" variant="solid" href="/signup">
              Start your 7-day trial
            </CTAButton>
            <CTAButton
              size="lg"
              variant="outline-light"
              href="mailto:hello@qwikly.co.za"
              withArrow={false}
            >
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
