/**
 * Home page: https://findmybusinesspartner.net/ (English) and /?lang=hi (Hindi). What FMBP is, how it works, why people can trust it,
 * the store buttons, a QR code for desktop visitors, an FAQ and the links to the information pages.
 *
 * Phone-first and light for slow 3G: no scripts, no web fonts (Android and iPhone already have good Devanagari fonts),
 * one small logo and an SVG QR code. Store buttons show "Coming soon" until STORES_LIVE=1 (a link to an unpublished
 * app would be a dead end). Screenshots appear once files are listed in SCREENSHOTS (public/screenshots/).
 */
import { INFO_PAGES } from "../../../packages/shared/src/info.ts";
import { escapeHtml, storeLinks, type Env } from "./page";

export type HomeEnv = Env & { STORES_LIVE?: string; SUPPORT_EMAIL?: string; LEGAL_NAME?: string };
type Lang = "en" | "hi";
type T = Record<Lang, string>;

/** QR code for desktop visitors: put public/qr.svg (a QR of the site URL; see WEB_PAGE.md) and set this to "/qr.svg". */
export const QR_IMAGE: string | null = null;

/** Add files to public/screenshots/ (portrait PNG / WebP, about 1080×2340, under 300 KB each) and list them here. */
export const SCREENSHOTS: { file: string; alt: T }[] = [];

