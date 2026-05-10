// Types for the ICP auto-suggester.
//
// The suggester takes a one or two sentence description of the Qwikly client's
// offer and returns a fully-populated ICP definition that pre-fills the setup
// form. The shape lines up with IcpDefinition in setup-state.ts, plus a
// human-readable reasoning string shown to the client.

export interface SuggesterInput {
  offer: string;
}

export interface SuggestedIcp {
  offer: string;
  industries: string[];
  titles: string[];
  sizeMin: number;
  sizeMax: number;
  locations: string[];
  intentSignals: string[];
  dealValueZar: number;
  reasoning: string;
}

export const VALID_INDUSTRIES = [
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
  "Legal",
  "Real Estate",
] as const;

export const VALID_TITLES = [
  "Owner",
  "Founder",
  "CEO",
  "COO",
  "Managing Director",
  "Head of Sales",
  "Head of Marketing",
  "Operations Manager",
  "Sales Manager",
  "Marketing Manager",
  "General Manager",
  "Practice Manager",
] as const;

export const VALID_LOCATIONS = [
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
  "Sandton",
  "International",
] as const;

export const VALID_INTENT_SIGNALS = [
  "Recently hired",
  "Recently funded",
  "Hiring sales reps",
  "Tech stack change",
  "Growing fast",
  "New product launch",
] as const;
