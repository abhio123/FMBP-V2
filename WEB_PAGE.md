# FMBP website (fmbp.app): what it is, how to see it locally, how to put it live

The website is part of this project. It lives in **`apps/share-web`** and runs on **Cloudflare Pages** (free plan is
enough). There is no separate web project.

## 1. What the website has

| Address | What it is | Where the code / text is |
|---|---|---|
| `/` and `/?lang=hi` | Home page: pitch, store buttons (or "Coming soon"), QR code on computers, how it works, who it is for, trust, screenshots, FAQ, footer links | `src/home.ts` |
| `/about` `/terms` `/privacy` `/safety` `/guidelines` `/help` `/contact` | Information pages, English and Hindi (`?lang=hi`), the **same text the app shows** | `packages/shared/src/info.ts` |
| `/delete-account` | How to delete an account (Google Play and App Store require this page) | `src/info.ts` |
| `/post/<id>` and `/business/<id>` | Preview of a shared post or business with "Open in FMBP app" and the store buttons; the photo card in WhatsApp | `src/page.ts` |
| `/sitemap.xml`, `/robots.txt` | For Google | `src/home.ts`, `public/robots.txt` |
| `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association` | Make fmbp.app links open the app (Android / iPhone) | `public/.well-known/` |

**How it is built.** Plain HTML made by small TypeScript functions (`functions/*.ts` → `src/*.ts`).
- No framework, no scripts in the pages and no web fonts. Phones already have Hindi fonts.
- Every page is a few kilobytes, so it opens fast on slow 3G.
- Security headers are set on every page: no scripts, no framing, HTTPS only.

## 2. What I still need from you

