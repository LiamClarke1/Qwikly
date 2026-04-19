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
        primary: "#0F172A",
        "primary-light": "#1E293B",
        cta: "#CA8A04",
        "cta-hover": "#A16207",
        "cta-light": "#FEF3C7",
        accent: "#0EA5E9",
        background: "#F8FAFC",
        foreground: "#0F172A",
        muted: "#64748B",
        "muted-light": "#94A3B8",
        border: "#E2E8F0",
        card: "#FFFFFF",
        success: "#16A34A",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        site: "1200px",
      },
    },
  },
  plugins: [],
};
export default config;
