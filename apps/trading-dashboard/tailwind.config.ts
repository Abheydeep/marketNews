import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./store/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        panel: "#111827",
        panelSoft: "#172033",
        line: "#2c3446",
        gain: "#11a36a",
        loss: "#db3b4d",
        amber: "#f4b740",
        cyan: "#31c7d7"
      }
    }
  },
  plugins: []
};

export default config;

