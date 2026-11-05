import { describe, expect, it } from "vitest";
import { handleInfo, renderInfo } from "../info";

const env = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "anon", SUPPORT_EMAIL: "help@fmbp.app" };

describe("information pages (fmbp.app/<page>)", () => {
  it("renders the privacy policy in English with the support email filled in", () => {
    const html = renderInfo(env, "privacy", "en")!;
    expect(html).toContain("<title>Privacy policy · FMBP</title>");
    expect(html).toContain("help@fmbp.app");
    expect(html).not.toContain("{{supportEmail}}");
    expect(html).toContain("<ul><li>"); // bullet lines become a list
    expect(html).not.toMatch(/<script/i);
  });

  it("renders Hindi with ?lang=hi and links back to English", async () => {
    const res = handleInfo(env, "terms", "https://fmbp.app/terms?lang=hi");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="hi">');
    expect(html).toContain("उपयोग की शर्तें");
    expect(html).toContain('href="?lang=en"');
  });

  it("has the account deletion page the stores ask for", () => {
    const html = renderInfo(env, "delete-account", "en")!;
    expect(html).toContain("Delete your FMBP account");
    expect(html).toContain("30 days");
    expect(html).toContain("help@fmbp.app");
  });

  it("links every page from every page", () => {
    const html = renderInfo(env, "about", "en")!;
    for (const slug of ["about", "terms", "privacy", "safety", "guidelines", "help", "delete-account"]) expect(html).toContain(`href="/${slug}"`);
  });
});
