// Hook generator for Qwikly Pipeline prospects.
//
// Writes a single, personalised 1-sentence cold email opener for each prospect,
// grounded in site recon data and the Qwikly client's ICP definition.
//
// Cost note: Claude Haiku 4.5 at ~USD 1 per million input tokens, ~USD 5 per
// million output. A typical prospect costs USD 0.0001 to USD 0.0003 per hook.
// 1000 prospects costs about USD 0.30.
//
// Caching is handled at the orchestrator call site, this module just runs the
// call. No internal cache here.

import Anthropic from "@anthropic-ai/sdk";

export interface ProspectForHook {
  businessName: string;
  industry: string;
  city: string;
  siteRecon:
    | {
        title: string;
        h1: string;
        meta_description: string;
        hero_text: string;
        services_text: string;
      }
    | null;
  firstName?: string;
}

export interface IcpForHook {
  offer: string;
  painPoint?: string;
  dealValueZar: number;
}

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT =
  "You write personalised 1-sentence cold email openers for South African B2B outreach. Hard rules: under 25 words, references something specific from the prospect's website, never references AI or technology, never opens with 'I hope this finds you well', always reads like one human noticed something about another business. Output only the sentence. No quotes, no preamble.";

function firstWords(text: string, n: number): string {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, n)
    .join(" ")
    .replace(/[.,;:!?]+$/, "");
}

function fallbackHook(prospect: ProspectForHook): string {
  const { businessName, industry, city, siteRecon } = prospect;
  if (siteRecon && siteRecon.hero_text && siteRecon.hero_text.trim().length > 0) {
    const snippet = firstWords(siteRecon.hero_text, 6);
    return `Hi there, read ${businessName}'s site, the part about ${snippet} stood out.`;
  }
  if (siteRecon && siteRecon.h1 && siteRecon.h1.trim().length > 0) {
    return `Hi there, browsed ${businessName}'s site, the ${siteRecon.h1.trim()} positioning is sharp.`;
  }
  if (industry && industry.trim().length > 0) {
    return `Hi there, came across ${businessName} while researching ${industry} firms in ${city}.`;
  }
  return `Hi there, found ${businessName} while looking up SA businesses in ${city}.`;
}

function stripQuotes(text: string): string {
  let out = text.trim();
  // Strip surrounding quote pairs (straight or curly), repeat in case nested.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const first = out.charAt(0);
    const last = out.charAt(out.length - 1);
    const isOpen = first === '"' || first === "'" || first === "“" || first === "‘";
    const isClose = last === '"' || last === "'" || last === "”" || last === "’";
    if (out.length >= 2 && isOpen && isClose) {
      out = out.slice(1, -1).trim();
      continue;
    }
    break;
  }
  return out;
}

function buildUserPrompt(prospect: ProspectForHook, icp: IcpForHook): string {
  const recon = prospect.siteRecon;
  const title = recon?.title ?? "";
  const h1 = recon?.h1 ?? "";
  const meta = recon?.meta_description ?? "";
  const hero = recon?.hero_text ?? "";
  const services = recon?.services_text ?? "";
  const painPoint = icp.painPoint && icp.painPoint.trim().length > 0
    ? icp.painPoint
    : "(none stated)";

  return [
    "Prospect:",
    `Business: ${prospect.businessName}`,
    `Industry: ${prospect.industry}`,
    `City: ${prospect.city}`,
    `Site title: ${title}`,
    `Site H1: ${h1}`,
    `Meta description: ${meta}`,
    `Hero text: ${hero}`,
    `Services snippet: ${services}`,
    "",
    `Sender's offer: ${icp.offer}`,
    `Sender's pain-point hypothesis for this prospect: ${painPoint}`,
    "",
    "Write the opener.",
  ].join("\n");
}

export async function generateHook(input: {
  prospect: ProspectForHook;
  icp: IcpForHook;
}): Promise<string> {
  const { prospect, icp } = input;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("ANTHROPIC_API_KEY not set, using fallback hook generator");
    return fallbackHook(prospect);
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 80,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(prospect, icp),
        },
      ],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    if (text.length === 0) {
      console.log("hook-generator: empty response from model, using fallback");
      return fallbackHook(prospect);
    }

    return stripQuotes(text);
  } catch (err) {
    console.log(
      "hook-generator: Anthropic call failed, using fallback,",
      err instanceof Error ? err.message : String(err),
    );
    return fallbackHook(prospect);
  }
}
