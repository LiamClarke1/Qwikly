"use client";

import {
  Check,
  Zap,
  Wrench,
  Home as HomeIcon,
  Sun,
  Bug,
  Wind,
  Waves,
  TreePine,
  DoorOpen,
  ShieldCheck,
  MessageSquare,
  Clock,
  CalendarX,
  CalendarClock,
  ArrowRight,
  XCircle,
  CheckCircle2,
  MessageCircle,
  Bot,
  CalendarCheck,
  RefreshCw,
  Bell,
  BarChart3,
  Users,
  Stethoscope,
  Scissors,
  Car,
  Building2,
  Sparkles,
  GraduationCap,
  PawPrint,
  Camera,
  Truck,
  Dumbbell,
  Mail,
} from "lucide-react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";
import SectionHeading from "@/components/SectionHeading";
import WhatsAppMock from "@/components/WhatsAppMock";
import EmailMock from "@/components/EmailMock";
import ComparisonTable from "@/components/ComparisonTable";
import FeatureBlock from "@/components/FeatureBlock";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/* ──────────────── DATA ──────────────── */

const additionalIndustries = [
  { icon: Stethoscope, label: "Dentists" },
  { icon: Scissors, label: "Beauty Salons" },
  { icon: Car, label: "Auto Mechanics" },
  { icon: Building2, label: "Estate Agents" },
  { icon: Sparkles, label: "Cleaning Services" },
  { icon: GraduationCap, label: "Tutoring" },
  { icon: PawPrint, label: "Vets" },
  { icon: Camera, label: "Photographers" },
  { icon: Truck, label: "Moving Companies" },
  { icon: Dumbbell, label: "Fitness Trainers" },
];

const tickerLabels = [
  "Electricians",
  "Plumbers",
  "Roofers",
  "Solar Companies",
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
  "Cleaning Services",
  "Tutoring",
  "Vets",
  "Photographers",
  "Moving Companies",
  "Fitness Trainers",
];

const stats = [
  { value: "500+", label: "leads captured" },
  { value: "30s", label: "avg first reply" },
  { value: "94%", label: "leads qualified" },
  { value: "24/7", label: "coverage" },
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
    description: "Asks the right questions, checks your service area, and assesses what the job involves. Feels like your own front office.",
  },
  {
    icon: CalendarCheck,
    step: "03",
    title: "The appointment is locked in",
    description: "Straight into your Google Calendar. Both you and the customer get a confirmation. No back-and-forth needed.",
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
  "No-show recovery",
  "Quote follow-ups",
  "Lead revival (30+ day dormant leads)",
  "Appointment reminders (24h + 1h)",
  "Multi-channel (WhatsApp + Email)",
  "Client dashboard with conversation transcripts",
  "Trade-specific AI",
];

const serviceExamples = [
  { business: "Pest Control", service: "Rat treatment", servicePrice: "R1,500", fee: "R150", feeNote: "min" },
  { business: "Pool Cleaning", service: "Monthly maintenance", servicePrice: "R1,800", fee: "R150", feeNote: "min" },
  { business: "Pool Cleaning", service: "Green pool cleanup", servicePrice: "R2,500", fee: "R200", feeNote: "" },
  { business: "Plumber", service: "Blocked drain", servicePrice: "R1,500", fee: "R150", feeNote: "min" },
  { business: "Plumber", service: "Geyser replacement", servicePrice: "R8,000", fee: "R640", feeNote: "" },
  { business: "Electrician", service: "COC certificate", servicePrice: "R2,500", fee: "R200", feeNote: "" },
  { business: "Electrician", service: "DB board upgrade", servicePrice: "R12,000", fee: "R960", feeNote: "" },
  { business: "Aircon", service: "Split unit install", servicePrice: "R8,000", fee: "R640", feeNote: "" },
  { business: "Roofer", service: "Tile repair", servicePrice: "R3,500", fee: "R280", feeNote: "" },
  { business: "Roofer", service: "Full re-roof", servicePrice: "R80,000", fee: "R5,000", feeNote: "max" },
  { business: "Solar", service: "Site assessment", servicePrice: "Free", fee: "R150", feeNote: "min" },
  { business: "Solar", service: "Full installation", servicePrice: "R150,000", fee: "R5,000", feeNote: "max" },
];

