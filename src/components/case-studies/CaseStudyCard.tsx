import Link from "next/link";
import { CaseStudy, hasPendingFields, isPendingField } from "@/lib/case-studies";
import { PendingPill } from "./PendingPill";

/**
 * Card used on the /case-studies index page. Keeps the visual language
 * of the rest of the site (ed-card-ghost, eyebrow caps in JetBrains
 * Mono, Fraunces serif for the headline) and surfaces a "Pending
 * publish" pill if any field is still a TODO.
 */
export function CaseStudyCard({ study }: { study: CaseStudy }) {
  const pending = hasPendingFields(study);
  const business = isPendingField(study.business) ? "Coming soon" : study.business;
  const town = isPendingField(study.town) ? "" : study.town;
  const summary = isPendingField(study.summary)
    ? "Full case study landing soon, check back shortly."
    : study.summary;

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="block ed-card-ghost focus:outline-none focus:ring-2 focus:ring-ember/40 rounded-[20px]"
    >
      <p className="eyebrow text-ink-500 mb-4">
        {study.niche}
        {town && (
          <>
            <span className="mx-2 text-ink-300">/</span>
            <span>{town}</span>
          </>
        )}
      </p>

      <h3 className="font-display text-2xl text-ink leading-snug mb-3">
        {business}
        {pending && <PendingPill />}
      </h3>

      <p className="text-ink-700 text-sm leading-relaxed mb-6">{summary}</p>

      <span className="eyebrow text-ember inline-flex items-center gap-2">
        Read the case study
        <svg
          className="w-3.5 h-3.5"
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
      </span>
    </Link>
  );
}
