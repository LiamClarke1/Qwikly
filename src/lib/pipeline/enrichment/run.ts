import "server-only";
import { readSite } from "@/lib/pipeline/scraper/site-reader";
import { lookupClientBusinessProfile } from "./google-places-profile";
import { synthesiseIcp } from "./anthropic-synthesis";
import type { ClientBusinessProfile } from "./google-places-profile";
import type { EnrichedIcp, EnrichmentInput } from "./types";

const SITE_FAIL_WARNING =
  "We couldn't read your website, the ICP is based on your offer and Google profile only.";
const GBP_FAIL_WARNING =
  "We couldn't find your Google Business Profile, the ICP is based on your website and offer only.";

/**
 * Orchestrates the three enrichment phases (site reader -> GBP lookup ->
 * Anthropic synthesis). Site reader and GBP failures are soft, synthesis
 * runs anyway and a warning is surfaced. Synthesis failure is hard, the
 * caller must surface a retry button.
 */
export async function runEnrichment(
  input: EnrichmentInput,
): Promise<EnrichedIcp> {
  const warnings: string[] = [];

  let siteCtx: { hero?: string; services?: string } = {};
  try {
    const site = await readSite(input.websiteUrl);
    if (!site || !site.ok) {
      warnings.push(SITE_FAIL_WARNING);
    } else {
      siteCtx = {
        hero: site.hero_text ?? undefined,
        services: site.services_text ?? undefined,
      };
    }
  } catch {
    warnings.push(SITE_FAIL_WARNING);
  }

  let profile: ClientBusinessProfile = {};
  try {
    profile = await lookupClientBusinessProfile({
      clientId: input.clientId,
      websiteUrl: input.websiteUrl,
      offer: input.offer,
    });
  } catch {
    warnings.push(GBP_FAIL_WARNING);
  }

  // Synthesis is a hard requirement. Let exceptions bubble to the caller.
  const synthesised = await synthesiseIcp({
    clientId: input.clientId,
    site: siteCtx,
    profile,
    offer: input.offer,
  });

  return {
    ...synthesised,
    warnings: [...warnings, ...synthesised.warnings],
  };
}
