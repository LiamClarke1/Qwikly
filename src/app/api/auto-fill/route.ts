import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  rateLimitMap.forEach((e, k) => { if (now > e.resetAt) rateLimitMap.delete(k); });
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return true; }
  if (e.count >= RATE_LIMIT_MAX) return false;
  e.count++; return true;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Restaurant / Café", "Hair & Beauty Salon", "Gym / Fitness Studio",
  "Medical / Dental Clinic", "Contractor / Trades", "Electrician", "Plumber",
  "Landscaper", "Cleaning Service", "Pest Control", "Pool Care", "Solar Installer",
  "Aircon & HVAC", "Security", "Coffee Shop", "Retail", "Accountant / Bookkeeper",
  "Legal Practice", "Real Estate Agency", "Marketing Agency", "Other",
];

const JSON_SHAPE = `{
  "business_name": "",
  "owner_name": "",
  "industry": "",
  "phone": "",
  "email": "",
  "address": "",
  "areas": "",
  "years_in_business": "",
  "certifications": "",
  "brands_used": "",
  "team_size": "",
  "star_rating": "",
  "review_count": "",
  "testimonials": "",
  "facebook_url": "",
  "instagram_url": "",
  "services_offered": "",
  "services_excluded": "",
  "after_hours": "",
  "emergency_response": "",
  "charge_type": "",
  "callout_fee": "",
  "example_prices": "",
  "minimum_job": "",
  "free_quotes": "",
  "payment_methods": "",
  "payment_terms": "",
  "working_hours": "",
  "booking_lead_time": "",
  "response_time": "",
  "unique_selling_point": "",
  "guarantees": "",
  "common_questions": ""
}`;

const SYSTEM = `You are a business data extraction specialist. Extract structured information from business website content. Return ONLY valid JSON — no markdown, no explanation, just the raw JSON object.`;

const FIELD_RULES = `Field rules:
- "industry": must be exactly one of: ${INDUSTRIES.join(", ")} — pick the closest match, never leave blank
- "after_hours": must be exactly one of: Yes, No, Depends on the job — or ""
- "charge_type": must be exactly one of: Call-out fee + labour, Per job quote, Hourly rate, Mix of the above — or ""
- "free_quotes": must be exactly one of: Yes, No, Only for big jobs — or ""
- "services_offered": bullet list "- service name", one per line, every service mentioned
- "example_prices": bullet list "- Service name: R amount", every price mentioned
- "testimonials": up to 3 real customer quotes verbatim, separated by "---"
- "areas": suburbs, cities, regions as service areas, comma-separated
- "certifications": every accreditation, licence, registration, membership, award
- "guarantees": every guarantee, warranty, promise
- "unique_selling_point": combine all value propositions, trust signals, years of experience, differentiators
- "common_questions": FAQ pairs "Q: ...\nA: ..." separated by blank lines
- "phone": South African phone number (+27 or 0XX format)
- "email": primary contact email (not noreply, webmaster, or spam)
- "facebook_url": full Facebook page URL if found
- "instagram_url": full Instagram URL if found
- "star_rating": numeric rating out of 5 if mentioned
- "review_count": number of reviews if mentioned
- "address": physical street address if stated
- "working_hours": exact operating hours
- "team_size": number of staff, technicians, or vehicles
Never invent data. Only extract what is explicitly stated on the website.`;

// ─── JSON-LD / Schema.org extraction ──────────────────────────────────────────

interface StructuredData {
  business_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  working_hours?: string;
  facebook_url?: string;
  instagram_url?: string;
  star_rating?: string;
  review_count?: string;
  unique_selling_point?: string;
  common_questions?: string;
  example_prices?: string;
}

