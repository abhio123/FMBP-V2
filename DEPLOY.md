# FMBP — Deploying to production

Everything below is run once to create the production environment, then repeated only for the steps marked **(each release)**.
Two systems: **Supabase** (database, auth, storage, Edge Functions) and **EAS** (store builds). CI runs the checks on every push and
starts a store build when a `v*` tag is pushed.

## 1. Supabase project (backend)

1. Create a project at https://supabase.com/dashboard (region: Mumbai `ap-south-1`). Note the project ref, anon key and service role key.
   **Free plan (to start):** enough for testing and a small launch (500 MB database, 1 GB photo storage, 5 GB
   bandwidth a month), but: the project **pauses after 7 days without any request** (Dashboard → Restore, and the
   app shows network errors until then), and there are **no automatic backups**. Before the public release move to
   **Pro** (Dashboard → Billing; same project, nothing to migrate).
2. Link and push the schema and seeds (Supabase CLI 3: hosted commands need `--remote`, otherwise they target the
   local Docker database):
   ```bash
   npx supabase login                                   # once, in your own terminal (asks for a code)
   npx supabase link --project-ref <ref>                # asks for the database password
   npx supabase db push --remote --dry-run              # lists what would be applied; nothing changes
   npx supabase db push --remote                        # applies supabase/migrations (incl. pg_cron jobs)
   npx supabase db push --remote --include-seed         # loads supabase/seed/*.sql (config.toml → [db.seed])
   ```
   Seeds are idempotent; re-run the last command whenever `supabase/seed/*.sql` changes **(each release)**.
   Set `SUPABASE_DB_PASSWORD` in the terminal instead of typing the password each time. Never commit it.
3. Deploy the Edge Functions **(each release)**:
   ```bash
   pnpm sync:shared
   npx supabase functions deploy ai-generate expire-posts erase-media --remote
   npx supabase functions deploy send-sms --no-verify-jwt --remote   # auth hooks carry no user JWT; the hook secret authenticates
   npx supabase functions list --remote                              # all four ACTIVE
   npx supabase secrets set --remote ANTHROPIC_API_KEY=sk-ant-...    # optional: without it posts use template copy
   npx supabase secrets set --remote MSG91_AUTH_KEY=... MSG91_TEMPLATE_ID=... MSG91_SENDER=FMBPIN SEND_SMS_HOOK_SECRET=...
   ```
   The functions share one import map, `supabase/functions/deno.json`. Supabase bundles deployed functions without
   Docker and only uses it when `config.toml` names it per function (`[functions.<name>] import_map`); a new function
   that imports `@fmbp/shared`, `zod` or `@supabase/supabase-js` needs the same entry (VERSION_UPGRADE.md §6).
4. Phone login (OTP by SMS). **Done on `fmbp` on 2026-11-13**, except MSG91:
   - MSG91: register the DLT sender id and an OTP template containing `##OTP##` (takes a few days; start first).
     Then `npx supabase secrets set --remote MSG91_AUTH_KEY=... MSG91_TEMPLATE_ID=... MSG91_SENDER=...`. Until both
     are set, `send-sms` answers "sms provider not configured" and a real number gets a login error (no SMS is
     pretended); test numbers work.
   - Dashboard → Authentication → Sign In / Providers → **Phone**: enabled.
   - Dashboard → Authentication → Hooks → **Send SMS**: HTTPS, `https://<ref>.supabase.co/functions/v1/send-sms`,
     secret `v1,whsec_…`. The same value is the function secret `SEND_SMS_HOOK_SECRET` (kept on the dev Mac in
     `~/.fmbp-secrets/send-sms-hook.env`). To change it: set the new value in both places.
   - **Test numbers** (Phone provider → Test phone numbers and OTPs): `919999900000`–`919999900009`, OTP `123456`,
     valid until **2027-02-28**. No SMS is sent for them. **Remove them (or switch to private numbers and a secret
     OTP) before the public launch**: the OTP is printed in README, so anyone can log in as these users. Never make a
     test number an admin in production. Google's reviewer gets one of them (Play Console → App access).
   - **First admin** (2026-11-13): the owner's real number, added to `public.admins` (ADMIN.md §1) and, until MSG91
     works, also as a test number with a fixed OTP. Remove that test entry once real SMS arrives.
   - `npx supabase config push` would copy the **local** auth settings to production. Never run it; change hosted auth
     settings in the Dashboard (or the Management API: `PATCH /v1/projects/<ref>/config/auth`).
