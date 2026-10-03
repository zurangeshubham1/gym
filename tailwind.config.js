/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          50: "#f4f7f5",
          100: "#e6eeea",
          500: "#1f7a4d",
          600: "#17633d",
          700: "#124e31",
          900: "#0b2a1b",
          ink: "#111827",
          accent: "#c4a35a",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
