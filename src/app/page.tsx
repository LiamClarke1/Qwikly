import {
  Zap,
  Wrench,
  Home as HomeIcon,
  Sun,
  Bug,
  MessageSquare,
  Bot,
  CalendarCheck,
  Clock,
  UserCheck,
  MessageCircle,
  CreditCard,
  Shield,
  CheckCircle2,
  Quote,
} from "lucide-react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";
import SectionHeading from "@/components/SectionHeading";

const trades = [
  { icon: Zap, label: "Electricians" },
  { icon: Wrench, label: "Plumbers" },
  { icon: HomeIcon, label: "Roofers" },
  { icon: Sun, label: "Solar" },
  { icon: Bug, label: "Pest Control" },
];

const howItWorks = [
  {
    icon: MessageSquare,
    title: "Lead Messages You",
    description:
      "A potential customer WhatsApps your business number about a job.",
  },
  {
    icon: Bot,
    title: "AI Qualifies in 30 Seconds",
    description:
      "Qwikly replies instantly, asks the right questions, and checks if they're in your area.",
  },
  {
    icon: CalendarCheck,
    title: "Appointment Booked",
    description:
      "Qualified leads get booked straight into your Google Calendar. You get notified immediately.",
  },
];

const stats = [
  { value: "352", label: "appointments booked" },
  { value: "30s", label: "average response time" },
  { value: "94%", label: "lead qualification rate" },
  { value: "24/7", label: "always-on coverage" },
];

const benefits = [
  {
    icon: Clock,
    title: "30-Second Replies",
    description: "Every lead gets an instant response, even at 2am on a Sunday.",
  },
  {
    icon: UserCheck,
    title: "Smart Qualification",
    description:
      "The AI asks the right questions: area, job type, urgency, budget range.",
  },
  {
    icon: CalendarCheck,
    title: "Automatic Booking",
    description:
      "Qualified leads are booked directly into your Google Calendar.",
  },
  {
    icon: MessageCircle,
    title: "Sounds Human",
    description:
      "Natural SA English conversations. Most leads don't even realise it's AI.",
  },
  {
    icon: CreditCard,
    title: "Pay Per Booking",
    description: "R750 per booked appointment. Nothing if it doesn't book.",
  },
  {
    icon: Shield,
    title: "7-Day Free Trial",
    description:
      "Test it with real leads for a full week before paying anything.",
  },
];

const pricingIncludes = [
  "30-second WhatsApp replies",
  "Lead qualification",
  "Google Calendar booking",
  "Client notifications",
  "Conversation logging",
  "24/7 coverage",
];

const tradeCards = [
  {
    icon: Zap,
    trade: "Electricians",
    description:
      "DB board trips at 9pm. The homeowner WhatsApps you. Qwikly replies in 30 seconds and books the callout.",
  },
  {
    icon: Wrench,
    trade: "Plumbers",
    description:
      "Burst geyser on a Sunday. Every plumber's phone goes off. Qwikly makes sure you're the first to reply.",
  },
  {
    icon: HomeIcon,
    trade: "Roofers",
    description:
      "Hail season hits, quotes pile up. Qwikly catches every one while you're on the roof.",
  },
  {
    icon: Sun,
    trade: "Solar Installers",
    description:
      "Load shedding announcement drops. 20 leads in a day. Qwikly qualifies and books them all.",
  },
  {
    icon: Bug,
    trade: "Pest Control",
    description:
      "Rats at midnight. The customer isn't sleeping. Qwikly books the callout before your competitor wakes up.",
  },
];

const testimonials = [
  {
    quote:
      "Qwikly picked up 12 extra jobs in our first month. The AI replies faster than my best receptionist.",
    name: "Thabo M.",
    role: "Electrician, Johannesburg",
  },
  {
    quote:
      "I was losing weekend leads for years. Now every WhatsApp gets answered in 30 seconds, even on Christmas Day.",
    name: "Sarah K.",
    role: "Pool Services, Cape Town",
  },
  {
    quote:
      "The setup took 2 days and I haven't thought about it since. It just works.",
    name: "James R.",
    role: "Plumber, Pretoria",
  },
];

