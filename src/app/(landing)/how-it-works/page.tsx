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

export default function HowItWorksPage() {
  const faqSchema = buildFAQSchema(FAQ_DATA);
  return (
    <div className="bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative pt-40 pb-20 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">How it works</p>
          <h1 className="display-xl text-ink max-w-[20ch]">
            From first visit to{" "}
            <em className="italic font-light">qualified lead in your inbox</em>.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            Qwikly scans your website, configures your digital assistant, and has it live in under 10 minutes.
            No integrations. No developer. No ongoing work from you.
          </p>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="text-xs font-semibold text-ember">Digital Assistant Platform</span>
            </div>
            <svg viewBox="0 0 16 16" className="w-3 h-3 text-ink-300" fill="none"><path d="M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <span className="text-xs font-semibold text-blue-500">Email Lead Delivery</span>
            </div>
            <span className="text-xs text-ink-400 pl-1">One platform. One script tag.</span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((s) => (
              <div key={s.stamp} className="ed-card-ghost">
                <div className="flex items-start justify-between mb-6">
                  <span className="step-stamp">{s.stamp}</span>
                  <span className="eyebrow text-ink-500">Step</span>
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

      {/* Industry stats */}
      <section className="py-24 bg-ink grain-dark overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14">
            <p className="eyebrow text-paper/50 mb-5">Why speed matters</p>
            <h2 className="display-lg text-paper max-w-[22ch]">
              If you don&rsquo;t reply in{" "}
              <em className="italic font-light text-ember">5 minutes</em>,
              the lead is gone.
            </h2>
            <p className="mt-6 text-paper/60 text-lg max-w-xl leading-relaxed">
              These aren&rsquo;t Qwikly&rsquo;s numbers. They&rsquo;re what independent research says about
              every business that takes too long to respond to website enquiries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {responseStats.map((s) => (
              <div
                key={s.figure}
                className="bg-paper/[0.05] border border-paper/10 rounded-2xl p-6"
              >
                <p className="font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none text-ember tracking-tight">
                  {s.figure}
                </p>
                <p className="mt-3 text-paper/80 text-sm leading-relaxed">{s.label}</p>
                <p className="mt-3 text-paper/30 text-[11px] leading-relaxed">{s.source}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-paper/30 text-xs">
            Statistics are industry averages from the sources cited. Individual results will vary.
          </p>
        </div>
      </section>

      {/* Under the hood */}
      <section className="py-24 bg-paper-deep grain">
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

      {/* Final CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[18ch] mx-auto">
            Live on your site in{" "}
            <em className="italic font-light text-ember">5 minutes</em>.
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
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
        </div>
      </section>
    </div>
  );
}
