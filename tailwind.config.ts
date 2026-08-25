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
          50: "#eef8ff",
          100: "#d9f0ff",
          500: "#0b84d8",
          600: "#076fb8",
          700: "#075a95"
        },
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
