// TODO: if we hit anti-scrape walls (Cloudflare, Akamai), upgrade to a
// headless browser. For now, regex parsing is sufficient for SA SMB websites.

import type { SiteRecon, SiteReconFailReason } from "./site-reader.types";

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 200 * 1024; // 200KB cap
const USER_AGENT = "QwiklyBot/1.0 (+https://www.qwikly.co.za)";
const TITLE_MAX = 200;
const HERO_MAX = 280;
const SERVICES_MAX = 240;
const HERO_MIN_CHARS = 30;

// Query params we keep when normalising the URL. Most tracking params are
// discarded.
const ESSENTIAL_QUERY_PARAMS = new Set<string>([
  "id",
  "page",
  "p",
  "lang",
]);

/**
 * Build an empty failure response.
 */
function buildFailure(
  url: string,
  reason: SiteReconFailReason,
): SiteRecon {
  return {
    url,
    title: null,
    h1: null,
    meta_description: null,
    hero_text: null,
    services_text: null,
    last_scraped_at: new Date().toISOString(),
    ok: false,
    reason,
  };
}

/**
 * Decode the small set of HTML entities we commonly encounter on SMB sites.
 * Numeric entities like &#39; and &#x27; are handled too.
 */
function decodeEntities(input: string): string {
  if (!input) return "";
  const named: Record<string, string> = {
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&copy;": "(c)",
    "&reg;": "(R)",
    "&hellip;": "...",
    "&mdash;": ", ",
    "&ndash;": ", ",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&rdquo;": '"',
    "&ldquo;": '"',
  };
  let out = input;
  for (const key of Object.keys(named)) {
    out = out.split(key).join(named[key]);
  }
  // Numeric decimal entities
  out = out.replace(/&#(\d{1,6});/g, (_match, codeStr: string) => {
    const code = parseInt(codeStr, 10);
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
    try {
      return String.fromCodePoint(code);
    } catch {
      return "";
    }
  });
  // Numeric hex entities
  out = out.replace(/&#x([0-9a-fA-F]{1,6});/g, (_match, codeStr: string) => {
    const code = parseInt(codeStr, 16);
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
    try {
      return String.fromCodePoint(code);
    } catch {
      return "";
    }
  });
  return out;
}

/**
 * Remove all HTML tags, decode entities, and collapse whitespace runs into
 * single spaces. Exported for reuse.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  // Drop script and style blocks entirely.
  let out = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, " ");
  out = out.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Strip every remaining tag.
  out = out.replace(/<[^>]+>/g, " ");
  out = decodeEntities(out);
  // Collapse whitespace.
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

/**
 * Normalise the URL. Adds https:// if scheme is missing and strips non
 * essential query params.
 */
function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let withScheme = trimmed;
  if (!/^https?:\/\//i.test(withScheme)) {
    withScheme = "https://" + withScheme;
  }
  try {
    const u = new URL(withScheme);
    const keep: Array<[string, string]> = [];
    u.searchParams.forEach((value, key) => {
      if (ESSENTIAL_QUERY_PARAMS.has(key.toLowerCase())) {
        keep.push([key, value]);
      }
    });
    u.search = "";
    for (const [k, v] of keep) {
      u.searchParams.append(k, v);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Map an HTTP status to a failure reason. Returns null when the status is OK.
 */
function statusToReason(status: number): SiteReconFailReason | null {
  if (status >= 200 && status < 300) return null;
  if (status === 404 || status === 410) return "404";
  if (status === 403 || status === 429) return "blocked";
  if (status >= 500 && status < 600) return "blocked";
  // Any other non 2xx, treat as blocked.
  return "blocked";
}

/**
 * Read up to MAX_BYTES from a Response body. Stops early once the cap is hit.
 * Falls back to response.text() if streaming is unavailable.
 */
async function readBodyCapped(response: Response): Promise<string> {
  const body = response.body;
  if (!body) {
    const text = await response.text();
    if (text.length > MAX_BYTES) return text.slice(0, MAX_BYTES);
    return text;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let result = "";
  // Read chunks until we hit the cap or the stream ends.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (received + value.byteLength > MAX_BYTES) {
      const remaining = MAX_BYTES - received;
      const slice = value.subarray(0, Math.max(0, remaining));
      result += decoder.decode(slice, { stream: false });
      received = MAX_BYTES;
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors.
      }
      break;
    }
    result += decoder.decode(value, { stream: true });
    received += value.byteLength;
  }
  // Flush any remaining bytes from the decoder.
  result += decoder.decode();
  return result;
}

