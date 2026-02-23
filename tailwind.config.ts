import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Map CSS custom properties to Tailwind utilities
      colors: {
        // Backgrounds
        background: {
          primary: "var(--background-primary)",
          secondary: "var(--background-secondary)",
          tertiary: "var(--background-tertiary)",
          elevated: "var(--background-elevated)",
        },
        // Surfaces
        surface: {
          DEFAULT: "var(--surface-default)",
          default: "var(--surface-default)",
          elevated: "var(--surface-elevated)",
          overlay: "var(--surface-overlay)",
          muted: "var(--surface-muted)",
        },
        // Borders
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          default: "var(--border-default)",
          emphasis: "var(--border-emphasis)",
          strong: "var(--border-strong)",
          accent: "var(--border-accent)",
        },
        // Text
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        // Accents
        accent: {
          blue: "var(--accent-blue)",
          "blue-muted": "var(--accent-blue-muted)",
          cyan: "var(--accent-cyan)",
          "cyan-muted": "var(--accent-cyan-muted)",
          emerald: "var(--accent-emerald)",
          "emerald-muted": "var(--accent-emerald-muted)",
          orange: "var(--accent-orange)",
          "orange-muted": "var(--accent-orange-muted)",
          pink: "var(--accent-pink)",
          "pink-muted": "var(--accent-pink-muted)",
          green: "var(--accent-green)",
          "green-muted": "var(--accent-green-muted)",
          yellow: "var(--accent-yellow)",
          "yellow-muted": "var(--accent-yellow-muted)",
          red: "var(--accent-red)",
          "red-muted": "var(--accent-red-muted)",
          purple: "var(--accent-purple)",
          "purple-muted": "var(--accent-purple-muted)",
        },
        // Status
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          error: "var(--status-error)",
          info: "var(--status-info)",
        },
        // Interactive
        interactive: {
          hover: "var(--interactive-hover)",
          active: "var(--interactive-active)",
          selected: "var(--interactive-selected)",
          disabled: "var(--interactive-disabled)",
        },
      },
      // Spacing (8px system)
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "11": "44px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "28": "112px",
        "32": "128px",
      },
      // Typography
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-normal)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-normal)" }],
        base: ["var(--font-size-base)", { lineHeight: "var(--line-height-normal)" }],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-normal)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-tight)" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-tight)" }],
        "3xl": ["var(--font-size-3xl)", { lineHeight: "var(--line-height-tight)" }],
        "4xl": ["var(--font-size-4xl)", { lineHeight: "var(--line-height-tight)" }],
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
      },
      // Border radius
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      // Box shadows
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
      // Transitions
      transitionDuration: {
        fast: "var(--duration-fast)",
        DEFAULT: "var(--duration-normal)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--easing-default)",
      },
      // Animation keyframes
      animation: {
        "fade-in": "fadeIn 200ms var(--easing-default)",
        "fade-out": "fadeOut 200ms var(--easing-default)",
        "slide-up": "slideUp 200ms var(--easing-default)",
        "slide-down": "slideDown 200ms var(--easing-default)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      // Font families
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
