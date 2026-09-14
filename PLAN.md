# FMBP — Build Plan and Status

Living document. Update it at the end of every task. The product definition is `FMBP_REQUIREMENTS.md`; this file tracks
what is built, what is verified, and what comes next. Phases refer to section C8 of the requirements.

_Last updated: 2026-09-14_

## 1. Where we are

| Phase | Scope (from C8) | Status |
|---|---|---|
| 0 Foundation | Monorepo, Expo shell, Supabase, migrations + seed, component kit, i18n, CI | ✅ Done (Sentry/PostHog keys not set) |
| 1 Onboarding | Phone OTP, one-minute business profile, profile completion card | ✅ Done |
| 2 Create Post | Intention picker, schema-driven forms, AI/template copy, publish, My Posts | ✅ Done (live AI path untested, see §4) |
| 3 Discover | Feed tabs, filters, search, post detail with trust card, report flag | 🟡 Feed tabs, search, detail done · filter UI and report flag missing |
| 4 Respond & Chat | Response actions, realtime chat, push, response-rate tracking | 🟡 Responses, chat, response-rate done · push missing |
| 5 Offerings | Manual offering creation, suggest-from-post, offering pages in search | 🔴 DB + 3 schemas only, no UI |
| 6 Lifecycle & Trust | Expiry/renew/pause/complete/archive, saved, follows, deals, reviews, verification | 🟡 Lifecycle + profile edit done · save/follow buttons, deals, reviews, verification missing |
| 7 Recommendations & AI polish | Rule-based recommendations, AI suggestions, profile nudges | 🟡 Recommended feed RPC wired · AI suggestions not surfaced |
| 8 Beta & Launch | Closed beta, analytics, perf/offline, store listings | 🔴 Not started |

## 2. Feature checklist

### Working and verified by the E2E suite
- Phone OTP login with friendly validation and error messages; server-side session validation on launch
- Onboarding in three taps: name, category, location (GPS or city list, never blocks)
- Business profile edit: logo, cover, description, phone/WhatsApp/email/website, service flags, up to 6 photos; completion score updates
- Public business page (never exposes contact fields)
- Create post: intention → type → basic form (≤4 tap fields) → advanced (collapsed) → AI or template copy → publish
- Intention picker simplified per Surya's feedback: Need / Offer / Partner / Invest / Announce; Buy + Learn under Need, Sell + Teach under Offer; type list has a quick filter
- Generic form fallback for the 27 post types without a dedicated schema; Hindi and English templates
- Feed tabs: Latest, Nearby (PostGIS), Recommended (rule-based RPC), Trending, Following, Saved, with pagination
- Unified search over posts, offerings and businesses (title, tags, city, business name)
- Post detail with trust row, view counting, expiry countdown
- Responses: "Let's talk" / "Interested" → response row + 1:1 conversation → chat screen
- Chat: conversation list with unread dot, message bubbles, realtime inserts, read receipts; owner reply marks response answered
- Post lifecycle: renew, pause, resume, complete, soft delete; expiry job; response-rate job
- RLS verified: strangers cannot edit posts/businesses, respond to own post, read others' chats, or write into others' media folders
- Hindi + English strings for every screen (checked by script: both files have identical keys)

### Built but not verified on a device
- Image pick + upload from the phone (verified only with bytes from the test suite)
- Keyboard avoidance on the chat and form screens
- Realtime subscription on a phone (verified via polling in the suite)

### Not built
- Push notifications (token registration, send on message/response)
- Feed filter sheet (data layer supports city, pincode, budget, verified-only, category)
- Save and Follow buttons (feeds exist, no way to save/follow from the UI)
- Report flag on posts and businesses
- Offerings UI (create, my offerings, offering detail, suggest-offering-from-post)
- Verification upload + admin review + badge
- Deals and reviews
- AI suggestions surfaced in UI (category, tags, missing fields are returned but only missing_fields is shown)
- Working hours and social links on the business profile
- Dedicated form schemas for the most-used post types (currently generic)

## 3. Next build steps (recommended order)

| # | Step | Why first | Size | Touches |
|---|---|---|---|---|
| 1 | Push notifications | Chats and responses go unnoticed without them | 1 day | `expo-notifications`, `push_tokens`, a `notify` Edge Function triggered on `messages`/`post_responses` insert |
| 2 | Feed filter sheet | Data layer done; users ask for "near me + budget" | ½ day | `app/(tabs)/feed.tsx`, `FeedFilters` |
| 3 | Save + Follow buttons | Saved/Following tabs are empty without them | ½ day | post detail, business page, `saved_posts`, `follows` |
| 4 | Dedicated schemas for top 6 types | Generic form gives thin posts | 1 day, seed data only | `supabase/seed/02_form_schemas.sql` (skill: `fmbp-form-schema`) |
| 5 | Offerings UI | Second half of the marketplace | 2–3 days | new `src/features/offerings`, `app/offering/*`, profile section, search cards |
| 6 | Live AI copy | Never exercised; needs `ANTHROPIC_API_KEY` in `supabase/.env` | ½ day | `supabase/functions/ai-generate` |
| 7 | Verification + badge | Trust layer credibility | 2 days | `business_verifications`, upload to `business-media`, admin action in Studio |
| 8 | Deals + reviews | Makes ratings/completed-deals real | 2 days | `deals`, `reviews`, chat header action |
| 9 | Report flag | Required before beta (C9 risk) | ½ day | `reports` |
| 10 | Production readiness | Hosted Supabase, MSG91 SMS, EAS build, Sentry/PostHog keys, store listings | 1 week | infra |

## 4. Known gaps and risks
- **Live Claude path untested.** Without an API key the function returns template copy. First real run may surface schema/prompt issues.
- **Number fields are typed, not tapped** (equity %, ROI %) in advanced sections — mild violation of UX6; acceptable for advanced, fix with presets later.
- **Test numbers:** `9999900001–3` for devices, `9999900011–13` for the E2E suite. Never share one between a device and the suite: a global sign-out on one side kills the other's session (this caused the 401s seen on 2026-09-13).
- **Seeds vs migrations:** seed files only run on `db reset`. After editing a seed, apply it to the running DB by hand or reset.
- **Expo Go version:** the project targets SDK 57; older Expo Go shows "Project is incompatible".
- **No iOS testing yet** (no simulator on the dev machine, no Apple device tested).

## 5. How to verify
Demo video: `docs/FMBP-demo.mp4` (2 min 43 s, narrated). Re-generate with `scripts/demo/README.md`.

```bash
pnpm typecheck && pnpm lint && pnpm test          # static + unit (shared: vitest, mobile: jest)
pnpm --filter @fmbp/mobile test:e2e               # 38 tests against the local stack (needs db + functions running)
```
Manual device pass after any UI change: login → onboarding → create post → feed/nearby → open post → respond → chat → My Business edit.

## 6. Changelog
- **2026-09-14** — Narrated demo video (`docs/FMBP-demo.mp4`, tooling in `scripts/demo/`); web build enabled (react-native-web) for demos and quick checks; publish now returns to the post with Back-to-feed / Create-another actions.
- **2026-09-14** — Intention picker folded to 5 cards (Surya's feedback); post types re-parented, `raise_money` hidden as a duplicate of `need_money`; quick filter on the type screen.
- **2026-09-13** — E2E suite added; fixed post/business embed ambiguity, response RLS, owner soft-delete, EWKB location parsing, expiry job, generic form fallback, auth deadlock, Post tab; built chat, business edit, feed tabs, business page, Hindi templates, city fallback; reserved E2E test numbers.
- **2026-09-10** — Phases 0–2 complete.
- **2026-09-09** — Project started.
