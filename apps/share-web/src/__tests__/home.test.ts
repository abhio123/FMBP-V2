import { describe, expect, it } from "vitest";
import { handleHome, renderHome, renderSitemap } from "../home";
import { handleInfo } from "../info";

const env = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "anon", SITE_URL: "https://findmybusinesspartner.net", SUPPORT_EMAIL: "help@findmybusinesspartner.net" };

describe("home page (findmybusinesspartner.net/)", () => {
  it("English by default: pitch, how it works, trust, FAQ, links to every information page; no scripts", async () => {
    const res = handleHome(env, "https://findmybusinesspartner.net/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("How it works");
    expect(html).toContain("Do I need a business?");
    for (const p of ["/about", "/terms", "/privacy", "/contact", "/delete-account"]) expect(html).toContain(`href="${p}"`);
    expect(html).toContain('hreflang="hi" href="https://findmybusinesspartner.net/?lang=hi"');
    expect(html).not.toMatch(/<script(?![^>]*application\/ld\+json)/i); // only the JSON-LD data block
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("Hindi with ?lang=hi, and the links keep the language", () => {
    const html = renderHome(env, "hi");
    expect(html).toContain('<html lang="hi">');
    expect(html).toContain("कैसे काम करता है");
    expect(html).toContain('href="/privacy?lang=hi"');
  });

  it("store buttons only once the apps are live; Coming soon before", () => {
    expect(renderHome(env, "en")).toContain("Coming soon");
    expect(renderHome(env, "en")).not.toContain("play.google.com");
    const live = renderHome({ ...env, STORES_LIVE: "1", IOS_APP_STORE_ID: "123456789" }, "en");
    expect(live).toContain("https://play.google.com/store/apps/details?id=io.fmbp.app");
    expect(live).toContain("https://apps.apple.com/app/id123456789");
  });

  it("the contact page names the grievance officer section (IT Rules 2021)", async () => {
    const html = await handleInfo(env, "contact", "https://findmybusinesspartner.net/contact").text();
    expect(html).toContain("Grievance officer");
    expect(html).toContain("15 days");
  });

  it("sitemap lists home and every information page in both languages", () => {
    const xml = renderSitemap(env);
    expect(xml).toContain("<loc>https://findmybusinesspartner.net/</loc>");
    expect(xml).toContain("<loc>https://findmybusinesspartner.net/contact?lang=hi</loc>");
    expect(xml).toContain("<loc>https://findmybusinesspartner.net/delete-account</loc>");
  });
});