const tradeCards = [
  {
    icon: Zap,
    trade: "Electricians",
    pain: "DB board trips at 9pm. Qwikly books the callout before your competitor wakes up.",
  },
  {
    icon: Wrench,
    trade: "Plumbers",
    pain: "Burst geyser on a Sunday. Qwikly makes sure you are the first to reply.",
  },
  {
    icon: HomeIcon,
    trade: "Roofers",
    pain: "Hail season hits, quotes pile up. Qwikly catches every one while you are on the roof.",
  },
  {
    icon: Sun,
    trade: "Solar Installers",
    pain: "Load shedding announcement drops. 20 leads in a day. Qwikly qualifies and books them all.",
  },
  {
    icon: Bug,
    trade: "Pest Control",
    pain: "Rats at midnight. The customer is not sleeping. Qwikly books it before sunrise.",
  },
  {
    icon: Wind,
    trade: "Aircon",
    pain: "Heatwave hits Joburg. Leads flood in. Qwikly responds in 30 seconds to every single one.",
  },
  {
    icon: Waves,
    trade: "Pool Services",
    pain: "Summer green pools everywhere. Qwikly qualifies leads while you are cleaning.",
  },
  {
    icon: TreePine,
    trade: "Landscaping",
    pain: "Estate managers want quotes fast. Qwikly handles the enquiry and books the site visit.",
  },
  {
    icon: DoorOpen,
    trade: "Garage Doors",
    pain: "Broken motor at 6am. Qwikly replies instantly and gets the booking in your calendar.",
  },
  {
    icon: ShieldCheck,
    trade: "Security",
    pain: "Break-in scare at midnight. Qwikly responds, qualifies, and books the assessment.",
  },
];

const testimonials = [
  {
    quote:
      "Qwikly picked up 4 extra jobs in the first month that I know I would have missed. That's about R28,000 in work just from after-hours leads. The follow-ups are what got me, it chased a quote I forgot about and the guy booked.",
    name: "Thabo M.",
    trade: "Electrician",
    city: "Johannesburg",
    metric: "4 extra jobs, ~R28k revenue",
  },
  {
    quote:
      "Two of my no-shows last month got automatically rebooked. That alone covered what I pay Qwikly. The weekend leads are the big win though, I used to lose every single one.",
    name: "Sarah K.",
    trade: "Pool Services",
    city: "Cape Town",
    metric: "2 no-shows recovered",
  },
  {
    quote:
      "Setup was quick and I haven't thought about it since. It handles about 6-8 bookings a month for me now. The ones that come in while I'm under a sink used to just disappear.",
    name: "James R.",
    trade: "Plumber",
    city: "Pretoria",
    metric: "6-8 bookings/month",
  },
];

/* ──────────────── MINI VISUAL COMPONENTS ──────────────── */

