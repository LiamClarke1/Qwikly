import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { recordApiUsage } from "@/lib/billing/api-usage";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";
import type { EnrichedIcp, IcpProvenance } from "./types";
import type { ClientBusinessProfile } from "./google-places-profile";
import type { InboundHistorySummary } from "./inbound-history";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert B2B sales strategist. You receive a company's website content (homepage, about, pricing, case-studies), their Google Business Profile, a one-sentence offer, and optionally a summary of their recent inbound chat and booking history. You return a structured Ideal Customer Profile (ICP) for outbound prospecting.

Quality bar: every field must be specific and defensible. Industries are concrete (e.g. "Solar installation" not "Energy"). Titles are reachable on LinkedIn (e.g. "Practice Manager" not "Decision Maker"). Locations are real cities or regions. Deal value is a realistic ZAR estimate for one closed customer.

If recent inbound history is provided, it is the strongest single signal for who they should prospect — actual job_types and areas observed should dominate the industries and locations fields. Pricing-page evidence beats website-hero evidence for the dealValueZar field. Case-studies content tells you what their best-fit customer looks like in practice; use it for sizeMin/sizeMax and industries.

For every output field, produce a "provenance" entry recording where the suggestion came from and a short evidence quote. Allowed provenance sources: site_hero, site_services, site_about, site_pricing, site_case_studies, gbp_category, gbp_location, gbp_size, inbound_bookings, inbound_chat, offer, synthesis.

Output strictly the JSON block. No commentary outside the block.`;

interface SiteContext {
  hero?: string;
  services?: string;
  about?: string;
  pricing?: string;
  caseStudies?: string;
}

export interface SynthesisInput {
  clientId: string | number;
  site: SiteContext;
  profile: ClientBusinessProfile;
  offer: string;
  /** Recent inbound chat + booking summary. Null when the tenant has no inbound data. */
  history?: InboundHistorySummary | null;
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
  const parts: string[] = [`Their offer: ${input.offer}`, ""];

  // Website context: homepage signals first, then deeper pages.
  parts.push("Website context:");
  parts.push(input.site.hero ? `- Homepage hero: ${input.site.hero}` : "- (no hero captured)");
  parts.push(
    input.site.services
      ? `- Homepage services: ${input.site.services}`
      : "- (no services list)",
  );
  if (input.site.about) {
    parts.push(`- About page: ${input.site.about}`);
  }
  if (input.site.pricing) {
    parts.push(`- Pricing page: ${input.site.pricing}`);
  }
  if (input.site.caseStudies) {
    parts.push(`- Case studies / customers page: ${input.site.caseStudies}`);
  }
  parts.push("");

  // Google Business Profile.
  parts.push("Google Business Profile:");
  parts.push(input.profile.name ? `- Name: ${input.profile.name}` : "- (not resolved)");
  if (input.profile.primaryCategory) parts.push(`- Category: ${input.profile.primaryCategory}`);
  if (input.profile.city) parts.push(`- City: ${input.profile.city}`);
  if (input.profile.region) parts.push(`- Region: ${input.profile.region}`);
  if (input.profile.ratingsCount != null) {
    parts.push(`- Ratings count: ${input.profile.ratingsCount}`);
  }
  parts.push("");

  // Recent inbound history. Only included when the tenant actually has data;
  // outbound-only tenants will have history.hasData === false and the block
  // is skipped entirely (no "(no history)" noise to muddy the prompt).
  if (input.history && input.history.hasData) {
    const h = input.history;
    parts.push("Recent inbound chat + booking history (last 60 days):");
    parts.push(`- ${h.bookingCount} bookings, ${h.conversationCount} conversations`);
    if (h.topJobTypes.length > 0) {
      parts.push(
        `- Most-booked job types: ${h.topJobTypes
          .map(([type, n]) => `${type} (${n})`)
          .join(", ")}`,
      );
    }
    if (h.topAreas.length > 0) {
      parts.push(
        `- Most-booked areas: ${h.topAreas.map(([area, n]) => `${area} (${n})`).join(", ")}`,
      );
    }
    if (h.channelMix.length > 0) {
      parts.push(
        `- Channel mix: ${h.channelMix.map(([ch, n]) => `${ch} (${n})`).join(", ")}`,
      );
    }
    if (h.recentNotes.length > 0) {
      parts.push("- Recent assistant notes about visitors:");
      for (const note of h.recentNotes) parts.push(`    * ${note}`);
    }
    parts.push("");
  }

  parts.push("Return the JSON block. Schema:");
  parts.push(`{
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
}`);
  return parts.filter(Boolean).join("\n");
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
