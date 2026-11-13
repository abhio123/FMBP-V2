import { BRAND } from "@fmbp/shared";
import { APP_NAME, COLORS } from "..";

// Node's file functions (this test runs in Node; the app itself has no Node types)
declare const __dirname: string;
/* eslint-disable @typescript-eslint/no-require-imports */
const { readdirSync, readFileSync, statSync } = require("fs") as {
  readdirSync: (p: string) => string[]; readFileSync: (p: string, enc: "utf8") => string; statSync: (p: string) => { isDirectory: () => boolean };
};
const { join } = require("path") as { join: (...p: string[]) => string };

const brand = require("../../../brand.config.js");
const root = join(__dirname, "../../..");

describe("brand settings: one place for the name and colours", () => {
  it("the app reads the colours from brand.config.js and the name from packages/shared/src/brand.ts", () => {
    expect(COLORS).toEqual(brand.colors);
    expect(APP_NAME).toBe(BRAND.appName);
  });

  it("the app build (app.config.js) uses the same name, support e-mail and website, and every logo file exists", () => {
    const appConfig = require("../../../app.config.js") as (c: { config: Record<string, unknown> }) => { name: string; extra: Record<string, string> };
    const built = appConfig({ config: { extra: {}, plugins: [] } });
    expect(built.name).toBe(BRAND.appName);
    expect(built.extra).toMatchObject({ supportEmail: BRAND.supportEmail, shareBaseUrl: BRAND.websiteUrl });
    const { existsSync } = require("fs") as { existsSync: (p: string) => boolean };
    for (const file of Object.values(brand.assets as Record<string, string>)) expect(existsSync(join(root, file))).toBe(true);
  });

  it("no screen hard-codes a colour (it would not change with the brand file)", () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) { if (f !== "__tests__") walk(p); continue; }
        if (!/\.tsx?$/.test(f)) continue;
        const code = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // comments may name colours
        if (/["'`]#[0-9A-Fa-f]{3,8}\b|rgba?\(/.test(code)) found.push(p.slice(root.length + 1));
      }
    };
    walk(join(root, "app")); walk(join(root, "src"));
    expect(found).toEqual([]);
  });

  it("texts use {{appName}} instead of writing the name", () => {
    for (const lang of ["en", "hi"]) {
      expect(readFileSync(join(root, `src/i18n/${lang}.json`), "utf8")).not.toMatch(/FMBP/);
    }
  });
});
