import type { Metadata } from "next";
import CTAButton from "@/components/CTAButton";
import { FAQ_DATA, buildFAQSchema } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Two things, done well. We plug the digital assistant onto your site, then start delivering daily Outbound prospects on Pro and up. Live in under 10 minutes.",
  alternates: { canonical: "https://www.qwikly.co.za/how-it-works" },
  openGraph: {
    title: "How Qwikly Works: Two Steps, Live in 10 Minutes",
    description:
      "We plug the digital assistant onto your site and start delivering daily Outbound prospects (Pro and up). One script tag. No developer.",
    url: "https://www.qwikly.co.za/how-it-works",
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to set up Qwikly on your website",
  description:
    "Two things, done well. We plug the digital assistant onto your site, then start delivering daily Outbound prospects on Pro and up. Live in under 10 minutes.",
  totalTime: "PT10M",
  estimatedCost: { "@type": "MonetaryAmount", currency: "ZAR", value: "0" },
  supply: [{ "@type": "HowToSupply", name: "An existing business website (Wix, WordPress, Squarespace, Webflow, Shopify, or any custom site)" }],
  tool: [{ "@type": "HowToTool", name: "Qwikly account" }],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Sign up and tell us about your business.",
      text: "Create your account in under 2 minutes. Tell us your business name, industry, location, and the services you offer. No technical knowledge required.",
      url: "https://www.qwikly.co.za/how-it-works#step-1",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "We scan your entire website automatically.",
      text: "Our tool reads your site from top to bottom: services, pricing, FAQs, contact details, opening hours. Everything your customers typically ask about, captured and structured for your assistant.",
      url: "https://www.qwikly.co.za/how-it-works#step-2",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "You review and confirm the details.",
      text: "We show you a clear summary of everything we found. Correct anything, fill in gaps, or add services we missed. This step takes most businesses under 5 minutes.",
      url: "https://www.qwikly.co.za/how-it-works#step-3",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Your digital assistant is configured.",
      text: "Based on what you confirmed, your assistant is set up and ready. It knows your services, your pricing, and exactly how to qualify a real lead from a time-waster.",
      url: "https://www.qwikly.co.za/how-it-works#step-4",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Paste one script tag onto your website.",
      text: "Copy a single line of code into your website's HTML. No developer, no plugin, no integrations needed. Works with Wix, Squarespace, WordPress, Webflow, Shopify, or any custom site.",
      url: "https://www.qwikly.co.za/how-it-works#step-5",
    },
    {
      "@type": "HowToStep",
      position: 6,
      name: "Leads land in your inbox from the first visitor.",
      text: "Your digital assistant greets every visitor, answers their questions using your content, qualifies them, and emails the lead's contact details straight to you. On Pro and up, we also start delivering hand-picked Outbound prospects every business day for you to decide who to reach out to.",
      url: "https://www.qwikly.co.za/how-it-works#step-6",
    },
  ],
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
      "Your digital assistant greets every visitor, answers their questions using your content, qualifies them, and emails their contact details straight to you. On Pro and up, we also start delivering hand-picked Outbound prospects every business day, so you decide who to reach out to.",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* ═══════ OPENER ═════════════════════════════════════════ */}
      <section className="relative pt-36 md:pt-44 pb-16 md:pb-24 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <h1 className="display-xl text-ink max-w-[18ch]">
            Two things.{" "}
            <em className="italic font-light">Done well.</em>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-ink-700 max-w-prose leading-relaxed">
            One digital assistant on your site, replying in under sixty seconds. One stream of hand-picked Outbound prospects landing in your inbox every business day. Here is how it comes together.
          </p>
        </div>
      </section>

      {/* ═══════ NARRATIVE TIMELINE ═════════════════════════════ */}
      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          {steps.map((s, idx) => (
            <div key={s.stamp} id={`step-${idx + 1}`}>
              {idx > 0 && (
                <div className="border-t border-ink/10" />
              )}
              <div className="grid grid-cols-12 gap-6 md:gap-10 py-12 md:py-20">
                <div className="col-span-12 md:col-span-2">
                  <span className="font-display italic font-light text-ink/40 text-5xl md:text-6xl lg:text-7xl leading-none block">
                    {s.stamp}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-9 md:col-start-4">
                  <h2 className="font-display text-2xl md:text-3xl text-ink leading-tight max-w-prose">
                    {s.title}
                  </h2>
                  <p className="mt-5 text-ink-700 text-base md:text-lg leading-relaxed max-w-prose">
                    {s.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ CLOSER ═════════════════════════════════════════ */}
      <section className="relative py-28 md:py-36 border-t border-ink/10 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-lg text-ink max-w-[20ch] mx-auto">
            Plug it in.{" "}
            <em className="italic font-light text-ember">It just works.</em>
          </h2>
          <div className="mt-12 flex justify-center">
            <CTAButton size="lg" variant="solid" href="/contact">
              Book a setup call
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
