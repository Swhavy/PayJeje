/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./client/**/*.{js,ts,jsx,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: ["Plus Jakarta Sans", "Space Grotesk", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "page-title": [
          "1.25rem",
          { lineHeight: "1.65rem", fontWeight: "800", letterSpacing: "-0.02em" },
        ],
        "page-title-lg": [
          "1.5rem",
          { lineHeight: "2rem", fontWeight: "800", letterSpacing: "-0.025em" },
        ],
        "section-title": [
          "1rem",
          { lineHeight: "1.375rem", fontWeight: "700", letterSpacing: "-0.015em" },
        ],
        "card-title": [
          "0.9375rem",
          { lineHeight: "1.35rem", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
        caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
      },
      colors: {
        brand: {
          50: "hsl(var(--brand-50))",
          400: "hsl(var(--brand-400))",
          500: "hsl(var(--brand-500))",
          950: "hsl(var(--brand-950))",
          glow: "hsl(var(--brand-glow))",
          tint: "hsl(var(--brand-tint))",
          foreground: "hsl(var(--brand-500-foreground))",
        },
        panel: "hsl(var(--panel))",
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Meal Rewards Obsidian Ember & Emerald tokens (scoped to Meal pages)
        meal: {
          surface: "#111317",
          "surface-lowest": "#0c0e12",
          "surface-low": "#1a1c20",
          "surface-card": "#1e2024",
          "surface-high": "#282a2e",
          "surface-highest": "#333539",
          ember: "#ff6b00",
          "ember-light": "#ffb693",
          emerald: "#44e092",
          "emerald-dark": "#004729",
          text: "#e2e2e8",
          "text-muted": "#e2bfb0",
          outline: "#a98a7d",
          "outline-variant": "#5a4136",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius)",
        pill: "9999px",
        lg: "var(--radius-card)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        sheet: "var(--shadow-sheet)",
        glass: "var(--shadow-glass)",
        hero: "var(--shadow-hero)",
        "emerald-glow": "var(--shadow-emerald-glow)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-slow": "spin 3s linear infinite",
        "border-spin": "border-spin 3s linear infinite",
        breathe: "breathe 8s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "line-glow": "line-glow 4s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "traveling-dot": "traveling-dot 3s infinite linear",
        shimmer: "shimmer 2s infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "rotate-slow": "rotate-slow 12s linear infinite",
      },
      keyframes: {
        "border-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.4" },
          "50%": { transform: "scale(1.15)", opacity: "0.65" },
        },
        drift: {
          "0%": { transform: "translateY(100vh) translateX(0)", opacity: "0" },
          "10%": { opacity: "0.4" },
          "90%": { opacity: "0.4" },
          "100%": {
            transform: "translateY(-10vh) translateX(20px)",
            opacity: "0",
          },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "line-glow": {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "50%": { transform: "scaleX(1)", transformOrigin: "left" },
          "50.1%": { transformOrigin: "right" },
          "100%": { transform: "scaleX(0)", transformOrigin: "right" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "traveling-dot": {
          "0%": { left: "0%" },
          "100%": { left: "100%" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.4" },
          "50%": { transform: "scale(1.05)", opacity: "0.7" },
          "100%": { transform: "scale(0.95)", opacity: "0.4" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
