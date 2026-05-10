// ICP auto-suggester for Qwikly Pipeline setup.
//
// Given a one or two sentence description of the Qwikly client's offer, return
// a fully-populated ICP definition (industries, titles, company size,
// locations, intent signals, deal value) plus a short human-readable reasoning
// paragraph. The form pre-fills from this, the client edits if they want.
//
// Cost note: Claude Haiku 4.5 at ~USD 1 per million input tokens, ~USD 5 per
// million output. A single suggestion costs well under USD 0.001.

import Anthropic from "@anthropic-ai/sdk";

import {
  SuggestedIcp,
  SuggesterInput,
  VALID_INDUSTRIES,
  VALID_INTENT_SIGNALS,
  VALID_LOCATIONS,
  VALID_TITLES,
} from "./icp-suggester.types";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT =
  "You are an experienced South African B2B sales strategist. Given a one-sentence description of a service business, you return the ICP they should target to grow their B2B revenue. Output strict JSON matching the SuggestedIcp schema. Pick industries, titles, locations, signals, and a realistic SA deal value. Keep the reasoning under 60 words. Never reference AI, technology, or automation in the reasoning.";

interface KeywordRule {
  keywords: string[];
  industries: string[];
  titles: string[];
  sizeMin: number;
  sizeMax: number;
  locations: string[];
  signals: string[];
  dealValueZar: number;
  label: string;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ["roof", "roofing", "solar", "construction"],
    industries: ["Real Estate", "Construction"],
    titles: ["Owner", "Operations Manager", "General Manager"],
    sizeMin: 5,
    sizeMax: 200,
    locations: ["Anywhere in SA"],
    signals: ["Growing fast"],
    dealValueZar: 20000,
    label: "roofing and construction",
  },
  {
    keywords: ["law", "legal", "attorney", "advocate"],
    industries: ["Professional Services", "Financial Services", "SaaS"],
    titles: ["Founder", "CEO", "COO", "Managing Director"],
    sizeMin: 10,
    sizeMax: 500,
    locations: ["Anywhere in SA"],
    signals: ["Recently funded", "Recently hired"],
    dealValueZar: 30000,
    label: "legal",
  },
  {
    keywords: ["accounting", "tax", "bookkeep", "audit"],
    industries: [
      "Retail",
      "Manufacturing",
      "Construction",
      "Hospitality",
      "Professional Services",
    ],
    titles: ["Owner", "Founder", "CEO", "General Manager"],
    sizeMin: 5,
    sizeMax: 200,
    locations: ["Anywhere in SA"],
    signals: ["Growing fast", "Recently hired"],
    dealValueZar: 12000,
    label: "accounting and tax",
  },
  {
    keywords: ["dental", "doctor", "medical", "health"],
    industries: ["Healthcare", "Education"],
    titles: ["Practice Manager", "Owner", "Operations Manager"],
    sizeMin: 5,
    sizeMax: 100,
    locations: ["Anywhere in SA"],
    signals: ["Recently hired"],
    dealValueZar: 8000,
    label: "healthcare",
  },
  {
    keywords: ["estate", "property", "real estate"],
    industries: ["Real Estate", "Professional Services", "Financial Services"],
    titles: ["Founder", "CEO", "Managing Director", "Head of Sales"],
    sizeMin: 5,
    sizeMax: 200,
    locations: ["Anywhere in SA"],
    signals: ["Recently funded", "Growing fast"],
    dealValueZar: 25000,
    label: "property and real estate",
  },
  {
    keywords: ["marketing", "agency", "advertising", "design"],
    industries: ["SaaS", "Retail", "Hospitality", "Manufacturing", "Healthcare"],
    titles: ["Founder", "CEO", "Head of Marketing"],
    sizeMin: 5,
    sizeMax: 200,
    locations: ["Anywhere in SA"],
    signals: ["Recently funded", "New product launch"],
    dealValueZar: 20000,
    label: "marketing and creative",
  },
];

const DEFAULT_RULE: KeywordRule = {
  keywords: ["consult"],
  industries: ["Professional Services", "SaaS", "Financial Services"],
  titles: ["Founder", "CEO", "COO", "Managing Director"],
  sizeMin: 10,
  sizeMax: 250,
  locations: ["Anywhere in SA"],
  signals: ["Growing fast", "Recently funded"],
  dealValueZar: 20000,
  label: "consulting and professional services",
};

function tidyOffer(offer: string): string {
  return offer.trim().replace(/\s+/g, " ").slice(0, 500);
}

function matchRule(offer: string): KeywordRule {
  const lower = offer.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule;
    }
  }
  if (DEFAULT_RULE.keywords.some((k) => lower.includes(k))) {
    return DEFAULT_RULE;
  }
  return DEFAULT_RULE;
}

