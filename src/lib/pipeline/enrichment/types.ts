// src/lib/pipeline/enrichment/types.ts
//
// Shared shapes for the wizard's enrichment step. The orchestrator returns
// a pre-filled ICP plus a per-field provenance record so the review screen
// can render "Why?" tooltips.

import type { IcpDefinition } from "@/lib/pipeline/setup-state";

export type ProvenanceSource =
  | "site_hero"
  | "site_services"
  | "gbp_category"
  | "gbp_location"
  | "gbp_size"
  | "offer"
  | "synthesis";

export interface FieldProvenance {
  source: ProvenanceSource;
  evidence: string; // human-readable quote/snippet
}

export type IcpProvenance = Partial<Record<keyof IcpDefinition, FieldProvenance>>;

export interface EnrichedIcp {
  icp: IcpDefinition;
  provenance: IcpProvenance;
  warnings: string[]; // e.g. "Couldn't read your site" — empty when all steps succeeded
}

export interface EnrichmentInput {
  clientId: string | number;
  websiteUrl: string;
  offer: string; // one-sentence offer description from the wizard
}