function extractJsonLd(html: string): StructuredData {
  const result: StructuredData = {};
  const schemas: Record<string, unknown>[] = [];

  for (const m of Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) schemas.push(...parsed);
      else schemas.push(parsed);
    } catch { /* invalid JSON-LD, skip */ }
  }

  for (const schema of schemas) {
    const type = String(schema["@type"] ?? "").toLowerCase();

    if (type.includes("localbusiness") || type.includes("organization") || type.includes("service")) {
      if (schema.name && !result.business_name) result.business_name = String(schema.name);
      if (schema.telephone && !result.phone) result.phone = String(schema.telephone);
      if (schema.email && !result.email) result.email = String(schema.email);
      if (schema.description && !result.unique_selling_point) result.unique_selling_point = String(schema.description);
      if (schema.priceRange && !result.example_prices) result.example_prices = String(schema.priceRange);

      const addr = schema.address as Record<string, unknown> | undefined;
      if (addr && !result.address) {
        const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion]
          .filter(Boolean).map(String);
        if (parts.length) result.address = parts.join(", ");
      }

      const hours = schema.openingHours ?? schema.openingHoursSpecification;
      if (hours && !result.working_hours) {
        result.working_hours = Array.isArray(hours) ? hours.map(String).join(", ") : String(hours);
      }

      const sameAs = schema.sameAs;
      const sameAsArr: string[] = Array.isArray(sameAs) ? sameAs : sameAs ? [String(sameAs)] : [];
      if (!result.facebook_url) result.facebook_url = sameAsArr.find(u => u.includes("facebook.com"));
      if (!result.instagram_url) result.instagram_url = sameAsArr.find(u => u.includes("instagram.com"));

      const rating = schema.aggregateRating as Record<string, unknown> | undefined;
      if (rating) {
        if (rating.ratingValue && !result.star_rating) result.star_rating = String(rating.ratingValue);
        const rc = rating.reviewCount ?? rating.ratingCount;
        if (rc && !result.review_count) result.review_count = String(rc);
      }
    }

    if (type === "faqpage" && !result.common_questions) {
      const mainEntity = schema.mainEntity as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(mainEntity)) {
        const faqs = mainEntity.map(item => {
          const q = String(item.name ?? "");
          const ans = item.acceptedAnswer as Record<string, unknown> | undefined;
          const a = String(ans?.text ?? "");
          return q ? `Q: ${q}${a ? `\nA: ${a}` : ""}` : "";
        }).filter(Boolean);
        if (faqs.length) result.common_questions = faqs.join("\n\n");
      }
    }
  }

  return result;
}

// ─── Regex extraction ──────────────────────────────────────────────────────────

function extractRegex(html: string): Partial<StructuredData> {
  const result: Partial<StructuredData> = {};

  // SA phone: +27 or 0XX patterns
  const phoneMatch = html.match(/(?:href=["']tel:|[">(\s,])(\+27|0[678][0-9])[0-9\s\-]{7,10}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0]
      .replace(/^(?:href=["']tel:|[">(\s,])/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20);
  }

  // Email: filter noise
  const emailMatches = Array.from(html.matchAll(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g))
    .map(m => m[1])
    .filter(e => !/(noreply|no-reply|webmaster|@sentry|@example|@schema|\.png|\.jpg)/.test(e));
  if (emailMatches.length) result.email = emailMatches[0];

  // Facebook
  const fbMatch = html.match(/href=["'](https?:\/\/(?:www\.)?facebook\.com\/(?!sharer)[^"'?\s\/]+[^"'?\s]*)/i);
  if (fbMatch) result.facebook_url = fbMatch[1];

  // Instagram
  const igMatch = html.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?\s\/]+[^"'?\s]*)/i);
  if (igMatch) result.instagram_url = igMatch[1];

  return result;
}

