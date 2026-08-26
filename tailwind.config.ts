import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/contexts/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "#d8dee8",
        panel: "#ffffff",
        muted: "#f3f6fa",
        ink: "#111827",
        subdued: "#5b6575",
        brand: {
          50: "#eef3ff",
          100: "#dce7ff",
          200: "#bfd1ff",
          300: "#91b1f6",
          500: "#2458bd",
          600: "#1d4ca8",
          700: "#173e91",
          800: "#153575"
        },
        "pet-yellow": "#f2e832",
        success: "#16875a",
        warning: "#b7791f",
        danger: "#c2413b"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
