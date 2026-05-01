import type { Metadata } from "next";
import FAQ from "@/components/FAQ";
import { FAQ_DATA, buildFAQSchema } from "@/lib/faq-data";
import CTAButton from "@/components/CTAButton";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to the most common questions about Qwikly — how the website chat widget works, what counts as a qualified lead, pricing, and POPIA compliance.",
  alternates: { canonical: "https://www.qwikly.co.za/faq" },
};

export default function FAQPage() {
  const faqSchema = buildFAQSchema(FAQ_DATA);
  return (
    <div className="bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative pt-40 pb-8 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">FAQ</p>
          <h1 className="display-xl text-ink max-w-[20ch]">
            Every question,{" "}
            <em className="italic font-light">answered plainly</em>.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            How Qwikly works, what it costs, who it&rsquo;s for, and what to expect
            from day one. No marketing fluff.
          </p>
        </div>
      </section>

      {/* Full FAQ list */}
      <FAQ />

      {/* Final CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[18ch] mx-auto">
            Still have a question?{" "}
            <em className="italic font-light text-ember">Talk to us.</em>
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            We reply within one business day. Or start free and try Qwikly for yourself &mdash; no card required.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton size="lg" variant="solid" href="/signup">
              Start Free
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/contact" withArrow={false}>
              Contact us
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
