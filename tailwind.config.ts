import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "k-white":   "#FAFAF8",
        "k-black":   "#111010",
        "k-primary": "#1D3A2F",
        "k-primary-light": "#2D5442",
        "k-accent":  "#C8A96E",
        "k-accent-light": "#E5CFA0",
        "k-gray-100": "#F2F0EC",
        "k-gray-200": "#E4E1DA",
        "k-gray-400": "#9B9690",
        "k-gray-600": "#5A5750",
      },
      fontFamily: {
        serif:   ["var(--font-cormorant)", "Georgia", "serif"],
        display: ["var(--font-dm-serif)", "Georgia", "serif"],
        sans:    ["var(--font-dm-sans)", "sans-serif"],
      },
      letterSpacing: {
        tight2: "-0.02em",
        tight3: "-0.03em",
        tight4: "-0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
