import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#171D2B", light: "#647081" },
        paper: { DEFAULT: "#F8FAF9", texture: "#F8FAF9" },
        border: "#E1E6E9",
        accent: { blue: "#3658F5", red: "#3658F5" },
      },
      fontFamily: {
        sans: ["Arial", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        serif: ["Arial", "PingFang SC", "sans-serif"],
        mono: ["SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        paper: "0 8px 32px -20px rgba(23,29,43,.16)",
        float: "0 18px 45px -25px rgba(23,29,43,.3)",
      },
    },
  },
  plugins: [],
};
export default config;