function MiniWhatsAppVisual() {
  return (
    <div className="bg-[#0b141a] rounded-2xl p-4 max-w-sm w-full shadow-lg border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[#00a884]/20 flex items-center justify-center">
          <MessageCircle className="w-3 h-3 text-[#00a884]" />
        </div>
        <span className="text-[#e9edef] text-xs font-medium">WhatsApp</span>
        <span className="ml-auto text-[#00a884] text-[10px] font-medium bg-[#00a884]/10 px-2 py-0.5 rounded-full">30s reply</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-end">
          <div className="bg-[#005c4b] text-white text-[11px] px-3 py-1.5 rounded-lg max-w-[80%]">
            Hi, I need a plumber in Randburg. Geyser is leaking.
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-[#1f2c34] text-[#e9edef] text-[11px] px-3 py-1.5 rounded-lg max-w-[80%]">
            Hi! I can help. When did the leak start? Is there hot water damage?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-[#1f2c34] text-[#e9edef] text-[11px] px-3 py-1.5 rounded-lg max-w-[80%]">
            I have a slot available at 10am tomorrow. Shall I book it?
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniTimelineVisual() {
  const followUps = [
    { time: "4 hours", label: "First check-in", active: true },
    { time: "24 hours", label: "Gentle reminder", active: true },
    { time: "2 days", label: "Value message", active: false },
    { time: "5 days", label: "Final follow-up", active: false },
  ];
  return (
    <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border-light">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
          <Clock className="w-3 h-3 text-accent" />
        </div>
        <span className="text-text-dark text-xs font-medium">Follow-up Cadence</span>
      </div>
      <div className="space-y-0">
        {followUps.map((item, i) => (
          <div key={item.time} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${item.active ? "border-accent bg-accent" : "border-border-light bg-white"}`} />
              {i < followUps.length - 1 && <div className="w-0.5 h-6 bg-border-light" />}
            </div>
            <div className="pb-2">
              <p className="text-text-dark text-[11px] font-semibold">{item.time}</p>
              <p className="text-text-muted-dark text-[10px]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniNotificationVisual() {
  return (
    <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border-light">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
          <CalendarX className="w-3 h-3 text-red-500" />
        </div>
        <span className="text-text-dark text-xs font-medium">No-Show Recovery</span>
      </div>
      <div className="space-y-2">
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <p className="text-red-700 text-[11px] font-medium">Missed: 9:00 AM appointment</p>
          <p className="text-red-600/70 text-[10px] mt-0.5">Sarah M. - DB board repair</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Bell className="w-3 h-3 text-green-600" />
            <p className="text-green-700 text-[11px] font-medium">Auto-rebooking sent</p>
          </div>
          <p className="text-green-600/70 text-[10px]">&ldquo;Hi Sarah, I noticed we missed you today. Would tomorrow at 10am work?&rdquo;</p>
        </div>
      </div>
    </div>
  );
}

function MiniRevivalVisual() {
  return (
    <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border-light">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
          <CalendarClock className="w-3 h-3 text-purple-600" />
        </div>
        <span className="text-text-dark text-xs font-medium">Lead Revival</span>
      </div>
      <div className="space-y-2">
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <p className="text-purple-700 text-[10px] font-medium mb-1">35 days dormant</p>
          <p className="text-purple-600/70 text-[10px]">John D. - Solar installation quote</p>
        </div>
        <div className="bg-bg-subtle rounded-lg p-3 border border-border-light">
          <p className="text-text-dark text-[11px]">&ldquo;Hi John, summer is coming and electricity prices just went up. Still thinking about going solar?&rdquo;</p>
          <p className="text-accent text-[10px] font-medium mt-1">Seasonal re-engagement sent</p>
        </div>
      </div>
    </div>
  );
}

function MiniDashboardVisual() {
  return (
    <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border-light">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
          <BarChart3 className="w-3 h-3 text-blue-600" />
        </div>
        <span className="text-text-dark text-xs font-medium">Client Dashboard</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-bg-subtle rounded-lg p-2 text-center border border-border-light">
          <p className="text-text-dark text-sm font-bold">47</p>
          <p className="text-text-muted-dark text-[9px]">Leads</p>
        </div>
        <div className="bg-bg-subtle rounded-lg p-2 text-center border border-border-light">
          <p className="text-accent text-sm font-bold">32</p>
          <p className="text-text-muted-dark text-[9px]">Booked</p>
        </div>
        <div className="bg-bg-subtle rounded-lg p-2 text-center border border-border-light">
          <p className="text-green-600 text-sm font-bold">94%</p>
          <p className="text-text-muted-dark text-[9px]">Rate</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between bg-bg-subtle rounded-lg px-3 py-1.5 border border-border-light">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-text-dark">Sarah M.</span>
          </div>
          <span className="text-[9px] text-accent font-medium">Booked</span>
        </div>
        <div className="flex items-center justify-between bg-bg-subtle rounded-lg px-3 py-1.5 border border-border-light">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-text-dark">David K.</span>
          </div>
          <span className="text-[9px] text-text-muted-dark font-medium">Following up</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── PAGE ──────────────── */

export default function Home() {
  useScrollReveal();

  return (
    <>
      {/* ─── SECTION 1: HERO (dark) ─── */}
      <section className="bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left hero-glow">
              <h1 className="relative z-10 text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-white leading-tight">
                You&apos;re on the job.
                <br />
                A new lead just messaged.
                <br />
                They&apos;re already <span className="text-accent">booked</span>.
              </h1>
              <p className="relative z-10 mt-6 text-base md:text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
                While you&apos;re under a sink or up on a roof, Qwikly handles
                every enquiry, chases every lead, and fills your calendar —
                automatically. Built for SA service businesses who are too busy
                to reply to everyone.
              </p>

              <ul className="relative z-10 mt-6 space-y-2 max-w-md mx-auto lg:mx-0">
                {[
                  "Replies to every WhatsApp and email within 30 seconds",
                  "Follows up at 4h, 24h, 2 days, and 5 days — without lifting a finger",
                  "Drops confirmed appointments into your Google Calendar, day or night",
                  "Only pay 8% when a booking is made — nothing upfront, no monthly fees",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <CTAButton size="lg" className="animate-subtle-pulse cta-glow">
                  Explore Your 7-Day Trial
                </CTAButton>
                <CTAButton variant="outline" size="lg" href="#how-it-works" className="border-border-subtle text-white hover:bg-bg-elevated hover:text-white">
                  See How It Works
                </CTAButton>
              </div>

              <p className="relative z-10 mt-5 text-sm text-text-tertiary">
                No setup fees. No contracts. Cancel anytime.
              </p>

              <div className="relative z-10 mt-6 bg-bg-card border border-border-subtle rounded-xl px-5 py-3 max-w-md mx-auto lg:mx-0">
                <p className="text-sm text-text-secondary">
                  <span className="text-accent font-bold">Average ROI: 10–50x.</span>{" "}
                  One extra booking a week covers Qwikly for the month. Everything after that is money you were leaving on the table.
                </p>
              </div>
            </div>

            {/* Right: WhatsApp mock */}
            <div className="relative z-10 flex-shrink-0">
              <WhatsAppMock />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: SOCIAL PROOF BAR ─── */}
      <section className="bg-bg-card py-8 border-y border-border-subtle">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 reveal-up">
          <p className="text-center text-text-secondary font-semibold text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            SA service businesses in Johannesburg, Pretoria, Cape Town, and
            Durban are capturing jobs they used to lose — every single day
          </p>

          {/* Counter stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(({ value, label }) => (
              <div key={label} className="stat-card text-center bg-bg-elevated border border-border-subtle rounded-xl p-4">
                <p className="font-sans text-2xl md:text-3xl font-bold text-white">
                  {value}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5 uppercase tracking-wide">
                  {label}
                </p>
              </div>
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

      {/* ─── SECTION 3: THE PROBLEM ─── */}
      <section className="py-16 bg-bg-light overflow-hidden">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal-up">
            <SectionHeading
              title="Right now, a third of your leads are booking with someone else"
              subtitle="The average homeowner contacts 3 tradies and books whoever replies first. Speed isn't a nice-to-have — it's the whole game."
            />
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* WITHOUT */}
            <div className="reveal-left bg-red-50/60 border border-red-200/60 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-sans font-bold text-red-700 text-sm uppercase tracking-wide">
                  Without Qwikly
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { text: "Lead messages at 7pm", icon: MessageSquare },
                  { text: "You're on site, phone in your pocket", icon: Wrench },
                  { text: "Reply at 10pm", icon: Clock },
                  { text: "They've already booked someone else", icon: Users },
                  { text: "R5,000 gone — before you even knew about it", icon: XCircle },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 flex-shrink-0">
                      <item.icon className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-red-800 text-sm font-medium">{item.text}</span>
                    {i < 4 && <ArrowRight className="w-3 h-3 text-red-300 ml-auto flex-shrink-0 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>

            {/* WITH */}
            <div className="reveal-right bg-green-50/60 border border-green-200/60 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-sans font-bold text-green-700 text-sm uppercase tracking-wide">
                  With Qwikly
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { text: "Lead messages at 7pm", icon: MessageSquare },
                  { text: "AI replies in 30 seconds", icon: Bot },
                  { text: "Qualifies the lead automatically", icon: CheckCircle2 },
                  { text: "Books the appointment", icon: CalendarCheck },
                  { text: "R5,000 booked — while you were still on the last job", icon: CheckCircle2 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 flex-shrink-0">
                      <item.icon className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-green-800 text-sm font-medium">{item.text}</span>
                    {i < 4 && <ArrowRight className="w-3 h-3 text-green-300 ml-auto flex-shrink-0 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3b: THE COST OF SLOW RESPONSE ─── */}
      <section className="py-12 bg-bg-dark relative noise-overlay">
        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 reveal-up">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              What every unanswered message is quietly costing you
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 reveal-stagger">
            {[
              { trade: "Plumber", lost: "R20,000", jobs: "4 missed jobs" },
              { trade: "Electrician", lost: "R15,000", jobs: "3 missed jobs" },
              { trade: "Roofer", lost: "R80,000", jobs: "2 missed quotes" },
              { trade: "Solar", lost: "R150,000", jobs: "1 missed install" },
              { trade: "Pest Control", lost: "R10,000", jobs: "7 missed callouts" },
            ].map((item) => (
              <div key={item.trade} className="bg-bg-card rounded-xl p-5 border border-border-subtle text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">{item.trade}</p>
                <p className="text-2xl font-bold text-danger tracking-tight">{item.lost}</p>
                <p className="text-xs text-text-tertiary mt-1">{item.jobs}/month</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-text-tertiary mt-6 reveal-up">
            Estimates based on average job values across SA trades. Every unanswered message is a booking in someone else&apos;s diary.
          </p>
        </div>
      </section>

      {/* ─── SECTION 4: PLATFORM FEATURES (alternating) ─── */}
      <section id="features" className="py-20 bg-bg-light overflow-hidden">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal-up">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-[#00a884]/10 text-[#00a884] text-xs font-semibold px-3 py-1 rounded-full border border-[#00a884]/20">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </span>
              <span className="text-text-tertiary text-sm">+</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
            </div>
            <SectionHeading
              title="One Platform. Every Lead Covered."
              subtitle="Whether they message you on WhatsApp or email, Qwikly replies in seconds, qualifies the lead, books the appointment, and follows up — automatically. You stay focused on the work."
            />
          </div>

          <div className="space-y-20 md:space-y-28">
            <div className="reveal-left">
              <FeatureBlock
                badge="WHATSAPP"
                badgeColor="bg-[#00a884]/10 text-[#00a884]"
                title="Replies Before Your Competitor Even Sees the Message"
                description="A new message comes in at 7pm while you're on a callout. Qwikly replies within 30 seconds, asks the right questions, and has the appointment confirmed before you've packed up your van. Most customers think they're talking to your assistant."
                visual={<MiniWhatsAppVisual />}
              />
            </div>

            <div className="reveal-right">
              <FeatureBlock
                badge="EMAIL"
                badgeColor="bg-blue-50 text-blue-600"
                title="Every Email Enquiry Answered, Every Time"
                description="Not every lead messages on WhatsApp. Qwikly handles email enquiries with the same speed and trade knowledge — qualifies the lead, checks availability, and books the appointment. All conversations land in your dashboard."
                reversed
                visual={<EmailMock />}
              />
            </div>

            <div className="reveal-left">
              <FeatureBlock
                badge="AUTOMATION"
                title="Four Follow-Ups. Zero Effort."
                description="When a lead goes quiet, most businesses forget about them. Qwikly re-engages at 4 hours, 24 hours, 2 days, and 5 days — and switches from WhatsApp to email if needed. That quote you sent and forgot about? Qwikly chased it."
                visual={<MiniTimelineVisual />}
              />
            </div>

            <div className="reveal-right">
              <FeatureBlock
                badge="RECOVERY"
                badgeColor="bg-red-50 text-red-600"
                title="Turn No-Shows Into Rebooked Jobs"
                description="A no-show is a delayed job, not a lost one. The moment someone misses their slot, Qwikly sends a personal-feeling rebooking message with the next available time. Most reschedule within 24 hours."
                reversed
                visual={<MiniNotificationVisual />}
              />
            </div>

            <div className="reveal-left">
              <FeatureBlock
                badge="REVIVAL"
                badgeColor="bg-purple-50 text-purple-600"
                title="The Leads You Forgot Aren't Gone Yet"
                description="That solar quote from six weeks ago. The pest control enquiry from March. Qwikly tracks every dormant lead and re-engages them with a message timed to what's happening in their world — load shedding, summer heat, school holidays. Cold leads come back warm."
                visual={<MiniRevivalVisual />}
              />
            </div>

            <div className="reveal-right">
              <FeatureBlock
                badge="DASHBOARD"
                badgeColor="bg-blue-50 text-blue-600"
                title="See Everything. Miss Nothing."
                description="Every conversation, booking, and stat in one place. Read exactly what Qwikly said to your leads, check qualification outcomes, and step in whenever you want. Full visibility without having to manage any of it."
                reversed
                visual={<MiniDashboardVisual />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: HOW IT WORKS (dark) ─── */}
      <section id="how-it-works" className="py-16 bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <div className="flex flex-col items-center">
              <div className="w-16 gold-line mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                From First Message to Booked Job
              </h2>
              <p className="text-text-tertiary text-lg mt-4 max-w-2xl">
                WhatsApp, email — it doesn&apos;t matter. Qwikly handles it. Booking lands in your calendar. You keep working.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
            {howItWorksSteps.map(({ icon: Icon, step, title, description }) => (
              <div
                key={step}
                className="gradient-border relative p-6 hover:bg-bg-elevated transition-all duration-300"
              >
                <span className="text-5xl font-extrabold text-white/5 absolute top-3 right-4">
                  {step}
                </span>
                <span className="text-sm font-semibold tracking-wide uppercase text-accent mb-3 block">
                  Step {step}
                </span>
                <Icon className="w-8 h-8 text-accent mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {title}
                </h3>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: COMPARISON TABLE ─── */}
      <section className="py-16 bg-bg-subtle">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <SectionHeading
              title="There's Only One Way to Beat the First-Reply Rule"
              subtitle="Hiring a receptionist costs R15,000 a month. Doing it yourself means missed jobs. Qwikly is the only other option."
            />
          </div>

          <div className="reveal-scale max-w-4xl mx-auto">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ─── SECTION 7: PRICING ─── */}
      <section id="pricing" className="py-20 bg-bg-light">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal-up">
            <SectionHeading
              title="You Only Pay When You Get Paid"
              subtitle="No monthly fee. No setup cost. No contracts. When Qwikly books a real job, we take 8% of the service price — and not a cent before that. List your services, set your prices, and Qwikly only earns when you earn."
            />
          </div>

          {/* The rule */}
          <div className="mt-10 max-w-2xl mx-auto reveal-up">
            <div className="bg-bg-dark rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-accent">8%</span>
                <span className="text-text-secondary text-sm">of the service price booked</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border-subtle" />
              <div className="flex items-center gap-4 text-sm text-text-tertiary">
                <span>Minimum <span className="text-white font-semibold">R150</span></span>
                <span className="text-text-tertiary">|</span>
                <span>Maximum <span className="text-white font-semibold">R5,000</span></span>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Service examples table */}
            <div className="bg-white rounded-2xl shadow-xl border border-border-light overflow-hidden reveal-left">
              <div className="bg-bg-dark px-6 py-4">
                <p className="text-white font-sans font-semibold text-sm">Real examples across industries</p>
              </div>
              <div className="divide-y divide-border-light">
                {/* Header — 2-col mobile, 4-col sm+ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 px-4 sm:px-6 py-2.5 bg-bg-subtle">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted-dark">Service</span>
                  <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-text-muted-dark" />
                  <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-text-muted-dark text-center">Price</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted-dark text-right">Qwikly Fee</span>
                </div>
                {serviceExamples.map((item, i) => (
                  <div key={i} className="hover:bg-accent/5 transition-colors duration-200">
                    {/* Mobile: 2-col card */}
                    <div className="sm:hidden grid grid-cols-2 items-start px-4 py-3 gap-2">
                      <div className="min-w-0">
                        <span className="block text-[11px] text-text-muted-dark leading-tight">{item.business}</span>
                        <span className="block text-sm font-medium text-text-dark leading-snug mt-0.5">{item.service}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[11px] text-text-muted-dark leading-tight">{item.servicePrice}</span>
                        <span className="block text-sm font-bold text-accent leading-snug mt-0.5">
                          {item.fee}
                          {item.feeNote && <span className="text-[10px] text-text-muted-dark ml-1">({item.feeNote})</span>}
                        </span>
                      </div>
                    </div>
                    {/* Desktop: 4-col grid */}
                    <div className="hidden sm:grid grid-cols-4 items-center px-6 py-3">
                      <span className="text-sm text-text-muted-dark">{item.business}</span>
                      <span className="text-sm font-medium text-text-dark">{item.service}</span>
                      <span className="text-center text-sm text-text-muted-dark">{item.servicePrice}</span>
                      <span className="text-right text-sm font-bold text-accent">
                        {item.fee}
                        {item.feeNote && <span className="text-[10px] text-text-muted-dark ml-1">({item.feeNote})</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-accent/5 border-t border-accent/20">
                <p className="text-xs text-text-dark text-center">
                  Your service prices, your rules. Change them anytime and your Qwikly fee adjusts automatically.
                </p>
              </div>

              {/* ROI quick math */}
              <div className="px-6 py-5 bg-bg-dark gradient-border rounded-none rounded-b-2xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Quick ROI math</p>
                <div className="space-y-2">
                  {[
                    { label: "Plumber gets 10 bookings/month", fee: "R5,000", earns: "R50,000", roi: "10x return" },
                    { label: "Electrician gets 12 bookings/month", fee: "R6,000", earns: "R84,000", roi: "14x return" },
                    { label: "Solar gets 3 bookings/month", fee: "R15,000", earns: "R450,000", roi: "30x return" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-tertiary leading-snug">{item.label}</span>
                      <span className="text-accent font-bold shrink-0">{item.roi}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* What's included card */}
            <div className="bg-white rounded-2xl shadow-xl border border-border-light p-8 reveal-right">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full mb-6">
                Everything Included
              </span>
              <p className="font-sans text-xl font-bold text-text-dark mb-6">
                No feature tiers. No add-ons. Every business gets:
              </p>

              <ul className="space-y-3">
                {pricingIncludes.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-text-dark text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="w-full h-px bg-border-light my-6" />

              <p className="text-sm text-text-muted-dark text-center mb-6">
                Only pay per booking. No contracts. No surprises.
              </p>

              <CTAButton size="lg" className="w-full justify-center">
                Claim Your First Booking
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: BUILT FOR EVERY SERVICE BUSINESS ─── */}
      <section className="py-16 bg-bg-subtle">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <SectionHeading
              title="If You Get Leads, Qwikly Works For You"
              subtitle="Trades, professionals, and every service business in between. If a customer can message you, Qwikly can respond for you."
            />
          </div>

          {/* Primary trade cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 reveal-stagger">
            {tradeCards.map(({ icon: Icon, trade, pain }, i) => (
              <div
                key={trade}
                className={`trade-card-hover bg-white rounded-xl p-5 border border-border-light hover:border-accent/30 transition-all duration-300 group ${i % 3 === 0 ? "border-l-2 border-l-accent" : ""}`}
              >
                <Icon className="w-8 h-8 text-accent mb-4" />
                <h3 className="text-sm font-semibold text-text-dark mb-1.5">
                  {trade}
                </h3>
                <p className="text-text-muted-dark text-xs leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>

          {/* Plus many more */}
          <div className="mt-10 reveal-up">
            <p className="text-center text-text-muted-dark font-sans font-semibold text-sm uppercase tracking-wide mb-5">
              Plus many more...
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {additionalIndustries.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-white border border-border-light rounded-full px-4 py-2 hover:border-accent/30 transition-colors duration-200"
                >
                  <Icon className="w-4 h-4 text-accent" />
                  <span className="text-sm text-text-dark font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: TESTIMONIALS (dark) ─── */}
      <section className="py-20 bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal-up">
            <div className="flex flex-col items-center">
              <div className="w-16 gold-line mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Real Results From SA Service Businesses
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal-stagger">
            {testimonials.map(({ quote, name, trade, city, metric }) => (
              <div
                key={name}
                className="gradient-border p-6 md:p-8 flex flex-col"
              >
                {metric && (
                  <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5 mb-4 inline-block self-start">
                    <p className="text-accent text-xs font-bold">{metric}</p>
                  </div>
                )}
                <p className="text-text-secondary leading-relaxed flex-1 text-sm md:text-base">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-border-subtle">
                  <p className="font-sans font-semibold text-white text-sm">
                    {name}
                  </p>
                  <p className="text-text-tertiary text-sm">
                    {trade}, {city}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 10: FAQ ─── */}
      <FAQ />

      {/* ─── SECTION 11: FINAL CTA (dark) ─── */}
      <section className="py-12 bg-bg-dark relative overflow-hidden noise-overlay">
        <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center reveal-up hero-glow">
          <h2 className="relative z-10 text-3xl md:text-4xl font-bold tracking-tight text-white">
            Every missed lead is money in your competitor&apos;s pocket.
          </h2>
          <p className="relative z-10 mt-4 text-lg text-text-tertiary max-w-2xl mx-auto">
            The average SA service business loses R15,000–80,000 a month from slow response.
            Qwikly clients see a 10–50x return. See what that looks like for your trade.
          </p>
          <div className="relative z-10 mt-8">
            <CTAButton size="lg" className="animate-subtle-pulse cta-glow">
              Start Your 7-Day Trial
            </CTAButton>
          </div>
          <p className="relative z-10 mt-4 text-sm text-text-tertiary">
            No setup fees. No monthly costs. Pay only when a job is booked.
          </p>
        </div>
      </section>
    </>
  );
}
