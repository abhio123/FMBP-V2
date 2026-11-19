# FMBP website (findmybusinesspartner.net): what it is, how to see it locally, how to put it live

The website is part of this project and runs as one **Cloudflare Worker** (free plan is enough):
- **`apps/web-worker`**: the Worker you deploy (`wrangler.jsonc` + `src/index.ts`, which only routes requests).
- **`apps/share-web`**: the pages themselves (`src/*.ts`) and the static files (`public/`). The Worker uses them
  directly, so every page exists once. (`apps/share-web/functions/` is the older Cloudflare Pages setup; it is no
  longer deployed.)

## 1. What the website has

| Address | What it is | Where the code / text is |
|---|---|---|
| `/` and `/?lang=hi` | Home page: pitch, store buttons (or "Coming soon"), QR code on computers, how it works, who it is for, trust, screenshots, FAQ, footer links | `src/home.ts` |
| `/about` `/terms` `/privacy` `/safety` `/guidelines` `/help` `/contact` | Information pages, English and Hindi (`?lang=hi`), the **same text the app shows** | `packages/shared/src/info.ts` |
| `/delete-account` | How to delete an account (Google Play and App Store require this page) | `src/info.ts` |
| `/post/<id>` and `/business/<id>` | Preview of a shared post or business with "Open in FMBP app" and the store buttons; the photo card in WhatsApp | `src/page.ts` |
| `/sitemap.xml`, `/robots.txt` | For Google | `src/home.ts`, `public/robots.txt` |
| `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association` | Make findmybusinesspartner.net links open the app (Android / iPhone) | `public/.well-known/` |

**How it is built.** Plain HTML made by small TypeScript functions (`apps/web-worker/src/index.ts` → `apps/share-web/src/*.ts`).
- No framework, no scripts in the pages and no web fonts. Phones already have Hindi fonts.
- Every page is a few kilobytes, so it opens fast on slow 3G.
- Security headers are set on every page: no scripts, no framing, HTTPS only.

## 2. What I still need from you

