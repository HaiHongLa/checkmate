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
        board: {
          dark: "#769656",
          light: "#eeeed2",
        },
        accent: {
          DEFAULT: "#5c6bc0",
          hover: "#4a56a8",
        },
        surface: {
          DEFAULT: "#1a1a2e",
          card: "#16213e",
          border: "#2a2a4a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
