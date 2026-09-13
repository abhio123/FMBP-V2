# FMBP — Find My Business Partner

Hyperlocal business opportunity discovery app for India. Read `FMBP_REQUIREMENTS.md` first; agent skills live in `skills/`.

## Layout
- `apps/mobile` — Expo SDK 57 (React Native 0.86, TypeScript, Expo Router, NativeWind)
- `packages/shared` — Zod schemas, form-schema contract, helpers shared by app and Edge Functions
- `supabase/` — migrations, seed data (taxonomy, form schemas, affinity), Edge Functions
- `scripts/sync-shared.mjs` — copies `packages/shared/src` into `supabase/functions/_shared/fmbp` (the edge runtime only sees `supabase/functions`)

## Local development
```bash
pnpm install
pnpm db:start                 # needs Docker; applies migrations + seeds, prints keys
pnpm db:types                 # regenerate packages/shared/src/database.types.ts after schema changes
pnpm functions:serve          # syncs shared code, serves Edge Functions on :54321/functions/v1
pnpm mobile                   # expo start (apps/mobile/.env already points at the local stack)
```
Local phone login: `9999900001`–`9999900003` accept OTP `123456` (see `[auth.sms.test_otp]` in `supabase/config.toml`). The local Twilio block holds dummy values so phone auth is enabled; production SMS goes through MSG91.

AI generation runs only in the `ai-generate` Edge Function. Without `ANTHROPIC_API_KEY` it returns the template-rendered text (`source: "template"`); with the key it calls `claude-opus-5` with structured outputs. Set it with:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # hosted
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> supabase/.env          # local (gitignored)
```

## Checks
```bash
pnpm typecheck && pnpm lint && pnpm test          # static checks + unit tests
pnpm --filter @fmbp/mobile test:e2e               # end-to-end: real data layer against the LOCAL stack
```
The E2E suite (`apps/mobile/e2e/app.e2e.test.ts`) needs `pnpm db:start` and `pnpm functions:serve` running. It logs in as test users
`9999900001` and `9999900002`, walks onboarding → create post → feed/search → view/respond → lifecycle → expiry job, and cleans up after itself.
Post/offering types without a dedicated form use the seeded `_generic` schema (see `supabase/seed/02_form_schemas.sql`).

## Status (Phase 0–2 of the plan in FMBP_REQUIREMENTS.md C8)
Done: monorepo, DB schema with RLS/triggers/RPCs, seed taxonomy and 9 form schemas, phone OTP login, one-minute business profile, intention-first create-post flow with schema-driven forms and AI/template copy, latest/trending feed, post detail, unified search, my-posts on profile, expiry job, CI workflow.
Next: nearby/recommended tabs wired to RPCs, responses + realtime chat + push (Phase 4), offerings UI (Phase 5), lifecycle actions and verification (Phase 6).
