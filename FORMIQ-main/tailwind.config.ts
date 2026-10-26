import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#090A0A",
        paper: "#F4F2EC",
        "paper-light": "#FAFAF7",
        "paper-dark": "#E8E5DD",
        neutral: {
          50: "#FAFAF9",
          100: "#F4F2EC",
          200: "#E5E3DB",
          300: "#D3D0C6",
          400: "#B8B8B0",
          500: "#8A8A82",
          600: "#5E605E",
          700: "#3E403E",
          800: "#222422",
          900: "#090A0A",
        },
        darkgray: "#222422",
        "formiq-blue": "#315CFF",
        "formiq-blue-hover": "#2548CC",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.05em",
        tightest: "-0.08em",
        widest: "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