const TEXT = {
  title: { en: "FMBP · Find My Business Partner", hi: "FMBP · फ़ाइंड माय बिज़नेस पार्टनर" },
  pitch: { en: "Find customers, suppliers, staff and partners near you.", hi: "अपने पास ग्राहक, सप्लायर, स्टाफ़ और पार्टनर ढूँढें।" },
  sub: {
    en: "For shops, small businesses and skilled workers. Post what you need or offer, and talk directly. Free, in Hindi and English.",
    hi: "दुकानों, छोटे बिज़नेस और हुनर वाले लोगों के लिए। जो चाहिए या जो दे सकते हैं, पोस्ट करें और सीधे बात करें। मुफ़्त, हिंदी और अंग्रेज़ी में।",
  },
  play: { en: "Get it on Google Play", hi: "Google Play से लें" },
  appStore: { en: "Download on the App Store", hi: "App Store से डाउनलोड करें" },
  soon: { en: "Coming soon on Google Play and the App Store", hi: "जल्द ही Google Play और App Store पर" },
  scan: { en: "On a computer? Scan with your phone camera to open FMBP.", hi: "कंप्यूटर पर हैं? FMBP खोलने के लिए फ़ोन के कैमरे से स्कैन करें।" },
  howTitle: { en: "How it works", hi: "कैसे काम करता है" },
  steps: [
    { en: "Sign in with your mobile number. Make your profile in one minute: your business, or just you and your work.", hi: "मोबाइल नंबर से लॉग इन करें। एक मिनट में प्रोफ़ाइल बनाएँ: आपका बिज़नेस, या सिर्फ़ आप और आपका काम।" },
    { en: "Post what you need or what you offer: a cook, a supplier, a shop to rent, a job, a partner…", hi: "जो चाहिए या जो दे सकते हैं, वह पोस्ट करें: रसोइया, सप्लायर, किराए की दुकान, नौकरी, पार्टनर…" },
    { en: "People nearby reply. Chat in the app and close the deal.", hi: "आस-पास के लोग जवाब देते हैं। ऐप में चैट करें और सौदा पक्का करें।" },
  ],
  whoTitle: { en: "Who is it for?", hi: "किसके लिए है?" },
  who: [
    { en: "Shops and small businesses looking for customers, suppliers, staff or space.", hi: "दुकानें और छोटे बिज़नेस जिन्हें ग्राहक, सप्लायर, स्टाफ़ या जगह चाहिए।" },
    { en: "Skilled workers (cooks, tailors, electricians, drivers…) looking for work.", hi: "हुनर वाले लोग (रसोइया, दर्ज़ी, इलेक्ट्रीशियन, ड्राइवर…) जिन्हें काम चाहिए।" },
    { en: "People who want to start or grow a business with a partner.", hi: "जो किसी पार्टनर के साथ बिज़नेस शुरू करना या बढ़ाना चाहते हैं।" },
  ],
  trustTitle: { en: "Built for trust", hi: "भरोसे के लिए बना" },
  trust: [
    { en: "Verified: businesses can show a checked business document (GST, Udyam, shop licence).", hi: "वेरिफ़ाइड: बिज़नेस अपना जाँचा हुआ दस्तावेज़ दिखा सकते हैं (GST, उद्यम, दुकान लाइसेंस)।" },
    { en: "Confirmed deals and ratings: both sides confirm a deal before it counts, and rate each other.", hi: "पक्के सौदे और रेटिंग: सौदा तभी गिना जाता है जब दोनों पुष्टि करें, और दोनों एक-दूसरे को रेटिंग देते हैं।" },
    { en: "Trusted badge for businesses with several confirmed deals and good ratings.", hi: "कई पक्के सौदों और अच्छी रेटिंग वाले बिज़नेस को भरोसेमंद बैज।" },
    { en: "Your phone number stays private. Report or block anyone in one tap; our team reviews every report.", hi: "आपका फ़ोन नंबर निजी रहता है। एक टैप में किसी की शिकायत करें या ब्लॉक करें; हमारी टीम हर शिकायत देखती है।" },
  ],
  shotsTitle: { en: "See the app", hi: "ऐप देखें" },
  faqTitle: { en: "Questions", hi: "सवाल" },
  faq: [
    { q: { en: "Is FMBP free?", hi: "क्या FMBP मुफ़्त है?" }, a: { en: "Yes. Posting, replying and chatting are free.", hi: "हाँ। पोस्ट करना, जवाब देना और चैट करना मुफ़्त है।" } },
    { q: { en: "Do I need a business?", hi: "क्या बिज़नेस होना ज़रूरी है?" }, a: { en: "No. If you work or have a skill, make a personal profile with your name and your work.", hi: "नहीं। अगर आप काम करते हैं या हुनर है, तो अपने नाम और काम से निजी प्रोफ़ाइल बनाएँ।" } },
    { q: { en: "Who can see my phone number?", hi: "मेरा फ़ोन नंबर कौन देख सकता है?" }, a: { en: "Nobody, unless you share it yourself in a chat.", hi: "कोई नहीं, जब तक आप ख़ुद चैट में न बताएँ।" } },
    { q: { en: "Which languages?", hi: "कौन-सी भाषाएँ?" }, a: { en: "Hindi and English. Change it any time in the app.", hi: "हिंदी और अंग्रेज़ी। ऐप में कभी भी बदलें।" } },
    { q: { en: "How do I delete my account?", hi: "अकाउंट कैसे हटाएँ?" }, a: { en: "In the app, or see the Delete account page below.", hi: "ऐप में, या नीचे अकाउंट हटाएँ पेज देखें।" } },
  ],
  contact: { en: "Contact", hi: "संपर्क" },
  deleteAccount: { en: "Delete account", hi: "अकाउंट हटाएँ" },
} as const;

