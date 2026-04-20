import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Claude Prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are a business data extraction specialist for South African service businesses. Extract every piece of useful information from the provided website content. Return ONLY valid JSON — no markdown, no explanation, just the raw JSON object.`;

const buildPrompt = (content: string) => `You have been given the full text content scraped from multiple pages of a South African service business website. Extract every useful detail and return ONLY this JSON structure. Use "" for fields you cannot find. Never invent data — only use what is explicitly stated.

{
  "business_name": "",
  "owner_name": "",
  "trade": "",
  "areas": "",
  "years_in_business": "",
  "certifications": "",
  "brands_used": "",
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
  "team_size": "",
  "guarantees": "",
  "unique_selling_point": "",
  "common_questions": ""
}

Field rules:
- "trade": must be exactly one of: Electrician, Plumber, Roofer, Solar Installer, Pest Control, Aircon / HVAC, Pool Cleaning, Landscaper, Garage Doors, Security, Other
- "after_hours": must be exactly one of: Yes, No, Depends on the job — or ""
- "charge_type": must be exactly one of: Call-out fee + labour, Per job quote, Hourly rate, Mix of the above — or ""
- "free_quotes": must be exactly one of: Yes, No, Only for big jobs — or ""
- "services_offered": bullet list, one per line starting "- ", extract every single service mentioned anywhere on the site
- "example_prices": bullet list "- Service name: R amount" — extract every price mentioned
- "areas": all suburbs, cities, regions mentioned as service areas, comma-separated
- "certifications": every accreditation, registration, licence, membership, award mentioned
- "guarantees": every guarantee, warranty, promise mentioned
- "unique_selling_point": combine all value propositions, trust signals, years of experience, team size, differentiators
- "common_questions": every FAQ or question the site answers, as a bullet list
- "payment_methods": all payment options mentioned (cash, EFT, card, etc.)
- "working_hours": exact hours if stated
- "team_size": number of staff, technicians, vehicles if mentioned

Be thorough. If something appears on any page of the site, capture it.

