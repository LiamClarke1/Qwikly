// Real pipeline orchestrator for the Qwikly lead engine.
//
// Flow:
//   1. Search Google Places for SA businesses matching the ICP.
//   2. Read each business website in parallel batches of 5.
//   3. Find the best email for the domain via Hunter.
//   4. Score every candidate, filter to total >= 7, sort, take top n.
//   5. Generate a personalised opener (Claude Haiku) for each survivor in
//      parallel batches of 10.
//
// Failure handling:
//   - If GOOGLE_PLACES_API_KEY is missing, fall back to the deterministic
//     mock generator so local development is unblocked.
//   - Per-prospect errors are isolated: a failed site read still yields a
//     candidate, just with a lower score.
//   - The orchestrator never throws. Anything unexpected is logged and the
//     run returns whatever survived.

import {
  GenerateProspectInput,
  MockProspect,
  SaIndustry,
  SiteRecon as GeneratorSiteRecon,
} from "./types";
import { scoreProspect } from "../scoring";
import { generateHook } from "../hook-generator";
import { searchBusinesses } from "../scraper/google-places";
import type { PlaceResult } from "../scraper/google-places.types";
import { readSite } from "../scraper/site-reader";
import type { SiteRecon as ScraperSiteRecon } from "../scraper/site-reader.types";
import { findEmailForDomain } from "../scraper/hunter";
import type { HunterEmailResult } from "../scraper/hunter.types";

const SCORE_FLOOR = 7;
const SITE_BATCH_SIZE = 5;
const HOOK_BATCH_SIZE = 10;
const OVERSAMPLE_FACTOR = 3;
const HARD_CAP = 100;
// TODO: replace with plan-based cap from tenant subscription. For now we
// hard-cap test runs at 5 prospects so we do not burn external API quota
// while the pipeline is still being shaken down.
const TEST_MODE_CAP = 5;

// --- helpers ------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function extractDomain(website: string | undefined): string | null {
  if (!website) return null;
  try {
    const withScheme = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const u = new URL(withScheme);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function extractCity(formattedAddress: string): string {
  // Google's formatted_address tends to be "Name, Suburb, City, Postal, Country".
  // The city is usually the second-to-last comma-separated segment after the
  // country and the postal code. We pick the longest non-numeric segment as
  // a robust-enough fallback.
  if (!formattedAddress) return "";
  const parts = formattedAddress.split(",").map((p) => p.trim()).filter(Boolean);
  // Drop the country (last) and any segment that is mostly digits (postal codes).
  const candidates = parts
    .slice(0, -1)
    .filter((p) => !/^\d[\d\s]*$/.test(p));
  if (candidates.length === 0) return parts[0] ?? "";
  return candidates[candidates.length - 1] ?? "";
}

function pickIndustryForPlace(
  place: PlaceResult,
  icpIndustries: SaIndustry[],
): SaIndustry {
  // Best effort: if any ICP industry token shows up in the place types, prefer
  // it. Otherwise return the first ICP industry as a label.
  const typesLower = place.types.map((t) => t.toLowerCase());
  for (const ind of icpIndustries) {
    const token = ind.toLowerCase().split(" ")[0];
    if (typesLower.some((t) => t.includes(token))) {
      return ind;
    }
  }
  return icpIndustries[0] ?? ("Professional Services" as SaIndustry);
}

function intentSignalsFromPlaceTypes(
  place: PlaceResult,
  icpIntents: string[],
): string[] {
  // The Places API does not give us hiring or funding signals, so we project
  // the ICP intents onto whichever ones plausibly survive a Place lookup.
  // Concretely, we only keep "Growing fast" when the business has lots of
  // reviews (a weak proxy for traction) and "Recently hired" never (we have
  // no source for it). This is intentionally conservative.
  const out: string[] = [];
  if (
    icpIntents.includes("Growing fast") &&
    (place.user_ratings_total ?? 0) >= 50
  ) {
    out.push("Growing fast");
  }
  return out;
}

function bridgeSiteRecon(
  recon: ScraperSiteRecon | null,
  fallbackUrl: string,
): GeneratorSiteRecon {
  // Map the scraper's nullable shape onto the generator's stricter shape that
  // the rest of the UI consumes. Empty strings where the scraper had nulls.
  return {
    title: recon?.title ?? "",
    h1: recon?.h1 ?? "",
    meta_description: recon?.meta_description ?? "",
    hero_text: recon?.hero_text ?? "",
    scraped_url: recon?.ok ? (recon.url || fallbackUrl) : "",
    last_scraped_at: recon?.last_scraped_at ?? new Date().toISOString(),
  };
}

function buildCandidate(args: {
  place: PlaceResult;
  recon: ScraperSiteRecon | null;
  hunter: HunterEmailResult | null;
  icpIndustries: SaIndustry[];
  icpIntents: string[];
}): MockProspect {
  const { place, recon, hunter, icpIndustries, icpIntents } = args;

  const firstName = hunter?.first_name ?? "";
  const lastName = hunter?.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const title = hunter?.position ?? "";
  const city = extractCity(place.formatted_address);
  const industry = pickIndustryForPlace(place, icpIndustries);
  const reconBridged = bridgeSiteRecon(recon, place.website ?? "");
  const intentSignals = intentSignalsFromPlaceTypes(place, icpIntents);

  // Rough employee estimate from review volume. Not authoritative, just gives
  // the scorer something to lean on. < 20 reviews -> 5, < 100 -> 20, else 50.
  const reviews = place.user_ratings_total ?? 0;
  const employeesEstimate = reviews >= 100 ? 50 : reviews >= 20 ? 20 : 5;

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || place.name,
    title,
    company: place.name,
    industry,
    employees: employeesEstimate,
    city,
    email: hunter?.email ?? "",
    email_verified: hunter?.verification_status === "valid",
    linkedin_url: "",
    intent_signals: intentSignals,
    enrichment_score: hunter?.confidence ?? 0,
    site_recon: reconBridged,
    score: 0,
    score_breakdown: {
      icp_match: 0,
      contact_completeness: 0,
      business_signals: 0,
      site_quality: 0,
    },
    unique_hook: "",
    phone: place.formatted_phone_number ?? null,
    website: place.website ?? null,
    rating: place.rating ?? null,
    reviews_count: place.user_ratings_total ?? null,
    business_status: place.business_status ?? null,
    place_types: place.types,
    email_verification_status: hunter?.verification_status ?? "unknown",
  };
}

