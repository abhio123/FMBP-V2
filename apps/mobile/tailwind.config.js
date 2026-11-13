const { colors: c } = require("./brand.config.js"); // change colours there, not here

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // The app is light-only (app.json userInterfaceStyle). "class" lets NativeWind set that explicitly on web too.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: c.brand, light: c.brandLight, dark: c.brandDark },
        accent: c.accent,
        ink: { DEFAULT: c.ink, muted: c.inkMuted, faint: c.inkFaint },
        line: c.line,
        surface: { DEFAULT: c.surface, muted: c.surfaceMuted },
        success: c.success,
        danger: c.danger,
      },
    },
  },
  plugins: [],
};
