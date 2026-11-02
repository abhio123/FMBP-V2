# FMBP — Find My Business Partner

Hyperlocal business opportunity discovery app for India. Read `FMBP_REQUIREMENTS.md` first; agent skills live in `skills/`.

## Layout
- `apps/mobile` — Expo SDK 58 (React Native 0.88, TypeScript, Expo Router, NativeWind)
- `apps/share-web` — fmbp.app share pages (link previews, store fallback, Universal/App Link files); see `DEPLOY.md` §2b
- `packages/shared` — Zod schemas, form-schema contract, helpers shared by app and Edge Functions
- `supabase/` — migrations, seed data (taxonomy, form schemas, affinity), Edge Functions
- `scripts/sync-shared.mjs` — copies `packages/shared/src` into `supabase/functions/_shared/fmbp` (the edge runtime only sees `supabase/functions`)

## Local development
```bash
pnpm install
pnpm db:start                 # needs Docker; applies migrations + seeds, prints keys
                              # low-memory machines: npx supabase start -x vector,logflare,studio,pg_meta,imgproxy,pooler
pnpm db:reset                 # re-apply migrations + seeds to a running stack (a device testing a stale DB misses new behaviour)
pnpm db:types                 # regenerate packages/shared/src/database.types.ts after schema changes
pnpm functions:serve          # syncs shared code, serves Edge Functions on :54321/functions/v1
pnpm mobile                   # expo start (apps/mobile/.env already points at the local stack)
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

c. After a pull that adds new files in supabase/migrations/ or supabase/seed/
------------------------------------------------------------------------------
pnpm install: Update the database, using one of these:
npx supabase migration up: applies only the new changes and keeps your data.
pnpm db:reset: wipes all local data, rebuilds the database and reloads starter data. Use it when seed files changed. Run pnpm demo:data again afterwards.
pnpm mobile

d. What must keep running while you use the app
-----------------------------------------------
Docker Desktop, with the database started by pnpm db:start. It keeps running in the background. After a PC restart, open Docker and run pnpm db:start again.
pnpm mobile in a terminal.
pnpm functions:serve in a second terminal, only for features that use backend functions (AI text, SMS hook). Login and browsing work without it.

Login Numbers and OTP
----------------------
Local phone login: `9999900001`–`9999900003` accept OTP `123456` (see `[auth.sms.test_otp]` in `supabase/config.toml`). The local Twilio block holds dummy values so phone auth is enabled; production SMS goes through MSG91.

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

## Checks
```bash
pnpm typecheck && pnpm lint && pnpm test          # static checks + unit tests
pnpm --filter @fmbp/mobile test:e2e               # end-to-end: real data layer against the LOCAL stack
```
The E2E suite (`apps/mobile/e2e/app.e2e.test.ts`) needs `pnpm db:start` and `pnpm functions:serve` running. It logs in as test users
`9999900011` and `9999900012` (reserved for the suite; use 01–03 on devices), walks onboarding → profile edit → create post → feed/search → view/respond → chat → lifecycle → expiry job (39 tests), and cleans up after itself.
Post/offering types without a dedicated form use the seeded `_generic` schema (see `supabase/seed/02_form_schemas.sql`).

## Architecture
`docs/architecture/fmbp-runtime.html` is an interactive runtime architecture diagram (open it in a browser); its source spec is next to it.

## Demo
`docs/FMBP-demo.mp4` is a narrated walkthrough of every feature; `scripts/demo/README.md` explains how to re-record it. The app also runs on web (`npx expo start --web` in `apps/mobile`) for quick checks.

## Status and plan
See `PLAN.md` for phase completion, the feature checklist, next build steps and known gaps. Update it at the end of every task.
