// Multi-page site reader for the wizard's ICP enrichment. The existing
// site-reader.ts grabs the homepage only — fine for the prospect-side recon
// (used during outreach copy generation) but thin for the client-side ICP
// build, where their pricing and case-study pages carry the strongest
// signals about deal value, ideal customer, and proof points.
//
// This helper fetches the homepage plus a small set of common slugs in
// parallel, extracts visible body text from each, and returns the union as
// a single rich context block fed to the Anthropic synthesis prompt.
//
// All fetches are best-effort: any slug that 404s or times out is silently
// dropped. The homepage's existing SiteRecon shape is preserved on the
// `homepage` field so callers that still want the title/h1/meta can read it.

import { readSite } from "./site-reader";
import type { SiteRecon } from "./site-reader.types";

const CANDIDATE_SLUGS = [
  // About-style pages — company story, founding, team, mission
  "/about",
  "/about-us",
  "/our-story",
  // Pricing pages — anchor real deal-value estimates
  "/pricing",
  "/prices",
  "/rates",
  // Proof pages — who their actual customers look like
  "/case-studies",
  "/portfolio",
  "/work",
  "/clients",
  "/customers",
] as const;

// Per-page fetch timeout. Total wall time for the parallel batch is bounded
// by the slowest fetch.
const PAGE_TIMEOUT_MS = 8_000;

// Per-page text cap (characters). Trims navigation/footer noise + keeps the
// Anthropic prompt input modest. ~1k chars ≈ 250 tokens per page.
const PER_PAGE_TEXT_CHARS = 1200;

// Total cap across all extra pages combined (excludes homepage's own fields).
const TOTAL_EXTRA_CHARS = 3500;

export interface RichSiteContext {
  /** The classic single-page recon for the homepage. */
  homepage: SiteRecon;
  /** About / who-we-are page text, if found. */
  aboutText?: string;
  /** Pricing / rates page text, if found. */
  pricingText?: string;
  /** Case-studies / portfolio / customer-list page text, if found. */
  caseStudiesText?: string;
  /** Which slugs were successfully fetched (for provenance + debugging). */
  slugsRead: string[];
}

function stripHtmlToText(html: string): string {
  // Remove script/style blocks then strip tags. We don't need a DOM parser
  // for this — the synthesis prompt just consumes prose.
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const noTags = noScripts.replace(/<[^>]+>/g, " ");
  // Collapse whitespace.
  return noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function bucketForSlug(slug: string): "about" | "pricing" | "case_studies" | null {
  if (/^\/(about|about-us|our-story)$/.test(slug)) return "about";
  if (/^\/(pricing|prices|rates)$/.test(slug)) return "pricing";
  if (/^\/(case-studies|portfolio|work|clients|customers)$/.test(slug)) {
    return "case_studies";
  }
  return null;
}

async function fetchSlugText(baseUrl: URL, slug: string): Promise<string | null> {
  const url = new URL(slug, baseUrl).toString();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; QwiklyPipeline/1.0; +https://www.qwikly.co.za)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
    const html = await res.text();
    const text = stripHtmlToText(html);
    if (text.length < 50) return null; // empty or near-empty page
    return text.slice(0, PER_PAGE_TEXT_CHARS);
  } catch {
    return null;
  }
}

/**
 * Fetch the homepage plus up to ~10 common slugs in parallel and bundle the
 * results into a single rich context block. Soft-fails on every per-page
 * error; if the homepage itself fails, the homepage field still reflects
 * that failure and the extras may be empty.
 */
export async function readSiteRich(websiteUrl: string): Promise<RichSiteContext> {
  const homepage = await readSite(websiteUrl);

  // If homepage didn't resolve to a usable URL, don't try sub-paths — we
  // have no base to resolve relative slugs against.
  let baseUrl: URL | null = null;
  try {
    baseUrl = new URL(homepage.url || websiteUrl);
  } catch {
    baseUrl = null;
  }
  if (!baseUrl) {
    return { homepage, slugsRead: [] };
  }

  // Parallel fan-out.
  const fetched = await Promise.all(
    CANDIDATE_SLUGS.map(async (slug) => ({
      slug,
      text: await fetchSlugText(baseUrl!, slug),
    })),
  );

  // Group by bucket, pick the first non-empty hit per bucket (first slug in
  // CANDIDATE_SLUGS wins — order matters here for tie-breaking).
  const buckets: {
    about?: string;
    pricing?: string;
    case_studies?: string;
  } = {};
  const slugsRead: string[] = [];
  for (const { slug, text } of fetched) {
    if (!text) continue;
    const bucket = bucketForSlug(slug);
    if (!bucket) continue;
    if (buckets[bucket]) continue; // already filled
    buckets[bucket] = text;
    slugsRead.push(slug);
  }

  // Enforce total extras cap by trimming buckets if combined length exceeds it.
  // We trim case_studies first (most generic), then pricing, then about.
  let total =
    (buckets.about?.length ?? 0) +
    (buckets.pricing?.length ?? 0) +
    (buckets.case_studies?.length ?? 0);
  if (total > TOTAL_EXTRA_CHARS) {
    const overflow = total - TOTAL_EXTRA_CHARS;
    if (buckets.case_studies) {
      const cut = Math.min(buckets.case_studies.length, overflow);
      buckets.case_studies = buckets.case_studies.slice(0, buckets.case_studies.length - cut);
      total -= cut;
    }
  }
  if (total > TOTAL_EXTRA_CHARS && buckets.pricing) {
    const overflow = total - TOTAL_EXTRA_CHARS;
    const cut = Math.min(buckets.pricing.length, overflow);
    buckets.pricing = buckets.pricing.slice(0, buckets.pricing.length - cut);
  }

  return {
    homepage,
    aboutText: buckets.about,
    pricingText: buckets.pricing,
    caseStudiesText: buckets.case_studies,
    slugsRead,
  };
}