| Item | Where it goes |
|---|---|
| Legal entity name and registered address | `packages/shared/src/info.ts` (Contact page, Terms) and the `LEGAL_NAME` setting |
| Grievance officer: name, email, address (required by India's IT Rules 2021) | Contact page in `info.ts` |
| Support email `support@findmybusinesspartner.net` working (step 4.7) | already set in `apps/web-worker/wrangler.jsonc` and `apps/mobile/app.json` |
| Lawyer review of Terms and Privacy | then set `INFO_IS_DRAFT = false` in `info.ts` |
| 4–6 app screenshots (portrait, about 1080×2340, PNG or WebP, under 300 KB each) | `apps/share-web/public/screenshots/` + list them in `SCREENSHOTS` in `src/home.ts` |
| The domain `findmybusinesspartner.net` | Added to Cloudflare (step 4.2) |
| Store links, once the apps are published | `STORES_LIVE=1` and `IOS_APP_STORE_ID` settings |
| Apple Team ID and Android signing fingerprint | `public/.well-known/` files (step 4.6) |

Everything marked `[to be filled]` on the pages must be completed before the public launch.

## 3. See it on your computer and phone (local)

You need: Node.js (already installed), and the local database running (`pnpm db:start`, as for the app).

1. **One-time: create the local settings file `apps/web-worker/.dev.vars`**
   - **Why it is not in the project:** the repository only has **`.dev.vars.example`**, on purpose. `.dev.vars`
     holds keys and the settings of your own computer, so it is listed in `.gitignore` and never committed. Every
     developer makes their own copy once. In production the same settings are entered in Cloudflare (step 4.4).
   - **What it is for:** only the **shared post / business pages** (`/post/<id>`, `/business/<id>`) read the
     database. The home page and the information pages work even without it.
   - **Make it.** From `apps/web-worker`, pick one:

     | Where you type | Command |
     |---|---|
     | PowerShell or CMD | `copy .dev.vars.example .dev.vars` |
     | Git Bash | `cp .dev.vars.example .dev.vars` |
     | VS Code | right-click `.dev.vars.example` → Copy, then Paste in the same folder and rename the copy to `.dev.vars` |

   - **Fill in two values** (open `.dev.vars` in VS Code):
     - `SUPABASE_URL`: `http://127.0.0.1:54321` (the same as `EXPO_PUBLIC_SUPABASE_URL` in `apps/mobile/.env`).
       The preview server runs on your computer, so this works even when you open the page from your phone.
     - `SUPABASE_ANON_KEY`: the same value as `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env`. You can also
       run `npx supabase status` from the main folder and copy the line called **anon key** (newer versions name
       it **Publishable key**).
     - Leave the other lines as they are.
   - **After a database reset:** the local key does not change, so you do not need to touch `.dev.vars` again.
2. **Start the website**
   ```bash
   pnpm --filter @fmbp/web-worker dev
   ```
   The first run downloads Cloudflare's `wrangler` tool (about a minute; it asks once to confirm). It is the same
   engine that runs the live site.
3. **Open it on the computer:** http://localhost:8787 (Hindi: http://localhost:8787/?lang=hi).
   Try `/privacy`, `/contact` and `/delete-account`.
4. **Open it on your phone:** phone and computer on the same Wi-Fi, then in the phone's browser open
   `http://<your computer's address>:8787`, e.g. http://192.168.1.8:8787 (the address Expo shows, with port 8787).
   - If it does not open, allow Node.js through the firewall (Windows: Private networks; Mac: System Settings → Network → Firewall).
5. **A shared post:** in the app (Expo Go), open a post → Share → copy the link. On the phone's browser, replace
   `https://findmybusinesspartner.net` with `http://192.168.1.8:8787` and open it. You see the preview page with the post.
6. Stop with **Ctrl + C**.

**Expo Go notes**
- The website and the app run separately. Expo Go keeps working as before; start both if you want to test both.
- "Open in FMBP app" and links that open the app directly **do not work in Expo Go**. They need a real app build
  (EAS preview or store build) and the files from step 4.6. Locally the button does nothing; that is expected.
- Run the website tests any time: `pnpm --filter @fmbp/share-web test` (pages) and `pnpm --filter @fmbp/web-worker test` (routing).

## 4. Put it live (step by step)

**4.1 Cloudflare account.** Sign up at https://dash.cloudflare.com (free plan).

**4.2 Add the domain to Cloudflare** (once).
1. Dashboard → **Add a domain** → `findmybusinesspartner.net` → Free plan.
2. Cloudflare shows two **nameservers**. At the registrar where you bought the domain, replace its nameservers with
   these two. It takes from a few minutes to a day; Cloudflare emails you when the domain is **Active**.
3. SSL/TLS → Overview: **Full (strict)**. SSL/TLS → Edge Certificates: **Always Use HTTPS** on.

**4.3 Deploy the Worker.** Pick one way.

*A. From this computer (simplest to start):*
```bash
cd apps/web-worker
npx wrangler@4 login        # opens the browser once
npx wrangler@4 deploy
```

*B. Automatic on every push (recommended later):* Workers & Pages → Create → **Import a repository** → this GitHub
repository → Root directory **`apps/web-worker`**, Build command *(empty)*, Deploy command `npx wrangler deploy`,
Production branch **`main`**. Every push to `main` then updates the site in about a minute. Cloudflare clones the
whole repository, so the Worker can use `apps/share-web` and `packages/shared`.

Either way, `wrangler.jsonc` attaches **findmybusinesspartner.net** and **www.findmybusinesspartner.net** to the Worker:
Cloudflare creates the DNS records and the HTTPS certificates by itself. `www` and `http://` redirect to
`https://findmybusinesspartner.net`.

**4.4 Settings.** Public settings are already in `apps/web-worker/wrangler.jsonc` (`SITE_URL`, `SUPPORT_EMAIL`,
`ANDROID_PACKAGE`, `STORES_LIVE`). The Supabase values change per project, so set them once as secrets:
```bash
cd apps/web-worker
npx wrangler@4 secret put SUPABASE_URL          # https://<project>.supabase.co
npx wrangler@4 secret put SUPABASE_ANON_KEY     # the anon / publishable key. NEVER the service-role key
```
Optional, in Dashboard → Workers → fmbp-web → Settings → Variables (kept on every deploy):

| Name | Value |
|---|---|
| `LEGAL_NAME` | the legal entity name (footer) |
| `IOS_APP_STORE_ID` | numeric App Store id, once the iPhone app is live |

To show the Google Play button once the app is published: set `"STORES_LIVE": "1"` in `wrangler.jsonc` and deploy.

**4.5 Links that open the app** (needs the real app builds, not Expo Go).
1. In `apps/share-web/public/.well-known/assetlinks.json`, replace `REPLACE_WITH_EAS_ANDROID_SHA256_FINGERPRINT`
   with the SHA-256 from `eas credentials` → Android, **and** add the Play App Signing fingerprint from
   Play Console → Setup → App signing (Play re-signs the app, so both are needed).
2. iPhone (later): in `apple-app-site-association`, replace `REPLACE_WITH_APPLE_TEAM_ID` with your Apple Team ID.
3. Deploy again (4.3). Then a shared link in WhatsApp opens the post in the app.

**4.6 Check the live site.**
- https://findmybusinesspartner.net opens; the language switch works; the footer links work.
- https://www.findmybusinesspartner.net redirects to https://findmybusinesspartner.net.
- https://findmybusinesspartner.net/.well-known/assetlinks.json shows JSON, with no redirect.
- https://developers.facebook.com/tools/debug/ with a post link shows the photo card.
- Visit counting (no cookies): Dashboard → Analytics & Logs → **Web Analytics** → add the site. The pages already allow its script.

**4.7 Support email (free): support@findmybusinesspartner.net into your Gmail.**
1. Dashboard → findmybusinesspartner.net → **Email → Email Routing** → Get started. Let it add its DNS records.
2. Destination addresses → add your Gmail address and click the link Cloudflare emails you.
3. Routing rules → custom address `support` → action *Send to an email* → your Gmail. Test by sending a mail to
   support@findmybusinesspartner.net from another account.
4. To **reply as** support@ from Gmail: Google Account → Security → turn on 2-Step Verification → **App passwords** →
   create one. Gmail → Settings → Accounts → *Send mail as* → Add `support@findmybusinesspartner.net` (keep
   "Treat as an alias" ticked); SMTP server `smtp.gmail.com`, port 587, your Gmail address and the app password.
   Confirm with the code Gmail sends (it arrives through the routing above). When replying, pick
   support@findmybusinesspartner.net in the *From* field.
5. So that these mails don't land in spam: in Cloudflare DNS, edit the TXT record that starts with `v=spf1` (added
   by Email Routing) to also contain `include:_spf.google.com`, for example
   `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`. Keep a single `v=spf1` record.

