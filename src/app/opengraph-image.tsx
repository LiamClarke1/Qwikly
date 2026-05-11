import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Qwikly — Reply to every visitor. Find new clients every day. Two products for SA service businesses.";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export default async function Image() {
  const [bold, regular] = await Promise.all([
    fetch(new URL("/fonts/Inter-Bold.ttf", BASE_URL)).then((r) =>
      r.arrayBuffer()
    ),
    fetch(new URL("/fonts/Inter-Regular.ttf", BASE_URL)).then((r) =>
      r.arrayBuffer()
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0E0E0C",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* Ember glow blob */}
        <div
          style={{
            position: "absolute",
            right: -60,
            bottom: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232,90,44,0.22) 0%, transparent 70%)",
          }}
        />

        {/* Top: eyebrow + wordmark */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#E85A2C",
              }}
            />
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                fontSize: 18,
                letterSpacing: "0.15em",
                color: "rgba(244,238,228,0.5)",
                textTransform: "uppercase",
              }}
            >
              Two products for SA service businesses
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 56,
                color: "#F4EEE4",
                letterSpacing: "-1.5px",
              }}
            >
              Qwikly
            </span>
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 56,
                color: "#E85A2C",
                letterSpacing: "-1.5px",
              }}
            >
              .
            </span>
          </div>
        </div>

        {/* Middle: two-line headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 68,
              color: "#F4EEE4",
              letterSpacing: "-2.5px",
              lineHeight: 1.05,
            }}
          >
            Reply to every visitor.
          </span>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 68,
              color: "#E85A2C",
              letterSpacing: "-2.5px",
              lineHeight: 1.05,
            }}
          >
            Find new clients every day.
          </span>
        </div>

        {/* Bottom: two product lines + domain */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxWidth: 760,
            }}
          >
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                fontSize: 21,
                color: "rgba(244,238,228,0.60)",
                lineHeight: 1.4,
              }}
            >
              Digital Assistant — replies to every website visitor in under 60s,
              qualifies them, emails you the lead.
            </span>
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                fontSize: 21,
                color: "rgba(244,238,228,0.60)",
                lineHeight: 1.4,
              }}
            >
              Outbound — a daily list of hand-picked new prospects delivered
              straight to your dashboard.
            </span>
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: 400,
              fontSize: 20,
              color: "rgba(244,238,228,0.30)",
              letterSpacing: "0.05em",
              alignSelf: "flex-end",
            }}
          >
            qwikly.co.za
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: bold, weight: 700, style: "normal" },
        { name: "Inter", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
