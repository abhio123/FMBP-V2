// Fills app.json with the brand settings: the name, support e-mail and website (packages/shared/src/brand.ts) and the
// icon and splash files and colours (brand.config.js). app.json keeps everything else.
const fs = require("fs");
const path = require("path");
const brand = require("./brand.config.js");

/** A value of packages/shared/src/brand.ts (a TypeScript file, which a build config cannot import). */
function shared(key) {
  const src = fs.readFileSync(path.join(__dirname, "../../packages/shared/src/brand.ts"), "utf8");
  const m = new RegExp(`\\b${key}: "([^"]+)",`).exec(src);
  if (!m) throw new Error(`packages/shared/src/brand.ts: ${key} not found (keep it as  ${key}: "…",)`);
  return m[1];
}
const appName = shared("appName");

/** Every "FMBP" in a text (permission prompts, store description) becomes the app's name. */
const named = (v) => (typeof v === "string" ? v.replace(/FMBP/g, appName)
  : Array.isArray(v) ? v.map(named)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, named(x)])) : v);

module.exports = ({ config }) => {
  const c = named(config);
  const { assets, colors } = brand;
  return {
    ...c,
    name: appName,
    icon: assets.icon,
    primaryColor: colors.brand,
    android: {
      ...c.android,
      adaptiveIcon: {
        ...c.android?.adaptiveIcon,
        backgroundColor: colors.brand,
        foregroundImage: assets.androidIconForeground,
        backgroundImage: assets.androidIconBackground,
        monochromeImage: assets.androidIconMonochrome,
      },
    },
    web: { ...c.web, name: appName, favicon: assets.favicon, themeColor: colors.brand },
    extra: { ...c.extra, supportEmail: shared("supportEmail"), shareBaseUrl: shared("websiteUrl") },
    plugins: (c.plugins ?? []).map((p) => {
      const [name, opts] = Array.isArray(p) ? p : [p, undefined];
      if (name === "expo-notifications") return [name, { ...opts, color: colors.brand }];
      if (name === "expo-splash-screen") return [name, { ...opts, image: assets.splash, backgroundColor: colors.brand }];
      return p;
    }),
  };
};
