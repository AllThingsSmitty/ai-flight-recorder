import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["ui-monospace", "'JetBrains Mono'", "monospace"],
      },
      colors: {
        surface: {
          0: "#0d0d0e",
          1: "#161618",
          2: "#1e1e21",
          3: "#26262a",
        },
        border: "#2a2a2d",
      },
    },
  },
  plugins: [],
};

export default config;