export function renderHome(env: HomeEnv, lang: Lang): string {
  const e = escapeHtml;
  const L = (x: T) => e(x[lang]);
  const site = (env.SITE_URL || "https://findmybusinesspartner.net").replace(/\/+$/, "");
  const self = lang === "hi" ? `${site}/?lang=hi` : `${site}/`;
  const other: Lang = lang === "hi" ? "en" : "hi";
  const stores = storeLinks(env);
  const live = env.STORES_LIVE === "1";
  const q = lang === "hi" ? "?lang=hi" : "";
  const buttons = live
    ? `<a class="btn primary" href="${e(stores.play)}" rel="noopener">${L(TEXT.play)}</a>${stores.appStore ? `<a class="btn secondary" href="${e(stores.appStore)}" rel="noopener">${L(TEXT.appStore)}</a>` : ""}`
    : `<p class="soon">${L(TEXT.soon)}</p>`;
  const links = [...INFO_PAGES.map((p) => ({ slug: p.slug as string, title: p.title[lang] })), { slug: "delete-account", title: TEXT.deleteAccount[lang] }];
  const legal = env.LEGAL_NAME ? `© ${new Date().getFullYear()} ${e(env.LEGAL_NAME)}` : "FMBP";
  // search engines: who we are and that there is an app (no script runs: browsers do not execute this type)
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org", "@type": "MobileApplication", name: "FMBP", operatingSystem: "Android, iOS",
    applicationCategory: "BusinessApplication", url: site, inLanguage: ["en", "hi"], offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${L(TEXT.title)}</title>
<meta name="description" content="${L(TEXT.sub)}">
<link rel="canonical" href="${e(self)}">
<link rel="alternate" hreflang="en" href="${e(site)}/">
<link rel="alternate" hreflang="hi" href="${e(site)}/?lang=hi">
<link rel="alternate" hreflang="x-default" href="${e(site)}/">
<meta property="og:site_name" content="FMBP">
<meta property="og:type" content="website">
<meta property="og:url" content="${e(self)}">
<meta property="og:title" content="${L(TEXT.title)}">
<meta property="og:description" content="${L(TEXT.pitch)}">
<meta property="og:image" content="${e(site)}/og-default.png">
<meta name="twitter:card" content="summary_large_image">
${stores.appStore && live ? `<meta name="apple-itunes-app" content="app-id=${e(env.IOS_APP_STORE_ID!)}">` : ""}
<meta name="theme-color" content="#1F6F5F">
<link rel="icon" href="/og-default.png">
<script type="application/ld+json">${jsonLd}</script>
<style>
  :root { --brand:#1F6F5F; --brand-light:#E6F2EF; --ink:#111827; --muted:#4B5563; --line:#E5E7EB; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari","Kohinoor Devanagari","Mangal",sans-serif;
         color:var(--ink); background:#F7F8F7; line-height:1.55; }
  main { max-width:760px; margin:0 auto; padding:20px 16px 48px; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.12em; color:var(--brand); font-size:20px; text-decoration:none; }
  .brand img { width:36px; height:36px; border-radius:9px; }
  .lang { color:var(--brand); font-weight:600; text-decoration:none; padding:8px 12px; border:1px solid var(--line); border-radius:999px; background:#fff; }
  .hero { margin-top:28px; }
  h1 { font-size:30px; line-height:1.2; margin:0 0 10px; }
  .hero p { font-size:17px; color:var(--muted); margin:0; }
  .stores { display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; }
  .btn { display:inline-block; padding:14px 18px; border-radius:12px; font-weight:600; text-decoration:none; min-height:48px; }
  .primary { background:var(--brand); color:#fff; }
  .secondary { background:var(--brand-light); color:#164F44; }
  .soon { margin:0; padding:12px 16px; border-radius:12px; background:var(--brand-light); color:#164F44; font-weight:600; }
  .qr { display:none; align-items:center; gap:16px; margin-top:20px; color:var(--muted); font-size:14px; }
  .qr img { width:120px; height:120px; background:#fff; padding:6px; border:1px solid var(--line); border-radius:12px; }
  @media (min-width: 900px) { .qr { display:flex; } }
  section { margin-top:36px; }
  h2 { font-size:22px; margin:0 0 12px; }
  ol.steps { list-style:none; padding:0; margin:0; display:grid; gap:12px; counter-reset:s; }
  ol.steps li { counter-increment:s; display:flex; gap:12px; background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; }
  ol.steps li::before { content:counter(s); flex:0 0 32px; height:32px; border-radius:50%; background:var(--brand); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; }
  ul.cards { list-style:none; padding:0; margin:0; display:grid; gap:10px; }
  ul.cards li { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; }
  .shots { display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; }
  .shots img { height:420px; width:auto; border-radius:18px; border:1px solid var(--line); }
  details { background:#fff; border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:8px; }
  summary { font-weight:600; cursor:pointer; }
  footer { border-top:1px solid var(--line); margin-top:40px; padding-top:16px; font-size:14px; color:var(--muted); }
  footer nav { display:flex; flex-wrap:wrap; gap:8px 16px; margin-bottom:12px; }
  a { color:var(--brand); }
</style>
</head>
<body>
<main>
  <header>
    <a class="brand" href="/${q}"><img src="/og-default.png" alt="">FMBP</a>
    <a class="lang" href="/${other === "hi" ? "?lang=hi" : ""}" hreflang="${other}">${other === "hi" ? "हिंदी" : "English"}</a>
  </header>
  <div class="hero">
    <h1>${L(TEXT.pitch)}</h1>
    <p>${L(TEXT.sub)}</p>
    <div class="stores">${buttons}</div>
    ${QR_IMAGE ? `<div class="qr"><img src="${e(QR_IMAGE)}" alt="QR code: ${e(site)}" width="120" height="120">${L(TEXT.scan)}</div>` : ""}
  </div>
  <section><h2>${L(TEXT.howTitle)}</h2><ol class="steps">${TEXT.steps.map((s) => `<li>${L(s)}</li>`).join("")}</ol></section>
  <section><h2>${L(TEXT.whoTitle)}</h2><ul class="cards">${TEXT.who.map((s) => `<li>${L(s)}</li>`).join("")}</ul></section>
  <section><h2>${L(TEXT.trustTitle)}</h2><ul class="cards">${TEXT.trust.map((s) => `<li>${L(s)}</li>`).join("")}</ul></section>
  ${SCREENSHOTS.length ? `<section><h2>${L(TEXT.shotsTitle)}</h2><div class="shots">${SCREENSHOTS.map((s) => `<img src="/screenshots/${e(s.file)}" alt="${L(s.alt)}" loading="lazy" width="194" height="420">`).join("")}</div></section>` : ""}
  <section><h2>${L(TEXT.faqTitle)}</h2>${TEXT.faq.map((f) => `<details><summary>${L(f.q)}</summary><p>${L(f.a)}</p></details>`).join("")}</section>
  <footer>
    <nav>${links.map((l) => `<a href="/${e(l.slug)}${q}">${e(l.title)}</a>`).join("")}</nav>
    <div>${legal} · <a href="mailto:${e(env.SUPPORT_EMAIL || "support@findmybusinesspartner.net")}">${e(env.SUPPORT_EMAIL || "support@findmybusinesspartner.net")}</a></div>
  </footer>
</main>
</body>
</html>`;
}

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // no scripts run (the JSON-LD block is data); Cloudflare Web Analytics, when switched on, is allowed explicitly
  "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src https://static.cloudflareinsights.com; connect-src https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "public, max-age=600",
};

export function handleHome(env: HomeEnv, url: string): Response {
  const lang: Lang = new URL(url).searchParams.get("lang") === "hi" ? "hi" : "en";
  return new Response(renderHome(env, lang), { headers: { ...HEADERS, "Content-Language": lang, Vary: "Accept-Encoding" } });
}

/** sitemap.xml: home in both languages and every information page (Search Console reads it). */
export function renderSitemap(env: Env): string {
  const site = (env.SITE_URL || "https://findmybusinesspartner.net").replace(/\/+$/, "");
  const paths = ["/", ...INFO_PAGES.map((p) => `/${p.slug}`), "/delete-account"];
  const url = (loc: string) => `  <url><loc>${escapeHtml(loc)}</loc></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.flatMap((p) => [url(`${site}${p}`), url(`${site}${p}?lang=hi`)]).join("\n")}
</urlset>
`;
}
