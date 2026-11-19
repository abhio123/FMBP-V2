import { describe, expect, it, vi } from "vitest";
import worker, { type WorkerEnv } from "../index";

const SITE = "https://findmybusinesspartner.net";

function makeEnv(assets: Record<string, { body: string; type?: string }> = {}): WorkerEnv {
  return {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon",
    SITE_URL: SITE,
    SUPPORT_EMAIL: "support@findmybusinesspartner.net",
    ASSETS: {
      fetch: vi.fn(async (req: Request) => {
        const a = assets[new URL(req.url).pathname];
        return a
          ? new Response(a.body, { headers: { "Content-Type": a.type ?? "application/octet-stream" } })
          : new Response("Not found", { status: 404 });
      }),
    },
  };
}

const get = (path: string, env = makeEnv(), init?: RequestInit) => worker.fetch(new Request(`${SITE}${path}`, init), env);

describe("web worker routing", () => {
  it("serves the home page in English and Hindi", async () => {
    const en = await get("/");
    expect(en.status).toBe(200);
    expect(en.headers.get("Content-Type")).toContain("text/html");
    expect(await en.text()).toContain("findmybusinesspartner.net");
    const hi = await get("/?lang=hi");
    expect(hi.headers.get("Content-Language")).toBe("hi");
  });

  it.each(["about", "terms", "privacy", "safety", "guidelines", "help", "contact", "delete-account"])("serves /%s", async (slug) => {
    const res = await get(`/${slug}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("shows the 'no longer available' share page for an unknown or invalid id, without calling the database", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await get("/post/not-a-uuid");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("no longer available");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("renders the sitemap with the public domain", async () => {
    const res = await get("/sitemap.xml");
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(await res.text()).toContain(`<loc>${SITE}/privacy</loc>`);
  });

  it("redirects www and plain http to https on the main domain, keeping the path", async () => {
    const env = makeEnv();
    const www = await worker.fetch(new Request("https://www.findmybusinesspartner.net/privacy?lang=hi"), env);
    expect(www.status).toBe(301);
    expect(www.headers.get("Location")).toBe(`${SITE}/privacy?lang=hi`);
    const http = await worker.fetch(new Request("http://findmybusinesspartner.net/about"), env);
    expect(http.headers.get("Location")).toBe(`${SITE}/about`);
  });

  it("does not force https for a local preview", async () => {
    const res = await worker.fetch(new Request("http://localhost:8787/about"), makeEnv());
    expect(res.status).toBe(200);
  });

  it("removes a trailing slash", async () => {
    const res = await get("/privacy/");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe(`${SITE}/privacy`);
  });

  it("serves the app-link files as JSON", async () => {
    const env = makeEnv({
      "/.well-known/apple-app-site-association": { body: "{}" },
      "/.well-known/assetlinks.json": { body: "[]" },
    });
    for (const p of ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"]) {
      const res = await get(p, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/json");
    }
  });

  it("passes other files to the static assets", async () => {
    const env = makeEnv({ "/robots.txt": { body: "User-agent: *", type: "text/plain" } });
    const res = await get("/robots.txt", env);
    expect(await res.text()).toBe("User-agent: *");
    expect((await get("/missing.png", env)).status).toBe(404);
  });

  it("never serves Cloudflare config files", async () => {
    const env = makeEnv({ "/_headers": { body: "secret config" } });
    const res = await get("/_headers", env);
    expect(res.status).toBe(404);
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("adds security headers to every response, keeping a page's own CSP", async () => {
    const res = await get("/privacy");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    const asset = await get("/robots.txt", makeEnv({ "/robots.txt": { body: "x" } }));
    expect(asset.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("allows only GET and HEAD; HEAD has no body", async () => {
    const post = await get("/", makeEnv(), { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.get("Allow")).toBe("GET, HEAD");
    const head = await get("/privacy", makeEnv(), { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  it("returns a plain 500 instead of crashing when a page throws", async () => {
    const env = makeEnv();
    env.ASSETS.fetch = vi.fn(async () => { throw new Error("boom"); });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get("/logo.png", env);
    expect(res.status).toBe(500);
    err.mockRestore();
  });
});
