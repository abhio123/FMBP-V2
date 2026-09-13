/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1F6F5F", light: "#E6F2EF", dark: "#144A40" },
        accent: "#F59E0B",
        ink: { DEFAULT: "#111827", muted: "#6B7280", faint: "#9CA3AF" },
        line: "#E5E7EB",
        surface: { DEFAULT: "#FFFFFF", muted: "#F6F7F9" },
        success: "#16A34A",
        danger: "#DC2626",
      },
    },
  },
  plugins: [],
};
