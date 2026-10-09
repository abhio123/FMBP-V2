# FMBP — Build Plan and Status

Living document. Update it at the end of every task. The product definition is `FMBP_REQUIREMENTS.md`; this file tracks
what is built, what is verified, and what comes next. Phases refer to section C8 of the requirements.

_Last updated: 2026-10-10_

## 1. Where we are

| Phase | Scope (from C8) | Status |
|---|---|---|
| 0 Foundation | Monorepo, Expo shell, Supabase, migrations + seed, component kit, i18n, CI | ✅ Done (Sentry/PostHog keys not set) |
| 1 Onboarding | Phone OTP, one-minute business profile, profile completion card | ✅ Done |
| 2 Create Post | Intention picker, schema-driven forms, AI/template copy, publish, My Posts | ✅ Done (live AI path untested, see §4) |
| 3 Discover | Feed tabs, filters, search, post detail with trust card, report flag | 🟡 Feed tabs, search, detail done · filter UI and report flag missing |
| 4 Respond & Chat | Response actions, realtime chat, push, response-rate tracking | ✅ Done (push verified only to the notifications row; needs a real build for delivery) |
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
- Dedicated form for every one of the 33 active post types (incl. Influencer Available under Offer) (generic `_generic` kept only as a fallback for future types); Hindi and English templates
- Conditional fields: a field with `show_when: {key, values}` appears only for those answers (Offering a Service asks cooking, tailoring, repair… specific questions in More details)
- Business edit: name and category, plus contact, branding, flags and photos; completion score reaches 100% from the app alone
- Language picker on My Business (English / हिंदी), remembered across launches and on the account
- Feed tabs: Latest, Nearby (PostGIS), Recommended (rule-based RPC), Trending, Following, Saved, with pagination
- Unified search over posts, offerings and businesses with stemming, prefix and trigram fuzzy matching ("investor" and "invstment" find "investment")
- Post detail with trust row, view counting, expiry countdown, Save / Share / Follow, status notices with Reopen; Interested is a signal, Let's talk / Open chat is the conversation
- Feed usable before creating a business (set-up card on top); posting, responding and chat ask for the business when needed
- "Your post" badge on own posts; My Business shows 3 live posts with a Live / Completed page for all
- Responses: "Let's talk" / "Interested" → response row + 1:1 conversation → chat screen
- Chat: conversation list with unread dot, message bubbles, realtime inserts, read receipts; owner reply marks response answered
- Post lifecycle: renew, pause, resume, complete, soft delete; expiry job; response-rate job
- RLS verified: strangers cannot edit posts/businesses, respond to own post, read others' chats, or write into others' media folders
- Hindi + English strings for every screen (checked by script: both files have identical keys)

### Built but not verified on a device
- Remote push on a real build (Expo Go on Android cannot receive it); the trigger → `notifications` row path is covered by E2E, the Expo send is queued by pg_net
- Image pick + upload from the phone (verified only with bytes from the test suite)
- Keyboard handling now via react-native-keyboard-controller (Expo Go has it); confirm on device that inputs stay visible and the page never blanks after sleep
- Realtime subscription on a phone (verified via polling in the suite)

### Not built
- Feed filter sheet (data layer supports city, pincode, budget, verified-only, category)
- Report flag on posts and businesses
- Offerings UI (create, my offerings, offering detail, suggest-offering-from-post)
- Verification upload + admin review + badge
- Deals and reviews
- AI suggestions surfaced in UI (category, tags, missing fields are returned but only missing_fields is shown)
- Working hours and social links on the business profile
- "Like" style reaction on posts (Save is the interaction today; trending ranks by responses and views)

## 3. Next build steps (recommended order)

| # | Step | Why first | Size | Touches |
|---|---|---|---|---|
| 2 | Feed filter sheet | Data layer done; users ask for "near me + budget" | ½ day | `app/(tabs)/feed.tsx`, `FeedFilters` |
| 5 | Offerings UI | Second half of the marketplace | 2–3 days | new `src/features/offerings`, `app/offering/*`, profile section, search cards |
| 6 | Live AI copy | Never exercised; needs `ANTHROPIC_API_KEY` in `supabase/.env` | ½ day | `supabase/functions/ai-generate` |
| 7 | Verification + badge | Trust layer credibility | 2 days | `business_verifications`, upload to `business-media`, admin action in Studio |
| 8 | Deals + reviews | Makes ratings/completed-deals real | 2 days | `deals`, `reviews`, chat header action |
| 9 | Report flag | Required before beta (C9 risk) | ½ day | `reports` |
| 10 | Production readiness | Follow `DEPLOY.md`: hosted Supabase + MSG91 DLT + EAS project + store accounts; wire Sentry/PostHog SDKs | 2–3 days | infra |

