// TODO: replace with real Apollo + Hunter integration. Spec in docs/pipeline-platform.md.

import {
  GenerateProspectInput,
  MockProspect,
  SaIndustry,
} from "./types";

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

export async function runGenerator(
  input: GenerateProspectInput,
): Promise<MockProspect[]> {
  const seed = buildSeedFromInput(input);
  const rnd = mulberry32(seed);

  const out: MockProspect[] = [];
  for (let i = 0; i < input.quantity; i++) {
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
    const score = 60 + Math.floor(rnd() * 40); // 60 to 99

    out.push({
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
      enrichment_score: score,
    });
  }

  return out;
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