5. Storage: the `business-media` bucket and its policies come from the migrations. Confirm it is **public** in Dashboard → Storage.
6. Realtime: Dashboard → Database → Publications → `supabase_realtime` must include `messages` and `post_responses` (set by migration).
7. Nightly jobs run inside Postgres via pg_cron (`fmbp_expire_posts` 00:15 UTC, `fmbp_response_rates` 00:30 UTC). Check
   Dashboard → Integrations → Cron, or `select * from cron.job_run_details order by start_time desc limit 20;`.

7b. Account deletion (README → Account deletion): `fmbp_erase_accounts` (00:45 UTC) erases accounts 30 days after
   "Delete account". Photo files are removed by the `erase-media` Edge Function, which must run daily after it with the
   service role key, e.g. Dashboard → Integrations → Cron → new job at 01:00 UTC, type "Supabase Edge Function",
   function `erase-media`, header `Authorization: Bearer <service role key>` (or any scheduler calling
   `POST https://<ref>.supabase.co/functions/v1/erase-media` with that header).

8. Push notifications are sent by the database (pg_net → Expo push API) on new messages and responses; nothing to deploy.
   Delivery needs push credentials on the EAS project (section 2.3) and a real build: **Expo Go on Android cannot receive
   remote push since SDK 53**. In-app alerts still work in Expo Go.

## 2. Expo / EAS (mobile builds)

1. **Done 2026-11-13:** Expo account `fmbp`, project `@fmbp/fmbp` (`extra.eas.projectId` and `owner` in `app.json`).
   For a new project: `npx eas-cli@latest login` (your own terminal), then in `apps/mobile`: `npx eas-cli@latest init`.
   `eas init` refuses to run while `extra.eas.projectId` holds a placeholder, and with `--force` it **rewrites the whole
   `app.json`** from the resolved config (expanded permissions, extra keys). Check `git diff app.json` afterwards and keep
   only `extra.eas.projectId` and `owner`.
2. Environment for builds: `eas.json` → each profile has `"environment"` (`preview`, `production`); the values live on EAS
   (expo.dev → project → Environment variables), all **plain text / public** (they ship inside the app):
   `EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>` (**set** for preview and
   production), `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_SENTRY_DSN` (both optional, not set yet).
   ```bash
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext --scope project
   npx eas-cli@latest env:list --environment preview
   ```
   `apps/mobile/.env` is git-ignored, so it is never uploaded: builds only see the EAS values. The same values go into
   GitHub → Secrets for the CI build job.
   Permissions: the app only picks photos from the gallery, so `app.json` blocks the microphone that `expo-image-picker`
   would add (`android.blockedPermissions: RECORD_AUDIO`, plugin `microphonePermission: false`).
3. Credentials: the Android keystore was generated and stored by EAS on the first build (2026-11-13); view it with
   `npx eas-cli@latest credentials -p android` (its SHA-256 goes into `assetlinks.json`). iOS needs an Apple Developer account.
   Push: Android → "Push Notifications: FCM V1" → upload the Firebase service-account JSON of a Firebase project that has the
   `io.fmbp.app` Android app; iOS → "Push Notifications" → let EAS create the APNs key. Test with a preview build:
   send to the token shown in `select * from push_tokens` via https://expo.dev/notifications.