// ─── HTML utilities ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ").trim();
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const { hostname, origin } = new URL(baseUrl);
  const seen = new Set<string>();
  const links: string[] = [];
  for (const m of Array.from(html.matchAll(/href=["']([^"'#?][^"']*?)["']/gi))) {
    const href = m[1].trim();
    if (!href || /^(mailto:|tel:|javascript:)/.test(href)) continue;
    try {
      const abs = new URL(href, origin).href.split("?")[0].split("#")[0];
      if (new URL(abs).hostname !== hostname || seen.has(abs)) continue;
      seen.add(abs); links.push(abs);
    } catch { /* skip */ }
  }
  return links;
}

function scoreLink(url: string): number {
  const p = url.toLowerCase();
  if (/\/(contact|contact-us|get-in-touch|reach-us)/.test(p)) return 25;
  if (/\/(service|services|what-we-do|offerings|solutions)/.test(p)) return 22;
  if (/\/(pricing|price|prices|cost|costs|rates|tariff)/.test(p)) return 21;
  if (/\/(about|about-us|our-story|company|who-we-are)/.test(p)) return 19;
  if (/\/(testimonial|reviews?|feedback|clients|google-reviews)/.test(p)) return 18;
  if (/\/(faq|faqs|frequently-asked|questions|help)/.test(p)) return 18;
  if (/\/(area|areas|coverage|where-we-work|locations|suburbs)/.test(p)) return 16;
  if (/\/(team|staff|our-team|meet-the-team)/.test(p)) return 14;
  if (/\/(guarantee|warranty|promise|assurance)/.test(p)) return 13;
  if (/\/(product|products|equipment|brands)/.test(p)) return 10;
  if (/\/(gallery|work|projects|portfolio)/.test(p)) return 8;
  if (/\/(blog|news|article|post|media|press)/.test(p)) return -5;
  if (/\/(privacy|terms|cookie|legal|disclaimer)/.test(p)) return -10;
  if (/\/(cart|checkout|login|register|account|wp-admin)/.test(p)) return -20;
  if (/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|zip)/.test(p)) return -20;
  return 3;
}

// ─── Fetch utilities ───────────────────────────────────────────────────────────

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-ZA,en-GB;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
};

async function tryDirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000), redirect: "follow" });
    return res.ok ? await res.text() : null;
  } catch { return null; }
}

// Jina Reader: handles JS-rendered sites (React, Wix, Webflow, Squarespace)
async function tryJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "Accept": "text/plain", "X-Timeout": "15" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 200 ? text : null;
  } catch { return null; }
}

async function tryWayback(url: string): Promise<string | null> {
  try {
    const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json() as { archived_snapshots?: { closest?: { url?: string; available?: boolean } } };
    const snap = d?.archived_snapshots?.closest;
    if (!snap?.url || !snap.available) return null;
    const sr = await fetch(snap.url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!sr.ok) return null;
    const html = await sr.text();
    return html.replace(/<!-- BEGIN WAYBACK[\s\S]*?END WAYBACK[^>]*?-->/gi, "");
  } catch { return null; }
}

