import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", "surface-2": "var(--surface-2)", ink: "var(--ink)",
        muted: "var(--muted)", line: "var(--line)", accent: "var(--accent)", "accent-ink": "var(--accent-ink)",
        tag: "var(--tag)", "tag-ink": "var(--tag-ink)", offer: "var(--offer)", ok: "var(--ok)", warn: "var(--warn)",
      },
      fontFamily: { display: "var(--display)", body: "var(--body)", mono: "var(--mono)" },
    },
  },
  plugins: [],
} satisfies Config;
