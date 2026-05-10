import { ImageResponse } from "next/og";

// Open Graph image for /watch.
// 1200x630, terracotta cream background, small play triangle indicator.

export const runtime = "nodejs";
export const alt = "How an SA plumber goes from 4 to 22 jobs per month with Qwikly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#F4EEE4";
const INK = "#0E0E0C";
const ACCENT = "#8A3B2A";

export default function Image() {
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
            gap: 18,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 999,
              backgroundColor: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BG,
              fontSize: 44,
              lineHeight: 1,
              paddingLeft: 8,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            {/* Play triangle */}
            {"▶"}
          </div>
          <div
            style={{
              fontSize: 28,
              color: INK,
              fontWeight: 600,
              letterSpacing: 0.5,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            Qwikly, watch the demo
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.04,
              color: INK,
              fontWeight: 700,
              letterSpacing: -1.5,
              maxWidth: 1040,
            }}
          >
            How an SA plumber goes from 4 to 22 jobs per month with Qwikly
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
          <div style={{ opacity: 0.75 }}>Real walk-through, real numbers, real diary</div>
          <div style={{ opacity: 0.75 }}>qwikly.co.za/watch</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