export default function Home() {
  return (
    <>
      {/* ───── HERO ───── */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-primary leading-tight">
            Never miss a WhatsApp
            <br className="hidden sm:block" /> lead again.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            AI that replies to every lead in 30 seconds, qualifies them, and
            books appointments straight into your calendar. Built for South
            African service businesses.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton size="lg">Start Your Free Trial</CTAButton>
            <CTAButton variant="outline" size="lg" href="#how-it-works">
              See How It Works
            </CTAButton>
          </div>

          <p className="mt-6 text-sm text-muted-light">
            No setup fees. No contracts. Pay only when it books.
          </p>
        </div>
      </section>

      {/* ───── SOCIAL PROOF BAR ───── */}
      <section className="bg-border/40 py-10">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted font-medium text-sm uppercase tracking-wide">
            Trusted by 50+ service businesses across South Africa
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {trades.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 text-muted"
              >
                <Icon className="w-7 h-7" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="How Qwikly Works"
            subtitle="Three steps to never losing a lead again"
          />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                className="bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow p-8 text-center"
              >
                <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-cta/10 mb-6">
                  <Icon className="w-7 h-7 text-cta" />
                </div>
                <p className="text-xs font-semibold text-cta uppercase tracking-wide mb-2">
                  Step {i + 1}
                </p>
                <h3 className="font-heading text-xl font-semibold text-primary">
                  {title}
                </h3>
                <p className="mt-3 text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CASE STUDY / METRICS ───── */}
      <section className="py-20 bg-primary text-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            The Results Speak for Themselves
          </h2>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="bg-white/10 rounded-xl p-6 backdrop-blur-sm"
              >
                <p className="font-heading text-4xl md:text-5xl font-bold text-cta">
                  {value}
                </p>
                <p className="mt-2 text-sm text-white/70 capitalize">{label}</p>
              </div>
            ))}
          </div>

          <blockquote className="mt-14 max-w-2xl mx-auto">
            <Quote className="w-8 h-8 text-cta mx-auto mb-4 opacity-60" />
            <p className="text-lg md:text-xl italic leading-relaxed text-white/90">
              &ldquo;Since switching to Qwikly, we&rsquo;ve picked up 40% more
              jobs. The AI replies faster than we ever could.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-white/60">
              &mdash; Johan V., Solar Installer, Durban
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ───── BENEFITS GRID ───── */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Why Service Businesses Choose Qwikly"
          />

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow p-8"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cta/10 mb-5">
                  <Icon className="w-6 h-6 text-cta" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-primary">
                  {title}
                </h3>
                <p className="mt-2 text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── PRICING ───── */}
      <section id="pricing" className="py-20 bg-border/20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Simple, Transparent Pricing"
          />

          <div className="mt-14 max-w-md mx-auto bg-card rounded-2xl shadow-lg border-t-4 border-cta p-8 md:p-10 text-center">
            <p className="font-heading text-5xl md:text-6xl font-bold text-primary">
              R750
            </p>
            <p className="mt-2 text-muted text-lg">per booked appointment</p>

            <ul className="mt-8 space-y-3 text-left">
              {pricingIncludes.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-muted">
              No monthly fees. No setup cost. No contracts.
            </p>

            <div className="mt-6">
              <CTAButton size="lg" className="w-full justify-center">
                Start Your Free 7-Day Trial
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ───── TRADES SECTION ───── */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Built for Your Trade"
            subtitle="Trade-specific AI that knows your business"
          />

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {tradeCards.map(({ icon: Icon, trade, description }) => (
              <div
                key={trade}
                className="bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow p-8"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cta/10 mb-5">
                  <Icon className="w-6 h-6 text-cta" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-primary">
                  {trade}
                </h3>
                <p className="mt-2 text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── TESTIMONIALS ───── */}
      <section className="py-20 bg-border/20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading title="What Our Clients Say" />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map(({ quote, name, role }) => (
              <div
                key={name}
                className="bg-card rounded-xl shadow-sm p-8 flex flex-col"
              >
                <Quote className="w-6 h-6 text-cta/40 mb-4" />
                <p className="text-foreground leading-relaxed flex-1">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="font-heading font-semibold text-primary text-sm">
                    {name}
                  </p>
                  <p className="text-muted text-sm">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <FAQ />

      {/* ───── FINAL CTA ───── */}
      <section className="py-20 bg-primary text-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Ready to Stop Losing Leads?
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            Start your free 7-day trial today. No setup fees, no contracts, no
            risk.
          </p>
          <div className="mt-8">
            <CTAButton
              size="lg"
              className="bg-cta hover:bg-cta-hover text-white"
            >
              Start Your Free Trial
            </CTAButton>
          </div>
        </div>
      </section>
    </>
  );
}
