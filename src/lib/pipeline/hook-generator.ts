// TODO: replace with Anthropic call. Pseudocode in docs/pipeline-platform.md.
//
// Production wiring will call Claude with a structured prompt that takes:
//   - prospect.full_name, prospect.company, prospect.industry, prospect.city
//   - prospect.site_recon (title, h1, hero_text, meta_description)
// And returns a single, sub-25-word, lower case opener that references one
// specific thing about the site, the location, or the role. No emojis, no
// generic praise. Output is sanitised, no em or en dashes.
//
// The mock below is deterministic so test runs are stable. Same input, same hook.

import type { MockProspect } from "./generator/types";

// Cheap deterministic hash for picking template indices.
function hash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface HookTemplate {
  text: string; // uses {firstName}, {company}, {industry}, {city}, {observation}
}

const HOOKS: HookTemplate[] = [
  { text: "Hi {firstName}, browsed {company}'s site, {observation}." },
  { text: "Hi {firstName}, had a quick look at {company} in {city}, {observation}." },
  { text: "Hi {firstName}, noticed {company} runs a tight {industry} setup, {observation}." },
  { text: "Hi {firstName}, came across {company} this morning, {observation}." },
  { text: "Hi {firstName}, spent two minutes on {company}'s site, {observation}." },
];

// Light, deterministic per-industry observation pool. Each is a single clause.
const OBSERVATIONS_BY_INDUSTRY: Record<string, string[]> = {
  Construction: [
    "looks like project gallery is the workhorse",
    "spec sheet downloads point to a busy ops desk",
    "your tender pipeline must move fast off that contact form",
  ],
  Healthcare: [
    "your booking flow looks built for repeat patients",
    "appointment requests run through a single inbox by the look of it",
    "your services page reads like a referral page in disguise",
  ],
  Education: [
    "your enrolment pages do a lot of heavy lifting",
    "your course pages suggest a steady inbound stream",
    "the parent FAQ tells me support volume is real",
  ],
  "Financial Services": [
    "your service mix points to a busy advisor desk",
    "your contact form quietly does the heavy lifting",
    "your client onboarding pages tell their own story",
  ],
  Marketing: [
    "your services list is broader than most peers",
    "your case study layout suggests a strong referral motion",
    "your contact CTA is buried, that always tells a story",
  ],
  Manufacturing: [
    "your product catalogue looks built for repeat buyers",
    "your spec sheets suggest quote requests run through email",
    "your supplier page hints at high inbound volume",
  ],
  Retail: [
    "your store locator suggests strong physical reach",
    "your collections rotation looks tighter than the average",
    "your contact page reads like a customer service inbox",
  ],
  Hospitality: [
    "your booking widget is doing a lot of work after hours",
    "your menu page reads like a marketing page in disguise",
    "your reviews suggest repeat customer flow",
  ],
  "Professional Services": [
    "your service pages quietly handle the qualifying",
    "your contact form is shouldering the enquiry load",
    "your case study list points to a busy referral motion",
  ],
  SaaS: [
    "your pricing page is doing all the convincing",
    "your demo CTA placement tells me where leads bottle up",
    "your sign up flow looks built for fast iteration",
  ],
};

function pickObservation(prospect: MockProspect): string {
  const pool =
    OBSERVATIONS_BY_INDUSTRY[prospect.industry] ||
    OBSERVATIONS_BY_INDUSTRY["Professional Services"];
  const idx = hash(`${prospect.full_name}|${prospect.company}|obs`) % pool.length;
  return pool[idx];
}

export async function generateHook(prospect: MockProspect): Promise<string> {
  const tmpl =
    HOOKS[hash(`${prospect.full_name}|${prospect.company}|hook`) % HOOKS.length];
  const observation = pickObservation(prospect);
  const filled = tmpl.text
    .replace(/\{firstName\}/g, prospect.first_name)
    .replace(/\{company\}/g, prospect.company)
    .replace(/\{industry\}/g, prospect.industry)
    .replace(/\{city\}/g, prospect.city)
    .replace(/\{observation\}/g, observation);
  return filled;
}
