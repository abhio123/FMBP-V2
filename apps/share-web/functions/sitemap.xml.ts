import { renderSitemap } from "../src/home";
import type { Env } from "../src/page";

/** GET /sitemap.xml: the pages search engines should know (submit it in Google Search Console). */
export const onRequestGet = ({ env }: { env: Env }) =>
  new Response(renderSitemap(env), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
