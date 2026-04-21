import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Landing site colors
        "bg-dark": "#111827",
        "bg-card": "#1F2937",
        "bg-elevated": "#374151",
        "bg-light": "#FFFFFF",
        "bg-subtle": "#F9FAFB",
        accent: "#2563EB",
        "accent-hover": "#1D4ED8",
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255,255,255,0.75)",
        "text-tertiary": "rgba(255,255,255,0.55)",
        "text-dark": "#111827",
        "text-muted-dark": "#6B7280",
        "border-subtle": "rgba(255,255,255,0.1)",
        "border-light": "#E5E7EB",

        // Dashboard: background layers
        ink: {
          950: "#07080B",
          900: "#0B0D11",
          800: "#0E1116",
          700: "#13171E",
          600: "#1A1F28",
          500: "#242A35",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
        ghost: {
          DEFAULT: "rgba(255,255,255,0.03)",
          hover: "rgba(255,255,255,0.05)",
        },
        fg: {
          DEFAULT: "#F4F4F5",
          muted: "#9CA3AF",
          subtle: "#6B7280",
          faint: "#4B5563",
        },
        // Qwikly brand = amber (not green)
        brand: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          glow: "rgba(245,158,11,0.18)",
          soft: "rgba(245,158,11,0.10)",
        },
        violet: {
          DEFAULT: "#8B5CF6",
          soft: "rgba(139,92,246,0.10)",
        },
        sky: {
          DEFAULT: "#38BDF8",
          soft: "rgba(56,189,248,0.10)",
        },
        success: { DEFAULT: "#22C55E", soft: "rgba(34,197,94,0.10)" },
        danger: { DEFAULT: "#F87171", soft: "rgba(248,113,113,0.10)" },
        warning: { DEFAULT: "#FBBF24", soft: "rgba(251,191,36,0.10)" },

        // Legacy dashboard compat
        primary: "#1E40AF",
        background: "#07080B",
        foreground: "#F4F4F5",
        muted: "#9CA3AF",
        border: "#1E293B",
        card: "#0E1116",
        danger_old: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-opensans)", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
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
        glow: "0 0 0 1px rgba(245,158,11,0.30), 0 8px 32px rgba(245,158,11,0.18)",
        pop: "0 24px 60px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grad-brand": "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)",
        "grad-violet": "linear-gradient(135deg,#8B5CF6 0%,#6D28D9 100%)",
        "grad-card": "linear-gradient(180deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)",
        "grad-mesh": "radial-gradient(60% 60% at 30% 0%,rgba(245,158,11,0.10) 0%,transparent 60%),radial-gradient(50% 50% at 80% 20%,rgba(139,92,246,0.08) 0%,transparent 60%)",
      },
      maxWidth: {
        site: "1200px",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms cubic-bezier(0.22,1,0.36,1)",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "shimmer": "shimmer 1.6s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
    },
  },
  plugins: [],
};
export default config;