WEBSITE CONTENT (${content.length} characters from multiple pages):
${content}`;

// ─── Utilities ────────────────────────────────────────────────────────────────

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
    .replace(/\s{2,}/g, " ")
    .trim();
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-ZA,en-GB;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

// ─── Link extraction & scoring ────────────────────────────────────────────────

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const { hostname, origin } = new URL(baseUrl);
  const linkRegex = /href=["']([^"'#?][^"']*?)["']/gi;
  const seen = new Set<string>();
  const links: string[] = [];

  for (const match of Array.from(html.matchAll(linkRegex))) {
    const href = match[1].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;

    try {
      const abs = new URL(href, origin).href.split("?")[0].split("#")[0];
      if (new URL(abs).hostname !== hostname) continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      links.push(abs);
    } catch {
      // skip invalid
    }
  }

  return links;
}

function scoreLink(url: string): number {
  const p = url.toLowerCase();
  if (p.match(/\/(service|services|what-we-do|offerings|solutions)/)) return 20;
  if (p.match(/\/(pricing|price|prices|cost|costs|rates|tariff)/)) return 19;
  if (p.match(/\/(about|about-us|our-story|company|who-we-are|team)/)) return 18;
  if (p.match(/\/(faq|faqs|frequently-asked|questions|help)/)) return 17;
  if (p.match(/\/(contact|contact-us|get-in-touch|reach-us)/)) return 15;
  if (p.match(/\/(area|areas|coverage|where-we-work|locations|suburbs)/)) return 14;
  if (p.match(/\/(guarantee|warranty|promise|assurance)/)) return 13;
  if (p.match(/\/(product|products|equipment|brands)/)) return 10;
  if (p.match(/\/(testimonial|reviews|feedback|clients)/)) return 9;
  if (p.match(/\/(work|projects|portfolio|gallery)/)) return 6;
  // Deprioritise
  if (p.match(/\/(blog|news|article|post|media|press)/)) return -5;
  if (p.match(/\/(privacy|terms|cookie|legal|disclaimer)/)) return -10;
  if (p.match(/\/(cart|checkout|login|register|account|wp-admin)/)) return -20;
  if (p.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|zip)/)) return -20;
  return 3;
}

// ─── Fetch strategies ─────────────────────────────────────────────────────────

async function tryFetch(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html;
  } catch {
    return null;
  }
}

async function tryWayback(url: string): Promise<string | null> {
  try {
    const availRes = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!availRes.ok) return null;

    const data = await availRes.json() as {
      archived_snapshots?: { closest?: { url?: string; available?: boolean } };
    };

    const snapshotUrl = data?.archived_snapshots?.closest?.url;
    if (!snapshotUrl || !data?.archived_snapshots?.closest?.available) return null;

    const snapRes = await fetch(snapshotUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!snapRes.ok) return null;

    const html = await snapRes.text();
    return html.replace(/<!-- BEGIN WAYBACK[\s\S]*?END WAYBACK[^>]*?-->/gi, "");
  } catch {
    return null;
  }
}

async function tryAllOrigins(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function tryCorsProxy(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function tryThingProxy(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://thingproxy.freeboard.io/fetch/${url}`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Fetch DuckDuckGo search snippets for a domain — works even on fully blocked sites
async function tryDuckDuckGoSnippets(domain: string): Promise<string | null> {
  try {
    const queries = [
      `"${domain}" services pricing`,
      `site:${domain}`,
    ];
    const parts: string[] = [];

    for (const q of queries) {
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=za-en`,
        {
          headers: {
            ...BROWSER_HEADERS,
            "Accept": "text/html",
            "Referer": "https://duckduckgo.com/",
          },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) continue;
      const html = await res.text();
      // Extract result snippets — DDG wraps them in .result__snippet
      const snippetMatches = Array.from(html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi));
      const titleMatches = Array.from(html.matchAll(/class="result__title"[^>]*>([\s\S]*?)<\/a>/gi));
      const snippets = [...titleMatches, ...snippetMatches]
        .map((m) => stripHtml(m[1]).trim())
        .filter((s) => s.length > 20);
      if (snippets.length > 0) parts.push(snippets.join("\n"));
    }

    return parts.length > 0 ? `Search snippets for ${domain}:\n${parts.join("\n\n")}` : null;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<{ html: string; text: string } | null> {
  let html: string | null = null;

  html = await tryFetch(url);
  if (!html || html.length < 100) html = await tryWayback(url);
  if (!html || html.length < 100) html = await tryAllOrigins(url);
  if (!html || html.length < 100) html = await tryCorsProxy(url);
  if (!html || html.length < 100) html = await tryThingProxy(url);
  if (!html || html.length < 100) return null;

  const text = stripHtml(html);
  if (text.length < 30) return null;

  return { html, text };
}

// ─── Full site crawl ──────────────────────────────────────────────────────────

async function crawlSite(rawUrl: string): Promise<string> {
  const baseUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const rootUrl = (() => { try { const u = new URL(baseUrl); return `${u.protocol}//${u.hostname}`; } catch { return baseUrl; } })();
  const domain = (() => { try { return new URL(baseUrl).hostname; } catch { return baseUrl; } })();

  // 1. Try the given URL, then root domain as fallback
  let seed = await fetchPage(baseUrl);
  if (!seed && baseUrl !== rootUrl) seed = await fetchPage(rootUrl);

  // 2. If all page fetches failed, fall back to DuckDuckGo snippets
  if (!seed) {
    const snippets = await tryDuckDuckGoSnippets(domain);
    if (snippets && snippets.length > 100) {
      console.log(`[crawl] Using DuckDuckGo snippets for ${domain}`);
      return snippets.slice(0, 28000);
    }
    throw new Error("SEED_FAILED");
  }

  // 2. Extract and score internal links
  const allLinks = extractInternalLinks(seed.html, baseUrl);
  const scored = allLinks
    .map((url) => ({ url, score: scoreLink(url) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // fetch up to 8 additional pages
    .map((l) => l.url);

  console.log(`[crawl] Seed: ${baseUrl} | Found ${allLinks.length} links | Fetching: ${scored.length} pages`);

  // 3. Fetch additional pages in parallel
  const pageResults = await Promise.allSettled(
    scored.map((url) => fetchPage(url))
  );

  // 4. Combine all text
  const parts: string[] = [];

  parts.push(`\n=== PAGE: ${baseUrl} ===\n${seed.text.slice(0, 3000)}`);

  pageResults.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      const url = scored[i];
      const text = result.value.text.slice(0, 2500);
      parts.push(`\n=== PAGE: ${url} ===\n${text}`);
    }
  });

  const combined = parts.join("\n\n");
  console.log(`[crawl] Total content: ${combined.length} chars from ${parts.length} pages`);

  return combined.slice(0, 28000);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  let body: { url?: string; fileText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { url, fileText } = body;
  if (!url && !fileText) {
    return NextResponse.json({ error: "Provide a URL or text content." }, { status: 400 });
  }

  let content = "";

  if (url) {
    try {
      content = await crawlSite(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SEED_FAILED") {
        return NextResponse.json(
          { error: "Could not load that website after trying multiple methods. Try the 'Paste your info' option — copy text from their About or Services page and paste it in." },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: "Something went wrong fetching the site. Try the Paste option instead." },
        { status: 422 }
      );
    }
  } else if (fileText) {
    content = fileText.slice(0, 28000);
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "No content found. Try the Paste option." }, { status: 422 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(content) }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

    let extracted: Record<string, string>;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed:", raw.slice(0, 500));
      return NextResponse.json(
        { error: "AI couldn't structure the extracted data. Try pasting content directly." },
        { status: 422 }
      );
    }

    const safe: Record<string, string> = {};
    for (const [k, v] of Object.entries(extracted)) {
      safe[k] = typeof v === "string" ? v : String(v ?? "");
    }

    return NextResponse.json({ data: safe });
  } catch (err: unknown) {
    console.error("Anthropic error:", err);
    return NextResponse.json({ error: "AI error. Please fill in manually." }, { status: 500 });
  }
}
