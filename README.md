# FMBP — Find My Business Partner

Hyperlocal business opportunity discovery app for India. Read `FMBP_REQUIREMENTS.md` first; agent skills live in `skills/`.

## Layout
- `apps/mobile` — Expo SDK 58 (React Native 0.88, TypeScript, Expo Router, NativeWind)
- `apps/share-web` — website pages for findmybusinesspartner.net (home, information pages, share-link previews, store fallback, Universal/App Link files)
- `apps/web-worker` — the Cloudflare Worker that serves those pages on findmybusinesspartner.net; see `WEB_PAGE.md` §4 and `DEPLOY.md` §2b
- `packages/shared` — Zod schemas, form-schema contract, helpers shared by app and Edge Functions
- `supabase/` — migrations, seed data (taxonomy, form schemas, affinity), Edge Functions
- `scripts/sync-shared.mjs` — copies `packages/shared/src` into `supabase/functions/_shared/fmbp` (the edge runtime only sees `supabase/functions`)

## Local development
```bash
pnpm install
pnpm db:start                 # needs Docker; applies migrations + seeds, prints keys
                              # low-memory machines: npx supabase start -x vector,logflare,studio,pg_meta,imgproxy,pooler
npx supabase migration up         # database updates(nothing to do if already up to date)
pnpm db:seed                  # re-apply seed data (post types, forms) to the running DB; keeps all your data
pnpm admin:local                  # 9999900000 = admin seeded after a reset
pnpm db:reset                 # rebuild from scratch: WIPES all local data (last resort)
pnpm db:types                 # regenerate packages/shared/src/database.types.ts after schema changes
pnpm functions:serve          # syncs shared code, serves Edge Functions on :54321/functions/v1
pnpm mobile                   # expo start (apps/mobile/.env already points at the local stack)
or run following:
cd apps\mobile
npx expo start --clear            # open in Expo Go

```
a. First-time setup
-------------------
Install Node 22, pnpm 9 and Docker Desktop.
pnpm install: installs packages.
pnpm db:start: starts the local database and backend in Docker, creates the tables and adds starter data.
pnpm demo:data (optional): adds sample businesses and posts.
pnpm mobile: starts the app. Scan the QR code with your phone on the same Wi-Fi as your PC.

b. After a pull with only code changes
--------------------------------------
pnpm install: needed only if package.json or pnpm-lock.yaml changed. It's safe to always run.
pnpm mobile. Add --clear if something looks stale.

c. After a pull that adds new files in supabase/migrations/, supabase/seed/ or supabase/forms/
------------------------------------------------------------------------------------------------
pnpm install
npx supabase migration up: applies only the new database changes and keeps your data.
pnpm db:seed: reloads post types and forms (seed files) and keeps your data.
pnpm mobile
(pnpm db:reset rebuilds everything but WIPES all local data: only if the database is broken. Run pnpm demo:data again afterwards.)

d. What must keep running while you use the app
-----------------------------------------------
Docker Desktop, with the database started by pnpm db:start. It keeps running in the background. After a PC restart, open Docker and run pnpm db:start again.
pnpm mobile in a terminal.
pnpm functions:serve in a second terminal, only for features that use backend functions (AI text, SMS hook). Login and browsing work without it.

Login Numbers and OTP
----------------------
Local phone login (OTP `123456` for all): `9999900000` is the admin (run `pnpm admin:local` once after a database reset; see ADMIN.md), `9999900001`–`9999900009` are normal users (see `[auth.sms.test_otp]` in `supabase/config.toml`). The local Twilio block holds dummy values so phone auth is enabled; production SMS goes through MSG91.

Viewing the Database
--------------------
Viewing the local database (needs `pnpm db:start`): **Supabase Studio** at http://127.0.0.1:54323 (Table Editor, SQL Editor, Auth users, Storage), or any Postgres client such as DBeaver with `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (app tables are in schema `public`). The hosted project has the same Studio at https://supabase.com/dashboard. Contact columns (`businesses.phone/whatsapp/email`) are not readable through the API by design; Studio and DBeaver connect as the database owner and see them.

AI generation runs only in the `ai-generate` Edge Function. Without `ANTHROPIC_API_KEY` it returns the template-rendered text (`source: "template"`); with the key it calls `claude-opus-5` with structured outputs. Set it with:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # hosted
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> supabase/.env          # local (gitignored)
```

## Demo data
```bash
pnpm demo:data                                    # 14 businesses, ~40 posts over 27 types, chats, follows, saves (re-runnable)
pnpm --filter @fmbp/mobile test:demo              # walkthrough: visitor logs in, browses every tab, searches, responds, chats
```
Then log in on a device as `9999900002` (Gupta Garments, Delhi) or `9999900003` (Sharma Sweets, Noida): both own posts and have unread chats.
`9999900001` stays empty for the first-time experience. Demo rows are marked `advanced._demo` and removed on the next run.

## Push notifications
Sent by the database on new messages and responses. Expo Go on Android cannot receive remote push (SDK 53+); the app shows local
alerts there instead. For real delivery build with `eas build --profile preview` after `eas init` and FCM/APNs credentials (see `DEPLOY.md`).

## Moderation
Reports (post, business, message) are in `public.reports`. A post reported by 3 different businesses is hidden for
everyone (`opportunity_posts.hidden_at`) until reviewed; the reporter never sees what they reported again.
Review daily in the app: **admin area → Reports** (see [ADMIN.md](ADMIN.md): login, every admin feature, the test admin
number). The SQL below is only a fallback when the app cannot be used (it is not written to the admin log):
```sql
-- open reports, most reported first
select target_type, target_id, count(*) as reports, array_agg(distinct reason) as reasons, min(created_at) as first
  from reports where status = 'open' group by 1, 2 order by 3 desc, 5;
