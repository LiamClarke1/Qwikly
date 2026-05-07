/** @type {import('next').NextConfig} */

// Content-Security-Policy: starting in Report-Only mode for the first deploy
// so we can watch the browser report endpoint for legitimate-traffic
// violations before flipping to enforce. Allows: self, inline styles (Tailwind
// emits them at build time), Supabase API + storage, Anthropic API, Vercel
// analytics + insights, GA / GTM, Resend tracking pixels.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 'unsafe-inline' on script-src is intentional for Next.js inline runtime
  // chunks until we wire up nonces. Tighten in a follow-up.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com https://vercel.live",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://www.google-analytics.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "frame-src 'self' https://vercel.live",
  "worker-src 'self' blob:",
].join("; ");

// X-Frame-Options applies globally except for embed surfaces. The widget
// loader (/embed.js) and the per-tenant branding endpoint
// (/api/embed/branding/*) are intentionally cross-origin loadable —
// embedding them is the whole product.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Subset for embed surfaces: same hardening but without X-Frame-Options DENY.
const EMBED_SECURITY_HEADERS = SECURITY_HEADERS.filter((h) => h.key !== "X-Frame-Options");

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // next 14: this key is "experimental.serverComponentsExternalPackages"
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk", "pdf-parse", "mammoth"],
  },
  async headers() {
    return [
      // Embed surfaces — cross-origin loadable, no X-Frame-Options.
      { source: "/embed.js", headers: EMBED_SECURITY_HEADERS },
      { source: "/api/embed/:path*", headers: EMBED_SECURITY_HEADERS },
      // Everything else gets the full hardened header set.
      { source: "/:path*", headers: SECURITY_HEADERS },
    ];
  },
};

export default nextConfig;
