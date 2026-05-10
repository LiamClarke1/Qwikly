import { ImageResponse } from "next/og";

// Open Graph image for /compare.
// 1200x630, terracotta cream background.

export const runtime = "nodejs";
export const alt = "Qwikly is not a chat widget. It is a lead engine.";
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
            Qwikly compared
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
            Qwikly is not a chat widget.
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.02,
              color: ACCENT,
              fontWeight: 700,
              letterSpacing: -1.5,
              maxWidth: 1040,
            }}
          >
            It is a lead engine.
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
          <div style={{ opacity: 0.75 }}>Built for South African service businesses</div>
          <div style={{ opacity: 0.75 }}>qwikly.co.za/compare</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
