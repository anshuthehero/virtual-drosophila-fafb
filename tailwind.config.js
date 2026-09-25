/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        doom: {
          bg: "#050505",
          panel: "#0A0A0A",
          surface: "#111111",
          border: "#262626",
          borderLight: "#404040",
          text: "#F5F5F5",
          textMuted: "#888888",
          fear: "#FF1E56",
          reward: "#00FF88",
          compass: "#00E5FF",
          motor: "#FFB300",
          rest: "#B388FF"
        }
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Space Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      }
    },
  },
  plugins: [],
}
