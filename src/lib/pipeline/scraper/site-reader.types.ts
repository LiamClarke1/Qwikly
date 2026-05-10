// Types for the Qwikly Pipeline site reader.
// Consumed by the unique hook generator and the prospect detail page's
// "Site recon" card.

export type SiteReconFailReason =
  | "timeout"
  | "non_html"
  | "404"
  | "blocked"
  | "network"
  | "no_url";

export interface SiteRecon {
  /** The resolved URL after redirects. Empty string when fetch never started. */
  url: string;
  /** Page <title>, decoded and trimmed, capped at 200 chars. */
  title: string | null;
  /** First <h1> text, tags stripped, decoded. */
  h1: string | null;
  /** <meta name="description" content="..."> value, decoded. */
  meta_description: string | null;
  /** First meaningful paragraph near the top, capped at 280 chars. */
  hero_text: string | null;
  /** First 240 chars of body text after the hero, nav/footer noise stripped. */
  services_text: string | null;
  /** ISO timestamp of when this recon was produced. */
  last_scraped_at: string;
  /** True when the page was fetched and parsed successfully. */
  ok: boolean;
  /** Populated when ok is false. */
  reason?: SiteReconFailReason;
}
