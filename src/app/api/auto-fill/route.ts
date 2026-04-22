import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM = `You are a business data extraction specialist for South African service businesses. Extract every piece of useful information from the provided content. Return ONLY valid JSON — no markdown, no explanation, just the raw JSON object.`;

const JSON_SHAPE = `{
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
}`;

const FIELD_RULES = `Field rules:
- "trade": must be exactly one of: Electrician, Plumber, Roofer, Solar Installer, Pest Control, Aircon / HVAC, Pool Cleaning, Landscaper, Garage Doors, Security, Other
- "after_hours": must be exactly one of: Yes, No, Depends on the job — or ""
- "charge_type": must be exactly one of: Call-out fee + labour, Per job quote, Hourly rate, Mix of the above — or ""
- "free_quotes": must be exactly one of: Yes, No, Only for big jobs — or ""
- "services_offered": bullet list, one per line starting "- ", extract every single service mentioned
- "example_prices": bullet list "- Service name: R amount" — extract every price mentioned
- "areas": all suburbs, cities, regions mentioned as service areas, comma-separated
- "certifications": every accreditation, registration, licence, membership, award mentioned
- "guarantees": every guarantee, warranty, promise mentioned
- "unique_selling_point": combine all value propositions, trust signals, years of experience, differentiators
- "common_questions": every FAQ or question answered, as a bullet list
- "payment_methods": all payment options (cash, EFT, card, etc.)
- "working_hours": exact hours if stated
- "team_size": number of staff, technicians, vehicles if mentioned

Be thorough. Capture everything explicitly stated. Never invent data.`;

const buildWebPrompt = (content: string) =>
  `You have been given text scraped from a South African service business website. Extract every useful detail and return ONLY this JSON:\n\n${JSON_SHAPE}\n\n${FIELD_RULES}\n\nWEBSITE CONTENT (${content.length} characters from multiple pages):\n${content}`;

const PDF_PROMPT = `Extract every business detail from the attached documents and return ONLY this JSON structure. Use "" for fields you cannot find. Never invent data — only use what is explicitly stated.\n\n${JSON_SHAPE}\n\n${FIELD_RULES}`;

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
    } catch { /* skip invalid */ }
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
  if (p.match(/\/(blog|news|article|post|media|press)/)) return -5;
  if (p.match(/\/(privacy|terms|cookie|legal|disclaimer)/)) return -10;
  if (p.match(/\/(cart|checkout|login|register|account|wp-admin)/)) return -20;
  if (p.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|zip)/)) return -20;
  return 3;
}

async function tryFetch(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function tryWayback(url: string): Promise<string | null> {
  try {
    const availRes = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) });
    if (!availRes.ok) return null;
    const data = await availRes.json() as { archived_snapshots?: { closest?: { url?: string; available?: boolean } } };
    const snapshotUrl = data?.archived_snapshots?.closest?.url;
    if (!snapshotUrl || !data?.archived_snapshots?.closest?.available) return null;
    const snapRes = await fetch(snapshotUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!snapRes.ok) return null;
    const html = await snapRes.text();
    return html.replace(/<!-- BEGIN WAYBACK[\s\S]*?END WAYBACK[^>]*?-->/gi, "");
  } catch { return null; }
}

