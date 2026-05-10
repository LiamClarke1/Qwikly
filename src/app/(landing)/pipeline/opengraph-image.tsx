import { ImageResponse } from "next/og";

// Open Graph image for /pipeline.
// 1200x630, terracotta cream background, brand language only.

export const runtime = "nodejs";
export const alt = "Qwikly Pipeline, booked sales calls every week";
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
            Qwikly Pipeline
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 92,
              lineHeight: 1.02,
              color: INK,
              fontWeight: 700,
              letterSpacing: -1.5,
              maxWidth: 1040,
            }}
          >
            Qwikly Pipeline, booked sales calls every week
          </div>
          <div
            style={{
              fontSize: 36,
              lineHeight: 1.25,
              color: ACCENT,
              fontWeight: 500,
              maxWidth: 1040,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            A full-service lead engine for South African operators who want a calendar, not a chat log.
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
          <div style={{ opacity: 0.75 }}>POPIA compliant, hosted in SA, ZAR pricing</div>
          <div style={{ opacity: 0.75 }}>qwikly.co.za/pipeline</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
