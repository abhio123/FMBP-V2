import { describe, expect, it } from "vitest";
import { businessPreview, escapeHtml, firstPhoto, handle, isUuid, postPreview, renderPage, type Env } from "../page";

const env: Env = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "anon", SITE_URL: "https://findmybusinesspartner.net" };
const ID = "4e60e4b0-3672-41d4-a1d0-b3aafce540a4";
const PHOTO = "https://db.example/storage/v1/object/public/business-media/b1/post-1.jpg";

const post = {
  id: ID, title: "Selling Machine in Greater Noida", description: "Jalebi making machine, barely used.", city: "Greater Noida",
  basic: { budget: 5000 }, advanced: { photos: ["file:///local/only.jpg", PHOTO] },
  business: { name: "My Sweet shop", cover_url: "https://db.example/cover.jpg", logo_url: null },
};

describe("share page", () => {
  it("validates ids before querying", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid("1 or 1=1")).toBe(false);
    expect(isUuid("../admin")).toBe(false);
  });

  it("escapes everything that comes from the database", () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;");
    const html = renderPage(env, "post", ID, postPreview({ ...post, title: `<img src=x onerror=alert(1)>` }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("uses the post's uploaded photo, ignoring device paths, then the business cover", () => {
    expect(firstPhoto(post.basic, post.advanced)).toBe(PHOTO);
    expect(postPreview(post).image).toBe(PHOTO);
    expect(postPreview({ ...post, advanced: { photos: ["file:///x.jpg"] } }).image).toBe("https://db.example/cover.jpg");
  });

  it("renders link-preview tags, app link and store button", () => {
    const html = renderPage(env, "post", ID, postPreview(post));
    expect(html).toContain(`<meta property="og:title" content="Selling Machine in Greater Noida">`);
    expect(html).toContain(`<meta property="og:image" content="${PHOTO}">`);
    expect(html).toContain(`<meta property="og:url" content="https://findmybusinesspartner.net/post/${ID}">`);
    expect(html).toContain(`href="fmbp://post/${ID}"`);
    expect(html).toContain("play.google.com/store/apps/details?id=io.fmbp.app");
    expect(html).not.toContain("apps.apple.com"); // no App Store id configured yet
    expect(renderPage({ ...env, IOS_APP_STORE_ID: "123456" }, "post", ID, postPreview(post))).toContain("apps.apple.com/app/id123456");
  });

  it("falls back to category and city for a business without a description", () => {
    const p = businessPreview({ id: ID, name: "Bhatura King", description: null, city: "Noida", cover_url: null, logo_url: "https://db.example/logo.png", category: { name_en: "Food & Restaurant" } });
    expect(p.description).toBe("Food & Restaurant · Noida");
    expect(p.image).toBe("https://db.example/logo.png");
  });

  it("returns 404 with store links for a missing or invalid post, without querying for invalid ids", async () => {
    let calls = 0;
    const fake = (async () => { calls++; return new Response("[]", { status: 200 }); }) as typeof fetch;
    const missing = await handle(env, "post", ID, fake);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("This post is no longer available");
    const invalid = await handle(env, "post", "not-a-uuid", fake);
    expect(invalid.status).toBe(404);
    expect(calls).toBe(1);
  });

  it("serves a found post with security headers", async () => {
    const fake = (async () => new Response(JSON.stringify([post]), { status: 200 })) as typeof fetch;
    const res = await handle(env, "post", ID, fake);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
  });
});
