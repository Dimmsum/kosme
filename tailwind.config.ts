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
        "k-white": "#FAFAF8",
        "k-black": "#111010",
        "k-primary": "#3B0A2A",
        "k-primary-light": "#551840",
        "k-accent": "#E5007D",
        "k-accent-light": "#C47BA3",
        "k-gray-100": "#F2F0EC",
        "k-gray-200": "#E4E1DA",
        "k-gray-400": "#9B9690",
        "k-gray-600": "#5A5750",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        display: ["var(--font-dm-serif)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
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
