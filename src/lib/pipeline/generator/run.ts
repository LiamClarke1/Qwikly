// TODO: replace with real Apollo + Hunter integration. Spec in docs/pipeline-platform.md.

import {
  GenerateProspectInput,
  MockProspect,
  SaIndustry,
  SiteRecon,
} from "./types";
import { scoreProspect } from "../scoring";
import { generateHook } from "../hook-generator";

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
  "Mahlangu",
  "Coetzee",
  "Maluleke",
  "Joubert",
  "Zulu",
  "Steyn",
  "Ndlovu",
  "Visser",
  "Modise",
  "Greyling",
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
  "Bushveld",
  "Cape Point",
  "Garden Route",
  "Knysna",
  "Wilderness",
  "Tygerberg",
  "Rooibos",
  "Protea",
  "Boulders",
  "Vaal",
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
  "Studio",
  "Works",
  "Co",
  "& Sons",
  "Trading",
];

const EMAIL_DOMAINS = [
  "co.za",
  "com",
  "africa",
  "io",
];

// Cheap deterministic hash, plenty for seeding a mock RNG. Not for crypto.
function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Mulberry32, deterministic and fast.
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

function pickSubset<T>(arr: readonly T[], rnd: () => number): T[] {
  if (arr.length === 0) return [];
  const out: T[] = [];
  for (const item of arr) {
    if (rnd() > 0.5) out.push(item);
  }
  // Always return at least one if the source had items.
  if (out.length === 0) out.push(pick(arr, rnd));
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "");
}

function makeCompany(rnd: () => number): string {
  const prefix = pick(COMPANY_PREFIXES, rnd);
  const suffix = pick(COMPANY_SUFFIXES, rnd);
  return `${prefix} ${suffix}`;
}

function makeEmployees(
  rnd: () => number,
  min: number,
  max: number,
): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(rnd() * (hi - lo + 1)) + lo;
}

function pickCity(
  locations: string[],
  rnd: () => number,
): string {
  // "Anywhere in SA" expands to a default pool when chosen.
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
  return pick(expanded, rnd);
}

export function buildSeedFromInput(input: GenerateProspectInput): number {
  // Stable JSON, sort keys so order does not change the seed.
  const stable = JSON.stringify(input, Object.keys(input).sort());
  return hashSeed(stable);
}

// Mock site recon, gives the scoring function and downstream UI realistic
// fields to work with. Production wiring will scrape live URLs.
const HERO_FRAGMENTS: Record<string, string[]> = {
  Construction: [
    "Building South Africa, one project at a time. Tender ready, BBBEE level 2.",
    "Civil and structural specialists working across Gauteng. 20 plus years on site.",
  ],
  Healthcare: [
    "Compassionate care for the whole family. Book online or call our reception.",
    "Modern clinic with same week appointments. Medical aids welcome.",
  ],
  Education: [
    "Independent school with a track record of distinction passes. Open days monthly.",
    "Online and in-class learning paths for working professionals.",
  ],
  "Financial Services": [
    "Independent advice for South African business owners. Wealth, tax, succession.",
    "Boutique brokerage with personal service. Risk, retirement, investments.",
  ],
  Marketing: [
    "Creative studio for ambitious SA brands. Strategy, content, paid media.",
    "Performance marketing for retailers. Real revenue, not vanity metrics.",
  ],
  Manufacturing: [
    "Engineered products for industry, made in South Africa. ISO certified.",
    "Custom fabrication with fast turnaround. Local sales, national delivery.",
  ],
  Retail: [
    "Independent retailer, locally loved. New collections every season.",
    "Curated homeware for South African homes. Cape Town and online.",
  ],
  Hospitality: [
    "Award winning hospitality in the heart of the Cape. Stay, eat, gather.",
    "Boutique guesthouse with a strong returning guest base.",
  ],
  "Professional Services": [
    "Trusted advisors for SA businesses. Corporate, commercial, compliance.",
    "Specialist practice serving owner managed businesses.",
  ],
  SaaS: [
    "Software for South African operators. Built local, priced fair.",
    "Workflow tools for service businesses. Free trial, no card required.",
  ],
};

