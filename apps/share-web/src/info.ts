/**
 * Information pages on the website: findmybusinesspartner.net/about, /terms, /privacy, /safety, /guidelines, /help (same texts as the
 * app, from packages/shared) and /delete-account. The stores require public URLs for the privacy policy and for how
 * to delete an account. English by default, Hindi with ?lang=hi. No scripts; all text is escaped.
 */
import { INFO_IS_DRAFT, INFO_PAGES, INFO_UPDATED, infoBlocks, infoPage, type InfoSection } from "../../../packages/shared/src/info.ts";
import { escapeHtml, type Env } from "./page";
import { BRAND } from "../../../packages/shared/src/brand.ts";

const APP = BRAND.appName; // the public name (packages/shared/src/brand.ts)

export type InfoRoute = "about" | "terms" | "privacy" | "safety" | "guidelines" | "help" | "contact" | "delete-account";
type Lang = "en" | "hi";

/** How to delete an account (store requirement): in the app, or by email when the app is no longer installed. */
const DELETE_ACCOUNT = {
  title: { en: `Delete your ${APP} account`, hi: `अपना ${APP} अकाउंट हटाएँ` },
  sections: [
    {
      heading: { en: "In the app", hi: "ऐप में" },
      body: {
        en: `• Open ${APP} and tap Business or Me (bottom right).\n• Scroll down and tap Delete account, then confirm.\n• Your business, posts and photos disappear at once and you are logged out.`,
        hi: `• ${APP} खोलें और बिज़नेस या मैं (नीचे दाएँ) दबाएँ।\n• नीचे जाकर अकाउंट हटाएँ दबाएँ और पुष्टि करें।\n• आपका बिज़नेस, पोस्ट और फोटो तुरंत हट जाते हैं और आप लॉग आउट हो जाते हैं।`,
      },
    },
    {
      heading: { en: "Without the app", hi: "ऐप के बिना" },
      body: {
        en: "Email {{supportEmail}} from any address with the phone number of the account and the words \"Delete my account\". We confirm by calling or texting that number, then delete it.",
        hi: "किसी भी ईमेल से {{supportEmail}} पर अकाउंट का फ़ोन नंबर और \"मेरा अकाउंट हटाएँ\" लिखकर भेजें। हम उस नंबर पर कॉल या SMS से पुष्टि करके अकाउंट हटा देते हैं।",
      },
    },
    {
      heading: { en: "What is deleted and when", hi: "क्या और कब हटता है" },
      body: {
        en: "For 30 days you can log in again and restore everything. After 30 days your name, phone number, business details, posts, photos, follows and saved posts are erased for good. Messages you sent stay visible to the business you chatted with, under \"Deleted business\".",
        hi: "30 दिन तक आप फिर से लॉग इन करके सब वापस ला सकते हैं। 30 दिन बाद आपका नाम, फ़ोन नंबर, बिज़नेस की जानकारी, पोस्ट, फोटो, फ़ॉलो और सेव की गई पोस्ट हमेशा के लिए मिटा दी जाती हैं। आपके भेजे मैसेज, जिस बिज़नेस से बात हुई उसे \"हटाया गया बिज़नेस\" नाम से दिखते रहते हैं।",
      },
    },
  ] as InfoSection[],
};

function page(route: InfoRoute) {
  if (route === "delete-account") return { icon: "", ...DELETE_ACCOUNT };
  return infoPage(route) ?? null;
}

export function renderInfo(env: Env & { SUPPORT_EMAIL?: string }, route: InfoRoute, lang: Lang): string | null {
  const p = page(route);
  if (!p) return null;
  const e = escapeHtml;
  const email = env.SUPPORT_EMAIL || "support@findmybusinesspartner.net";
  const other: Lang = lang === "hi" ? "en" : "hi";
  const links = [...INFO_PAGES.map((x) => ({ slug: x.slug as string, title: x.title[lang] })), { slug: "delete-account", title: DELETE_ACCOUNT.title[lang] }];
  const body = p.sections.map((s) => {
    const blocks = infoBlocks(s.body[lang], email);
    const html: string[] = [];
    let list: string[] = [];
    const flush = () => { if (list.length) { html.push(`<ul>${list.join("")}</ul>`); list = []; } };
    for (const b of blocks) {
      if (b.kind === "li") list.push(`<li>${e(b.text)}</li>`);
      else { flush(); html.push(`<p>${e(b.text)}</p>`); }
    }
    flush();
    return `<section><h2>${e(s.heading[lang])}</h2>${html.join("")}</section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(p.title[lang])} · ${e(APP)}</title>
<meta name="description" content="${e(p.title[lang])}: ${e(APP)}.">
<meta name="theme-color" content="#1F6F5F">
<style>
  :root { --brand:#1F6F5F; --ink:#111827; --muted:#4B5563; --line:#E5E7EB; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari",sans-serif; color:var(--ink); background:#F7F8F7; line-height:1.6; }
  main { max-width:720px; margin:0 auto; padding:24px 16px 48px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.12em; color:var(--brand); font-size:20px; text-decoration:none; }
  .brand img { width:32px; height:32px; border-radius:8px; }
  h1 { font-size:26px; line-height:1.25; margin:20px 0 4px; }
  .meta { color:var(--muted); font-size:13px; margin:0 0 16px; }
  h2 { font-size:18px; margin:24px 0 6px; }
  p, li { font-size:16px; }
  ul { padding-left:22px; }
  nav { border-top:1px solid var(--line); margin-top:32px; padding-top:16px; display:flex; flex-wrap:wrap; gap:8px 16px; font-size:14px; }
  a { color:var(--brand); }
</style>
</head>
<body>
<main>
  <a class="brand" href="/"><img src="/og-default.png" alt="">${e(APP)}</a>
  <h1>${e(p.title[lang])}</h1>
  <p class="meta">${lang === "hi" ? "आखिरी बदलाव" : "Last updated"} ${e(INFO_UPDATED)}${INFO_IS_DRAFT ? (lang === "hi" ? " · ड्राफ़्ट" : " · Draft") : ""} · <a href="?lang=${other}">${other === "hi" ? "हिंदी" : "English"}</a></p>
  ${body}
  <nav>${links.map((l) => `<a href="/${e(l.slug)}${lang === "hi" ? "?lang=hi" : ""}">${e(l.title)}</a>`).join("")}</nav>
</main>
</body>
</html>`;
}

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Cloudflare Web Analytics (when switched on in the Pages project) is the only script allowed
  "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src https://static.cloudflareinsights.com; connect-src https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "public, max-age=3600",
};

/** Shared handler for the info routes (functions/<route>.ts). */
export function handleInfo(env: Env & { SUPPORT_EMAIL?: string }, route: InfoRoute, url: string): Response {
  const lang: Lang = new URL(url).searchParams.get("lang") === "hi" ? "hi" : "en";
  const html = renderInfo(env, route, lang);
  return html ? new Response(html, { headers: HEADERS }) : new Response("Not found", { status: 404 });
}
