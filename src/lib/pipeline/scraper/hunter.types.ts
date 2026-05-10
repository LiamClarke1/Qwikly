// Types for the Hunter.io email finder integration.
// Used by the Qwikly Pipeline lead engine to enrich prospects with a verified
// contact email.

export type HunterVerificationStatus =
  | "valid"
  | "accept_all"
  | "invalid"
  | "unknown";

export type HunterSource = "domain_search" | "email_finder" | "verifier_only";

export interface HunterEmailResult {
  email: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  confidence: number; // 0 to 100
  verification_status: HunterVerificationStatus;
  source: HunterSource;
}