Cost: free. Limits: replies go out through your Gmail account, which is fine for support; for bulk or automatic
mail use a real mail service later.

**4.8 Google.**
1. Add the site in https://search.google.com/search-console. Choose "Domain" and verify with the DNS TXT record;
   Cloudflare can add it.
2. Submit `https://findmybusinesspartner.net/sitemap.xml`.

**4.9 Store listings.**
- Play Console and App Store Connect: Privacy policy URL `https://findmybusinesspartner.net/privacy`, account deletion URL
  `https://findmybusinesspartner.net/delete-account`, support URL `https://findmybusinesspartner.net/contact`.
- When the apps are live, set `STORES_LIVE` to `1` (and `IOS_APP_STORE_ID`), then deploy.

**Before deploying a change:** `pnpm --filter @fmbp/web-worker check:deploy` builds the Worker exactly as Cloudflare
will, without publishing it.

## 5. Changing things later

| To change | Do this |
|---|---|
| About / Terms / Privacy / Help / Contact text | Edit `packages/shared/src/info.ts`; the app (next build) and the website (next push) both change |
| Home page text (EN / HI) | `TEXT` in `apps/share-web/src/home.ts` |
| Screenshots | Add files to `public/screenshots/`, list them in `SCREENSHOTS` (`src/home.ts`) |
| QR code on computers | Make `public/qr.svg` (a QR code of `https://findmybusinesspartner.net/`), e.g. `npx qrcode -t svg -o apps/share-web/public/qr.svg https://findmybusinesspartner.net/`, then set `QR_IMAGE = "/qr.svg"` in `src/home.ts` |
| Store buttons | `STORES_LIVE` `1` in `apps/web-worker/wrangler.jsonc` (and `IOS_APP_STORE_ID` in Cloudflare), then deploy |
| Official store badges | When you have them (Google Play badge generator; Apple Marketing Resources), put the files in `public/badges/` and I swap the text buttons for the badge images. Their guidelines require the official artwork unchanged |

## 6. Notes

- **Cost:** Cloudflare Workers free plan: 100,000 requests a day (every page, image and file counts as one
  request), plenty for the launch. Email Routing is free. You already own the domain.
- **Secrets:** the website only ever gets the public anon key. Never put the service-role key in Cloudflare.
- **Wrangler version:** `compatibility_date` in `wrangler.jsonc` must not be newer than the Wrangler you run
  ("requires compatibility date … newest date supported" means: update Wrangler or keep the older date).
- **Caching:**
  - pages are cached at the edge, so a text change shows within 10 minutes (home) or an hour (information pages);
  - a removed post disappears from its share page within 5 minutes.
- **Legal:** the pages say "Draft" until `INFO_IS_DRAFT = false`. Don't publish the apps with `[to be filled]`
  still on the Contact page.
- **Later, if you want a blog or many marketing pages:** move the marketing part to Astro, a static-site tool that
  also runs on Cloudflare. The information pages and share links can stay as they are.
