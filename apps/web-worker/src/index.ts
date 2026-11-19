/**
 * findmybusinesspartner.net as one Cloudflare Worker: home page, information pages, share pages for posts and
 * businesses, sitemap, and the static files in apps/share-web/public (images, robots.txt, .well-known app-link files).
 *
 * The page code itself lives in apps/share-web/src (also used by its tests); this file only routes requests to it,
 * so there is a single copy of every page. The Worker runs first for every request (wrangler.jsonc →
 * assets.run_worker_first), which keeps routing, redirects and security headers in one place.
 */
import { handleHome, renderSitemap, type HomeEnv } from "../../share-web/src/home";
import { handleInfo, type InfoRoute } from "../../share-web/src/info";
import { handle, type Kind } from "../../share-web/src/page";

/** The static-assets binding (`assets.binding` in wrangler.jsonc). */
export type AssetFetcher = { fetch(request: Request): Promise<Response> };

export type WorkerEnv = HomeEnv & { ASSETS: AssetFetcher };

const INFO_ROUTES: readonly InfoRoute[] = ["about", "terms", "privacy", "safety", "guidelines", "help", "contact", "delete-account"];
const isInfoRoute = (v: string): v is InfoRoute => (INFO_ROUTES as readonly string[]).includes(v);

const SHARE_PATH = /^\/(post|business)\/([^/]+)$/;

/** Apple and Google fetch these without a file extension / strictly as JSON. */
const JSON_FILES = new Set(["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"]);

/** Added to every response that does not already set them (the HTML handlers set their own CSP). */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

const DEFAULT_SITE = "https://findmybusinesspartner.net";

function siteOrigin(env: WorkerEnv): URL {
  try {
    return new URL(env.SITE_URL || DEFAULT_SITE);
  } catch {
    return new URL(DEFAULT_SITE);
  }
}

const redirect = (location: string) => new Response(null, { status: 301, headers: { Location: location } });
const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** Picks the page for one GET/HEAD request. Exported for tests. */
export async function route(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const site = siteOrigin(env);

  // one public address: www and plain http go to https://<site>, keeping the path
  // (only for the real domain, so a local preview on localhost or a LAN address keeps working)
  if (url.hostname === `www.${site.hostname}` || (url.protocol === "http:" && url.hostname === site.hostname)) {
    return redirect(`${site.origin}${url.pathname}${url.search}`);
  }

  const path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) return redirect(`${url.origin}${path.replace(/\/+$/, "") || "/"}${url.search}`);

  if (path === "/") return handleHome(env, request.url);
  if (path === "/sitemap.xml") {
    return new Response(renderSitemap(env), {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
    });
  }

  const slug = path.slice(1);
  if (isInfoRoute(slug)) return handleInfo(env, slug, request.url);

  const share = SHARE_PATH.exec(path);
  if (share) return handle(env, share[1] as Kind, share[2]);

  // Cloudflare config files in the assets folder (_headers, _redirects) are never public
  if (path.startsWith("/_")) return notFound();

  const asset = await env.ASSETS.fetch(request);
  if (JSON_FILES.has(path) && asset.ok) {
    const json = new Response(asset.body, asset);
    json.headers.set("Content-Type", "application/json");
    return json;
  }
  return asset;
}

function withSecurityHeaders(res: Response): Response {
  const out = new Response(res.body, res); // copy: headers of fetched / redirect responses are read-only
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return withSecurityHeaders(new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } }));
    }
    let res: Response;
    try {
      res = await route(request, env);
    } catch (e) {
      console.error("web-worker: unhandled error", e instanceof Error ? e.message : String(e));
      res = new Response("Something went wrong. Please try again.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    res = withSecurityHeaders(res);
    return request.method === "HEAD" ? new Response(null, res) : res;
  },
};
