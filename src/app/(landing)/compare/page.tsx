import type { Metadata } from "next";
import { Calculator, ArrowRight } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import CompareTable from "@/components/compare/CompareTable";

export const metadata: Metadata = {
  title: "Qwikly vs chat widgets, vs receptionists, vs Fiverr",
  description:
    "Qwikly is not a chat widget, it is a lead engine. See how Qwikly compares to Tidio, Intercom, Fiverr builds, and a part-time receptionist on price, response time, booking, POPIA, and ZAR billing.",
  alternates: { canonical: "https://www.qwikly.co.za/compare" },
  openGraph: {
    title: "Qwikly vs chat widgets, vs receptionists, vs Fiverr",
    description:
      "Most tools capture chats. Qwikly books paying jobs. Compare like for like on price, response, booking, and ZAR billing.",
    url: "https://www.qwikly.co.za/compare",
  },
};

const honestPicks: { title: string; body: string }[] = [
  {
    title: "Pure international SaaS team with global support",
    body: "Intercom is built for that. If your audience is global, billing is in USD, and you have a full support org behind it, use Intercom.",
  },
  {
    title: "One-off chatbot for a single landing page",
    body: "Fiverr is fine. If you need a static FAQ widget for a single page, a freelancer build will do the job for a couple of hundred rand.",
  },
  {
    title: "A real receptionist for in-person reception",
    body: "Hire a person. Qwikly handles website enquiries, not the front desk. If you need someone greeting walk-ins, take coats, and pour coffee, that is a job for a human.",
  },
];

const categoryPoints: string[] = [
  "Chat widgets are priced like utilities, R5 a lead. That is fine if you have unlimited time to chase those leads. Most owners do not.",
  "A lead engine is priced like a sales channel, in the cost of the work it replaces. Replacing a part-time receptionist saves R5k+ a month and never sleeps.",
  "Qwikly stacks the engine and the response in one product. Other tools make you stitch them together yourself.",
];

export default function ComparePage() {
  return (
    <div className="bg-paper">

      {/* HEADER */}
      <section className="relative pt-36 pb-16 md:pt-44 md:pb-20 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">How Qwikly compares</p>
          <h1 className="display-xl text-ink max-w-[22ch]">
            Qwikly is not a chat widget.{" "}
            <em className="italic font-light">It is a lead engine.</em>
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-2xl leading-relaxed">
            Most tools capture chats. Qwikly books paying jobs. Here is what changes when you compare like for like.
          </p>
        </div>
      </section>

      {/* PRIMARY COMPARISON TABLE */}
      <section className="pb-24 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow text-ember mb-4">Side by side</p>
            <h2 className="display-lg text-ink">
              The full
              <br />
              <em className="italic font-light">comparison</em>.
            </h2>
            <p className="mt-4 text-ink-700 text-base leading-relaxed">
              ZAR pricing where known. Competitor prices marked as industry estimate are public list prices
              or typical SA market rates and may vary.
            </p>
          </div>

          <CompareTable />
        </div>
      </section>

      {/* WHY THE CATEGORY MATTERS */}
      <section className="py-28 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Why the category matters</p>
            <h2 className="display-lg text-ink">
              Chat widgets and lead engines
              <br />
              <em className="italic font-light">are priced differently for a reason.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categoryPoints.map((point, i) => (
              <div key={i} className="ed-card-ghost">
                <p className="eyebrow text-ember mb-4">0{i + 1}</p>
                <p className="text-ink-700 text-base leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHEN TO PICK SOMETHING ELSE */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">When to pick something else</p>
            <h2 className="display-lg text-ink">
              We are not for everyone,
              <br />
              <em className="italic font-light">and that is fine.</em>
            </h2>
            <p className="mt-6 text-ink-700 text-base leading-relaxed max-w-xl">
              Rare but real cases where another tool, or a real person, is the better call.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            {honestPicks.map(({ title, body }) => (
              <div key={title} className="ed-card flex flex-col">
                <h3 className="font-display text-xl text-ink leading-snug mb-3">{title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATOR LINK */}
      <section className="pb-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="rounded-2xl border border-ember/25 bg-ember/[0.06] p-8 md:p-10 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
              <span className="w-12 h-12 rounded-xl bg-ember/15 flex items-center justify-center flex-shrink-0">
                <Calculator className="w-6 h-6 text-ember" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="flex-1">
                <p className="eyebrow text-ember mb-2">Run the numbers</p>
                <h3 className="font-display text-2xl text-ink leading-snug mb-3">
                  Run the numbers for your own business.
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">
                  See how much you are losing every month to missed enquiries.
                </p>
              </div>
              <a
                href="/pricing#calculator"
                className="inline-flex items-center gap-2 text-ember font-medium text-sm hover:gap-3 transition-all flex-shrink-0"
              >
                Open the calculator
                <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[20ch] mx-auto">
            Try Qwikly{" "}
            <em className="italic font-light text-ember">free for 7 days</em>.
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Live on your website in 24 hours. No card required.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton size="lg" variant="solid" href="/get-started">
              Try Qwikly free for 7 days
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/pricing" withArrow={false}>
              See pricing
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