/**
 * Pull the first <title> value out of the HTML.
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const raw = stripHtml(match[1]);
  if (!raw) return null;
  return raw.slice(0, TITLE_MAX);
}

/**
 * Pull the meta description out of the HTML, case insensitive.
 */
function extractMetaDescription(html: string): string | null {
  // content first, name second
  const re1 =
    /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i;
  const re2 =
    /<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["'][^>]*>/i;
  const match = html.match(re1) ?? html.match(re2);
  if (!match) return null;
  const raw = decodeEntities(match[1]).replace(/\s+/g, " ").trim();
  if (!raw) return null;
  return raw;
}

/**
 * Pull the first <h1> text, tags stripped and entities decoded.
 */
function extractH1(html: string): string | null {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  const raw = stripHtml(match[1]);
  if (!raw) return null;
  return raw;
}

/**
 * Find the first <p> with at least HERO_MIN_CHARS visible characters.
 * Returns the paragraph text and its end offset in the original HTML so we
 * can slice the rest for services_text.
 */
function extractHero(
  html: string,
): { text: string; endIndex: number } | null {
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const inner = stripHtml(m[1]);
    if (inner.length >= HERO_MIN_CHARS) {
      const text = inner.length > HERO_MAX ? inner.slice(0, HERO_MAX) : inner;
      return { text, endIndex: m.index + m[0].length };
    }
  }
  return null;
}

/**
 * Heuristically strip nav and footer chrome before extracting services_text.
 */
function stripChrome(html: string): string {
  let out = html;
  out = out.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  out = out.replace(/<header[\s\S]*?<\/header>/gi, " ");
  out = out.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  out = out.replace(/<aside[\s\S]*?<\/aside>/gi, " ");
  out = out.replace(/<form[\s\S]*?<\/form>/gi, " ");
  return out;
}

/**
 * Compute services_text. Takes the body HTML after the hero, strips chrome
 * and tags, then trims to SERVICES_MAX chars.
 */
function extractServicesText(
  html: string,
  heroEndIndex: number | null,
): string | null {
  const startIndex = heroEndIndex ?? 0;
  const tail = html.slice(startIndex);
  const cleaned = stripChrome(tail);
  const text = stripHtml(cleaned);
  if (!text) return null;
  return text.slice(0, SERVICES_MAX);
}

/**
 * Check that a Content-Type header looks like HTML.
 */
function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) {
    // Some servers omit it. Be lenient and assume HTML.
    return true;
  }
  const ct = contentType.toLowerCase();
  return ct.includes("text/html") || ct.includes("application/xhtml+xml");
}

/**
 * Read a prospect's website and return a SiteRecon. Never throws.
 */
export async function readSite(
  url: string | null | undefined,
): Promise<SiteRecon> {
  if (!url) {
    return buildFailure("", "no_url");
  }
  const normalised = normaliseUrl(url);
  if (!normalised) {
    return buildFailure("", "no_url");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(normalised, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-ZA,en;q=0.9",
      },
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    // AbortError on timeout, everything else is network.
    if (err instanceof Error && err.name === "AbortError") {
      return buildFailure(normalised, "timeout");
    }
    return buildFailure(normalised, "network");
  }
  clearTimeout(timer);

  const statusReason = statusToReason(response.status);
  if (statusReason) {
    return buildFailure(response.url || normalised, statusReason);
  }

  const contentType = response.headers.get("content-type");
  if (!isHtmlContentType(contentType)) {
    return buildFailure(response.url || normalised, "non_html");
  }

  let html: string;
  try {
    html = await readBodyCapped(response);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return buildFailure(response.url || normalised, "timeout");
    }
    return buildFailure(response.url || normalised, "network");
  }

  const title = extractTitle(html);
  const metaDescription = extractMetaDescription(html);
  const h1 = extractH1(html);
  const hero = extractHero(html);
  const heroText = hero ? hero.text : null;
  const servicesText = extractServicesText(
    html,
    hero ? hero.endIndex : null,
  );

  return {
    url: response.url || normalised,
    title,
    h1,
    meta_description: metaDescription,
    hero_text: heroText,
    services_text: servicesText,
    last_scraped_at: new Date().toISOString(),
    ok: true,
  };
}
