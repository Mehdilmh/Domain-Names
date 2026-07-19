import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DomainPulse design system — emerald/amber, dark-first. NOT blue/indigo.
        background: "#0B0F0E",
        surface: "#131A18",
        border: "#1F2C28",
        input: "#1F2C28",
        ring: "#14B87A",
        primary: {
          DEFAULT: "#14B87A", // emerald
          foreground: "#04120C",
        },
        secondary: {
          DEFAULT: "#E8B44A", // amber — warnings & "value" highlights
          foreground: "#1A1204",
        },
        danger: {
          DEFAULT: "#E05252",
          foreground: "#180404",
        },
        foreground: "#ECF2F0",
        muted: {
          DEFAULT: "#131A18",
          foreground: "#8A9C96",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        // the single permitted gradient: faint emerald radial glow behind hero
        "hero-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(20,184,122,0.16) 0%, rgba(20,184,122,0.04) 45%, transparent 70%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
