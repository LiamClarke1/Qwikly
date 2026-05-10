import type { Metadata } from "next";
import { caseStudies, hasPendingFields } from "@/lib/case-studies";
import { CaseStudyCard } from "@/components/case-studies/CaseStudyCard";

/**
 * /case-studies index. Lists every published case study as a card. If
 * every entry is still TODO placeholders, we render an empty state and
 * mark the page noindex so search engines don't crawl pilot drafts.
 */

const allPending = caseStudies.every(hasPendingFields);

export const metadata: Metadata = {
  title: allPending
    ? "Case studies, coming soon, Qwikly"
    : "Case studies, Qwikly",
  description:
    "Real South African businesses growing with Qwikly's digital assistant. Jobs booked, revenue captured, plain numbers.",
  robots: allPending ? { index: false, follow: false } : undefined,
};

export default function CaseStudiesIndexPage() {
  const isEmpty = caseStudies.length === 0 || allPending;

  return (
    <div className="bg-paper">
      {/* ─── HERO ─── */}
      <section className="relative pt-36 pb-16 md:pt-44 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Case studies</p>
          <h1 className="display-xl text-ink max-w-[20ch]">
            Real businesses,{" "}
            <em className="italic font-light">real numbers</em>.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            How South African operators are using Qwikly to capture leads
            after hours, on weekends, and the moment a visitor lands on
            their website.
          </p>
        </div>
      </section>

      {/* ─── LIST ─── */}
      <section className="relative pb-28 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          {isEmpty ? (
            <div className="ed-card-ghost max-w-2xl mx-auto text-center py-16">
              <p className="eyebrow text-ink-500 mb-5">Empty for now</p>
              <h2 className="font-display text-2xl text-ink mb-4">
                Pilot case studies coming soon. Reach out if you want to be the first.
              </h2>
              <p className="text-ink-700 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                We are working with our first wave of pilot customers right now.
                Want to share your numbers, get a featured slot, and a discount on
                your plan? Get in touch.
              </p>
              <a
                href="/contact?subject=case-study"
                className="btn-ember btn-ember-solid px-6 py-3 text-[0.95rem] inline-flex"
              >
                <span className="relative z-10">Be the first case study</span>
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
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {caseStudies.map((study) => (
                <CaseStudyCard key={study.slug} study={study} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
