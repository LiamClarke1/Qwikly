import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { recordApiUsage } from "@/lib/billing/api-usage";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";
import type { EnrichedIcp, IcpProvenance } from "./types";
import type { ClientBusinessProfile } from "./google-places-profile";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert B2B sales strategist. You receive a company's website content, their Google Business Profile data, and a one-sentence offer. You return a structured Ideal Customer Profile (ICP) for outbound prospecting.

Quality bar: every field must be specific and defensible. Industries are concrete (e.g. "Solar installation" not "Energy"). Titles are reachable on LinkedIn (e.g. "Practice Manager" not "Decision Maker"). Locations are real cities or regions. Deal value is a realistic ZAR estimate for one closed customer.

For every output field, produce a "provenance" entry recording where the suggestion came from and a short evidence quote. Allowed provenance sources: site_hero, site_services, gbp_category, gbp_location, gbp_size, offer, synthesis.

Output strictly the JSON block. No commentary outside the block.`;

interface SiteContext {
  hero?: string;
  services?: string;
}

export interface SynthesisInput {
  clientId: string | number;
  site: SiteContext;
  profile: ClientBusinessProfile;
  offer: string;
}

interface SynthesisOutput {
  icp: IcpDefinition;
  provenance: IcpProvenance;
}

export function parseSynthesisOutput(raw: string): SynthesisOutput {
  const match = raw.match(/```json\s*([\s\S]*?)```/);
  const jsonText = match ? match[1].trim() : raw.trim();
  const parsed = JSON.parse(jsonText) as SynthesisOutput;
  if (!parsed.icp) throw new Error("Synthesis output missing icp field");
  const required: Array<keyof IcpDefinition> = [
    "offer",
    "industries",
    "titles",
    "sizeMin",
    "sizeMax",
    "locations",
    "intentSignals",
    "dealValueZar",
  ];
  for (const key of required) {
    if (parsed.icp[key] === undefined || parsed.icp[key] === null) {
      throw new Error(`Synthesis output missing required field: ${String(key)}`);
    }
  }
  return parsed;
}

function buildUserMessage(input: SynthesisInput): string {
  return [
    `Their offer: ${input.offer}`,
    "",
    "Website context:",
    input.site.hero ? `- Hero: ${input.site.hero}` : "- (no hero captured)",
    input.site.services ? `- Services: ${input.site.services}` : "- (no services list)",
    "",
    "Google Business Profile:",
    input.profile.name ? `- Name: ${input.profile.name}` : "- (not resolved)",
    input.profile.primaryCategory ? `- Category: ${input.profile.primaryCategory}` : "",
    input.profile.city ? `- City: ${input.profile.city}` : "",
    input.profile.region ? `- Region: ${input.profile.region}` : "",
    input.profile.ratingsCount != null ? `- Ratings count: ${input.profile.ratingsCount}` : "",
    "",
    "Return the JSON block. Schema:",
    `{
  "icp": {
    "offer": string,
    "industries": [string],
    "titles": [string],
    "sizeMin": number,
    "sizeMax": number,
    "locations": [string],
    "intentSignals": [string],
    "dealValueZar": number
  },
  "provenance": {
    "<field>": { "source": ProvenanceSource, "evidence": string }
  }
}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function synthesiseIcp(input: SynthesisInput): Promise<EnrichedIcp> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(input);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  await recordApiUsage({
    clientId: input.clientId,
    usage: response.usage,
    source: "pipeline_icp_synthesis",
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = parseSynthesisOutput(rawText);
  return { icp: parsed.icp, provenance: parsed.provenance, warnings: [] };
}
