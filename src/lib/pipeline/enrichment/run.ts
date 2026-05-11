import "server-only";
import { readSiteRich } from "@/lib/pipeline/scraper/site-reader-rich";
import { lookupClientBusinessProfile } from "./google-places-profile";
import { summariseInboundHistory } from "./inbound-history";
import { synthesiseIcp } from "./anthropic-synthesis";
import type { ClientBusinessProfile } from "./google-places-profile";
import type { InboundHistorySummary } from "./inbound-history";
import type { EnrichedIcp, EnrichmentInput } from "./types";

const SITE_FAIL_WARNING =
  "We couldn't read your website, the ICP is based on your offer and Google profile only.";
const GBP_FAIL_WARNING =
  "We couldn't find your Google Business Profile, the ICP is based on your website and offer only.";

/**
 * Orchestrates four enrichment phases in parallel:
 *   1. Multi-page site reader  (homepage + about + pricing + case-studies)
 *   2. Google Business Profile (client's own GBP for location/category)
 *   3. Inbound chat history    (job types + areas observed in real bookings,
 *                               empty for outbound-only tenants)
 *   4. Anthropic synthesis     (combines all of the above into a structured
 *                               ICP with per-field provenance)
 *
 * Steps 1-3 run in parallel; step 4 waits for all of them. Steps 1-3 are
 * soft-fail; step 4 is hard-fail and bubbles up so the caller can surface
 * a retry. Warnings collected across steps 1-3 are concatenated and
 * returned alongside the ICP.
 */
export async function runEnrichment(
  input: EnrichmentInput,
): Promise<EnrichedIcp> {
  const warnings: string[] = [];

  // Fan-out: site / GBP / history all hit different services and don't
  // depend on each other.
  const [siteResult, profileResult, historyResult] = await Promise.allSettled([
    readSiteRich(input.websiteUrl),
    lookupClientBusinessProfile({
      clientId: input.clientId,
      websiteUrl: input.websiteUrl,
      offer: input.offer,
    }),
    summariseInboundHistory(input.clientId),
  ]);

  // 1. Site reader (rich: homepage + about/pricing/case-studies).
  let siteCtx: {
    hero?: string;
    services?: string;
    about?: string;
    pricing?: string;
    caseStudies?: string;
  } = {};
  if (siteResult.status === "fulfilled") {
    const rich = siteResult.value;
    if (rich.homepage.ok) {
      siteCtx = {
        hero: rich.homepage.hero_text ?? undefined,
        services: rich.homepage.services_text ?? undefined,
        about: rich.aboutText,
        pricing: rich.pricingText,
        caseStudies: rich.caseStudiesText,
      };
    } else {
      warnings.push(SITE_FAIL_WARNING);
    }
  } else {
    warnings.push(SITE_FAIL_WARNING);
  }

  // 2. Google Business Profile.
  const profile: ClientBusinessProfile =
    profileResult.status === "fulfilled" ? profileResult.value : {};
  if (profileResult.status === "rejected") {
    warnings.push(GBP_FAIL_WARNING);
  }

  // 3. Inbound history. Soft-fails to an empty summary which the synthesis
  // prompt simply skips — no warning surfaced because plenty of legitimate
  // outbound-only tenants will never have any inbound data, that's not an
  // error state.
  const history: InboundHistorySummary | null =
    historyResult.status === "fulfilled" ? historyResult.value : null;

  // 4. Synthesis is a hard requirement. Let exceptions bubble to the caller.
  const synthesised = await synthesiseIcp({
    clientId: input.clientId,
    site: siteCtx,
    profile,
    offer: input.offer,
    history,
  });

  return {
    ...synthesised,
    warnings: [...warnings, ...synthesised.warnings],
  };
}
