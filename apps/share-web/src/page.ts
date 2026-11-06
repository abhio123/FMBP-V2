/**
 * Share page for https://fmbp.app/post/<id> and /business/<id>.
 *
 * When the FMBP app is installed, iOS Universal Links / Android App Links open these URLs in the app and this page is
 * never seen. Otherwise (or inside an in-app browser) it shows a preview with "Open in app" and store buttons.
 * Messengers (WhatsApp, Telegram, iMessage, LinkedIn…) read the Open Graph tags to draw the link card with the photo.
 *
 * Everything from the database is untrusted: it is HTML-escaped, and only http(s) URLs are used for images.
 */

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /** Public origin of this site, e.g. https://fmbp.app */
  SITE_URL?: string;
  /** Numeric App Store id once the iOS app is published (enables the App Store button and Smart App Banner). */
  IOS_APP_STORE_ID?: string;
  ANDROID_PACKAGE?: string;
};

export type Kind = "post" | "business";

export type Preview = {
  kind: Kind;
  id: string;
  title: string;
  description: string;
  /** Second line under the title, e.g. "Bhatura King · Greater Noida". */
  subtitle: string;
  image: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const httpUrl = (v: unknown): string | null => (typeof v === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : null);

const clip = (s: string | null | undefined, max: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** First uploaded photo in a post's form answers (photo fields hold arrays of public URLs). */
export function firstPhoto(...parts: (Record<string, unknown> | null | undefined)[]): string | null {
  for (const part of parts) {
    for (const v of Object.values(part ?? {})) {
      if (!Array.isArray(v)) continue;
      for (const item of v) { const u = httpUrl(item); if (u && /\/storage\/v1\/object\/public\//.test(u)) return u; }
    }
  }
  return null;
}

type PostRow = {
  id: string; title: string; description: string | null; city: string;
  basic: Record<string, unknown> | null; advanced: Record<string, unknown> | null;
  business: { name: string; cover_url: string | null; logo_url: string | null } | null;
};
type BusinessRow = {
  id: string; name: string; description: string | null; city: string; cover_url: string | null; logo_url: string | null;
  category: { name_en: string } | null;
};

export function postPreview(r: PostRow): Preview {
  return {
    kind: "post", id: r.id, title: clip(r.title, 120), description: clip(r.description, 200),
    subtitle: [r.business?.name, r.city].filter(Boolean).join(" · "),
    // the post's own photo, else the business's cover or logo
    image: firstPhoto(r.basic, r.advanced) ?? httpUrl(r.business?.cover_url) ?? httpUrl(r.business?.logo_url),
  };
}

export function businessPreview(r: BusinessRow): Preview {
  return {
    kind: "business", id: r.id, title: clip(r.name, 120),
    description: clip(r.description, 200) || [r.category?.name_en, r.city].filter(Boolean).join(" · "),
    subtitle: [r.category?.name_en, r.city].filter(Boolean).join(" · "),
    image: httpUrl(r.cover_url) ?? httpUrl(r.logo_url),
  };
}

/** Read through PostgREST with the anon key: RLS only returns active, non-deleted posts and the public business view. */
export async function loadPreview(env: Env, kind: Kind, id: string, fetchImpl: typeof fetch = fetch): Promise<Preview | null> {
  if (!isUuid(id)) return null;
  const path = kind === "post"
    ? `opportunity_posts?id=eq.${id}&select=id,title,description,city,basic,advanced,business:businesses_public!business_id(name,cover_url,logo_url)&limit=1`
    : `businesses_public?id=eq.${id}&select=id,name,description,city,cover_url,logo_url,category:categories!category_id(name_en)&limit=1`;
  const res = await fetchImpl(`${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows) || !rows.length) return null;
  return kind === "post" ? postPreview(rows[0] as PostRow) : businessPreview(rows[0] as BusinessRow);
}

export function storeLinks(env: Env) {
  const pkg = env.ANDROID_PACKAGE || "io.fmbp.app";
  return {
    play: `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`,
    appStore: env.IOS_APP_STORE_ID && /^\d+$/.test(env.IOS_APP_STORE_ID) ? `https://apps.apple.com/app/id${env.IOS_APP_STORE_ID}` : null,
  };
}

/** Full HTML page. `preview` null renders the "no longer available" page (still with store links). */
export function renderPage(env: Env, kind: Kind, id: string, preview: Preview | null): string {
  const site = (env.SITE_URL || "https://fmbp.app").replace(/\/+$/, "");
  const pageUrl = `${site}/${kind}/${isUuid(id) ? id : ""}`;
  const title = preview?.title || (kind === "post" ? "This post is no longer available" : "This business is not available");
  const description = preview?.description || "FMBP: find business partners, customers and opportunities near you.";
  const image = preview?.image || `${site}/og-default.png`;
  const stores = storeLinks(env);
  const appLink = `fmbp://${kind}/${isUuid(id) ? id : ""}`;
  const e = escapeHtml;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} · FMBP</title>
<meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(pageUrl)}">
<meta property="og:site_name" content="FMBP">
<meta property="og:type" content="website">
<meta property="og:url" content="${e(pageUrl)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:image" content="${e(image)}">
<meta name="twitter:card" content="summary_large_image">
${stores.appStore ? `<meta name="apple-itunes-app" content="app-id=${e(env.IOS_APP_STORE_ID!)}, app-argument=${e(pageUrl)}">` : ""}
<meta name="theme-color" content="#1F6F5F">
<style>
  :root { --brand:#1F6F5F; --ink:#111827; --muted:#4B5563; --line:#E5E7EB; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",sans-serif; color:var(--ink); background:#F7F8F7; }
  main { max-width:520px; margin:0 auto; padding:24px 16px 40px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.12em; color:var(--brand); font-size:22px; }
  .brand img { width:36px; height:36px; border-radius:9px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; margin-top:20px; }
  .card img.hero { width:100%; aspect-ratio:1.91/1; object-fit:cover; display:block; background:#EEF4F2; }
  .body { padding:16px; }
  h1 { font-size:22px; margin:0 0 6px; line-height:1.25; }
  .sub { color:var(--muted); font-size:14px; margin:0 0 10px; }
  p.desc { margin:0; line-height:1.5; }
  .actions { display:flex; flex-direction:column; gap:10px; margin-top:20px; }
  .btn { display:block; text-align:center; padding:14px 16px; border-radius:12px; font-weight:600; text-decoration:none; }
  .primary { background:var(--brand); color:#fff; }
  .secondary { background:#E3F0EC; color:#164F44; }
  .note { color:var(--muted); font-size:13px; text-align:center; margin-top:14px; }
</style>
</head>
<body>
<main>
  <div class="brand"><img src="/og-default.png" alt="">FMBP</div>
  <div class="card">
    ${preview?.image ? `<img class="hero" src="${e(preview.image)}" alt="">` : ""}
    <div class="body">
      <h1>${e(title)}</h1>
      ${preview?.subtitle ? `<p class="sub">${e(preview.subtitle)}</p>` : ""}
      <p class="desc">${e(description)}</p>
    </div>
  </div>
  <div class="actions">
    ${preview ? `<a class="btn primary" href="${e(appLink)}">Open in FMBP app</a>` : ""}
    <a class="btn secondary" href="${e(stores.play)}">Get it on Google Play</a>
    ${stores.appStore ? `<a class="btn secondary" href="${e(stores.appStore)}">Download on the App Store</a>` : ""}
  </div>
  <p class="note">Find My Business Partner: post what your business needs or offers, and talk directly with businesses near you.</p>
</main>
</body>
</html>`;
}

const SECURITY_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // no own scripts (Cloudflare Web Analytics only, when switched on); images may come from Supabase storage
  "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src https://static.cloudflareinsights.com; connect-src https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Shared handler for both routes. Cached briefly at the edge; a post that ends drops out within minutes. */
export async function handle(env: Env, kind: Kind, id: string, fetchImpl: typeof fetch = fetch): Promise<Response> {
  let preview: Preview | null = null;
  try { preview = await loadPreview(env, kind, id, fetchImpl); } catch { preview = null; }
  return new Response(renderPage(env, kind, id, preview), {
    status: preview ? 200 : 404,
    headers: { ...SECURITY_HEADERS, "Cache-Control": preview ? "public, max-age=300" : "public, max-age=60" },
  });
}
