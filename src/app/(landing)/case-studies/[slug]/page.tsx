import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  caseStudies,
  getCaseStudy,
  getAllCaseStudySlugs,
  hasPendingFields,
  isPendingField,
} from "@/lib/case-studies";
import { FieldOrPending, PendingPill } from "@/components/case-studies/PendingPill";

interface SlugProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: SlugProps): Metadata {
  const study = getCaseStudy(params.slug);
  if (!study) {
    return { title: "Case study not found, Qwikly" };
  }
  const pending = hasPendingFields(study);
  const business = isPendingField(study.business) ? "Pilot customer" : study.business;
  const niche = isPendingField(study.niche) ? "Local business" : study.niche;
  const summary = isPendingField(study.summary)
    ? `How ${niche.toLowerCase()} are using Qwikly to capture more leads.`
    : study.summary;

  return {
    title: `${business}, ${niche}, Qwikly case study`,
    description: summary,
    robots: pending ? { index: false, follow: false } : undefined,
  };
}

export default function CaseStudyPage({ params }: SlugProps) {
  const study = getCaseStudy(params.slug);
  if (!study) notFound();

  const pending = hasPendingFields(study);

  return (
    <div className="bg-paper">
      {/* ─── HERO ─── */}
      <section className="relative pt-36 pb-20 md:pt-44 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">
            <Link href="/case-studies" className="hover:text-ember transition-colors">
              Case studies
            </Link>
            <span className="mx-2 text-ink-300">/</span>
            <FieldOrPending value={study.niche} fallback="Niche" />
            {!isPendingField(study.town) && (
              <>
                <span className="mx-2 text-ink-300">/</span>
                <span>{study.town}</span>
              </>
            )}
          </p>

          <h1 className="display-xl text-ink max-w-[22ch]">
            <FieldOrPending value={study.business} fallback="Pilot customer" />
          </h1>

          <p className="mt-8 text-lg text-ink-700 max-w-2xl leading-relaxed">
            <FieldOrPending
              value={study.summary}
              fallback="Summary lands when this case study goes live."
            />
          </p>

          {pending && (
            <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-ink/[0.04] border border-ink/10">
              <span className="w-2 h-2 rounded-full bg-ink-400" />
              <span className="eyebrow text-ink-500">
                Draft, pending publish, hidden from search
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ─── METRICS ─── */}
      <section className="py-16 bg-paper-deep grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-8">The numbers</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {study.metrics.map((m) => (
              <div key={m.label} className="ed-card text-center py-10">
                <p
                  className="font-mono num text-ink leading-none mb-5"
                  style={{ fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)", letterSpacing: "-0.02em" }}
                >
                  <FieldOrPending value={m.value} fallback="—" />
                </p>
                <p className="eyebrow text-ink-500">
                  <FieldOrPending value={m.label} fallback="Metric" />
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-ink-400 italic max-w-prose">
            Revenue figures are an industry estimate based on the customer&apos;s
            stated average job value. Plan and lead counts are taken directly
            from the Qwikly dashboard.
          </p>
        </div>
      </section>

      {/* ─── BEFORE / AFTER ─── */}
      <section className="py-20 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Before, and after</p>
          <h2 className="display-lg text-ink max-w-[20ch] mb-12">
            What changed when Qwikly went live.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="ed-card-ghost">
              <p className="eyebrow text-ink-500 mb-5">Before</p>
              <p className="text-ink-700 text-base leading-relaxed">
                <FieldOrPending
                  value={study.beforeAfter.before}
                  fallback="Before snapshot lands when this case study goes live."
                />
              </p>
            </div>
            <div className="ed-card-ink">
              <p className="eyebrow text-ember mb-5">After</p>
              <p className="text-paper/85 text-base leading-relaxed">
                <FieldOrPending
                  value={study.beforeAfter.after}
                  fallback="After snapshot lands when this case study goes live."
                />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── QUOTE ─── */}
      <section className="py-20 bg-paper-deep grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <figure className="max-w-3xl">
            <p className="eyebrow text-ink-500 mb-6">In their own words</p>
            <blockquote className="font-display text-2xl md:text-3xl text-ink leading-snug">
              <span className="text-ember mr-1">&ldquo;</span>
              <FieldOrPending
                value={study.quote.text}
                fallback="Quote pending review with the customer."
              />
              <span className="text-ember ml-1">&rdquo;</span>
            </blockquote>
            <figcaption className="mt-6 eyebrow text-ink-500">
              <FieldOrPending value={study.quote.attributedTo} fallback="Customer" />
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─── HOW THEY DID IT ─── */}
      <section className="py-20 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">How they did it</p>
          <h2 className="display-lg text-ink max-w-[20ch] mb-12">
            Three steps, no developer required.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Connect the website",
                body: "A single copy-paste of the Qwikly snippet into the website. Live in under five minutes, no plugins, no rebuild.",
              },
              {
                step: "02",
                title: "Tune the digital assistant",
                body: "Qwikly reads the website and adapts to the business. The owner reviewed the greeting and qualifying questions, and turned it on.",
              },
              {
                step: "03",
                title: "Answer the leads",
                body: "Qualified leads land in the inbox with name, contact details, and intent. The team replies, books the job, and gets back to work.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="ed-card">
                <p className="font-mono text-ember text-sm mb-4">{step}</p>
                <h3 className="font-display text-xl text-ink mb-3">{title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative py-24 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[20ch] mx-auto">
            Want numbers like these for{" "}
            <em className="italic font-light text-ember">your business</em>?
          </h2>
          <p className="text-paper/70 text-base mt-6 max-w-xl mx-auto leading-relaxed">
            Flat ZAR pricing. No per-job fees. Cancel anytime.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="btn-ember btn-ember-solid px-8 py-[1.05rem] text-[1rem]"
            >
              <span className="relative z-10">See pricing</span>
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
          {pending && (
            <div className="mt-10 flex justify-center">
              <span className="inline-flex">
                <PendingPill />
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Hidden but indexed-by-helpers list of related studies for future */}
      <noscript>
        <ul>
          {caseStudies.map((c) => (
            <li key={c.slug}>
              <Link href={`/case-studies/${c.slug}`}>{c.business}</Link>
            </li>
          ))}
        </ul>
      </noscript>
    </div>
  );
}
