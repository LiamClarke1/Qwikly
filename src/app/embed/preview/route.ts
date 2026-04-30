import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const origin = req.nextUrl.origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Widget Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
    h1 { font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -.02em; margin-bottom: 8px; }
    p { color: #64748b; font-size: 15px; margin-bottom: 20px; }
    .cta { display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div>
    <h1>Your client's website</h1>
    <p>This is how the widget looks on a typical customer page.</p>
    <a class="cta" href="#">Get a free quote</a>
  </div>
  <script src="${origin}/embed.js" data-qwikly-id="${key}" data-api="${origin}" async></script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
