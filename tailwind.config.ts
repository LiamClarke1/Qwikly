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
        // Backgrounds — dark, layered, premium
        "bg-dark": "#050505",
        "bg-card": "#0C0C0C",
        "bg-elevated": "#141414",
        "bg-light": "#FAFAFA",
        "bg-subtle": "#F5F5F5",

        // Accent — warm gold
        accent: "#D4A843",
        "accent-hover": "#B8922F",

        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255,255,255,0.65)",
        "text-tertiary": "rgba(255,255,255,0.4)",
        "text-dark": "#0C0A09",
        "text-muted-dark": "#57534E",

        // Borders
        "border-subtle": "rgba(255,255,255,0.07)",
        "border-light": "#E7E5E4",

        // Status
        success: "#22C55E",
        danger: "#EF4444",
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
