/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./client/**/*.{js,ts,jsx,ts}"],
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
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        navy: {
          500: "#1d3a6a",
          600: "#152c52",
          700: "#0f2040",
          800: "#0a1628",
          900: "#060d1a",
        },
        green: {
          500: "#00c96e",
          400: "#00e87d",
          deep: "#003d20",
        },
        "blue-accent": "#00a8ff",
        "text-primary": "#e8f0ff",
        "text-secondary": "#7a9cc8",
        "text-muted": "#3d5a80",
        danger: "#ff5c6c",
        gold: "#f5a623",
        /* end */
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
        // Paywaka brand colors
        paywaka: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e", // Primary green
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
