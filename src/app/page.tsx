"use client";

import {
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
  Quote,
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
  { value: "500+", label: "leads handled" },
  { value: "30s", label: "avg response" },
  { value: "94%", label: "qualification rate" },
  { value: "24/7", label: "coverage" },
];

const howItWorksSteps = [
  {
    icon: MessageSquare,
    step: "01",
    title: "Lead reaches out",
    description: "A customer messages via WhatsApp or email about a job.",
  },
  {
    icon: Bot,
    step: "02",
    title: "AI responds in 30 seconds",
    description: "Qualifies the lead, asks the right questions, checks your service area.",
  },
  {
    icon: CalendarCheck,
    step: "03",
    title: "Appointment booked",
    description: "Straight into your Google Calendar. You and the customer get notified.",
  },
  {
    icon: RefreshCw,
    step: "04",
    title: "Follow-up automated",
    description: "Reminders, no-show recovery, and lead revival happen automatically.",
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

const tradePricing = [
  { trade: "Pest Control", price: "R200", jobValue: "R1,500", roi: "7.5x" },
  { trade: "Pool Cleaning", price: "R250", jobValue: "R1,800/mo", roi: "7x" },
  { trade: "Plumber", price: "R500", jobValue: "R5,000", roi: "10x" },
  { trade: "Electrician", price: "R500", jobValue: "R7,000", roi: "14x" },
  { trade: "Security", price: "R500", jobValue: "R1,000/mo", roi: "24x" },
  { trade: "Aircon", price: "R600", jobValue: "R8,000", roi: "13x" },
  { trade: "Landscaper", price: "R750", jobValue: "R10,000", roi: "13x" },
  { trade: "Garage Doors", price: "R1,000", jobValue: "R12,000", roi: "12x" },
  { trade: "Roofer", price: "R1,500", jobValue: "R40,000", roi: "27x" },
  { trade: "Solar", price: "R3,000", jobValue: "R150,000", roi: "50x" },
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
      "Qwikly picked up 12 extra jobs in our first month. The AI replies faster than my best receptionist and follows up on every single quote.",
    name: "Thabo M.",
    trade: "Electrician",
    city: "Johannesburg",
  },
  {
    quote:
      "I was losing weekend leads for years. Now every WhatsApp and email gets answered in 30 seconds, even on Christmas Day. The no-show recovery alone has paid for itself.",
    name: "Sarah K.",
    trade: "Pool Services",
    city: "Cape Town",
  },
  {
    quote:
      "The setup took 2 days and I have not thought about it since. It just works. The dashboard shows me everything the AI is saying.",
    name: "James R.",
    trade: "Plumber",
    city: "Pretoria",
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
    <div className="bg-card rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-cta/10 flex items-center justify-center">
          <Clock className="w-3 h-3 text-cta" />
        </div>
        <span className="text-foreground text-xs font-medium">Follow-up Cadence</span>
      </div>
      <div className="space-y-0">
        {followUps.map((item, i) => (
          <div key={item.time} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${item.active ? "border-cta bg-cta" : "border-border bg-white"}`} />
              {i < followUps.length - 1 && <div className="w-0.5 h-6 bg-border" />}
            </div>
            <div className="pb-2">
              <p className="text-foreground text-[11px] font-semibold">{item.time}</p>
              <p className="text-muted text-[10px]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniNotificationVisual() {
  return (
    <div className="bg-card rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
          <CalendarX className="w-3 h-3 text-red-500" />
        </div>
        <span className="text-foreground text-xs font-medium">No-Show Recovery</span>
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
    <div className="bg-card rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
          <CalendarClock className="w-3 h-3 text-purple-600" />
        </div>
        <span className="text-foreground text-xs font-medium">Lead Revival</span>
      </div>
      <div className="space-y-2">
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <p className="text-purple-700 text-[10px] font-medium mb-1">35 days dormant</p>
          <p className="text-purple-600/70 text-[10px]">John D. - Solar installation quote</p>
        </div>
        <div className="bg-background rounded-lg p-3 border border-border">
          <p className="text-foreground text-[11px]">&ldquo;Hi John, summer is coming and electricity prices just went up. Still thinking about going solar?&rdquo;</p>
          <p className="text-cta text-[10px] font-medium mt-1">Seasonal re-engagement sent</p>
        </div>
      </div>
    </div>
  );
}

function MiniDashboardVisual() {
  return (
    <div className="bg-card rounded-2xl p-4 max-w-sm w-full shadow-lg border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
          <BarChart3 className="w-3 h-3 text-blue-600" />
        </div>
        <span className="text-foreground text-xs font-medium">Client Dashboard</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-background rounded-lg p-2 text-center border border-border">
          <p className="text-foreground text-sm font-bold">47</p>
          <p className="text-muted text-[9px]">Leads</p>
        </div>
        <div className="bg-background rounded-lg p-2 text-center border border-border">
          <p className="text-cta text-sm font-bold">32</p>
          <p className="text-muted text-[9px]">Booked</p>
        </div>
        <div className="bg-background rounded-lg p-2 text-center border border-border">
          <p className="text-green-600 text-sm font-bold">94%</p>
          <p className="text-muted text-[9px]">Rate</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-1.5 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-foreground">Sarah M.</span>
          </div>
          <span className="text-[9px] text-cta font-medium">Booked</span>
        </div>
        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-1.5 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-foreground">David K.</span>
          </div>
          <span className="text-[9px] text-muted font-medium">Following up</span>
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
      {/* ─── SECTION 1: HERO (dark navy) ─── */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 hero-grid pointer-events-none" />

        <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-white leading-tight">
                Every lead answered.
                <br />
                Every follow-up sent.
                <br />
                Every appointment booked.
              </h1>
              <p className="mt-6 text-base md:text-lg text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                AI that responds in 30 seconds, follows up automatically, and
                never lets a lead go cold. Built for South African service
                businesses.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <CTAButton size="lg" className="animate-subtle-pulse cta-glow">
                  Start Free Trial
                </CTAButton>
                <CTAButton variant="outline" size="lg" href="#how-it-works" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                  See How It Works
                </CTAButton>
              </div>

              <p className="mt-5 text-sm text-gray-400">
                No setup fees. No contracts. Cancel anytime.
              </p>
            </div>

            {/* Right: WhatsApp mock */}
            <div className="flex-shrink-0">
              <WhatsAppMock />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: SOCIAL PROOF BAR ─── */}
      <section className="bg-[#f1f5f9] py-10 border-y border-border/50">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <p className="text-center text-foreground font-heading font-semibold text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            Helping service businesses across Johannesburg, Pretoria, Cape Town,
            and Durban respond faster and book more
          </p>

          {/* Counter stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(({ value, label }) => (
              <div key={label} className="stat-card text-center bg-white rounded-xl p-4">
                <p className="font-heading text-2xl md:text-3xl font-bold text-primary">
                  {value}
                </p>
                <p className="text-xs text-muted mt-0.5 uppercase tracking-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Scrolling industry ticker */}
          <div className="mt-8 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#f1f5f9] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f1f5f9] to-transparent z-10 pointer-events-none" />
            <div className="ticker-scroll flex items-center gap-4 w-max">
              {[...tickerLabels, ...tickerLabels].map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="inline-flex items-center text-xs font-medium text-muted bg-white px-3 py-1.5 rounded-full border border-border whitespace-nowrap"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: THE PROBLEM ─── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal">
            <SectionHeading
              title="You're losing 30-40% of your leads right now"
              subtitle="Most service businesses take hours to reply. By then, the customer has already booked someone else."
            />
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 reveal">
            {/* WITHOUT */}
            <div className="bg-red-50/60 border border-red-200/60 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-heading font-bold text-red-700 text-sm uppercase tracking-wide">
                  Without Qwikly
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { text: "Lead messages at 7pm", icon: MessageSquare },
                  { text: "You're on site, phone in your pocket", icon: Wrench },
                  { text: "Reply at 10pm", icon: Clock },
                  { text: "They've already booked someone else", icon: Users },
                  { text: "R5,000 job lost", icon: XCircle },
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
            <div className="bg-green-50/60 border border-green-200/60 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-heading font-bold text-green-700 text-sm uppercase tracking-wide">
                  With Qwikly
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { text: "Lead messages at 7pm", icon: MessageSquare },
                  { text: "AI replies in 30 seconds", icon: Bot },
                  { text: "Qualifies the lead automatically", icon: CheckCircle2 },
                  { text: "Books the appointment", icon: CalendarCheck },
                  { text: "R5,000 job won", icon: CheckCircle2 },
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

      {/* ─── SECTION 4: PLATFORM FEATURES (alternating) ─── */}
      <section id="features" className="py-20 bg-background">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <SectionHeading
              title="One Platform. Every Touchpoint Covered."
              subtitle="From first message to rebooking, Qwikly handles the entire lead lifecycle."
            />
          </div>

          <div className="space-y-20 md:space-y-28">
            <div className="reveal">
              <FeatureBlock
                badge="WHATSAPP"
                badgeColor="bg-[#00a884]/10 text-[#00a884]"
                title="Instant WhatsApp Response"
                description="Every WhatsApp lead gets a reply within 30 seconds, 24 hours a day, 7 days a week. The AI qualifies them, asks the right questions, and books the appointment. Most customers do not even realise it is AI."
                visual={<MiniWhatsAppVisual />}
              />
            </div>

            <div className="reveal">
              <FeatureBlock
                badge="EMAIL"
                badgeColor="bg-blue-50 text-blue-600"
                title="Email Lead Handling"
                description="Leads do not only come through WhatsApp. Qwikly responds to email enquiries on behalf of your business, using the same trade-specific AI. Same speed, same quality, different channel."
                reversed
                visual={<EmailMock />}
              />
            </div>

            <div className="reveal">
              <FeatureBlock
                badge="AUTOMATION"
                title="Automated Follow-ups"
                description="When a lead goes quiet, Qwikly re-engages them automatically at 4 hours, 24 hours, 2 days, and 5 days. If WhatsApp gets no response, the AI switches to email. No lead falls through the cracks."
                visual={<MiniTimelineVisual />}
              />
            </div>

            <div className="reveal">
              <FeatureBlock
                badge="RECOVERY"
                badgeColor="bg-red-50 text-red-600"
                title="No-Show Recovery"
                description="Missed appointments mean lost revenue. When a customer does not show up, Qwikly sends an automatic rebooking message within minutes, suggesting the next available slot."
                reversed
                visual={<MiniNotificationVisual />}
              />
            </div>

            <div className="reveal">
              <FeatureBlock
                badge="REVIVAL"
                badgeColor="bg-purple-50 text-purple-600"
                title="Lead Revival"
                description="Leads that went cold 30 or more days ago are not dead. Qwikly sends seasonal, trade-specific re-engagement messages that bring dormant leads back to life."
                visual={<MiniRevivalVisual />}
              />
            </div>

            <div className="reveal">
              <FeatureBlock
                badge="DASHBOARD"
                badgeColor="bg-blue-50 text-blue-600"
                title="Client Dashboard"
                description="See every conversation, every booking, and every stat in real time. Read full transcripts, review AI performance, and step in whenever you want. Full visibility, full control."
                reversed
                visual={<MiniDashboardVisual />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: HOW IT WORKS (dark navy) ─── */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="flex flex-col items-center">
              <div className="w-12 h-1 bg-cta rounded-full mb-4" />
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
                How Qwikly Works
              </h2>
              <p className="text-gray-400 text-lg mt-4 max-w-2xl">
                Four steps from first message to fully automated lifecycle management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal">
            {howItWorksSteps.map(({ icon: Icon, step, title, description }) => (
              <div
                key={step}
                className="relative bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-cta/30 transition-all duration-300"
              >
                <span className="font-heading text-5xl font-bold text-white/5 absolute top-3 right-4">
                  {step}
                </span>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cta/10 mb-5">
                  <Icon className="w-6 h-6 text-cta" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  {title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: COMPARISON TABLE ─── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <SectionHeading
              title="How Qwikly Stacks Up"
              subtitle="See why service businesses choose Qwikly over the alternatives."
            />
          </div>

          <div className="reveal max-w-4xl mx-auto">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ─── SECTION 7: PRICING ─── */}
      <section id="pricing" className="py-20 bg-[#f1f5f9]">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal">
            <SectionHeading
              title="Pay Per Booking. Priced for Your Trade."
              subtitle="Every trade has different job values, so every trade gets a fair price. You only pay when Qwikly books a real appointment."
            />
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Trade pricing table */}
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden reveal">
              <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
                <div className="grid grid-cols-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <span>Trade</span>
                  <span className="text-center">Per Booking</span>
                  <span className="text-center">Avg Job Value</span>
                  <span className="text-right">Your ROI</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {tradePricing.map((item) => (
                  <div key={item.trade} className="grid grid-cols-4 items-center px-6 py-3.5 hover:bg-cta/5 transition-colors duration-200">
                    <span className="text-sm font-medium text-foreground">{item.trade}</span>
                    <span className="text-center text-sm font-bold text-cta">{item.price}</span>
                    <span className="text-center text-sm text-muted">{item.jobValue}</span>
                    <span className="text-right text-sm font-bold text-success">{item.roi}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-[#f8fafc] border-t border-border">
                <p className="text-xs text-muted text-center">Other industries priced at consultation. Same features, fair pricing.</p>
              </div>
            </div>

            {/* What's included card */}
            <div className="bg-card rounded-2xl shadow-xl border border-border p-8 reveal">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-cta bg-cta/10 px-3 py-1 rounded-full mb-6">
                Everything Included
              </span>
              <p className="font-heading text-xl font-bold text-primary mb-6">
                Every plan includes the full Qwikly platform:
              </p>

              <ul className="space-y-3">
                {pricingIncludes.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="w-full h-px bg-border my-6" />

              <p className="text-sm text-muted text-center mb-6">
                No monthly fees. No setup cost. No contracts. 7-day free trial.
              </p>

              <CTAButton size="lg" className="w-full justify-center">
                Start Your Free 7-Day Trial
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: BUILT FOR EVERY SERVICE BUSINESS ─── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <SectionHeading
              title="Built for Every Service Business"
              subtitle="From tradespeople to professionals, if your business gets leads, Qwikly handles them."
            />
          </div>

          {/* Primary trade cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 reveal">
            {tradeCards.map(({ icon: Icon, trade, pain }) => (
              <div
                key={trade}
                className="trade-card-hover bg-background rounded-xl p-5 border border-border hover:border-cta/30 transition-all duration-300 group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cta/10 mb-3 group-hover:bg-cta/20 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-cta" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-primary mb-1.5">
                  {trade}
                </h3>
                <p className="text-muted text-xs leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>

          {/* Plus many more */}
          <div className="mt-10 reveal">
            <p className="text-center text-muted font-heading font-semibold text-sm uppercase tracking-wide mb-5">
              Plus many more...
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {additionalIndustries.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-background border border-border rounded-full px-4 py-2 hover:border-cta/30 transition-colors duration-200"
                >
                  <Icon className="w-4 h-4 text-cta" />
                  <span className="text-sm text-foreground font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: TESTIMONIALS (dark navy) ─── */}
      <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="flex flex-col items-center">
              <div className="w-12 h-1 bg-cta rounded-full mb-4" />
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
                What Our Clients Say
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal">
            {testimonials.map(({ quote, name, trade, city }) => (
              <div
                key={name}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/10 flex flex-col"
              >
                <Quote className="w-8 h-8 text-cta/40 mb-4 flex-shrink-0" />
                <p className="text-gray-200 leading-relaxed flex-1 text-sm md:text-base">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="font-heading font-semibold text-white text-sm">
                    {name}
                  </p>
                  <p className="text-gray-400 text-sm">
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

      {/* ─── SECTION 11: FINAL CTA (dark navy) ─── */}
      <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            Stop losing leads. Start today.
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
            Join 50+ service businesses across South Africa that never miss a
            lead.
          </p>
          <div className="mt-8">
            <CTAButton size="lg" className="animate-subtle-pulse cta-glow">
              Start Your Free Trial
            </CTAButton>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No setup fees. No contracts. 7-day free trial.
          </p>
        </div>
      </section>
    </>
  );
}