async function tryAllOrigins(url: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

async function tryCorsProxy(url: string): Promise<string | null> {
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(12000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

// Raw HTML for structured data extraction (JSON-LD, regex)
async function fetchRawHtml(url: string): Promise<string | null> {
  let html = await tryDirect(url);
  if (!html || html.length < 200) html = await tryWayback(url);
  if (!html || html.length < 200) html = await tryAllOrigins(url);
  if (!html || html.length < 200) html = await tryCorsProxy(url);
  return html && html.length >= 200 ? html : null;
}

// Clean text content (Jina first for JS sites, then fallbacks)
async function fetchCleanText(url: string): Promise<string | null> {
  const jina = await tryJina(url);
  if (jina) return jina;
  const html = await tryDirect(url) ?? await tryWayback(url) ?? await tryAllOrigins(url);
  if (!html || html.length < 200) return null;
  return stripHtml(html);
}

async function tryDuckDuckGoFallback(domain: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(domain + " services pricing")}&kl=za-en`,
      { headers: { ...BROWSER_HEADERS, Accept: "text/html", Referer: "https://duckduckgo.com/" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const snippets = Array.from(html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi))
      .map(m => stripHtml(m[1]).trim()).filter(s => s.length > 20);
    return snippets.length > 0 ? `Search snippets for ${domain}:\n${snippets.join("\n")}` : null;
  } catch { return null; }
}

// ─── Crawl ─────────────────────────────────────────────────────────────────────

interface CrawlResult {
  textContent: string;
  structuredData: StructuredData;
  regexData: Partial<StructuredData>;
  pagesCrawled: number;
}

async function crawlSite(rawUrl: string): Promise<CrawlResult> {
  const baseUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const rootUrl = (() => { try { const u = new URL(baseUrl); return `${u.protocol}//${u.hostname}`; } catch { return baseUrl; } })();
  const domain = (() => { try { return new URL(baseUrl).hostname; } catch { return baseUrl; } })();

  // Fetch seed: raw HTML (for structured data) + clean text (for Claude) in parallel
  const [seedHtmlResult, seedTextResult] = await Promise.all([
    fetchRawHtml(baseUrl).then(h => h ?? (baseUrl !== rootUrl ? fetchRawHtml(rootUrl) : null)),
    fetchCleanText(baseUrl).then(t => t ?? (baseUrl !== rootUrl ? fetchCleanText(rootUrl) : null)),
  ]);

  if (!seedHtmlResult && !seedTextResult) {
    const snippets = await tryDuckDuckGoFallback(domain);
    if (snippets && snippets.length > 100) {
      return { textContent: snippets.slice(0, 50000), structuredData: {}, regexData: {}, pagesCrawled: 0 };
    }
    throw new Error("SEED_FAILED");
  }

  // Extract structured data from raw seed HTML
  const structuredData = seedHtmlResult ? extractJsonLd(seedHtmlResult) : {};
  const regexData = seedHtmlResult ? extractRegex(seedHtmlResult) : {};

  // Discover and score sub-pages
  const allLinks = seedHtmlResult ? extractInternalLinks(seedHtmlResult, baseUrl) : [];
  const subUrls = allLinks
    .map(url => ({ url, score: scoreLink(url) }))
    .filter(l => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(l => l.url);

  // Fetch sub-pages (clean text only — Jina handles JS-heavy sub-pages)
  const subResults = await Promise.allSettled(subUrls.map(url => fetchCleanText(url)));

  const parts: string[] = [];
  if (seedTextResult) parts.push(`=== ${baseUrl} ===\n${seedTextResult.slice(0, 4000)}`);

  subResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      parts.push(`=== ${subUrls[i]} ===\n${r.value.slice(0, 3500)}`);
    }
  });

  const pagesCrawled = 1 + subResults.filter(r => r.status === "fulfilled" && r.value).length;
  const textContent = parts.join("\n\n").slice(0, 50000);

  return { textContent, structuredData, regexData, pagesCrawled };
}

// ─── Confidence scoring ────────────────────────────────────────────────────────

type ConfidenceLevel = "high" | "medium" | "low";

function scoreConfidence(value: string, isHighConf: boolean): ConfidenceLevel {
  if (!value || !value.trim()) return "low";
  if (isHighConf) return "high";
  if (value.length > 30) return "medium";
  return "low";
}

// ─── Claude extraction ─────────────────────────────────────────────────────────

interface UploadedFile { base64: string; mediaType: string; name: string; }

async function runClaude(textContent: string, files: UploadedFile[]): Promise<Record<string, string>> {
  const hasFiles = files.length > 0;
  const prompt = hasFiles && !textContent
    ? `Extract every business detail from the attached documents. Return ONLY this JSON:\n\n${JSON_SHAPE}\n\n${FIELD_RULES}`
    : `Extract all business details from this website content. Return ONLY this JSON:\n\n${JSON_SHAPE}\n\n${FIELD_RULES}\n\nWEBSITE CONTENT (${textContent.length} characters):\n${textContent}`;

  const message = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: [
        ...files.map(f => ({
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: f.base64 },
        })),
        { type: "text" as const, text: prompt },
      ],
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

  let extracted: Record<string, string>;
  try { extracted = JSON.parse(cleaned); }
  catch { throw new Error("PARSE_FAILED"); }

  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(extracted)) {
    safe[k] = typeof v === "string" ? v : String(v ?? "");
  }
  return safe;
}

