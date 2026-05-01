import type { Metadata } from "next";
import CTAButton from "@/components/CTAButton";
import { FAQ_DATA, buildFAQSchema } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Qwikly scans your website, configures your digital assistant, and has it live in under 10 minutes. Here is exactly how the six-step process works.",
  alternates: { canonical: "https://www.qwikly.co.za/how-it-works" },
};

const steps = [
  {
    stamp: "i.",
    title: "Sign up and tell us about your business.",
    body:
      "Create your account in under 2 minutes. Tell us your business name, industry, location, and the services you offer. No technical knowledge required.",
  },
  {
    stamp: "ii.",
    title: "We scan your entire website automatically.",
    body:
      "Our tool reads your site from top to bottom. Services, pricing, FAQs, contact details, opening hours. Everything your customers typically ask about, captured and structured for your assistant.",
  },
  {
    stamp: "iii.",
    title: "You review and confirm the details.",
    body:
      "We show you a clear summary of everything we found. Correct anything, fill in gaps, or add services we missed. This step takes most businesses under 5 minutes.",
  },
  {
    stamp: "iv.",
    title: "Your digital assistant is configured.",
    body:
      "Based on what you confirmed, your assistant is set up and ready. It knows your services, your pricing, and exactly how to qualify a real lead from a time-waster.",
  },
  {
    stamp: "v.",
    title: "Paste one script tag onto your website.",
    body:
      "Copy a single line of code into your website's HTML. No developer, no plugin, no integrations needed. Works with Wix, Squarespace, WordPress, Webflow, Shopify, or any custom site.",
  },
  {
    stamp: "vi.",
    title: "Leads land in your inbox from the first visitor.",
    body:
      "Your digital assistant greets every visitor, answers their questions using your content, qualifies them based on your criteria, and sends confirmed leads straight to your inbox with a one-click confirmation.",
  },
];

const underTheHood = [
  {
    title: "Customisable qualifying questions",
    body:
      "Tell Qwikly what to ask: service type, location, budget, timeline. You define the questions, and the assistant works through them naturally in conversation.",
  },
  {
    title: "Instant email notifications",
    body:
      "Every qualified lead hits your inbox immediately with all the context you need: name, contact, what they want, and their requested booking time. No dashboard login required.",
  },
  {
    title: "Full conversation log",
    body:
      "Every exchange is recorded and available in your dashboard. See exactly what the assistant said, how the visitor responded, and whether the lead was qualified or not.",
  },
];

const responseStats = [
  {
    figure: "78%",
    label: "of customers book the first business that responds",
    source: "Salesforce, State of the Connected Customer",
  },
  {
    figure: "21×",
    label: "more likely to convert when contacted within 5 minutes vs 30 minutes",
    source: "Harvard Business Review / InsideSales.com",
  },
  {
    figure: "47 hrs",
    label: "average response time for a South African service business",
    source: "Independent SA SME survey, 2024",
  },
  {
    figure: "62%",
    label: "of website enquiries are never followed up at all",
    source: "Salesforce Research, 2024",
  },
];

const quickSummary = [
  { step: "01", text: "We scan your site" },
  { step: "02", text: "Your assistant goes live" },
  { step: "03", text: "Leads land in your inbox" },
];

