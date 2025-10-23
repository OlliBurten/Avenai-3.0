import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        card: "rgb(var(--card))",
        popover: "rgb(var(--popover))",
        muted: "rgb(var(--muted))",
        "muted-foreground": "rgb(var(--muted-foreground))",
        border: "rgb(var(--border))",
        ring: "rgb(var(--ring))",
        // Avenai Brand Colors - Design Tokens
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
          bg: "var(--color-primary-bg)",
          border: "var(--color-primary-border)",
          50: "#F9F5FF",
          100: "#F4EBFF",
          200: "#E9D7FE",
          300: "#D6BBFB",
          400: "#B692F6",
          500: "#9E77ED",
          600: "#7F56D9",
          700: "#6941C6",
          800: "#53389E",
          900: "#42307D",
        },
        brand: {
          50: "#F9F5FF",
          100: "#F4EBFF",
          200: "#E9D7FE",
          300: "#D6BBFB",
          400: "#B692F6",
          500: "#9E77ED",
          600: "#7F56D9",
          700: "#6941C6",
          800: "#53389E",
          900: "#42307D",
        },
        // Neutral Base - Professional & Readable
        neutral: {
          50: "#FAFAFA",   // Almost white
          100: "#F5F5F5",  // Very light gray
          200: "#E5E5E5",  // Light gray
          300: "#D4D4D4",  // Mid-light gray
          400: "#A3A3A3",  // Gray
          500: "#737373",  // Mid gray
          600: "#525252",  // Dark gray
          700: "#404040",  // Darker gray
          800: "#262626",  // Very dark
          900: "#171717",  // Almost black
          950: "#0F0F12",  // Dark mode background
        },
        charcoal: "#1A1A1A",  // Primary text color
        lightGray: "#F3F4F6",  // Surfaces, cards
        midGray: "#9CA3AF",    // Secondary text, borders
      },
      maxWidth: {
        "chat": "1100px",       // container width
        "bubble": "780px",      // max line width for messages (super readable)
      },
      boxShadow: {
        "soft": "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        "glow": "0 0 20px rgba(109, 94, 249, 0.15)",
        "subtle": "0 1px 3px rgba(0,0,0,0.05)",
      },
      backgroundImage: {
        "gradient-avenai": "linear-gradient(135deg, #a78bfa 0%, #6D5EF9 100%)",
        "gradient-hero": "linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)",
        "gradient-dark": "linear-gradient(180deg, #0F0F12 0%, #1A1A1A 100%)",
      },
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            maxWidth: "75ch",
            h1: { fontWeight: "700" },
            h2: { fontWeight: "700", marginTop: "1.25em" },
            h3: { fontWeight: "600", marginTop: "1.15em" },
            code: {
              backgroundColor: theme("colors.gray.100"),
              padding: "0.15rem 0.35rem",
              borderRadius: "0.35rem",
              fontWeight: "600",
            },
            pre: {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
              boxShadow: "none",
              border: "0",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
              boxShadow: "none",
              border: "0",
            },
            a: { color: theme("colors.brand.600"), textDecoration: "none" },
            "a:hover": { textDecoration: "underline" },
          },
        },
      }),
    },
  },
  plugins: [],
}

export default config

