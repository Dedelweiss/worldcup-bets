import type { Config } from "tailwindcss";

/**
 * Neon Stadium — extension du thème Tailwind v4.
 * Les tokens shadcn principaux vivent dans src/app/globals.css (@theme / :root).
 */
const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: [
          "var(--font-space-grotesk)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        neon: {
          lime: "#a3e635",
          fuchsia: "#d946ef",
        },
      },
      borderRadius: {
        bento: "1rem",
        "bento-lg": "1.5rem",
      },
    },
  },
};

export default config;
