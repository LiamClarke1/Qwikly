import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import { getAllNicheSlugs, getNiche, type Niche } from "@/lib/niches";
import { NicheRevenueCalc } from "@/components/niche/NicheRevenueCalc";

// Pre-render every niche at build time.
export function generateStaticParams() {
  return getAllNicheSlugs().map((slug) => ({ slug }));
}

const OG_IMAGE = "/og-image.png"; // exists in /public

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const niche = getNiche(params.slug);
  if (!niche) {
    return { title: "Niche not found, Qwikly" };
  }

  const title = `Qwikly for ${niche.label} in South Africa`;
  const description = `Qwikly is the digital assistant for ${niche.label} in South Africa. Capture every website enquiry, qualify it in seconds, and book it before your competitor replies.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: OG_IMAGE ? [{ url: OG_IMAGE }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: OG_IMAGE ? [OG_IMAGE] : [],
    },
  };
}

function jargonForIndex(niche: Niche, i: number): string {
  return niche.jargon[i % niche.jargon.length];
}

function isPlaceholder(value: string): boolean {
  return value === "TODO" || value === "" || value === undefined;
}

export default function NichePage({
  params,
}: {
  params: { slug: string };
}) {
  const niche = getNiche(params.slug);
  if (!niche) notFound();

  const t = niche.testimonialSlot;
  const testimonialIsPlaceholder =
    isPlaceholder(t.name) || isPlaceholder(t.quote);

  // Three steps for "How Qwikly handles this", flavoured per niche.
  const steps = [
    {
      title: `Visitor lands on your site at 9pm with a ${jargonForIndex(niche, 0)} problem`,
      body: `They are stressed, they want a real person, and they want a fast answer. Qwikly greets them in a friendly tone, asks the right questions, and works out exactly what they need.`,
    },
    {
      title: `Qwikly captures their name, number, and the issue`,
      body: `It qualifies the enquiry the way a good front desk would, picking up the suburb, the urgency, and any ${jargonForIndex(niche, 1)} or ${jargonForIndex(niche, 2)} detail you would normally have to ask about.`,
    },
    {
      title: `You get a WhatsApp ping in under 60 seconds with a one-tap reply`,
      body: `The lead lands on your phone with everything you need to quote or book. One tap, you are in. Quotes go out before the customer has a chance to message anyone else.`,
    },
  ];

  return (
    <div className="bg-paper">
      {/* HERO */}
      <section className="relative pt-36 pb-16 md:pt-44 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-ember" />
            <span className="eyebrow text-ember text-xs">For {niche.label}</span>
          </div>
          <h1 className="display-xl text-ink max-w-[22ch]">{niche.headline}</h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            Qwikly is a digital assistant that lives on your website. It picks up every enquiry, qualifies it, and hands it to you ready to quote, even when you are on a job.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <CTAButton size="lg" variant="primary" href="/get-started">
              Try Qwikly free for 7 days
            </CTAButton>
            <CTAButton size="lg" variant="outline" href="/pricing" withArrow={false}>
              See pricing
            </CTAButton>
          </div>
        </div>
      </section>

      {/* PAIN POINT TILES */}
      <section className="py-20 md:py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Sound familiar?</p>
            <h2 className="display-lg text-ink">
              The three things that cost{" "}
              <em className="italic font-light">{niche.label.toLowerCase()}</em> the most.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {niche.painPoints.map((pain, i) => {
              const term = jargonForIndex(niche, i);
              return (
                <div
                  key={i}
                  className="ed-card flex flex-col gap-4 min-h-[220px]"
                >
                  <p className="eyebrow text-ember">{term}</p>
                  <p className="font-display text-xl text-ink leading-snug">
                    {pain}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* REVENUE CALCULATOR */}
      <section className="py-20 md:py-28 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">
              {niche.label}, industry estimate
            </p>
            <h2 className="display-lg text-ink">
              How much is{" "}
              <em className="italic font-light">slow replies</em> costing you?
            </h2>
            <p className="mt-6 text-ink-700 leading-relaxed">
              The numbers below are the {niche.label} industry estimate. Drag the sliders to match your business. Every figure shown is an estimate, not your actual books.
            </p>
          </div>

          <NicheRevenueCalc
            nicheLabel={niche.label}
            defaultJobValue={niche.defaultJobValue}
            defaultEnquiriesPerMonth={niche.defaultEnquiriesPerMonth}
            defaultCloseRate={niche.defaultCloseRate}
          />
        </div>
      </section>

      {/* HOW QWIKLY HANDLES THIS */}
      <section className="py-20 md:py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">How Qwikly handles this</p>
            <h2 className="display-lg text-ink">
              From website visitor,{" "}
              <em className="italic font-light">to booked job</em>, in under a minute.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="ed-card flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-ember/15 text-ember flex items-center justify-center font-display text-lg">
                  {i + 1}
                </div>
                <h3 className="font-display text-xl text-ink leading-snug">
                  {step.title}
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-20 md:py-28 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">{niche.label} on Qwikly</p>
          </div>

          <div className="ed-card-ink max-w-3xl p-10 md:p-12">
            {testimonialIsPlaceholder && (
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/15 border border-ember/30">
                <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                <span className="eyebrow text-ember text-xs">
                  TODO, awaiting real {niche.label.toLowerCase()} testimonial
                </span>
              </div>
            )}

            <p className="font-display text-2xl md:text-3xl text-paper leading-snug">
              {isPlaceholder(t.quote)
                ? `TODO, real quote from a ${niche.label} owner using Qwikly`
                : `"${t.quote}"`}
            </p>

            <div className="rule-light mt-8 mb-8" />

            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-paper font-medium">
                  {isPlaceholder(t.name) ? "TODO, name" : t.name}
                </p>
                <p className="text-paper/60 text-sm">
                  {isPlaceholder(t.business) ? "TODO, business" : t.business}
                  {", "}
                  {isPlaceholder(t.town) ? "TODO, town" : t.town}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl text-ember leading-none">
                  {t.jobsBooked > 0 ? t.jobsBooked : "TODO"}
                </p>
                <p className="text-paper/60 text-xs mt-1">
                  jobs booked through Qwikly
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TILE */}
      <section className="py-20 md:py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="ed-card flex flex-col md:flex-row items-start md:items-center justify-between gap-8 p-10">
            <div className="max-w-xl">
              <p className="eyebrow text-ember mb-3">Pricing</p>
              <h3 className="font-display text-2xl md:text-3xl text-ink mb-3">
                Starter R699 covers up to 30 qualified leads per month.
              </h3>
              <p className="text-ink-700 leading-relaxed">
                That is more than enough for the average {niche.label}. No per-job fees, no commission, no lock-in. Flat ZAR pricing, cancel anytime.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/pricing"
                className="btn-ember px-6 py-3 text-[0.95rem]"
              >
                <span className="relative z-10">See full pricing</span>
                <svg
                  className="btn-arrow w-4 h-4 relative z-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-ink-700">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-ember" strokeWidth={2.5} />
              <span>POPIA compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-ember" strokeWidth={2.5} />
              <span>Hosted in South Africa</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-ember" strokeWidth={2.5} />
              <span>ZAR pricing, no commission</span>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[20ch] mx-auto">
            Try Qwikly{" "}
            <em className="italic font-light text-ember">free for 7 days.</em>
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Built for {niche.label} in South Africa. No card required, cancel anytime.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton
              size="lg"
              variant="solid"
              href="/get-started"
            >
              Try Qwikly free for 7 days
            </CTAButton>
            <CTAButton
              size="lg"
              variant="outline-light"
              href="/pricing"
              withArrow={false}
            >
              See pricing
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
