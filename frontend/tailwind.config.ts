import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sapio: {
          bg: "#0d130e",
          surface: "#152016",
          accent: "#44f91f",
          "accent-dim": "#2cbb5d",
          glass: "rgba(20, 30, 20, 0.4)",
          "border-glow": "rgba(68, 249, 31, 0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        outfit: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(68, 249, 31, 0.2)" },
          "50%": { boxShadow: "0 0 25px rgba(68, 249, 31, 0.4)" },
        },
      },
      boxShadow: {
        "neon": "0 0 15px rgba(68, 249, 31, 0.3)",
        "neon-lg": "0 0 30px rgba(68, 249, 31, 0.4)",
        "neon-sm": "0 0 8px rgba(68, 249, 31, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