export default function HowItWorksPage() {
  const faqSchema = buildFAQSchema(FAQ_DATA);
  return (
    <div className="bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ═══════ HERO ═══════════════════════════════════════════ */}
      <section className="relative bg-[#0A0908] overflow-hidden grain-dark">
        <div className="ember-blob w-[600px] h-[600px] -top-32 -right-32 opacity-25" />
        <div className="ember-blob w-[350px] h-[350px] bottom-0 -left-24 opacity-15" />
        <div className="dot-grid absolute inset-0 opacity-30" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10 pt-36 pb-24 md:pt-44 md:pb-32">

          {/* Badge */}
          <div className="mb-12">
            <span className="inline-flex items-center gap-2.5 bg-ember/15 border border-ember/25 text-ember px-5 py-2.5 rounded-full text-sm font-medium">
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Digital Assistant Platform
            </span>
          </div>

          {/* Two-column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">

            {/* Left */}
            <div>
              <h1 className="display-xl text-paper">
                From first visit to{" "}
                <em className="italic font-light text-ember">
                  qualified lead in your inbox
                </em>
                .
              </h1>
              <p className="mt-8 text-lg text-paper/65 max-w-xl leading-relaxed">
                Qwikly scans your website, configures your digital assistant, and has it live in under 10 minutes.
                No integrations. No developer. No ongoing work from you.
              </p>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap gap-4">
                {[
                  "Live in under 10 minutes",
                  "One script tag, any website",
                  "No developer needed",
                ].map((badge) => (
                  <div key={badge} className="flex items-center gap-2.5 bg-paper/[0.05] border border-paper/10 rounded-full px-4 py-2">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-ember flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm text-paper/65">{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: quick summary cards */}
            <div className="flex flex-col gap-3">
              {quickSummary.map((item, i) => (
                <div
                  key={item.step}
                  className="flex items-center gap-5 bg-paper/[0.04] border border-paper/[0.08] rounded-2xl px-6 py-5 group hover:bg-paper/[0.07] hover:border-paper/[0.14] transition-colors duration-300"
                >
                  <span className="font-mono text-xs text-ember/60 w-6 flex-shrink-0">{item.step}</span>
                  <div className="w-px h-8 bg-paper/10 flex-shrink-0" />
                  <span className="font-display text-xl text-paper">{item.text}</span>
                  {i === quickSummary.length - 1 && (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-ember ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ))}
              <div className="mt-4">
                <CTAButton size="md" variant="solid" href="/signup">
                  Get started free
                </CTAButton>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════ STEPS ══════════════════════════════════════════ */}
      <section className="py-28 md:py-36 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="text-center mb-16">
            <p className="eyebrow text-ink-500 mb-4">Six steps to live</p>
            <h2 className="display-lg text-ink max-w-[22ch] mx-auto">
              Simple by design.{" "}
              <em className="italic font-light">Powerful by default.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((s) => (
              <div key={s.stamp} className="ed-card group">
                <div className="flex items-start justify-between mb-6">
                  <span className="step-stamp">{s.stamp}</span>
                  <span className="eyebrow text-ink-500 group-hover:text-ember transition-colors">Step</span>
                </div>
                <h2 className="font-display text-xl md:text-2xl text-ink leading-tight">
                  {s.title}
                </h2>
                <p className="mt-4 text-ink-700 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ INDUSTRY STATS ═════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-ink grain-dark overflow-hidden">
        <div className="ember-blob w-[500px] h-[400px] top-0 right-0 opacity-20" />
        <div className="dot-grid absolute inset-0 opacity-50" />

        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-5">
              <p className="eyebrow text-paper/50 mb-5">Why speed matters</p>
              <h2 className="display-lg text-paper">
                If you don&rsquo;t reply in{" "}
                <em className="italic font-light text-ember">5 minutes</em>,
                the lead is gone.
              </h2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7 lg:pt-4">
              <p className="text-paper/60 text-lg leading-relaxed">
                These aren&rsquo;t Qwikly&rsquo;s numbers. They&rsquo;re what independent research says about
                every business that takes too long to respond to website enquiries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {responseStats.map((s) => (
              <div
                key={s.figure}
                className="bg-paper/[0.05] border border-paper/10 rounded-2xl p-7 hover:bg-paper/[0.08] hover:border-paper/[0.16] transition-colors duration-300"
              >
                <p className="font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none text-ember tracking-tight">
                  {s.figure}
                </p>
                <p className="mt-4 text-paper/80 text-sm leading-relaxed">{s.label}</p>
                <p className="mt-3 text-paper/30 text-[11px] leading-relaxed">{s.source}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-paper/30 text-xs">
            Statistics are industry averages from the sources cited. Individual results will vary.
          </p>
        </div>
      </section>

      {/* ═══════ UNDER THE HOOD ═════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-paper-deep grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
            <div className="md:col-span-5">
              <p className="eyebrow text-ink-500 mb-5">Under the hood</p>
              <h2 className="display-lg text-ink">
                Quiet power,
                <br />
                <em className="italic font-light">running in the background</em>.
              </h2>
            </div>
            <div className="md:col-span-6 md:col-start-7 md:pt-4">
              <p className="text-ink-700 text-lg leading-relaxed">
                Everything you&rsquo;d expect from a full-time front office: triage, qualification,
                logging, and notifications. Working silently while you focus on the work.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {underTheHood.map((f) => (
              <div key={f.title} className="ed-card">
                <h3 className="font-display text-xl text-ink leading-tight mb-3">
                  {f.title}
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ══════════════════════════════════════ */}
      <section className="relative py-36 md:py-44 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[900px] h-[500px] top-0 left-1/2 -translate-x-1/2 opacity-40" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <p className="eyebrow text-paper/50 mb-10">Your move</p>
          <h2 className="display-xl text-paper max-w-[18ch] mx-auto">
            Live on your site in{" "}
            <em className="italic font-light text-ember">5 minutes</em>.
          </h2>
          <p className="text-paper/70 text-lg md:text-xl mt-8 max-w-xl mx-auto leading-relaxed">
            Free to start. No card required. Upgrade when you need more leads.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton size="lg" variant="solid" href="/signup">
              Start Free
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/pricing" withArrow={false}>
              See all plans
            </CTAButton>
          </div>
          <p className="mt-8 text-sm text-paper/35">
            POPIA compliant · Hosted in South Africa · hello@qwikly.co.za
          </p>
        </div>
      </section>
    </div>
  );
}
