import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── EDITORIAL PALETTE (landing) ─────────────────────────
        // Cream canvas + deep ink + single burnt-orange accent.
        paper: "#F4EEE4",
        "paper-deep": "#EAE1D1",
        ink: {
          DEFAULT: "#0E0E0C",
          900: "#111110",
          800: "#1A1A18",
          700: "#2A2A27",
          600: "#3C3C38",
          500: "#6A6A63",
          400: "#8F8F86",
          300: "#B5B5AC",
          200: "#D6D2C8",
          100: "#E6E0D4",
        },
        ember: {
          DEFAULT: "#E85A2C",
          deep: "#C3431C",
          soft: "rgba(232,90,44,0.12)",
        },
        sage: {
          DEFAULT: "#3C5A3D",
        },

        // ── LEGACY (dashboard / auth) — kept for (app) routes ────
        "bg-dark": "#111827",
        "bg-card": "#1F2937",
        "bg-elevated": "#374151",
        "bg-light": "#F4EEE4",
        "bg-subtle": "#EAE1D1",
        accent: "#E85A2C",
        "accent-hover": "#C3431C",
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255,255,255,0.75)",
        "text-tertiary": "rgba(255,255,255,0.55)",
        "text-dark": "#0E0E0C",
        "text-muted-dark": "#6A6A63",
        "border-subtle": "rgba(255,255,255,0.1)",
        "border-light": "#D6D2C8",

        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        ghost: {
          DEFAULT: "rgba(255,255,255,0.03)",
          hover: "rgba(255,255,255,0.05)",
        },
        // ── THEME-AWARE SURFACE TOKENS ───────────────────────────
        surface: {
          DEFAULT: "var(--surface)",
          card:    "var(--surface-card)",
          input:   "var(--surface-input)",
          hover:   "var(--surface-hover)",
          active:  "var(--surface-active)",
        },
        // ── THEME-AWARE TEXT TOKENS ──────────────────────────────
        fg: {
          DEFAULT: "var(--text-primary)",
          muted:   "var(--text-muted)",
          subtle:  "var(--text-subtle)",
          faint:   "var(--text-faint)",
        },
        brand: {
          DEFAULT: "#E85A2C",
          hover: "#C3431C",
          glow: "rgba(232,90,44,0.20)",
          soft: "rgba(232,90,44,0.10)",
        },
        success: { DEFAULT: "#3C5A3D", soft: "rgba(60,90,61,0.10)" },
        danger: { DEFAULT: "#C3431C", soft: "rgba(195,67,28,0.10)" },
        warning: { DEFAULT: "#C8941A", soft: "rgba(200,148,26,0.10)" },

        primary: "#E85A2C",
        background: "#07080B",
        foreground: "#F4F4F5",
        muted: "#9CA3AF",
        border: "#1E293B",
        card: "#0E1116",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        heading: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-1": ["44px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-2": ["32px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "h1": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "h2": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "h3": ["15px", { lineHeight: "22px", fontWeight: "600" }],
        "body": ["14px", { lineHeight: "22px" }],
        "small": ["12.5px", { lineHeight: "18px" }],
        "tiny": ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)",
        ink: "0 30px 60px -24px rgba(14,14,12,0.35)",
        glow: "0 0 0 1px rgba(232,90,44,0.30), 0 8px 32px rgba(232,90,44,0.18)",
        pop: "0 24px 60px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grad-brand": "linear-gradient(135deg,#E85A2C 0%,#C3431C 100%)",
        "grad-card": "linear-gradient(180deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)",
      },
      maxWidth: {
        site: "1280px",
        prose: "68ch",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms cubic-bezier(0.22,1,0.36,1)",
        "slide-in-right": "slideInRight 280ms cubic-bezier(0.22,1,0.36,1)",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "shimmer": "shimmer 1.6s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInRight: { "0%": { opacity: "0", transform: "translateX(24px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        pulseSoft: { "0%,100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
    },
  },
  plugins: [],
};
export default config;