4. Build **(each release)**:
   ```bash
   cd apps/mobile
   eas build --platform android --profile preview        # APK for testers (Surya), share the link
   eas build --platform all --profile production         # store builds (AAB + IPA); version auto-increments
   eas submit --platform android --profile production    # needs google-play-service-account.json (gitignored)
   eas submit --platform ios --profile production        # fill appleId / ascAppId / appleTeamId in eas.json
   ```
   Or push a tag: `git tag v1.0.0 && git push --tags` and CI starts the production build.
5. Store listings: copy from `docs/store-listing.md`. Both stores need a privacy policy URL and screenshots (6.5" iPhone, phone + 7" tablet Android).

## 2b. Website and share links on findmybusinesspartner.net (Cloudflare Worker)
The whole website (home page, information pages, contact / grievance officer, share links, app-link files) runs as
one Cloudflare Worker, `apps/web-worker`; step-by-step in [WEB_PAGE.md](WEB_PAGE.md) §4. The essentials:
1. Add `findmybusinesspartner.net` to Cloudflare (nameservers at the registrar), then
   `cd apps/web-worker && npx wrangler@4 login && npx wrangler@4 deploy`. `wrangler.jsonc` attaches the domain and `www`.
2. `npx wrangler@4 secret put SUPABASE_URL` and `SUPABASE_ANON_KEY` (the public anon key; reads go through RLS).
3. Use `https://findmybusinesspartner.net/privacy` and `/delete-account` in the Play Console (required).
4. Links that open the app: put the EAS SHA-256 **and** the Play App Signing fingerprint into
   `apps/share-web/public/.well-known/assetlinks.json`, deploy, then rebuild the app. Expo Go cannot open https links
   into the app; test with a preview build: tap a shared link in WhatsApp; it must open the post in the app.
5. Support email: Cloudflare Email Routing forwards support@findmybusinesspartner.net to Gmail (WEB_PAGE.md §4.7).

## 3. Before the first public release

- [ ] Information pages (`packages/shared/src/info.ts`, drafts): lawyer review of Terms and Privacy; fill in every
      `[to be filled]` (legal entity, address, city for jurisdiction, grievance officer, required by the IT Rules 2021);
      then set `INFO_IS_DRAFT = false`. Link https://findmybusinesspartner.net/terms and /privacy from `auth.terms`.
- [ ] Store listings: privacy policy URL https://findmybusinesspartner.net/privacy, account deletion URL https://findmybusinesspartner.net/delete-account.
- [ ] Admins: add the first admin with the SQL in ADMIN.md §1 (production has none), log in on a phone and choose
      "Admin"; then add the team in the app (More → Admins). Someone checks Reports and Verify daily (ADMIN.md §4).
- [ ] Verification documents bucket `verification-docs` exists and is **private** (created by migration
      `20261105000012`; Storage → Buckets shows no "Public" label).
- [ ] Social-proof minimums (the line at the top of Opportunities) suit your launch numbers: defaults in `fmbp.app_settings`
      key `social_proof` (deals 10 per city / 25 overall a month, 10 new posts or replies a week, 20 businesses). Change with
      `update fmbp.app_settings set value = value || '{"deals_city_min": 5}' where key = 'social_proof';` — no app release needed.
- [ ] `apps/mobile/app.json`: bundle ids `io.fmbp.app` are owned by you on both stores; `supportEmail` is a real inbox.
- [ ] Test numbers for store review configured in Supabase (section 1.4).
- [ ] Smoke test on a production build: login → onboarding → create post → feed → respond → chat (two phones).
- [ ] Observability keys set (Sentry DSN, PostHog key) — the app tolerates missing keys.
- [ ] `supabase/config.toml` `[auth.sms.test_otp]` numbers are local-only; production uses the SMS hook.

## 4. Release checklist (each release)
1. `pnpm typecheck && pnpm lint && pnpm test`, then E2E against the local stack.
2. `npx supabase db push` + seeds + `functions deploy` (sections 1.2–1.3).
3. `eas build --profile production`, `eas submit`, tag the commit.
4. Update `PLAN.md` changelog.
