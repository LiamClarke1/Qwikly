// Hunter.io email finder for the Qwikly Pipeline lead engine.
//
// Hunter usage: ~25 credits per Domain Search + Verifier per prospect. Free tier
// is 25/month, paid is 500 starting around USD 49/mo. Cache verified emails by
// domain in pipeline_prospects.icp_match.email_source so we do not re-call.

import type {
  HunterEmailResult,
  HunterVerificationStatus,
} from "./hunter.types";

const HUNTER_BASE = "https://api.hunter.io/v2";

// Free / personal mailbox providers. We never try to enrich these because the
// domain belongs to the mailbox host, not the prospect's business.
const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.za",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.co.za",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "tutanota.com",
  "mweb.co.za",
  "vodamail.co.za",
  "telkomsa.net",
  "absamail.co.za",
  "webmail.co.za",
]);

function normaliseDomain(input: string): string | null {
  if (!input) return null;
  let domain = input.trim().toLowerCase();
  // Strip protocol.
  domain = domain.replace(/^https?:\/\//, "");
  // Strip everything after the first slash, query, or hash.
  domain = domain.split("/")[0];
  domain = domain.split("?")[0];
  domain = domain.split("#")[0];
  // Strip leading www.
  domain = domain.replace(/^www\./, "");
  // Strip trailing dot and port.
  domain = domain.replace(/:\d+$/, "");
  domain = domain.replace(/\.$/, "");

  if (domain.length < 4) return null;
  if (!domain.includes(".")) return null;

  return domain;
}

function isSuppressedDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain);
}

function coerceVerificationStatus(value: unknown): HunterVerificationStatus {
  if (value === "valid" || value === "invalid" || value === "accept_all") {
    return value;
  }
  return "unknown";
}

// Minimal typings for the Hunter responses we consume. We avoid `any`.
interface HunterDomainSearchEmail {
  value?: string;
  confidence?: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
}

interface HunterDomainSearchResponse {
  data?: {
    emails?: HunterDomainSearchEmail[];
  };
  errors?: Array<{ id?: string; code?: number; details?: string }>;
}

interface HunterEmailFinderResponse {
  data?: {
    email?: string | null;
    score?: number | null;
    first_name?: string | null;
    last_name?: string | null;
    position?: string | null;
  };
  errors?: Array<{ id?: string; code?: number; details?: string }>;
}

interface HunterVerifierResponse {
  data?: {
    status?: string;
    result?: string;
    score?: number;
  };
  errors?: Array<{ id?: string; code?: number; details?: string }>;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[hunter] HTTP ${res.status} from ${redactKey(url)}: ${body.slice(0, 200)}`,
      );
      return null;
    }
    const json = (await res.json()) as T;
    return json;
  } catch (err) {
    console.error(`[hunter] request failed for ${redactKey(url)}:`, err);
    return null;
  }
}

function redactKey(url: string): string {
  return url.replace(/api_key=[^&]+/i, "api_key=REDACTED");
}

async function verifyEmail(
  email: string,
  apiKey: string,
): Promise<HunterVerificationStatus> {
  const url = `${HUNTER_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetchJson<HunterVerifierResponse>(url);
  if (!res || !res.data) return "unknown";
  // Hunter returns "status" (e.g. "valid", "invalid", "accept_all", "webmail",
  // "disposable", "unknown"). We map non, standard values to "unknown".
  return coerceVerificationStatus(res.data.status);
}

export async function findEmailForDomain(
  domain: string,
  opts?: { firstName?: string; lastName?: string },
): Promise<HunterEmailResult | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    console.log("HUNTER_API_KEY not set, returning null");
    return null;
  }

  const normalised = normaliseDomain(domain);
  if (!normalised) {
    return null;
  }
  if (isSuppressedDomain(normalised)) {
    return null;
  }

  const firstName = opts?.firstName?.trim();
  const lastName = opts?.lastName?.trim();

  // Email Finder path, used when we have a contact name.
  if (firstName && lastName) {
    const finderUrl =
      `${HUNTER_BASE}/email-finder` +
      `?domain=${encodeURIComponent(normalised)}` +
      `&first_name=${encodeURIComponent(firstName)}` +
      `&last_name=${encodeURIComponent(lastName)}` +
      `&api_key=${encodeURIComponent(apiKey)}`;

    const finder = await fetchJson<HunterEmailFinderResponse>(finderUrl);
    const found = finder?.data?.email;
    if (found) {
      const verification = await verifyEmail(found, apiKey);
      const confidence =
        typeof finder?.data?.score === "number" ? finder.data.score : 0;
      return {
        email: found,
        first_name: finder?.data?.first_name ?? firstName ?? null,
        last_name: finder?.data?.last_name ?? lastName ?? null,
        position: finder?.data?.position ?? null,
        confidence,
        verification_status: verification,
        source: "email_finder",
      };
    }
    // If finder produced nothing, fall through to domain search as a backup.
  }

  // Domain Search path.
  const searchUrl =
    `${HUNTER_BASE}/domain-search` +
    `?domain=${encodeURIComponent(normalised)}` +
    `&limit=5` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  const search = await fetchJson<HunterDomainSearchResponse>(searchUrl);
  const emails = search?.data?.emails ?? [];
  if (emails.length === 0) {
    return null;
  }

  // Pick the highest confidence email. Hunter usually orders them already, but
  // we sort defensively.
  const sorted = [...emails].sort(
    (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
  );
  const top = sorted[0];
  if (!top.value) {
    return null;
  }

  const verification = await verifyEmail(top.value, apiKey);

  return {
    email: top.value,
    first_name: top.first_name ?? null,
    last_name: top.last_name ?? null,
    position: top.position ?? null,
    confidence: typeof top.confidence === "number" ? top.confidence : 0,
    verification_status: verification,
    source: "domain_search",
  };
}