// --- main entry ---------------------------------------------------------

// Run the full live pipeline: search, enrich, score, hook. Returns at most
// `effectiveQuantity` prospects, where `effectiveQuantity = min(input.quantity,
// TEST_MODE_CAP)`. The TEST_MODE_CAP is a temporary safety rail while we are
// still burning in the integration, see the constant declaration above.
export async function runGenerator(
  input: GenerateProspectInput,
): Promise<MockProspect[]> {
  const effectiveQuantity = Math.min(input.quantity, TEST_MODE_CAP);
  if (effectiveQuantity < input.quantity) {
    console.log(
      `[pipeline/runGenerator] capped quantity from ${input.quantity} to ${effectiveQuantity} (TEST_MODE_CAP)`,
    );
  }
  const cappedInput: GenerateProspectInput = {
    ...input,
    quantity: effectiveQuantity,
  };

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.warn(
      "[pipeline/runGenerator] GOOGLE_PLACES_API_KEY missing, falling back to deterministic mock generator",
    );
    return runMockGenerator(cappedInput);
  }

  const oversampleTarget = Math.min(cappedInput.quantity * OVERSAMPLE_FACTOR, HARD_CAP);

  let places: PlaceResult[] = [];
  try {
    places = await searchBusinesses({
      industries: input.industries,
      locations: input.locations,
      quantity: oversampleTarget,
    });
  } catch (err) {
    console.error("[pipeline/runGenerator] searchBusinesses threw, returning empty list", err);
    return [];
  }

  if (places.length === 0) {
    console.warn(
      "[pipeline/runGenerator] Places returned zero results, falling back to deterministic mock so the test flow is not blocked",
    );
    return runMockGenerator(cappedInput);
  }

  // Step 2 + 3: enrich each place in parallel batches.
  const candidates: MockProspect[] = [];
  for (const batch of chunk(places, SITE_BATCH_SIZE)) {
    const settled = await Promise.all(
      batch.map(async (place): Promise<MockProspect | null> => {
        try {
          const recon = place.website ? await readSite(place.website) : null;
          const domain = extractDomain(place.website);
          let hunter: HunterEmailResult | null = null;
          if (domain) {
            try {
              hunter = await findEmailForDomain(domain);
            } catch (err) {
              console.error(
                `[pipeline/runGenerator] hunter failed for ${domain}`,
                err,
              );
              hunter = null;
            }
          }
          return buildCandidate({
            place,
            recon,
            hunter,
            icpIndustries: input.industries as SaIndustry[],
            icpIntents: input.intentSignals,
          });
        } catch (err) {
          console.error(
            `[pipeline/runGenerator] candidate build failed for ${place.name}`,
            err,
          );
          return null;
        }
      }),
    );
    for (const c of settled) {
      if (c) candidates.push(c);
    }
  }

  // Step 4: score every candidate.
  for (const c of candidates) {
    const scored = scoreProspect(c, {
      industries: input.industries,
      jobTitles: input.jobTitles,
      intentSignals: input.intentSignals,
      locations: input.locations,
      companySize: input.companySize,
    });
    c.score = scored.total;
    c.score_breakdown = scored.breakdown;
  }

  // Step 5: filter, sort, truncate. Honour the effective (post-cap) quantity.
  const survivors = candidates
    .filter((p) => p.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, cappedInput.quantity);

  // Step 6: generate hooks in batches of 10.
  const offer = input.offer && input.offer.trim().length > 0
    ? input.offer
    : "a simple, plain-language way to catch the leads your business misses after hours";
  const dealValueZar = typeof input.dealValueZar === "number" ? input.dealValueZar : 20000;

  for (const batch of chunk(survivors, HOOK_BATCH_SIZE)) {
    await Promise.all(
      batch.map(async (p) => {
        try {
          const hook = await generateHook({
            prospect: {
              businessName: p.company,
              industry: p.industry,
              city: p.city,
              siteRecon: p.site_recon.scraped_url
                ? {
                    title: p.site_recon.title,
                    h1: p.site_recon.h1,
                    meta_description: p.site_recon.meta_description,
                    hero_text: p.site_recon.hero_text,
                    services_text: "",
                  }
                : null,
              firstName: p.first_name || undefined,
            },
            icp: {
              offer,
              painPoint: undefined,
              dealValueZar,
            },
          });
          p.unique_hook = hook;
        } catch (err) {
          console.error(
            `[pipeline/runGenerator] hook generation failed for ${p.company}`,
            err,
          );
          p.unique_hook = "";
        }
      }),
    );
  }

  return survivors;
}

