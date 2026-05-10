/**
 * Qwikly customer case studies.
 *
 * Each entry is rendered both on the index page and on its own
 * /case-studies/[slug] route. Fields that still read "TODO" render with a
 * "Pending publish" pill, and any case study with a TODO field is marked
 * noindex so it does not get crawled before it is real.
 *
 * To add a new case study: append an object below, keep the slug
 * URL-friendly (lowercase, dashes), and replace every TODO before launch.
 */

export const TODO_VALUE = "TODO";

export interface CaseStudyMetric {
  label: string;
  value: string;
}

export interface CaseStudyBeforeAfter {
  before: string;
  after: string;
}

export interface CaseStudyQuote {
  text: string;
  attributedTo: string;
}

export interface CaseStudy {
  slug: string;
  business: string;
  niche: string;
  town: string;
  summary: string;
  metrics: CaseStudyMetric[];
  beforeAfter: CaseStudyBeforeAfter;
  quote: CaseStudyQuote;
  publishedAt: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "acme-plumbing",
    business: "TODO",
    niche: "Plumbers",
    town: "TODO",
    summary: "TODO short pitch (1 sentence)",
    metrics: [
      { label: "Jobs booked in 30 days", value: "TODO" },
      { label: "Revenue invoiced", value: "TODO" },
      { label: "Plan", value: "Starter R699/mo" },
    ],
    beforeAfter: {
      before: "TODO",
      after: "TODO",
    },
    quote: {
      text: "TODO",
      attributedTo: "TODO",
    },
    publishedAt: "TODO YYYY-MM-DD",
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

export function getAllCaseStudySlugs(): string[] {
  return caseStudies.map((c) => c.slug);
}

/**
 * Returns true when any field on the case study still contains "TODO".
 * Used by the page to render a "Pending publish" pill and to set a
 * noindex meta tag so unfinished case studies don't leak to search.
 */
export function hasPendingFields(c: CaseStudy): boolean {
  const flat: string[] = [
    c.business,
    c.niche,
    c.town,
    c.summary,
    c.beforeAfter.before,
    c.beforeAfter.after,
    c.quote.text,
    c.quote.attributedTo,
    c.publishedAt,
    ...c.metrics.flatMap((m) => [m.label, m.value]),
  ];
  return flat.some((v) => typeof v === "string" && v.includes(TODO_VALUE));
}

/**
 * True when a single field is still a TODO placeholder. Helper for the
 * case-study renderer to wrap individual fields in a "Pending publish"
 * pill rather than shipping the literal string "TODO".
 */
export function isPendingField(value: string): boolean {
  return typeof value === "string" && value.includes(TODO_VALUE);
}
