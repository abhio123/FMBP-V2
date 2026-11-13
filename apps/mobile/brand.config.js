/**
 * Brand settings of the app: the logo files and the colours. Change them here, without touching any other code.
 *
 * The NAME ("Find My Business Partner"), the support e-mail and the company details are in
 * packages/shared/src/brand.ts: the app, the website and the server texts share them. Texts write it as {{appName}}.
 *
 *   assets   the logo, splash screen and icon files. To change the logo, replace these files (same names), or put new
 *            files in apps/mobile/assets and point to them here. brandMark is the logo shown inside the app (login
 *            screen and page headers).
 *   colors   every colour the app uses. The screens, the styling classes (bg-brand, text-ink…), the app icon
 *            background and the splash screen all read them from here.
 *
 * Texts (titles such as "Opportunities", the tagline, notes and hints) live in src/i18n/en.json and src/i18n/hi.json,
 * so each one can be changed in both languages. The most asked-for ones:
 *   app.fullName        "Find My Business Partner"
 *   app.slogan          the tagline, "Grow your business with the right partners" (auth.title is the login heading)
 *   feed.title          "Opportunities" (the Home tab heading); search.posts is the same word on Search
 *   create.partnerTip*  the partnership note on the Post screen
 *
 * After changing the name or the icon files, make a new app build (they are part of the installed app). Colours and texts
 * change with a normal update.
 */
const colors = {
  // brand green: buttons, icons, selected choices
  brand: "#1F6F5F",
  brandLight: "#E6F2EF", // tinted backgrounds behind brand items
  brandDark: "#144A40", // text on brandLight
  // amber: counts, "new" dots, search highlight, rating stars and warnings
  accent: "#F59E0B",
  // text
  ink: "#111827",
  inkMuted: "#6B7280",
  inkFaint: "#9CA3AF",
  // lines and backgrounds
  line: "#E5E7EB",
  surface: "#FFFFFF",
  surfaceMuted: "#F6F7F9",
  white: "#FFFFFF",
  shadow: "#000000", // the soft shadow under cards and dialogs
  // status
  success: "#16A34A",
  danger: "#DC2626",
  dangerDark: "#B91C1C", // error text inside dialogs
  whatsapp: "#25D366", // WhatsApp's own green, for its button only
  // see-through layers
  overlay: "rgba(0,0,0,0.5)", // the dimmed screen behind a dialog
  overlayLight: "rgba(0,0,0,0.45)", // "+3 more" over a photo
  photoBackdrop: "rgba(0,0,0,0.9)", // behind a photo opened full screen
  onDarkMuted: "rgba(255,255,255,0.72)", // small text on a brand-green bubble
  onDarkButton: "rgba(255,255,255,0.18)", // a round button over a photo
};

module.exports = {
  assets: {
    brandMark: "./assets/brand-mark.png",
    icon: "./assets/icon.png",
    androidIconForeground: "./assets/android-icon-foreground.png",
    androidIconBackground: "./assets/android-icon-background.png",
    androidIconMonochrome: "./assets/android-icon-monochrome.png",
    splash: "./assets/splash-icon.png",
    favicon: "./assets/favicon.png",
  },
  colors,
};