// -----------------------------------------------------------------------
// Deterministic mock generator, kept around for local development when no
// Google Places API key is configured. The shape and behaviour match the
// previous implementation.
// -----------------------------------------------------------------------

const SA_FIRST_NAMES = [
  "Thandi",
  "Sipho",
  "Lerato",
  "Nomsa",
  "Themba",
  "Pieter",
  "Anika",
  "Johan",
  "Ayanda",
  "Kagiso",
  "Naledi",
  "Hendrik",
  "Zandile",
  "Karabo",
  "Riaan",
  "Mbali",
  "Sibusiso",
  "Megan",
  "Tumelo",
  "Carla",
];

const SA_LAST_NAMES = [
  "Naidoo",
  "Van der Merwe",
  "Dlamini",
  "Pretorius",
  "Khumalo",
  "Botha",
  "Mokoena",
  "Smit",
  "Nkosi",
  "Du Plessis",
];

const COMPANY_PREFIXES = [
  "Strand",
  "Karoo",
  "Atlantic",
  "Table Mountain",
  "Highveld",
  "Drakensberg",
  "Sandton",
  "Camps Bay",
  "Stellenbosch",
  "Constantia",
];

const COMPANY_SUFFIXES = [
  "Holdings",
  "Capital",
  "Logistics",
  "Group",
  "Partners",
  "Labs",
  "Industries",
  "Collective",
  "Ventures",
  "Solutions",
];

const EMAIL_DOMAINS = ["co.za", "com", "africa", "io"];

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "");
}

export function buildSeedFromInput(input: GenerateProspectInput): number {
  const stable = JSON.stringify(input, Object.keys(input).sort());
  return hashSeed(stable);
}

