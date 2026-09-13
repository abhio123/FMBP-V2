---
name: fmbp-bootstrap
description: Scaffold the FMBP monorepo (Expo app, Supabase project, shared package, CI) for phase 0. Use when the repo is empty or when setting up a new environment.
---

# FMBP Bootstrap (Phase 0)

Read `FMBP_REQUIREMENTS.md` Part C (C1, C2, C3) first. Do not invent a different stack.

## Steps

1. **Monorepo**
   - `pnpm init` at repo root; add `pnpm-workspace.yaml` with `apps/*`, `packages/*`, `supabase/functions/*`.
   - Root scripts: `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`.

2. **Mobile app** (`apps/mobile`)
   - `pnpm create expo-app@latest mobile --template blank-typescript`, then install Expo Router.
   - Install: `nativewind tailwindcss`, `@tanstack/react-query`, `zustand`, `react-hook-form zod @hookform/resolvers`, `i18next react-i18next`, `@supabase/supabase-js`, `expo-location expo-image-picker expo-notifications expo-secure-store`, `@sentry/react-native`, `posthog-react-native`.
   - Create folders exactly as in C2. Add `src/lib/supabase.ts` reading `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - Route skeleton: `app/(auth)/login`, `app/(auth)/otp`, `app/(onboarding)/business`, `app/(tabs)/feed`, `app/(tabs)/search`, `app/(tabs)/create`, `app/(tabs)/chat`, `app/(tabs)/profile`, `app/post/[id]`, `app/business/[id]`.
   - `src/i18n/en.json` and `hi.json`; wire i18next with device-language default.

3. **Shared package** (`packages/shared`): Zod schemas + TS types for every table in C3, and the `FormSchema` / `FormField` types from `fmbp-form-schema`. Both app and Edge Functions import from here.

4. **Supabase** (`supabase/`)
   - `supabase init`; enable extensions in first migration: `postgis`, `pg_trgm`, `uuid-ossp`.
   - Create migrations for every C3 table using `fmbp-db-migration` conventions.
   - Seed: `categories`, `intentions`, `post_types`, `offering_types`, `form_schemas` (start with Need Money, Need Employee, Need Influencer, Looking to Invest, plus Investment and Influencer offerings).
   - Edge Functions stubs: `ai-generate`, `feed`, `recommend`, `expire-posts` (cron), `push`.
   - Auth: phone provider enabled; SMS hook pointing at MSG91 (document env vars in `supabase/.env.example`).

5. **Component kit** (`src/components/ui`): `Card`, `Chip`, `ChipGroup`, `Select`, `AmountPicker`, `LocationPicker`, `ImagePicker`, `Switch`, `ProgressCard`, `TrustRow`. Each takes `label` as an i18n key.

6. **CI**: GitHub Actions workflow running `pnpm lint && pnpm typecheck && pnpm test`, `supabase db lint`, and EAS build on tags.

7. **Observability**: Sentry init in `app/_layout.tsx`; PostHog with events `post_created`, `post_viewed`, `response_sent`, `offering_created`, `profile_completed_item`.

## Done when
- `pnpm typecheck` passes, app boots to the login screen in Expo Go, `supabase db reset` applies all migrations and seeds without error.
