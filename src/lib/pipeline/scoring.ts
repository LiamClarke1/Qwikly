/**
 * Prospect scoring for the Qwikly Pipeline lead engine.
 *
 * Real rules. Each of the four components is computed on a 0 to 10 scale,
 * then combined into a 1 to 10 total using these weights:
 *
 *   - icp_match              40 percent
 *   - contact_completeness   25 percent
 *   - business_signals       20 percent
 *   - site_quality           15 percent
 *
 * The breakdown is returned so the UI can explain a score in plain English.
 */

import type { GenerateProspectInput, MockProspect } from "./generator/types";

export interface ScoreBreakdown {
  icp_match: number;
  contact_completeness: number;
  business_signals: number;
  site_quality: number;
}

export interface ScoreResult {
  total: number; // 1 to 10 inclusive
  breakdown: ScoreBreakdown;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Loose industry comparison. Treats two strings as a match when either
 * contains the other after normalisation. Catches cases like
 * "Marketing" vs "Marketing Agency" or "Healthcare" vs "Healthcare clinic".
 */
function industryMatches(prospectIndustry: string, icpIndustry: string): boolean {
  const a = norm(prospectIndustry);
  const b = norm(icpIndustry);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

function locationMatches(prospectCity: string, icpLocations: string[]): boolean {
  const a = norm(prospectCity);
  if (!a) return false;
  for (const loc of icpLocations) {
    if (loc === "Anywhere in SA") return true;
    const b = norm(loc);
    if (!b) continue;
    if (a === b || a.includes(b) || b.includes(a)) return true;
  }
  return false;
}

export function scoreProspect(
  prospect: MockProspect,
  icp: Pick<
    GenerateProspectInput,
    "industries" | "jobTitles" | "intentSignals" | "locations"
  > & {
    companySize?: { min: number; max: number };
  },
): ScoreResult {
  // ICP match dimension, 0 to 10.
  //   +4 industry match (exact or fuzzy)
  //   +2 location match
  //   +2 employees within icp.sizeMin..sizeMax
  //   +1 per intent signal that matches
  let icpMatch = 0;
  const hasIndustryHit = icp.industries.some((i) =>
    industryMatches(prospect.industry, i),
  );
  if (hasIndustryHit) icpMatch += 4;

  if (locationMatches(prospect.city, icp.locations)) icpMatch += 2;

  if (icp.companySize && typeof prospect.employees === "number") {
    if (
      prospect.employees >= icp.companySize.min &&
      prospect.employees <= icp.companySize.max
    ) {
      icpMatch += 2;
    }
  }

  const intentHits = prospect.intent_signals.filter((s) =>
    icp.intentSignals.includes(s as (typeof icp.intentSignals)[number]),
  ).length;
  icpMatch += intentHits;
  icpMatch = clamp(icpMatch, 0, 10);

  // Contact completeness, 0 to 10.
  //   +4 email present
  //   +3 email verified ("valid")
  //   +2 phone present
  //   +1 linkedin_url present
  let contact = 0;
  const hasEmail = Boolean(prospect.email && prospect.email.trim().length > 0);
  if (hasEmail) contact += 4;
  if (hasEmail && prospect.email_verification_status === "valid") contact += 3;
  if (prospect.phone && prospect.phone.trim().length > 0) contact += 2;
  if (prospect.linkedin_url && prospect.linkedin_url.trim().length > 0) {
    contact += 1;
  }
  const contactCompleteness = clamp(contact, 0, 10);

  // Business signals, 0 to 10.
  //   +1 per star of rating (rating * 1.5, cap 7.5)
  //   +1.5 if reviews_count >= 20
  //   +1 if business_status === "OPERATIONAL"
  let business = 0;
  if (typeof prospect.rating === "number" && prospect.rating > 0) {
    business += Math.min(7.5, prospect.rating * 1.5);
  }
  if (typeof prospect.reviews_count === "number" && prospect.reviews_count >= 20) {
    business += 1.5;
  }
  if (prospect.business_status === "OPERATIONAL") {
    business += 1;
  }
  const businessSignals = clamp(business, 0, 10);

  // Site quality, 0 to 10.
  //   +3 site_recon.ok (signalled by a real scraped URL)
  //   +2 hero_text present and >= 50 chars
  //   +2 h1 present
  //   +2 meta_description present
  //   +1 services_text present (carried via title for backwards compat)
  let site = 0;
  const recon = prospect.site_recon;
  const reconOk = Boolean(
    recon &&
      typeof recon.scraped_url === "string" &&
      recon.scraped_url.trim().length > 0,
  );
  if (reconOk) site += 3;
  if (recon?.hero_text && recon.hero_text.trim().length >= 50) site += 2;
  if (recon?.h1 && recon.h1.trim().length > 0) site += 2;
  if (recon?.meta_description && recon.meta_description.trim().length > 0) {
    site += 2;
  }
  if (recon?.title && recon.title.trim().length > 0) site += 1;
  const siteQuality = clamp(site, 0, 10);

  // Weighted total. Round to nearest integer, clamp to 1..10.
  const raw =
    icpMatch * 0.4 +
    contactCompleteness * 0.25 +
    businessSignals * 0.2 +
    siteQuality * 0.15;
  const total = clamp(Math.round(raw), 1, 10);

  return {
    total,
    breakdown: {
      icp_match: Math.round(icpMatch),
      contact_completeness: Math.round(contactCompleteness),
      business_signals: Math.round(businessSignals),
      site_quality: Math.round(siteQuality),
    },
  };
}
