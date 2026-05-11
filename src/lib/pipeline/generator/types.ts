// Types and zod schemas for the Pipeline generator. Keep this file pure (no
// runtime side effects) so it is safe to import from both server actions and
// client components for shared validation.
//
// MockProspect fields, persistence map for pipeline_prospects:
//
//   Persisted to dedicated columns:
//     first_name, last_name, title, company, industry, employees, city,
//     email, email_verified, linkedin_url, intent_signals, enrichment_score
//     (derived from `score` * 10, clamped 0 to 100).
//
//   Persisted inside icp_match JSONB:
//     phone, website, rating, reviews_count, business_status, place_types,
//     email_verification_status, site_recon, score_breakdown, unique_hook,
//     suburb (currently mirrors city), run_id.
//
//   Not persisted (derived on the client or unused at this stage):
//     full_name (server reconstructs from first_name + last_name when needed),
//     score (raw 1 to 10 value, only the * 10 form is stored).

import { z } from "zod";

export const SA_INDUSTRIES = [
  "Construction",
  "Professional Services",
  "SaaS",
  "Healthcare",
  "Education",
  "Financial Services",
  "Marketing",
  "Manufacturing",
  "Retail",
  "Hospitality",
] as const;

export const JOB_TITLES = [
  "Founder",
  "CEO",
  "COO",
  "Head of Sales",
  "Head of Marketing",
  "Operations Manager",
  "Sales Manager",
  "Marketing Manager",
  "General Manager",
  "Managing Director",
] as const;

export const SA_LOCATIONS = [
  "Anywhere in SA",
  "Cape Town",
  "Johannesburg",
  "Pretoria",
  "Durban",
  "Stellenbosch",
  "Port Elizabeth",
  "Bloemfontein",
  "East London",
  "Centurion",
] as const;

export const INTENT_SIGNALS = [
  "Recently hired",
  "Recently funded",
  "Hiring sales reps",
  "Tech stack change",
  "Growing fast",
] as const;

export type SaIndustry = (typeof SA_INDUSTRIES)[number];
export type JobTitle = (typeof JOB_TITLES)[number];
export type SaLocation = (typeof SA_LOCATIONS)[number];
export type IntentSignal = (typeof INTENT_SIGNALS)[number];

export const generateProspectInputSchema = z.object({
  industries: z
    .array(z.enum(SA_INDUSTRIES as unknown as [string, ...string[]]))
    .min(1, "Pick at least one industry"),
  jobTitles: z
    .array(z.enum(JOB_TITLES as unknown as [string, ...string[]]))
    .min(1, "Pick at least one job title"),
  companySize: z.object({
    min: z.number().int().min(5).max(500),
    max: z.number().int().min(5).max(500),
  }),
  locations: z
    .array(z.enum(SA_LOCATIONS as unknown as [string, ...string[]]))
    .min(1, "Pick at least one location"),
  intentSignals: z.array(
    z.enum(INTENT_SIGNALS as unknown as [string, ...string[]]),
  ),
  quantity: z.number().int().min(25).max(500),
  // Optional fields forwarded from the IcpDefinition. Used by the hook
  // generator and the cadence body. Generator-shape stays backward compatible.
  offer: z.string().optional(),
  dealValueZar: z.number().optional(),
});

export type GenerateProspectInput = z.infer<typeof generateProspectInputSchema>;

export interface SiteRecon {
  title: string;
  h1: string;
  meta_description: string;
  hero_text: string;
  scraped_url: string;
  last_scraped_at: string; // ISO timestamp
}

export interface ProspectScoreBreakdown {
  icp_match: number; // 0 to 10
  contact_completeness: number; // 0 to 10
  business_signals: number; // 0 to 10
  site_quality: number; // 0 to 10
}

export interface MockProspect {
  first_name: string;
  last_name: string;
  full_name: string;
  title: string;
  company: string;
  industry: SaIndustry;
  employees: number;
  city: string;
  email: string;
  email_verified: boolean;
  linkedin_url: string;
  intent_signals: string[];
  enrichment_score: number;

  // Upgrade: site recon, scored signal, generated hook.
  site_recon: SiteRecon;
  score: number; // 1 to 10
  score_breakdown: ProspectScoreBreakdown;
  unique_hook: string;

  // Optional, populated when the real pipeline runs against Google Places.
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  business_status?: string | null;
  place_types?: string[];
  // "valid" when we found an email on the prospect's website (any source),
  // "not_found" when nothing usable was on the site. Legacy values ("accept_all",
  // "invalid", "unknown") are kept for backward compatibility with rows
  // written before the Hunter -> website-scrape migration on 2026-05-11.
  email_verification_status?: "valid" | "not_found" | "accept_all" | "invalid" | "unknown";
  // Tells the dashboard where the email came from so it can render an honest
  // label ("Found via mailto link" vs "Pulled from website text" vs "No email
  // on site, find via LinkedIn").
  email_source?: "website_mailto" | "website_text" | "not_found";
}

export type GeneratorResult =
  | { ok: true; count: number; runId: string }
  | { ok: false; reason: string };
