/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cyber: {
          deep:    "#020817",
          dark:    "#0b0f19",
          card:    "rgba(8, 15, 35, 0.75)",
          border:  "rgba(255, 255, 255, 0.07)",
          accent:  "#22d3ee",
          purple:  "#818cf8",
          pink:    "#f472b6",
          safe:    "#10b981",
          warning: "#f59e0b",
          danger:  "#f43f5e",
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-cyber": "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(34,211,238,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 10%, rgba(99,102,241,0.06) 0%, transparent 60%)",
      },
      animation: {
        "float": "float 8s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s infinite",
        "scanline": "scanline 3s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s ease forwards",
        "slide-in": "slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "count-up": "countUp 0.6s ease forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        float:   { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-20px)" } },
        fadeUp:  { from: { transform: "translateY(16px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(34,211,238,0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(34,211,238,0.6), 0 0 50px rgba(34,211,238,0.2)" },
        },
      },
      boxShadow: {
        "glow-cyan":  "0 0 20px -5px rgba(34,211,238,0.5)",
        "glow-red":   "0 0 20px -5px rgba(244,63,94,0.5)",
        "glow-green": "0 0 20px -5px rgba(16,185,129,0.5)",
        "glow-card":  "0 25px 50px -12px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
}
