// Lightweight URL crawler — returns plain text up to 50k chars.
// Uses Jina Reader first (handles JS-rendered sites), falls back to direct fetch.

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-ZA,en-GB;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
};

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

function extractLinks(html: string, baseUrl: string): string[] {
  const { hostname, origin } = new URL(baseUrl);
  const seen = new Set<string>();
  const links: string[] = [];
  for (const m of Array.from(html.matchAll(/href=["']([^"'#?][^"']*?)["']/gi))) {
    const href = m[1].trim();
    if (!href || /^(mailto:|tel:|javascript:)/.test(href)) continue;
    try {
      const abs = new URL(href, origin).href.split("?")[0].split("#")[0];
      if (new URL(abs).hostname !== hostname || seen.has(abs)) continue;
      seen.add(abs);
      links.push(abs);
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
  if (/\/(testimonial|reviews?|feedback|clients)/.test(p)) return 18;
  if (/\/(faq|faqs|frequently-asked|questions|help)/.test(p)) return 18;
  if (/\/(area|areas|coverage|locations|suburbs)/.test(p)) return 16;
  if (/\/(team|staff|our-team)/.test(p)) return 14;
  if (/\/(guarantee|warranty|promise)/.test(p)) return 13;
  if (/\/(product|products|equipment|brands)/.test(p)) return 10;
  if (/\/(gallery|work|projects|portfolio)/.test(p)) return 8;
  if (/\/(blog|news|post|media)/.test(p)) return -5;
  if (/\/(privacy|terms|cookie|legal)/.test(p)) return -10;
  if (/\.(pdf|jpg|png|gif|css|js|xml|zip)/.test(p)) return -20;
  return 3;
}

async function tryJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain", "X-Timeout": "15" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 200 ? text : null;
  } catch { return null; }
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function getPageText(url: string): Promise<string | null> {
  // Jina Reader handles JS-rendered sites (React, Wix, Webflow, Squarespace)
  const jina = await tryJina(url);
  if (jina) return jina;
  const html = await tryFetch(url);
  if (!html || html.length < 200) return null;
  return stripHtml(html);
}

export async function crawlUrl(rawUrl: string, depthLimit = 5): Promise<string> {
  const baseUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const origin = (() => { try { const u = new URL(baseUrl); return `${u.protocol}//${u.hostname}`; } catch { return baseUrl; } })();

  const seedText = await getPageText(baseUrl).then(t => t ?? (baseUrl !== origin ? getPageText(origin) : null));
  const seedHtml = await tryFetch(baseUrl).then(h => h ?? (baseUrl !== origin ? tryFetch(origin) : null));

  if (!seedText && !seedHtml) throw new Error("CRAWL_FAILED");

  const allLinks = seedHtml ? extractLinks(seedHtml, baseUrl) : [];
  const topLinks = allLinks
    .map((u) => ({ u, s: scoreLink(u) }))
    .filter((l) => l.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, depthLimit)
    .map((l) => l.u);

  const pageResults = await Promise.allSettled(topLinks.map((u) => getPageText(u)));

  const parts: string[] = [];
  if (seedText) parts.push(`=== ${baseUrl} ===\n${seedText.slice(0, 4000)}`);
  pageResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      parts.push(`=== ${topLinks[i]} ===\n${r.value.slice(0, 3500)}`);
    }
  });

  return parts.join("\n\n").slice(0, 50000);
}