-- dismiss (post shown again; kept for the record)
update reports set status = 'dismissed' where target_id = '<id>' and status = 'open';
update opportunity_posts set hidden_at = null where id = '<id>';
-- action: remove the post
update reports set status = 'actioned' where target_id = '<id>' and status = 'open';
update opportunity_posts set deleted_at = now() where id = '<id>';
-- action: suspend a business (hides it and all its posts; lift with suspended_at = null). Never use deleted_at for
-- this: that is the owner's own account deletion.
update businesses set suspended_at = now(), suspension_reason = '<reason the owner sees>' where id = '<business id>';
```
Blocks are private to the blocker (`business_blocks`); a block stops messages and responses both ways.

## Account deletion
"Delete account" hides the business, posts and offerings at once (same timestamp) and logs out; signing in within 30
days offers "Restore my account". After 30 days `fmbp_erase_accounts` (pg_cron, 00:45 UTC) erases personal data:
the business row stays as "Deleted business" (chats point to it), posts and media rows are deleted, the phone number is
released. Photo files are deleted by the `erase-media` Edge Function (schedule it, DEPLOY.md 7b). Run on demand with
the service role: `select public.run_erase_deleted_accounts();`.

## Checks
```bash
pnpm typecheck && pnpm lint && pnpm test          # static checks + unit tests
pnpm --filter @fmbp/mobile test:e2e               # end-to-end: real data layer against the LOCAL stack
```
The E2E suite (`apps/mobile/e2e/app.e2e.test.ts`) needs `pnpm db:start` and `pnpm functions:serve` running. It logs in as test users
`9999900011` and `9999900012` (reserved for the suite; use 01–09 on devices; afterwards `pnpm e2e:clean` removes the suite's test profiles from the local database), walks onboarding → profile edit → create post → feed/search → view/respond → chat → lifecycle → expiry job (39 tests), and cleans up after itself.
Post/offering types without a dedicated form use the seeded `_generic` schema (see `supabase/seed/02_form_schemas.sql`).

Editing post forms
------------------
Each post category's form is one file: `supabase/forms/post/<category>.json` (basic fields shown first, 8–12 of them,
the rest under "More details"; labels in English and Hindi). To change a form: edit the JSON and **raise its
`version`** (old posts keep the version they were made with), then run `pnpm forms:build` (validates every form and
writes `supabase/seed/04_post_forms.sql`) and `pnpm db:seed`. `pnpm test` also checks all forms. New broad groups are
added to `supabase/seed/01_taxonomy.sql`.

Business categories and trades
------------------------------
- **Business categories** stay broad (no product-specific ones like "LED shop"). Each has an ⓘ in the picker that
  lists what comes under it (Electrical & Electronics: wires, LED, fans, motors, AC, TV, remote…), and those examples
  plus Hindi / Hinglish words ("bijli", "pankha") are its search words, in the picker and in Search. The examples
  and the 3 newer categories are in `scripts/category-examples.mjs`: change a line, run `pnpm categories:build`
  (writes `supabase/seed/06_category_examples.sql`) and `pnpm db:seed`. English and Hindi lists must have the same
  length (the script checks).
- **Trades** (what an individual does, and the job / skill choices of the Looking for work, Need skilled person and
  Need employee forms): `packages/shared/src/trades.ts`. A new trade must also be added to those forms' options (with
  the same value) and the form `version` raised; `pnpm test` checks that every form job is a trade.

## Architecture
`docs/architecture/fmbp-runtime.html` is an interactive runtime architecture diagram (open it in a browser); its source spec is next to it.

## Demo
`docs/FMBP-demo.mp4` is a narrated walkthrough of every feature; `scripts/demo/README.md` explains how to re-record it. The app also runs on web (`npx expo start --web` in `apps/mobile`) for quick checks.

## Status and plan
See `PLAN.md` for phase completion, the feature checklist, next build steps and known gaps. Update it at the end of every task.

## Changing the name, logo, colours or texts

- **Name, support e-mail, website, company details (legal name, address, grievance officer):** `packages/shared/src/brand.ts`, used by the app, the app build, the information pages, the website and the server. Replace the sample company details and set `isSample: false` before publishing. Run `pnpm sync:shared` after a change.
- **Logo files and colours:** `apps/mobile/brand.config.js` (every screen, the styling classes, the app icon and splash screen). A new name or logo needs a new app build.
- **Texts** (titles such as "Opportunities", the tagline, notes): `apps/mobile/src/i18n/en.json` and `hi.json`. Write `{{appName}}` for the app's name.
