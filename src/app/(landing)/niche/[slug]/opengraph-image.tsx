import { ImageResponse } from "next/og";
import { getNiche, getAllNicheSlugs } from "@/lib/niches";

// Per-niche Open Graph image, served at
// /niche/[slug]/opengraph-image
//
// Uses the Next.js App Router file-convention OG image API.
// 1200x630, terracotta cream background, system serif fallback.
// Brand language only (Qwikly, lead engine, the system). No long dashes.

export const runtime = "nodejs";
export const alt = "Qwikly lead engine for South African service businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#F4EEE4";
const INK = "#0E0E0C";
const ACCENT = "#8A3B2A";

export function generateImageMetadata() {
  return getAllNicheSlugs().map((slug) => {
    const niche = getNiche(slug);
    return {
      id: slug,
      alt: niche
        ? `Qwikly for ${niche.label}, a South African lead engine`
        : "Qwikly lead engine",
      contentType: "image/png",
      size,
    };
  });
}

export default function Image({ params }: { params: { slug: string } }) {
  const niche = getNiche(params.slug);
  const label = niche?.label ?? "service businesses";
  const headline = `Qwikly for ${label}`;
  const subline = niche?.headline ?? "Every enquiry, captured. Every lead, qualified.";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: "72px 80px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: ACCENT,
            }}
          />
          <div
            style={{
              fontSize: 26,
              color: INK,
              fontWeight: 600,
              letterSpacing: 0.5,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            Qwikly
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.02,
              color: INK,
              fontWeight: 700,
              letterSpacing: -1.5,
              maxWidth: 1040,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.25,
              color: ACCENT,
              fontWeight: 500,
              maxWidth: 1040,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            {subline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: INK,
            fontSize: 22,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <div style={{ opacity: 0.7 }}>POPIA compliant, hosted in SA, ZAR pricing</div>
          <div style={{ opacity: 0.7 }}>qwikly.co.za</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