function pickCity(locations: string[], rnd: () => number): string {
  const expanded: string[] = [];
  for (const loc of locations) {
    if (loc === "Anywhere in SA") {
      expanded.push(
        "Cape Town",
        "Johannesburg",
        "Pretoria",
        "Durban",
        "Stellenbosch",
        "Port Elizabeth",
      );
    } else {
      expanded.push(loc);
    }
  }
  if (expanded.length === 0) return "Cape Town";
  return pick(expanded, rnd);
}

async function runMockGenerator(
  input: GenerateProspectInput,
): Promise<MockProspect[]> {
  const seed = buildSeedFromInput(input);
  const rnd = mulberry32(seed);

  const target = input.quantity;
  const out: MockProspect[] = [];

  for (let i = 0; i < target * OVERSAMPLE_FACTOR; i++) {
    const firstName = pick(SA_FIRST_NAMES, rnd);
    const lastName = pick(SA_LAST_NAMES, rnd);
    const prefix = pick(COMPANY_PREFIXES, rnd);
    const suffix = pick(COMPANY_SUFFIXES, rnd);
    const company = `${prefix} ${suffix}`;
    const industry = pick(input.industries, rnd) as SaIndustry;
    const city = pickCity(input.locations, rnd);
    const employees = Math.floor(
      rnd() * (input.companySize.max - input.companySize.min + 1) +
        input.companySize.min,
    );
    const tld = pick(EMAIL_DOMAINS, rnd);
    const domainBase = slugify(company);
    const email = `${slugify(firstName)}.${slugify(lastName)}@${domainBase}.${tld}`;
    const title = pick(input.jobTitles, rnd);

    const recon: GeneratorSiteRecon = {
      title: `${company}, ${industry} in South Africa`,
      h1: `Welcome to ${company}`,
      meta_description: `${company} is a ${industry.toLowerCase()} business serving South African customers.`,
      hero_text: `${company} serves businesses in ${city} with practical ${industry.toLowerCase()} support.`,
      scraped_url: `https://${domainBase}.${tld}`,
      last_scraped_at: new Date().toISOString(),
    };

    const partial: MockProspect = {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      title,
      company,
      industry,
      employees,
      city,
      email,
      email_verified: true,
      linkedin_url: `https://www.linkedin.com/in/${slugify(firstName)}-${slugify(lastName)}`,
      intent_signals: input.intentSignals.slice(0, 1),
      enrichment_score: 70 + Math.floor(rnd() * 30),
      site_recon: recon,
      score: 0,
      score_breakdown: {
        icp_match: 0,
        contact_completeness: 0,
        business_signals: 0,
        site_quality: 0,
      },
      unique_hook: "",
      phone: "+27 11 555 0100",
      website: recon.scraped_url,
      rating: 4 + rnd(),
      reviews_count: 20 + Math.floor(rnd() * 80),
      business_status: "OPERATIONAL",
      place_types: [],
      email_verification_status: "valid",
    };

    const scored = scoreProspect(partial, {
      industries: input.industries,
      jobTitles: input.jobTitles,
      intentSignals: input.intentSignals,
      locations: input.locations,
      companySize: input.companySize,
    });
    partial.score = scored.total;
    partial.score_breakdown = scored.breakdown;
    partial.unique_hook = `Hi there, came across ${company} while researching ${industry} firms in ${city}.`;

    out.push(partial);
  }

  return out
    .filter((p) => p.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, target);
}

// Deterministic estimator for the live preview. Pure function, no I/O.
// Kept here so the rest of the app does not break when this file is the
// canonical source of generator utilities.
export function estimateMatches(
  input: Pick<
    GenerateProspectInput,
    "industries" | "jobTitles" | "companySize" | "locations" | "intentSignals"
  >,
): number {
  const seed = hashSeed(JSON.stringify(input, Object.keys(input).sort()));
  const rnd = mulberry32(seed);
  const breadth =
    input.industries.length *
    input.jobTitles.length *
    Math.max(1, input.locations.length);
  const sizeWindow = Math.max(1, input.companySize.max - input.companySize.min);
  const intentPenalty = Math.max(1, 1 + input.intentSignals.length * 0.4);
  const base = breadth * (sizeWindow / 10) * 18;
  const jitter = 0.85 + rnd() * 0.3;
  const estimate = Math.round((base / intentPenalty) * jitter);
  return Math.max(50, estimate);
}
