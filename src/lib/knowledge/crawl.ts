// Lightweight URL crawler — strips HTML, returns plain text up to 28k chars.

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
  if (/\/(service|services|what-we-do|offerings)/.test(p)) return 20;
  if (/\/(pricing|price|cost|rates)/.test(p)) return 19;
  if (/\/(about|about-us|company|team)/.test(p)) return 18;
  if (/\/(faq|faqs|questions|help)/.test(p)) return 17;
  if (/\/(contact|get-in-touch)/.test(p)) return 15;
  if (/\/(blog|news|post|media)/.test(p)) return -5;
  if (/\/(privacy|terms|cookie|legal)/.test(p)) return -10;
  if (/\.(pdf|jpg|png|gif|css|js|xml|zip)/.test(p)) return -20;
  return 3;
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

export async function crawlUrl(rawUrl: string, depthLimit = 5): Promise<string> {
  const baseUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const origin = (() => { try { const u = new URL(baseUrl); return `${u.protocol}//${u.hostname}`; } catch { return baseUrl; } })();

  let seedHtml = await tryFetch(baseUrl);
  if (!seedHtml && baseUrl !== origin) seedHtml = await tryFetch(origin);
  if (!seedHtml) throw new Error("CRAWL_FAILED");

  const allLinks = extractLinks(seedHtml, baseUrl);
  const topLinks = allLinks
    .map((u) => ({ u, s: scoreLink(u) }))
    .filter((l) => l.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, depthLimit)
    .map((l) => l.u);

  const pageResults = await Promise.allSettled(topLinks.map((u) => tryFetch(u)));

  const parts: string[] = [`=== ${baseUrl} ===\n${stripHtml(seedHtml).slice(0, 3000)}`];
  pageResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      parts.push(`=== ${topLinks[i]} ===\n${stripHtml(r.value).slice(0, 2500)}`);
    }
  });

  return parts.join("\n\n").slice(0, 30000);
}
