"use client";

import { useRef, useState, useEffect } from "react";
import {
  Zap,
  CalendarCheck,
  RefreshCw,
  MessageSquare,
  Bot,
  CheckCircle2,
  Clock,
  BarChart3,
  Mail,
} from "lucide-react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";
import WhatsAppMock from "@/components/WhatsAppMock";
import EmailMock from "@/components/EmailMock";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/* ──────────────── DATA ──────────────── */

const stats = [
  { value: "500+", label: "leads captured" },
  { value: "30s", label: "avg first reply" },
  { value: "94%", label: "leads qualified" },
  { value: "24/7", label: "coverage" },
];

const tickerLabels = [
  "Electricians","Plumbers","Roofers","Solar Companies","Pest Control",
  "Aircon","Pool Services","Landscaping","Garage Doors","Security",
  "Dentists","Beauty Salons","Auto Mechanics","Estate Agents","Cleaning Services",
  "Tutoring","Vets","Photographers","Moving Companies","Fitness Trainers",
];

const coreCapabilities = [
  {
    icon: Zap,
    badge: "Reply",
    title: "Replies in 30 seconds",
    description:
      "Every WhatsApp and email answered before your competitor even sees the notification — day or night, weekends included.",
    iconBg: "bg-blue-600/15",
    iconBorder: "border-blue-500/20",
    iconColor: "text-blue-400",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    icon: CalendarCheck,
    badge: "Book",
    title: "Books automatically",
    description:
      "Qualifies the lead, checks your availability, and locks the appointment straight into your Google Calendar. No back-and-forth.",
    iconBg: "bg-emerald-600/15",
    iconBorder: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    icon: RefreshCw,
    badge: "Follow up",
    title: "Follows up and recovers",
    description:
      "4-stage follow-up sequence. No-show rebooking. Dormant lead revival. Every lead stays in play until it becomes a booking.",
    iconBg: "bg-violet-600/15",
    iconBorder: "border-violet-500/20",
    iconColor: "text-violet-400",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
];

const whyCards = [
  {
    icon: Zap,
    title: "Built for SA service businesses",
    description:
      "Not a generic chatbot bolted onto your number. Qwikly is trained on your services, prices, and trade. It speaks like your front office, knows your area, and books jobs the way you would.",
    iconBg: "bg-blue-600/15",
    iconBorder: "border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Clock,
    title: "Works while you work",
    description:
      "At 7pm when you're finishing a job. At 2am when you're asleep. On a Sunday with your family. Qwikly never misses a message, never needs managing, and never calls in sick.",
    iconBg: "bg-violet-600/15",
    iconBorder: "border-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: BarChart3,
    title: "Full visibility, always",
    description:
      "Every conversation is logged in your dashboard. Read exactly what Qwikly said, see qualification outcomes, and step in whenever you want. Full automation with full control.",
    iconBg: "bg-emerald-600/15",
    iconBorder: "border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: CheckCircle2,
    title: "Only pays when you earn",
    description:
      "8% per confirmed booking. That's it. No monthly subscription. No setup fee. No contract. Qwikly only gets paid when it actually puts money in your pocket.",
    iconBg: "bg-orange-600/15",
    iconBorder: "border-orange-500/20",
    iconColor: "text-orange-400",
  },
];

const howItWorksSteps = [
  {
    icon: MessageSquare,
    step: "01",
    title: "A lead messages in",
    description: "Someone sends a WhatsApp or email — at 7pm, on a Sunday, while you're on another job.",
  },
  {
    icon: Bot,
    step: "02",
    title: "Qwikly replies in 30 seconds",
    description: "Asks the right questions, checks your service area, and assesses the job. Feels like your own front office.",
  },
  {
    icon: CalendarCheck,
    step: "03",
    title: "The appointment is locked in",
    description: "Straight into your Google Calendar. Both you and the customer get a confirmation. No back-and-forth.",
  },
  {
    icon: RefreshCw,
    step: "04",
    title: "Everything after runs itself",
    description: "Reminders send. No-shows get rebooking messages. Cold leads get revival sequences. Nothing slips through.",
  },
];

const pricingIncludes = [
  "30-second WhatsApp response",
  "Email lead handling",
  "Automated follow-ups (4h, 24h, 2d, 5d)",
  "No-show recovery messaging",
  "Quote follow-ups",
  "Lead revival (30+ day dormant leads)",
  "Appointment reminders (24h + 1h before)",
  "Multi-channel (WhatsApp + Email)",
  "Client dashboard with conversation transcripts",
  "Trade-specific AI training",
];

const testimonials = [
  {
    quote:
      "Qwikly picked up 4 extra jobs in the first month that I know I would have missed. That's about R28,000 in work just from after-hours leads. The follow-ups chased a quote I forgot about and the guy booked.",
    name: "Thabo M.",
    trade: "Electrician",
    city: "Johannesburg",
    metric: "4 extra jobs, ~R28k revenue",
    cardClass: "testimonial-blue",
    accentColor: "text-blue-400",
    badgeBg: "bg-blue-500/15 border border-blue-500/25",
  },
  {
    quote:
      "Two of my no-shows last month got automatically rebooked. That alone covered what I pay Qwikly. The weekend leads are the big win — I used to lose every single one.",
    name: "Sarah K.",
    trade: "Pool Services",
    city: "Cape Town",
    metric: "2 no-shows recovered",
    cardClass: "testimonial-emerald",
    accentColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/15 border border-emerald-500/25",
  },
  {
    quote:
      "Setup was quick and I haven't thought about it since. Handles about 6-8 bookings a month for me now. The ones that come in while I'm under a sink used to just disappear.",
    name: "James R.",
    trade: "Plumber",
    city: "Pretoria",
    metric: "6-8 bookings/month",
    cardClass: "testimonial-violet",
    accentColor: "text-violet-400",
    badgeBg: "bg-violet-500/15 border border-violet-500/25",
  },
];

/* ──────────────── STAT COUNTER ──────────────── */

function StatCounter({ value, label }: { value: string; label: string }) {
  const [displayed, setDisplayed] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const match = value.match(/^(\d+)(.*)$/);
    if (!match) return;
    const target = parseInt(match[1]);
    const suffix = match[2];

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        observer.disconnect();
        const duration = 1600;
        const startTime = performance.now();
        const frame = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayed(Math.round(eased * target) + suffix);
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="stat-card text-center bg-bg-elevated/80 border border-border-subtle rounded-xl p-4 hover:border-accent/30 transition-colors duration-300 cursor-default">
      <p className="font-sans text-2xl md:text-3xl font-bold text-white tabular-nums">{displayed}</p>
      <p className="text-xs text-text-tertiary mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

/* ──────────────── PAGE ──────────────── */

export default function Home() {
  useScrollReveal();

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="bg-bg-dark relative overflow-hidden pt-16 noise-overlay">
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="orb-a absolute w-[700px] h-[700px] -top-56 -left-40 rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="orb-b absolute w-[500px] h-[500px] -bottom-28 -right-28 rounded-full bg-violet-600/10 blur-[100px]" />
          <div className="orb-c absolute w-[350px] h-[350px] top-1/4 right-1/3 rounded-full bg-sky-500/5 blur-[80px]" />
          <div className="absolute inset-0 grid-bg opacity-40" />
        </div>

        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-32">

          {/* Centered copy */}
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="badge-pulse inline-flex items-center gap-2 bg-accent/10 border border-accent/25 text-accent text-xs font-semibold px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Built for SA service businesses
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
              Never miss a lead on{" "}
              <span className="text-gradient-blue">WhatsApp</span>{" "}
              or{" "}
              <span className="text-gradient-blue">email</span>{" "}
              again.
            </h1>

            {/* Subline */}
            <p className="mt-6 text-xl md:text-2xl font-medium text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Qwikly replies in 30 seconds, qualifies the lead, and books the appointment into your calendar — while you stay on the job.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
              <CTAButton size="lg" className="animate-subtle-pulse cta-glow">
                Explore Your 7-Day Trial
              </CTAButton>
              <CTAButton
                variant="outline"
                size="lg"
                href="#how-it-works"
                className="border-border-subtle text-white hover:bg-bg-elevated hover:text-white"
              >
                See How It Works
              </CTAButton>
            </div>

            <p className="mt-4 text-sm text-text-tertiary">
              No setup fees. No contracts. Pay only when a job is booked.
            </p>
          </div>

          {/* Mocks — WhatsApp + Email side by side */}
          <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start max-w-5xl mx-auto">

            {/* WhatsApp panel */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-sm font-semibold text-white">WhatsApp</span>
                <span className="text-xs text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2.5 py-0.5 rounded-full font-medium">Replied in 30 seconds</span>
              </div>
              <div className="px-12 sm:px-14">
                <WhatsAppMock />
              </div>
            </div>

            {/* Email panel */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-white">Email</span>
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-medium">Replied in 45 seconds</span>
              </div>
              <EmailMock />
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["Reads the enquiry", "Qualifies the lead", "Books the slot", "Sends confirmation"].map((tag) => (
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

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-card to-transparent pointer-events-none" aria-hidden="true" />
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="bg-bg-card py-10 border-y border-border-subtle">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 reveal-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(({ value, label }) => (
              <StatCounter key={label} value={value} label={label} />
            ))}
          </div>

          {/* Scrolling industry ticker */}
          <div className="mt-8 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-card to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-card to-transparent z-10 pointer-events-none" />
            <div className="ticker-scroll flex items-center gap-4 w-max">
              {[...tickerLabels, ...tickerLabels].map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="inline-flex items-center text-xs font-medium text-text-tertiary bg-bg-elevated px-3 py-1.5 rounded-full border border-border-subtle whitespace-nowrap"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CORE 3 CAPABILITIES ─── */}
      <section className="py-24 bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="orb-a absolute w-[600px] h-[400px] top-0 left-1/4 rounded-full bg-blue-600/8 blur-[100px]" />
          <div className="absolute inset-0 grid-bg opacity-20" />
        </div>

        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <p className="text-text-tertiary text-sm font-semibold uppercase tracking-widest mb-4">What Qwikly does</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white tracking-tight">
              3 things. All automated.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal-stagger">
            {coreCapabilities.map(({ icon: Icon, badge, title, description, iconBg, iconBorder, iconColor, badgeColor }) => (
              <div key={title} className="glass-card-dark p-8 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} border ${iconBorder}`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${badgeColor}`}>
                    {badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-white mb-2">{title}</h3>
                  <p className="text-text-tertiary leading-relaxed text-sm md:text-base">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY QWIKLY ─── */}
      <section id="why" className="relative overflow-hidden bg-black">
        {/* Starfield */}
        <div className="why-stars absolute inset-0 pointer-events-none" aria-hidden="true" />

        {/* Blue center glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(7,69,162,0.28) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          {/* Mobile / tablet */}
          <div className="lg:hidden py-24 reveal-up">
            <div className="text-center mb-10">
              <p className="why-hero-sm select-none pointer-events-none">Why?</p>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mt-2">Why Qwikly</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 reveal-stagger">
              {whyCards.map(({ title, description }) => (
                <div key={title} className="why-card">
                  <h3 className="why-card-title">{title}</h3>
                  <p className="why-card-desc">{description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:block relative" style={{ height: "680px" }}>
            {/* Giant WHY? centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none z-10">
              <p className="why-hero-lg">Why?</p>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-400 -mt-2">Why Qwikly</p>
            </div>

            {/* Top-left */}
            <div className="why-card absolute z-20" style={{ top: 90, left: 0, width: 310 }}>
              <h3 className="why-card-title">{whyCards[0].title}</h3>
              <p className="why-card-desc">{whyCards[0].description}</p>
            </div>

            {/* Bottom-left */}
            <div className="why-card absolute z-20" style={{ bottom: 90, left: 0, width: 310 }}>
              <h3 className="why-card-title">{whyCards[1].title}</h3>
              <p className="why-card-desc">{whyCards[1].description}</p>
            </div>

            {/* Top-right */}
            <div className="why-card absolute z-20" style={{ top: 90, right: 0, width: 310 }}>
              <h3 className="why-card-title">{whyCards[2].title}</h3>
              <p className="why-card-desc">{whyCards[2].description}</p>
            </div>

            {/* Bottom-right */}
            <div className="why-card absolute z-20" style={{ bottom: 90, right: 0, width: 310 }}>
              <h3 className="why-card-title">{whyCards[3].title}</h3>
              <p className="why-card-desc">{whyCards[3].description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="orb-a absolute w-[500px] h-[300px] top-0 left-1/2 -translate-x-1/2 rounded-full bg-blue-600/6 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <div className="w-16 gold-line mx-auto mb-6" />
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white tracking-tight">
              4 steps.
            </h2>
            <p className="mt-4 text-text-tertiary text-lg max-w-xl mx-auto">
              WhatsApp or email — it doesn&apos;t matter. Qwikly handles it. You keep working.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
            {howItWorksSteps.map(({ icon: Icon, step, title, description }, index) => (
              <div key={step} className="relative">
                <div className="gradient-border p-6 hover:bg-bg-elevated transition-all duration-300 h-full">
                  <span className="text-6xl font-extrabold text-white/[0.04] absolute top-3 right-4 select-none">{step}</span>
                  <span className="text-xs font-bold tracking-widest uppercase text-accent mb-3 block">Step {step}</span>
                  <Icon className="w-9 h-9 text-accent mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-white mb-2">{title}</h3>
                  <p className="text-text-tertiary text-sm leading-relaxed">{description}</p>
                </div>
                {index < howItWorksSteps.length - 1 && (
                  <div className="step-connector-arrow">
                    <svg className="w-5 h-5 text-accent/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="orb-b absolute w-[600px] h-[400px] top-0 left-0 rounded-full bg-blue-600/6 blur-[100px]" />
          <div className="orb-c absolute w-[400px] h-[400px] bottom-0 right-0 rounded-full bg-violet-600/6 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <div className="w-16 gold-line mx-auto mb-6" />
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white tracking-tight">
              Real results.
            </h2>
            <p className="mt-4 text-text-tertiary text-lg max-w-xl mx-auto">
              These aren&apos;t estimates. These are jobs that were booked because Qwikly replied first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal-stagger">
            {testimonials.map(({ quote, name, trade, city, metric, cardClass, accentColor, badgeBg }) => (
              <div key={name} className={`${cardClass} p-7 flex flex-col`}>
                {metric && (
                  <div className={`${badgeBg} rounded-lg px-3 py-1.5 mb-5 inline-block self-start`}>
                    <p className={`${accentColor} text-xs font-bold`}>{metric}</p>
                  </div>
                )}
                <p className="text-text-secondary leading-relaxed flex-1 text-sm md:text-base">&ldquo;{quote}&rdquo;</p>
                <div className="mt-6 pt-4 border-t border-white/[0.07]">
                  <p className="font-semibold text-white text-sm">{name}</p>
                  <p className="text-text-tertiary text-sm">{trade}, {city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 bg-bg-light">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal-up">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark tracking-tight">
              Simple pricing.
            </h2>
            <p className="mt-4 text-text-muted-dark text-lg max-w-xl mx-auto">
              No monthly fee. No setup cost. No contracts. Qwikly takes 8% when it books a real job — not a cent before that.
            </p>
          </div>

          {/* 8% rule */}
          <div className="mt-10 bg-bg-dark rounded-2xl px-6 py-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 border border-border-subtle reveal-up">
            <div className="text-center sm:text-left">
              <span className="text-5xl font-extrabold text-gradient-blue">8%</span>
              <p className="text-text-secondary text-sm mt-1">of the service price booked</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-border-subtle" />
            <div className="flex gap-6 text-sm text-text-tertiary">
              <span>Min <span className="text-white font-bold">R150</span></span>
              <span>Max <span className="text-white font-bold">R5,000</span></span>
            </div>
            <div className="hidden sm:block w-px h-12 bg-border-subtle" />
            <div className="text-center">
              <p className="text-text-tertiary text-sm">Average ROI</p>
              <p className="text-accent font-bold text-lg">10–50×</p>
            </div>
          </div>

          {/* What's included */}
          <div className="mt-8 bg-white rounded-2xl border border-border-light p-8 shadow-lg reveal-up">
            <p className="font-sans text-lg font-bold text-text-dark mb-6">Everything included — no tiers, no add-ons:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pricingIncludes.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-text-dark text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-border-light">
              <CTAButton size="lg" className="w-full justify-center">
                Claim Your First Booking
              </CTAButton>
              <p className="text-center text-sm text-text-muted-dark mt-3">No upfront cost. Cancels anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <FAQ />

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 cta-premium-bg relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="orb-a absolute w-[800px] h-[400px] top-0 left-1/2 -translate-x-1/2 rounded-full bg-blue-500/8 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center reveal-up">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            7-day free trial
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.05]">
            Stop losing jobs to the first reply.
          </h2>
          <p className="mt-5 text-lg text-text-tertiary max-w-xl mx-auto">
            The average SA service business loses R15,000–80,000 a month from slow replies. Qwikly clients see a 10–50× return.
          </p>
          <div className="mt-10">
            <CTAButton size="lg" className="animate-subtle-pulse cta-glow">
              Start Your 7-Day Trial
            </CTAButton>
          </div>
          <p className="mt-4 text-sm text-text-tertiary">No setup fees. No monthly costs. Pay only when a job is booked.</p>
        </div>
      </section>
    </>
  );
}