function buildSiteRecon(
  rnd: () => number,
  company: string,
  industry: SaIndustry,
  domainBase: string,
  tld: string
): SiteRecon {
  const heroPool =
    HERO_FRAGMENTS[industry] || HERO_FRAGMENTS["Professional Services"];
  const hero = heroPool[Math.floor(rnd() * heroPool.length)];
  return {
    title: `${company}, ${industry} in South Africa`,
    h1: `Welcome to ${company}`,
    meta_description: `${company} is a ${industry.toLowerCase()} business serving South African customers.`,
    hero_text: hero,
    scraped_url: `https://${domainBase}.${tld}`,
    last_scraped_at: new Date().toISOString(),
  };
}

/**
 * Generates prospects scored 7 or above only.
 *
 * To return the requested quantity at a 7+ floor, we internally generate
 * roughly 3x the asked-for count, score them all, and return the top n.
 * If we still cannot fill the requested count at the floor, we cap at what
 * we have so we never lie about quality.
 */
export async function runGenerator(
  input: GenerateProspectInput,
): Promise<MockProspect[]> {
  const seed = buildSeedFromInput(input);
  const rnd = mulberry32(seed);

  const SCORE_FLOOR = 7;
  const OVERSAMPLE_FACTOR = 3;
  const oversampleTarget = Math.max(
    input.quantity,
    input.quantity * OVERSAMPLE_FACTOR
  );

  const candidates: MockProspect[] = [];
  for (let i = 0; i < oversampleTarget; i++) {
    const firstName = pick(SA_FIRST_NAMES, rnd);
    const lastName = pick(SA_LAST_NAMES, rnd);
    const company = makeCompany(rnd);
    const title = pick(input.jobTitles, rnd);
    const industry = pick(input.industries, rnd) as SaIndustry;
    const employees = makeEmployees(
      rnd,
      input.companySize.min,
      input.companySize.max,
    );
    const city = pickCity(input.locations, rnd);
    const domainBase = slugify(company);
    const domainTld = pick(EMAIL_DOMAINS, rnd);
    const email = `${slugify(firstName)}.${slugify(lastName)}@${domainBase}.${domainTld}`;
    const linkedin = `https://www.linkedin.com/in/${slugify(firstName)}-${slugify(lastName)}-${(seed + i).toString(36).slice(-4)}`;
    const intent = input.intentSignals.length
      ? pickSubset(input.intentSignals, rnd)
      : [];
    const enrichmentScore = 60 + Math.floor(rnd() * 40); // 60 to 99

    const siteRecon = buildSiteRecon(
      rnd,
      company,
      industry,
      domainBase,
      domainTld
    );

    // Build a partial prospect to feed the scorer and hook generator.
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
      linkedin_url: linkedin,
      intent_signals: intent,
      enrichment_score: enrichmentScore,
      site_recon: siteRecon,
      score: 0,
      score_breakdown: {
        icp_match: 0,
        contact_completeness: 0,
        business_signals: 0,
        site_quality: 0,
      },
      unique_hook: "",
    };

    const scored = scoreProspect(partial, {
      industries: input.industries,
      jobTitles: input.jobTitles,
      intentSignals: input.intentSignals,
      locations: input.locations,
    });
    partial.score = scored.total;
    partial.score_breakdown = scored.breakdown;
    partial.unique_hook = await generateHook(partial);

    candidates.push(partial);
  }

  // Keep only score 7+, sort descending so the strongest land first, then
  // truncate to the requested quantity.
  const filtered = candidates
    .filter((p) => p.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.quantity);

  return filtered;
}

// Deterministic estimator for the live preview, given the same input as the
// generator. Returns a "matches" number that is roughly proportional to how
// broad the targeting is. Pure function, no I/O.
export function estimateMatches(
  input: Pick<
    GenerateProspectInput,
    "industries" | "jobTitles" | "companySize" | "locations" | "intentSignals"
  >,
): number {
  const seed = hashSeed(
    JSON.stringify(input, Object.keys(input).sort()),
  );
  const rnd = mulberry32(seed);
  const breadth =
    input.industries.length *
    input.jobTitles.length *
    Math.max(1, input.locations.length);
  const sizeWindow = Math.max(
    1,
    input.companySize.max - input.companySize.min,
  );
  const intentPenalty = Math.max(1, 1 + input.intentSignals.length * 0.4);
  const base = breadth * (sizeWindow / 10) * 18;
  const jitter = 0.85 + rnd() * 0.3;
  const estimate = Math.round((base / intentPenalty) * jitter);
  return Math.max(50, estimate);
}
