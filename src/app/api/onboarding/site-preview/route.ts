import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ reachable: false });

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Qwikly-Preview/1.0" },
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
    const title = titleMatch?.[1]?.trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? new URL(url).hostname;
    return NextResponse.json({ reachable: true, title });
  } catch {
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch {}
    return NextResponse.json({ reachable: false, title: hostname });
  }
}
