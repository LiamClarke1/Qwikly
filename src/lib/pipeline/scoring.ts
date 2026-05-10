/**
 * Prospect scoring.
 *
 * Production scoring rules, applied additively then clamped to 1-10:
 *   - ICP match exact, +3 (industry is in icp.industries AND a job title hits)
 *   - Has email, +2
 *   - Has phone, +1
 *   - Both email and phone verified, +2
 *   - Good reviews, +1 (>= 4.0 average, or >= 20 review count)
 *   - Site has hero text, +1 (site_recon.hero_text non-empty)
 *
 * Intent signal overlap with icp.intentSignals adds a tiebreaker bump within
 * the breakdown.business_signals dimension. The four-way breakdown surfaces
 * which lever produced the score so the UI can explain it.
 *
 * This mock is deterministic given the same prospect input. Replace with the
 * real production logic once contact verification is wired through.
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

// Cheap deterministic hash, keeps mock outputs stable across runs.
function hash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function scoreProspect(
  prospect: MockProspect,
  icp: Pick<
    GenerateProspectInput,
    "industries" | "jobTitles" | "intentSignals" | "locations"
  >
): ScoreResult {
  // ICP match dimension, 0 to 10.
  const industryMatch = icp.industries.includes(prospect.industry) ? 6 : 0;
  const titleMatch = icp.jobTitles.includes(prospect.title) ? 4 : 0;
  const icpMatch = clamp(industryMatch + titleMatch, 0, 10);

  // Contact completeness, 0 to 10. Has email +6, verified +4.
  const hasEmail = Boolean(prospect.email);
  const emailVerified = Boolean(prospect.email_verified);
  const contactCompleteness = clamp(
    (hasEmail ? 6 : 0) + (emailVerified ? 4 : 0),
    0,
    10
  );

  // Business signals, 0 to 10. Intent overlap weighted heavily.
  const intentOverlap = prospect.intent_signals.filter((s) =>
    icp.intentSignals.includes(s as (typeof icp.intentSignals)[number])
  ).length;
  const businessSignals = clamp(intentOverlap * 3 + 2, 0, 10);

  // Site quality, 0 to 10. Driven off site_recon if present, else hash jitter.
  const reconHero = prospect.site_recon?.hero_text?.length ?? 0;
  const reconTitle = prospect.site_recon?.title?.length ?? 0;
  const siteSeed = hash(`${prospect.full_name}|${prospect.company}|site`);
  const siteJitter = (siteSeed % 4); // 0 to 3
  const siteQuality = clamp(
    (reconHero > 40 ? 5 : reconHero > 0 ? 3 : 0) +
      (reconTitle > 10 ? 3 : 0) +
      siteJitter,
    0,
    10
  );

  // Combine to a 1 to 10 total. Weighted: ICP 40%, contact 25%, signals 20%, site 15%.
  const raw =
    icpMatch * 0.4 +
    contactCompleteness * 0.25 +
    businessSignals * 0.2 +
    siteQuality * 0.15;
  const total = clamp(Math.round(raw), 1, 10);

  return {
    total,
    breakdown: {
      icp_match: icpMatch,
      contact_completeness: contactCompleteness,
      business_signals: businessSignals,
      site_quality: siteQuality,
    },
  };
}