| Item | Where it goes |
|---|---|
| Legal entity name and registered address | `packages/shared/src/info.ts` (Contact page, Terms) and the `LEGAL_NAME` setting |
| Grievance officer: name, email, address (required by India's IT Rules 2021) | Contact page in `info.ts` |
| Support email (a real inbox) | `SUPPORT_EMAIL` setting + `apps/mobile/app.json` → `extra.supportEmail` |
| Lawyer review of Terms and Privacy | then set `INFO_IS_DRAFT = false` in `info.ts` |
| 4–6 app screenshots (portrait, about 1080×2340, PNG or WebP, under 300 KB each) | `apps/share-web/public/screenshots/` + list them in `SCREENSHOTS` in `src/home.ts` |
| The domain `fmbp.app` (or another one) | Cloudflare (step 4.3) |
| Store links, once the apps are published | `STORES_LIVE=1` and `IOS_APP_STORE_ID` settings |
| Apple Team ID and Android signing fingerprint | `public/.well-known/` files (step 4.6) |

Everything marked `[to be filled]` on the pages must be completed before the public launch.

## 3. See it on your computer and phone (local)

You need: Node.js (already installed), and the local database running (`pnpm db:start`, as for the app).

1. **One-time: create the local settings file `apps/share-web/.dev.vars`**
   - **Why it is not in the project:** the repository only has **`.dev.vars.example`**, on purpose. `.dev.vars`
     holds keys and the settings of your own computer, so it is listed in `.gitignore` and never committed. Every
     developer makes their own copy once. In production the same settings are entered in Cloudflare (step 4.3).
   - **What it is for:** only the **shared post / business pages** (`/post/<id>`, `/business/<id>`) read the
     database. The home page and the information pages work even without it.
   - **Make it.** From `E:\Workspaces\FMBP_V2\apps\share-web`, pick one:

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
   - **Already done for you:** on this computer `.dev.vars` was created on 2026-11-05 from `apps/mobile/.env`,
     so you can go straight to step 2. Use these steps on any other computer, or if you delete the file.
2. **Start the website**
   ```bash
   cd E:\Workspaces\FMBP_V2
   pnpm --filter @fmbp/share-web dev
   ```
   The first run downloads Cloudflare's `wrangler` tool (about a minute; it asks once to confirm). It is the same
   engine that runs the live site.
3. **Open it on the computer:** http://localhost:8788 (Hindi: http://localhost:8788/?lang=hi).
   Try `/privacy`, `/contact` and `/delete-account`.
4. **Open it on your phone:** phone and computer on the same Wi-Fi, then in the phone's browser open
   `http://<your computer's address>:8788`, e.g. http://192.168.1.8:8788. It's the same address as in
   `apps/mobile/.env`, with port 8788.
   - If it does not open, allow Node.js through Windows Firewall (Private networks).
5. **A shared post:** in the app (Expo Go), open a post → Share → copy the link. On the phone's browser, replace
   `https://fmbp.app` with `http://192.168.1.8:8788` and open it. You see the preview page with the post.
6. Stop with **Ctrl + C**.

**Expo Go notes**
- The website and the app run separately. Expo Go keeps working as before; start both if you want to test both.
- "Open in FMBP app" and links that open the app directly **do not work in Expo Go**. They need a real app build
  (EAS preview or store build) and the files from step 4.6. Locally the button does nothing; that is expected.
- Run the website tests any time: `pnpm --filter @fmbp/share-web test`.

## 4. Put it live (step by step)

**4.1 Cloudflare account.** Sign up at https://dash.cloudflare.com (free plan).

**4.2 Create the Pages project.**
1. Go to Workers & Pages → Create → Pages → **Connect to Git**, then choose GitHub and this repository.
2. Production branch: **`main`**.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`public`**
   - Root directory (advanced): **`apps/share-web`**
4. Save and deploy.
   - Cloudflare clones the whole repository, so the pages can use the shared texts in `packages/shared`.
   - The `functions/` folder is picked up automatically.

**4.3 Settings (environment variables).** Set these under Settings → Variables (Production; the same for Preview if
you want previews to show data).

| Name | Value |
|---|---|
| `SUPABASE_URL` | your production Supabase URL (`https://<project>.supabase.co`) |
| `SUPABASE_ANON_KEY` | the production **anon** key. It's public, and reads go through the database rules. **Never** the service-role key |
| `SITE_URL` | `https://fmbp.app` |
| `SUPPORT_EMAIL` | the support inbox |
| `LEGAL_NAME` | the legal entity name (footer) |
| `STORES_LIVE` | `0` until the apps are published, then `1` |
| `IOS_APP_STORE_ID` | numeric App Store id, once the iPhone app is live |
| `ANDROID_PACKAGE` | only if not `io.fmbp.app` |

Redeploy after changing settings (Deployments → ⋯ → Retry deployment).

**4.4 Domain.**
1. Buy `fmbp.app` (any registrar, or Cloudflare Registrar).
2. Pages project → Custom domains → add `fmbp.app`, and `www.fmbp.app` if you want it.
3. Follow the DNS steps shown. The easiest way is to let Cloudflare manage the domain's DNS.
4. HTTPS certificates are automatic (a few minutes).

**4.5 Visit counting (no cookies, no banner).** Pages project → Metrics → **Web Analytics → Enable**. The pages
already allow its script.

**4.6 Links that open the app** (needs the real app builds, not Expo Go).
1. In `public/.well-known/apple-app-site-association`, replace `REPLACE_WITH_APPLE_TEAM_ID` with your Apple Team ID
   (developer.apple.com → Membership).
2. In `public/.well-known/assetlinks.json`, replace `REPLACE_WITH_EAS_ANDROID_SHA256_FINGERPRINT` with the SHA-256
   from `eas credentials` → Android, plus the Play App Signing fingerprint from Play Console.
3. Commit and push to `main` (the site redeploys by itself).
4. Build the apps again (EAS). Then a shared link in WhatsApp should open the post in the app.

**4.7 Check the live site.**
- https://fmbp.app opens; the language switch works; the footer links work.
- https://fmbp.app/.well-known/assetlinks.json shows JSON, with no redirect.
- https://developers.facebook.com/tools/debug/ with a post link shows the photo card.
- On a phone over mobile data the home page appears in about a second.

**4.8 Google.**
1. Add the site in https://search.google.com/search-console. Choose "Domain" and verify with the DNS TXT record;
   Cloudflare can add it.
2. Submit `https://fmbp.app/sitemap.xml`.

**4.9 Store listings.**
- Play Console and App Store Connect: Privacy policy URL `https://fmbp.app/privacy`, account deletion URL
  `https://fmbp.app/delete-account`, support URL `https://fmbp.app/contact`.
- When the apps are live, set `STORES_LIVE=1` (and `IOS_APP_STORE_ID`), then redeploy.

**From then on:** every push to `main` updates the live site in about a minute. Every other branch gets its own
private preview address (shown in Cloudflare → Deployments), so you can check a change before merging.

## 5. Changing things later

| To change | Do this |
|---|---|
| About / Terms / Privacy / Help / Contact text | Edit `packages/shared/src/info.ts`; the app (next build) and the website (next push) both change |
| Home page text (EN / HI) | `TEXT` in `apps/share-web/src/home.ts` |
| Screenshots | Add files to `public/screenshots/`, list them in `SCREENSHOTS` (`src/home.ts`) |
| QR code on computers | Make `public/qr.svg` (a QR code of `https://fmbp.app/`), e.g. `npx qrcode -t svg -o apps/share-web/public/qr.svg https://fmbp.app/`, then set `QR_IMAGE = "/qr.svg"` in `src/home.ts` |
| Store buttons | `STORES_LIVE=1` and `IOS_APP_STORE_ID` in Cloudflare settings, then redeploy |
| Official store badges | When you have them (Google Play badge generator; Apple Marketing Resources), put the files in `public/badges/` and I swap the text buttons for the badge images. Their guidelines require the official artwork unchanged |

## 6. Notes

- **Cost:** Cloudflare Pages free plan (unlimited visits, 100,000 function requests a day). The domain is about
  ₹1,000–2,000 a year.
- **Secrets:** the website only ever gets the public anon key. Never put the service-role key in Cloudflare.
- **Caching:**
  - pages are cached at the edge, so a text change shows within 10 minutes (home) or an hour (information pages);
  - a removed post disappears from its share page within 5 minutes.
- **Legal:** the pages say "Draft" until `INFO_IS_DRAFT = false`. Don't publish the apps with `[to be filled]`
  still on the Contact page.
- **Later, if you want a blog or many marketing pages:** move the marketing part to Astro, a static-site tool that
  also runs on Cloudflare Pages. The information pages and share links can stay as they are.