## 4. Known gaps and risks
- **Live Claude path untested.** Without an API key the function returns template copy. First real run may surface schema/prompt issues.
- **Number fields are typed, not tapped** (equity %, ROI %) in advanced sections — mild violation of UX6; acceptable for advanced, fix with presets later.
- **Test numbers:** `9999900001–3` for devices, `9999900011–13` for the E2E suite. Never share one between a device and the suite: a global sign-out on one side kills the other's session (this caused the 401s seen on 2026-09-13).
- **Seeds vs migrations:** seed files only run on `db reset`. After editing a seed, apply it to the running DB by hand or reset.
- **Expo Go version:** the project targets SDK 57; older Expo Go shows "Project is incompatible".
- **Local stack drift:** migrations and seeds only reach the running DB on `npx supabase db reset` (or `migration up`). A device testing against a stale local DB misses newer search/completion behaviour. On 2026-10-09 the local Realtime container was also crash-looping (DB host unresolved) until `supabase stop && supabase start`; chat now polls so it still works, but check `docker ps` when realtime looks dead.
- **No iOS testing yet** (no simulator on the dev machine, no Apple device tested).

## 5. How to verify
Architecture diagram: `docs/architecture/fmbp-runtime.html`. Demo video: `docs/FMBP-demo.mp4` (2 min 43 s, narrated). Re-generate with `scripts/demo/README.md`.

```bash
pnpm typecheck && pnpm lint && pnpm test          # static + unit (shared: vitest, mobile: jest)
pnpm --filter @fmbp/mobile test:e2e               # 44 tests against the local stack (needs db + functions running)
pnpm demo:data && pnpm --filter @fmbp/mobile test:demo   # demo content + 11-test product walkthrough on top of it
```
Manual device pass after any UI change: login → onboarding → create post → feed/nearby → open post → respond → chat → My Business edit.

## 6. Changelog
- **2026-10-10 (c)** — Push notifications: database triggers (pg_net → Expo push API) on new message/response write `notifications` rows and push to every registered token; app registers the token after login, opens the chat/post on tap, shows local alerts for incoming messages while open, Chats tab badge. Chat composer no longer hidden by the keyboard (flex via style); realtime channel topic unique per subscription.
- **2026-10-10 (b)** — Demo data (`pnpm demo:data`): 14 businesses, 41 posts over 27 types, chats, follows, saves, views; demo walkthrough suite (`test:demo`, 11 tests) covering login → onboarding → every feed tab → search → detail → respond → chat with reply → save/follow → lifecycle visibility.
- **2026-10-10** — Branding and deployability: FMBP mark (icon, splash, adaptive icon, favicon), branded login with the three pillars and a language switch, brand header + "What is FMBP?" card on the feed for new users, About block with version; `eas.json` (development / preview / production), production fields in `app.json`, tag-triggered EAS build job in CI, MSG91 Send-SMS auth hook (`send-sms` function), nightly jobs moved to pg_cron, `DEPLOY.md` and `docs/store-listing.md`.
- **2026-10-09** — QA round (Surya): form fields can depend on another answer (`show_when`), used to give Offering a Service a per-service advanced section (13 services); chat polls as a fallback and refreshes on foreground when the realtime socket is down; profile completion rescaled so a fully filled profile reads 100% (verification is a badge, not part of the score); business name and category editable; language is a picker that remembers the choice; search matches every query word against title/description/city/type.
- **2026-09-30** — Post page lists every filled field (basic + advanced) with labels; free-text details close the generated description; post ↔ business navigation de-duplicated (own business goes to My Business).
- **2026-09-27 (b)** — BUGLIST.md validated section by section; closed the remaining gaps: Interested vs chat, LIVE badge on own posts, fuzzy search, empty-state CTAs, main category in form header, Influencer offer type.
- **2026-09-27** — 20-item device bug list addressed: keyboard library, chip/amount toggles, login alignment, dedicated forms for all 33 types, stemmed search, feed-first onboarding, own-post badge, Save/Share/Follow, Live/Completed posts page, status notices, Modify on review, minimal back button, category title on forms.
- **2026-09-14** — Narrated demo video (`docs/FMBP-demo.mp4`, tooling in `scripts/demo/`); web build enabled (react-native-web) for demos and quick checks; publish now returns to the post with Back-to-feed / Create-another actions.
- **2026-09-14** — Intention picker folded to 5 cards (Surya's feedback); post types re-parented, `raise_money` hidden as a duplicate of `need_money`; quick filter on the type screen.
- **2026-09-13** — E2E suite added; fixed post/business embed ambiguity, response RLS, owner soft-delete, EWKB location parsing, expiry job, generic form fallback, auth deadlock, Post tab; built chat, business edit, feed tabs, business page, Hindi templates, city fallback; reserved E2E test numbers.
- **2026-09-10** — Phases 0–2 complete.
- **2026-09-09** — Project started.
