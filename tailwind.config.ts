import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1e40af",
          dark: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
