// Scrapes a prospect's website for a public-facing email address.
//
// We dropped Hunter.io (verified-email lookup) on 2026-05-11 in favour of
// reading the prospect's own website and surfacing what the business has
// published themselves. Tradeoffs:
//
//   - Pros: zero per-request API cost, no third-party dependency, the
//     email we deliver is one the business actively publishes, no
//     "verified vs guessed" ambiguity for the client.
//   - Cons: a lot of SA service businesses use contact forms instead of
//     mailto: links; coverage is patchier than Hunter. When we can't
//     find an email we deliver the prospect anyway with email_source =
//     "not_found" so the client knows to find one via LinkedIn or by
//     visiting the site.
//
// Used by src/lib/pipeline/generator/run.ts in place of findEmailForDomain.
//
// No `server-only` guard: this file is reachable from the IcpForm client
// component via generator/run.ts. The function is still effectively
// server-only at runtime (it does a long-running fetch), but the static
// import chain has to compile in both bundles.

export type EmailSource = "website_mailto" | "website_text" | "not_found";

export interface ScrapedEmail {
  email: string;
  source: EmailSource;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Filters that exclude obviously-not-real or generic placeholder addresses.
const REJECT_PATTERNS = [
  /^example@/i,
  /^test@/i,
  /^email@/i,
  /^name@/i,
  /^your@/i,
  /@example\./i,
  /@sentry\./i,
  /@wix\./i,
  /@wordpress\./i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.svg$/i,
];

function isPlausibleEmail(email: string): boolean {
  const lower = email.toLowerCase();
  for (const pat of REJECT_PATTERNS) {
    if (pat.test(lower)) return false;
  }
  // Reject obvious image filenames that happen to contain an @ (rare but seen).
  if (lower.includes(".png") || lower.includes(".jpg") || lower.includes(".svg")) {
    return false;
  }
  return true;
}

function preferEmailForDomain(emails: string[], hostDomain: string | null): string | null {
  if (emails.length === 0) return null;
  // First, try addresses whose domain matches the website's domain (the
  // strongest signal that this is the business's own inbox, not a vendor
  // or a developer's personal address).
  if (hostDomain) {
    const matchHost = emails.find((e) => {
      const dom = e.split("@")[1]?.toLowerCase() ?? "";
      return dom === hostDomain || dom.endsWith("." + hostDomain);
    });
    if (matchHost) return matchHost;
  }
  // Otherwise prefer info@/hello@/contact@/sales@ over personal-looking ones
  // because those are the inboxes a business actively monitors.
  const role = emails.find((e) =>
    /^(info|hello|contact|sales|enquiries|enquiry|admin|office)@/i.test(e),
  );
  if (role) return role;
  return emails[0];
}

function extractHostDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Fetch the website, look for a mailto: link first (highest signal), then
 * fall back to email patterns in the rendered text. Best-effort, fail-soft.
 *
 * Returns { email: "", source: "not_found" } when nothing usable is found
 * so the caller can deliver the prospect anyway with a clear no-email flag.
 */
export async function scrapeEmailFromWebsite(websiteUrl: string): Promise<ScrapedEmail> {
  if (!websiteUrl || typeof websiteUrl !== "string") {
    return { email: "", source: "not_found" };
  }

  const hostDomain = extractHostDomain(websiteUrl);

  let html = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(websiteUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; QwiklyPipeline/1.0; +https://www.qwikly.co.za)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { email: "", source: "not_found" };
    html = await res.text();
  } catch {
    return { email: "", source: "not_found" };
  }

  // 1. Look for mailto: links (highest signal).
  const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailtoMatch) {
    const candidate = mailtoMatch[1];
    if (isPlausibleEmail(candidate)) {
      return { email: candidate, source: "website_mailto" };
    }
  }

  // 2. Fall back to email patterns in the body text. Pick the best one.
  const all = (html.match(EMAIL_REGEX) ?? []).filter(isPlausibleEmail);
  const unique = Array.from(new Set(all.map((e) => e.toLowerCase())));
  const picked = preferEmailForDomain(unique, hostDomain);
  if (picked) {
    return { email: picked, source: "website_text" };
  }

  return { email: "", source: "not_found" };
}
