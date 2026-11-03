# FMBP — Deploying to production

Everything below is run once to create the production environment, then repeated only for the steps marked **(each release)**.
Two systems: **Supabase** (database, auth, storage, Edge Functions) and **EAS** (store builds). CI runs the checks on every push and
starts a store build when a `v*` tag is pushed.

## 1. Supabase project (backend)

1. Create a project at https://supabase.com/dashboard (region: Mumbai `ap-south-1`). Note the project ref, anon key and service role key.
2. Link and push the schema and seeds:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push                       # applies supabase/migrations (incl. pg_cron jobs)
   psql "$(npx supabase status -o json | jq -r .DB_URL)" -f supabase/seed/01_taxonomy.sql   # or run the four seed files from the SQL editor
   psql ... -f supabase/seed/02_form_schemas.sql && psql ... -f supabase/seed/03_affinity.sql && psql ... -f supabase/seed/04_post_forms.sql
   ```
   Seeds are idempotent; re-run them whenever `supabase/seed/*.sql` changes **(each release)**.
3. Deploy the Edge Functions **(each release)**:
   ```bash
   pnpm sync:shared
   npx supabase functions deploy ai-generate expire-posts
   npx supabase functions deploy send-sms --no-verify-jwt     # auth hooks carry no user JWT; the hook secret authenticates
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...            # optional: without it posts use template copy
   npx supabase secrets set MSG91_AUTH_KEY=... MSG91_TEMPLATE_ID=... MSG91_SENDER=FMBPIN SEND_SMS_HOOK_SECRET=...
   ```
4. Phone login (OTP by SMS):
   - MSG91: register the DLT sender id and an OTP template containing `##OTP##` (takes a few days; start first).
   - Dashboard → Authentication → Providers → Phone: enable, leave the built-in SMS provider off.
   - Dashboard → Authentication → Hooks → **Send SMS**: type HTTPS, URL `https://<ref>.supabase.co/functions/v1/send-sms`,
     generate the secret and store it as `SEND_SMS_HOOK_SECRET` (step 3).
   - Test: Dashboard → Authentication → Users → add a test number with a fixed OTP for store review
     (Phone provider → Test OTPs), e.g. `+919999900001 → 123456`.
5. Storage: the `business-media` bucket and its policies come from the migrations. Confirm it is **public** in Dashboard → Storage.
6. Realtime: Dashboard → Database → Publications → `supabase_realtime` must include `messages` and `post_responses` (set by migration).
7. Nightly jobs run inside Postgres via pg_cron (`fmbp_expire_posts` 00:15 UTC, `fmbp_response_rates` 00:30 UTC). Check
   Dashboard → Integrations → Cron, or `select * from cron.job_run_details order by start_time desc limit 20;`.

8. Push notifications are sent by the database (pg_net → Expo push API) on new messages and responses; nothing to deploy.
   Delivery needs push credentials on the EAS project (section 2.3) and a real build: **Expo Go on Android cannot receive
   remote push since SDK 53**. In-app alerts still work in Expo Go.

## 2. Expo / EAS (mobile builds)

1. `npm i -g eas-cli && eas login`, then inside `apps/mobile`: `eas init` — this writes the real `extra.eas.projectId` into
   `app.json` (replace the `REPLACE_WITH_EAS_PROJECT_ID` placeholder).
2. Environment for builds (EAS → Project → Environment variables, or `eas env:create`), all **plain text / public**:
   `EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>`,
   `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_SENTRY_DSN` (both optional). The same four go into GitHub → Secrets for the CI build job.
3. Credentials: `eas credentials` once per platform (Android keystore is generated and stored by EAS; iOS needs an Apple Developer account).
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

## 2b. Share links on fmbp.app (Cloudflare Pages)
Shared posts and businesses use `https://fmbp.app/post/<id>` and `https://fmbp.app/business/<id>`
(`apps/mobile/app.json` → `extra.shareBaseUrl`). With the app installed the link opens the app (iOS Universal Links,
Android App Links); otherwise `apps/share-web` serves a preview page with "Open in app" and store buttons. Its Open
Graph tags give WhatsApp/Telegram/iMessage the photo card; email and SMS show the text and link.
1. Cloudflare → Pages → create a project from this repo: root `apps/share-web`, build command none, output `public`
   (the `functions/` folder is picked up automatically). Add the custom domain `fmbp.app`.
2. Environment variables (production): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the public anon key, reads go through RLS),
   `SITE_URL=https://fmbp.app`, and once the iOS app is live `IOS_APP_STORE_ID` (numeric id; adds the App Store
   button and Smart App Banner). `ANDROID_PACKAGE` defaults to `io.fmbp.app`.
3. Replace the placeholders, then redeploy:
   - `public/.well-known/apple-app-site-association`: `REPLACE_WITH_APPLE_TEAM_ID` → your Apple Team ID
     (developer.apple.com → Membership).
   - `public/.well-known/assetlinks.json`: `REPLACE_WITH_EAS_ANDROID_SHA256_FINGERPRINT` → `eas credentials` →
     Android → SHA-256 fingerprint (and the Play App Signing key's fingerprint from Play Console, if enabled).
4. Rebuild the apps (`associatedDomains` / `intentFilters` are native config). Expo Go cannot open https links into
   the app; test with a preview build: tap a shared link in WhatsApp/Notes; it must open the post in the app.
5. Check: `https://fmbp.app/.well-known/apple-app-site-association` and `/assetlinks.json` return JSON (no redirect),
   and https://developers.facebook.com/tools/debug/ shows the preview image for a post link.

## 3. Before the first public release

- [ ] Privacy policy and terms pages hosted (link them from `auth.terms` once the URL exists).
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
