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
        // Backgrounds — clean, friendly
        "bg-dark": "#111827",
        "bg-card": "#1F2937",
        "bg-elevated": "#374151",
        "bg-light": "#FFFFFF",
        "bg-subtle": "#F9FAFB",

        // Accent — friendly blue
        accent: "#2563EB",
        "accent-hover": "#1D4ED8",

        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255,255,255,0.75)",
        "text-tertiary": "rgba(255,255,255,0.55)",
        "text-dark": "#111827",
        "text-muted-dark": "#6B7280",

        // Borders
        "border-subtle": "rgba(255,255,255,0.1)",
        "border-light": "#E5E7EB",

        // Status
        success: "#10B981",
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