async function tryAllOrigins(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function tryCorsProxy(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function tryThingProxy(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function tryDuckDuckGoSnippets(domain: string): Promise<string | null> {
  try {
    const queries = [`"${domain}" services pricing`, `site:${domain}`];
    const parts: string[] = [];
    for (const q of queries) {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=za-en`, {
        headers: { ...BROWSER_HEADERS, "Accept": "text/html", "Referer": "https://duckduckgo.com/" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const snippetMatches = Array.from(html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi));
      const titleMatches = Array.from(html.matchAll(/class="result__title"[^>]*>([\s\S]*?)<\/a>/gi));
      const snippets = [...titleMatches, ...snippetMatches].map((m) => stripHtml(m[1]).trim()).filter((s) => s.length > 20);
      if (snippets.length > 0) parts.push(snippets.join("\n"));
    }
    return parts.length > 0 ? `Search snippets for ${domain}:\n${parts.join("\n\n")}` : null;
  } catch { return null; }
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

async function crawlSite(rawUrl: string): Promise<string> {
  const baseUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const rootUrl = (() => { try { const u = new URL(baseUrl); return `${u.protocol}//${u.hostname}`; } catch { return baseUrl; } })();
  const domain = (() => { try { return new URL(baseUrl).hostname; } catch { return baseUrl; } })();

  let seed = await fetchPage(baseUrl);
  if (!seed && baseUrl !== rootUrl) seed = await fetchPage(rootUrl);

  if (!seed) {
    const snippets = await tryDuckDuckGoSnippets(domain);
    if (snippets && snippets.length > 100) return snippets.slice(0, 28000);
    throw new Error("SEED_FAILED");
  }

  const allLinks = extractInternalLinks(seed.html, baseUrl);
  const scored = allLinks
    .map((url) => ({ url, score: scoreLink(url) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((l) => l.url);

  const pageResults = await Promise.allSettled(scored.map((url) => fetchPage(url)));

  const parts: string[] = [`\n=== PAGE: ${baseUrl} ===\n${seed.text.slice(0, 3000)}`];
  pageResults.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      parts.push(`\n=== PAGE: ${scored[i]} ===\n${result.value.text.slice(0, 2500)}`);
    }
  });

  return parts.join("\n\n").slice(0, 28000);
}

// ─── Claude call helper ───────────────────────────────────────────────────────

interface UploadedFile {
  base64: string;
  mediaType: string;
  name: string;
}

async function runClaude(textContent: string, files: UploadedFile[]): Promise<Record<string, string>> {
  const hasFiles = files.length > 0;

  const userMessage: MessageParam = {
    role: "user",
    content: [
      ...files.map((f) => ({
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf" as const, data: f.base64 },
      })),
      {
        type: "text" as const,
        text: hasFiles && !textContent ? PDF_PROMPT : buildWebPrompt(textContent),
      },
    ],
  };

  const message = await client.messages.create({
    model: hasFiles ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001",
    max_tokens: 2500,
    system: SYSTEM,
    messages: [userMessage],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

  let extracted: Record<string, string>;
  try {
    extracted = JSON.parse(cleaned);
  } catch {
    console.error("JSON parse failed:", raw.slice(0, 500));
    throw new Error("PARSE_FAILED");
  }

  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(extracted)) {
    safe[k] = typeof v === "string" ? v : String(v ?? "");
  }
  return safe;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  let body: { url?: string; fileText?: string; files?: UploadedFile[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { url, fileText, files = [] } = body;

  if (!url && !fileText && files.length === 0) {
    return NextResponse.json({ error: "Provide a URL, files, or text content." }, { status: 400 });
  }

  let textContent = "";

  if (url) {
    try {
      textContent = await crawlSite(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SEED_FAILED") {
        // If we also have files, proceed with files only
        if (files.length === 0 && !fileText) {
          return NextResponse.json(
            { error: "Could not load that website. Try uploading a PDF or using the 'Paste your info' option instead." },
            { status: 422 }
          );
        }
      } else {
        if (files.length === 0 && !fileText) {
          return NextResponse.json(
            { error: "Something went wrong fetching the site. Try uploading a PDF instead." },
            { status: 422 }
          );
        }
      }
    }
  } else if (fileText) {
    textContent = fileText.slice(0, 28000);
  }

  try {
    const data = await runClaude(textContent, files);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "PARSE_FAILED") {
      return NextResponse.json({ error: "AI couldn't structure the data. Try adding more detail or pasting content directly." }, { status: 422 });
    }
    console.error("Anthropic error:", err);
    return NextResponse.json({ error: "AI error. Please fill in manually." }, { status: 500 });
  }
}
