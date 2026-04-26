import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: "#0b0b0c",
          900: "#131315",
          800: "#1b1b1e",
          700: "#26262a",
          600: "#36363b",
          500: "#54545a",
          400: "#7c7c84",
          300: "#a8a8ad",
          200: "#cfcfd2",
          100: "#e8e6e0",
          50:  "#f5f3ee",
        },
        gold: {
          700: "#8a6d31",
          600: "#a88845",
          500: "#c9a961",
          400: "#d6ba7c",
          300: "#e3cd9b",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 0 1px rgba(201,169,97,0.25), 0 8px 24px -8px rgba(201,169,97,0.25)",
        "premium": "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grain": "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