// ─── Field label map for UI ────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  business_name: "Business name",
  phone: "Phone number",
  email: "Email address",
  address: "Physical address",
  industry: "Industry",
  areas: "Service areas",
  services_offered: "Services",
  example_prices: "Pricing",
  working_hours: "Working hours",
  certifications: "Certifications",
  guarantees: "Guarantees",
  unique_selling_point: "Selling points",
  testimonials: "Customer reviews",
  facebook_url: "Facebook page",
  instagram_url: "Instagram",
  star_rating: "Star rating",
  review_count: "Review count",
  common_questions: "FAQs",
};

// ─── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  let body: { url?: string; fileText?: string; files?: UploadedFile[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const { url, fileText, files = [] } = body;
  if (!url && !fileText && files.length === 0) {
    return NextResponse.json({ error: "Provide a URL, files, or text content." }, { status: 400 });
  }

  let textContent = "";
  let structuredData: StructuredData = {};
  let regexData: Partial<StructuredData> = {};
  let pagesCrawled = 0;

  if (url) {
    try {
      const result = await crawlSite(url);
      textContent = result.textContent;
      structuredData = result.structuredData;
      regexData = result.regexData;
      pagesCrawled = result.pagesCrawled;
    } catch (err) {
      if (files.length === 0 && !fileText) {
        const msg = err instanceof Error ? err.message : "";
        return NextResponse.json({
          error: msg === "SEED_FAILED"
            ? "Could not load that website. Try uploading a PDF or using the 'Paste your info' option instead."
            : "Something went wrong fetching the site. Try uploading a PDF instead.",
        }, { status: 422 });
      }
    }
  } else if (fileText) {
    textContent = fileText.slice(0, 50000);
  }

  try {
    const claudeData = await runClaude(textContent, files);

    // Merge: structured/regex data wins over Claude (it's authoritative)
    const merged: Record<string, string> = { ...claudeData };
    const overrides: Record<string, string> = {
      ...(structuredData as Record<string, string>),
      ...(regexData as Record<string, string>),
    };
    for (const [k, v] of Object.entries(overrides)) {
      if (v && v.trim()) merged[k] = v.trim();
    }

    // Confidence map
    const highConfFields = new Set([
      ...Object.keys(structuredData).filter(k => (structuredData as Record<string, unknown>)[k]),
      ...Object.keys(regexData).filter(k => (regexData as Record<string, unknown>)[k]),
    ]);

    const confidence: Record<string, ConfidenceLevel> = {};
    for (const [k, v] of Object.entries(merged)) {
      confidence[k] = scoreConfidence(v, highConfFields.has(k));
    }

    // Discovery list for real-time UI feed
    const discovered = Object.entries(FIELD_LABELS).map(([field, label]) => ({
      field,
      label,
      found: !!(merged[field] && merged[field].trim()),
      confidence: confidence[field] ?? "low",
      source: highConfFields.has(field)
        ? (Object.keys(structuredData).includes(field) ? "schema" : "regex")
        : "claude",
    }));

    const fieldsFound = Object.values(merged).filter(v => v && v.trim()).length;

    return NextResponse.json({
      data: merged,
      confidence,
      discovered,
      stats: { pages_crawled: pagesCrawled, fields_found: fieldsFound },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "PARSE_FAILED") {
      return NextResponse.json({ error: "AI couldn't structure the data. Try adding more detail or pasting content directly." }, { status: 422 });
    }
    console.error("auto-fill error:", err);
    return NextResponse.json({ error: "AI error. Please fill in manually." }, { status: 500 });
  }
}