function heuristicSuggestion(offer: string): SuggestedIcp {
  const tidied = tidyOffer(offer);
  const rule = matchRule(tidied);
  const locationsText = rule.locations.join(", ");
  const signalsText = rule.signals.join(", ");
  const reasoning =
    `Picked B2B clients in industries that typically need ${rule.label} services. ` +
    `Titles target the actual decision-maker. ${locationsText} keeps the sample sized for outreach. ` +
    `${signalsText} prioritise prospects with budget and intent.`;

  return {
    offer: tidied,
    industries: [...rule.industries],
    titles: [...rule.titles],
    sizeMin: rule.sizeMin,
    sizeMax: rule.sizeMax,
    locations: [...rule.locations],
    intentSignals: [...rule.signals],
    dealValueZar: rule.dealValueZar,
    reasoning,
  };
}

function filterValid(values: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>(allowed);
  const out: string[] = [];
  for (const v of values) {
    if (typeof v === "string" && set.has(v) && !out.includes(v)) {
      out.push(v);
    }
  }
  return out;
}

function clampSize(v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const rounded = Math.round(v);
  if (rounded < 1) return 1;
  if (rounded > 500) return 500;
  return rounded;
}

function clampDealValue(v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const rounded = Math.round(v);
  if (rounded < 0) return fallback;
  return rounded;
}

function stripJsonFences(text: string): string {
  let out = text.trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:json)?/i, "").trim();
    if (out.endsWith("```")) {
      out = out.slice(0, -3).trim();
    }
  }
  return out;
}

function cleanReasoning(text: unknown, fallback: string): string {
  if (typeof text !== "string") return fallback;
  const cleaned = text.trim().replace(/[—–]/g, ",").replace(/\s+/g, " ");
  if (cleaned.length === 0) return fallback;
  return cleaned;
}

function buildUserPrompt(offer: string): string {
  const industries = VALID_INDUSTRIES.join(", ");
  const titles = VALID_TITLES.join(", ");
  const locations = VALID_LOCATIONS.join(", ");
  const signals = VALID_INTENT_SIGNALS.join(", ");

  return [
    "Describe this business's ideal B2B customer:",
    '"""',
    offer,
    '"""',
    "",
    "Valid options:",
    `- industries (pick 1 to 5): ${industries}`,
    `- titles (pick 2 to 5): ${titles}`,
    `- locations (pick 1 to 4): ${locations}`,
    `- intentSignals (pick 1 to 4): ${signals}`,
    "- sizeMin/Max: integers 1 to 500 (500 means no upper limit)",
    "- dealValueZar: realistic ZAR average deal value",
    "",
    "Output strict JSON. No prose, no markdown, no code fences.",
  ].join("\n");
}

function parseAndValidate(
  raw: string,
  tidiedOffer: string,
  fallback: SuggestedIcp,
): SuggestedIcp {
  const text = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object") return fallback;
  const obj = parsed as Record<string, unknown>;

  const industries = filterValid(obj.industries, VALID_INDUSTRIES);
  const titles = filterValid(obj.titles, VALID_TITLES);
  const locations = filterValid(obj.locations, VALID_LOCATIONS);
  const intentSignals = filterValid(obj.intentSignals, VALID_INTENT_SIGNALS);

  const sizeMin = clampSize(obj.sizeMin, fallback.sizeMin);
  const sizeMaxRaw = clampSize(obj.sizeMax, fallback.sizeMax);
  const sizeMax = sizeMaxRaw < sizeMin ? sizeMin : sizeMaxRaw;

  const dealValueZar = clampDealValue(obj.dealValueZar, fallback.dealValueZar);

  const offerOut =
    typeof obj.offer === "string" && obj.offer.trim().length > 0
      ? tidyOffer(obj.offer)
      : tidiedOffer;

  const reasoning = cleanReasoning(obj.reasoning, fallback.reasoning);

  return {
    offer: offerOut,
    industries: industries.length > 0 ? industries : fallback.industries,
    titles: titles.length > 0 ? titles : fallback.titles,
    sizeMin,
    sizeMax,
    locations: locations.length > 0 ? locations : fallback.locations,
    intentSignals: intentSignals.length > 0 ? intentSignals : fallback.intentSignals,
    dealValueZar,
    reasoning,
  };
}

export async function suggestIcpFromOffer(
  input: SuggesterInput,
): Promise<SuggestedIcp> {
  const tidied = tidyOffer(input.offer ?? "");
  const fallback = heuristicSuggestion(tidied);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("ANTHROPIC_API_KEY not set, using heuristic ICP suggester");
    return fallback;
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(tidied),
        },
      ],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (text.length === 0) {
      console.log("icp-suggester: empty response from model, using heuristic fallback");
      return fallback;
    }

    return parseAndValidate(text, tidied, fallback);
  } catch (err) {
    console.log(
      "icp-suggester: Anthropic call failed, using heuristic fallback,",
      err instanceof Error ? err.message : String(err),
    );
    return fallback;
  }
}
