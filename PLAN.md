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
- Paid/membership post extension (longer or more renewals) on top of the free Renew

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
- **Expo Go version:** the project targets SDK 58; a different Expo Go SDK shows "Project is incompatible". Upgrade steps: `VERSION_UPGRADE.md` section 1.
- **Local stack drift:** migrations and seeds only reach the running DB on `npx supabase db reset` (or `migration up`). A device testing against a stale local DB misses newer search/completion behaviour. On 2026-10-09 the local Realtime container was also crash-looping (DB host unresolved) until `supabase stop && supabase start`; chat now polls so it still works, but check `docker ps` when realtime looks dead.
- **iOS testing is manual only** (no simulator on the dev machine; Expo Go on an iPhone since 2026-11-01). iOS-specific layout fixes (login centring, header inset) need a device check after UI changes.

## 5. How to verify
Architecture diagram: `docs/architecture/fmbp-runtime.html`. Demo video: `docs/FMBP-demo.mp4` (2 min 43 s, narrated). Re-generate with `scripts/demo/README.md`.

```bash
pnpm typecheck && pnpm lint && pnpm test          # static + unit (shared: vitest, mobile: jest)
pnpm --filter @fmbp/mobile test:e2e               # 44 tests against the local stack (needs db + functions running)
pnpm demo:data && pnpm --filter @fmbp/mobile test:demo   # demo content + 11-test product walkthrough on top of it
```
Manual device pass after any UI change: login → onboarding → create post → feed/nearby → open post → respond → chat → My Business edit.

## 6. Changelog
- **2026-11-04 (d)** — Language dialog showed no padding, borders or radio circles: its Tailwind classes were new to the app and the running Metro had not generated them (NativeWind builds styles at bundle time; restart with `npx expo start --clear` after adding new utility classes if they don't show). The dialog now uses plain StyleSheet styles (24 pt padding, bordered 56 pt rows with radio circles, Cancel button), so it no longer depends on class generation.
- **2026-11-04 (c)** — Search screen: title + one-line hint, search box with magnifier and clear button; while nothing is searched it shows recent searches (on the phone, max 6, saved on submit or tap only), "Try searching" example chips and a "What you can find here" guide. Chat: unsent text is kept per chat on the phone (`features/chat/drafts`): restored when the chat opens, saved while typing and when leaving, cleared on send. Drafts and recent searches are wiped on log out (shared phones). Language dialog: Material-style padding (title no longer tight to the top).
- **2026-11-04 (b)** — Language picker dialog blended into the page: now a proper dialog — 50% dark scrim over the whole screen (incl. Android status/navigation bars), card with border and shadow, each choice a full-width row with a radio circle (selected row highlighted), and a Cancel button; tap outside / Back also closes. Render tests added (`Select.test.tsx`).
- **2026-11-04** — Post screen: two big choices (Need / Offer) + Announce, with a 🤝 partnership tip; "Need business partner" moved under Need, "Looking to invest" hidden (replaced by Offer → Money to invest / lend; old posts stay); intentions without active types are no longer listed (Partner / Invest gone). Forms (all 49, new versions): "More details" depends on the sub-category picked (business category, product, skill/job, learning topic, vehicle, business type, machine, professional service: show_when blocks), and every form has ≥ 6 always-visible advanced fields (test-enforced). Picking "Other" opens an optional text box; the text is stored as `<field>_other` and shown instead of "Other" in post details, templates and ai-generate (shared `answerText`). Up to 5 photos per post. Review step is a read-only preview of the post exactly as published (shared `PostBody` with the post page); Modify / Publish unchanged. Owners can edit a published post (✏️ on the post page and on My posts): same form → preview → "Save changes"; status, responses and expiry stay; `edited_at` (set by the database on content changes) shows "Updated on". Short pickers (e.g. language) open as a centred card; long ones are full screen below the status bar. Migration `20261104000001`.
- **2026-11-03 (f)** — Categories and forms reworked for the app's purpose (local skills, assets, money and space meeting as partners). Need and Offer mirror each other: Need 24 categories (new: Need skilled person, Need vehicle on rent), Offer 19 (new: Available for work, Money to invest/lend, Vehicle for rent, Can sell your products, Delivery, Promotion, Professional services, Business guidance, Can manufacture, Can distribute, Something else), Announce 4 (new: Opening, Offer/discount, Event). Every form has 8–12 basic fields (≤5 required, mostly tap answers; FormSchema basic limit raised from 4 to 12, short text allowed in basic) plus category-specific "More details". Every non-announcement form asks "How do you want to work?" (Paid / Rent / Partnership / Exchange) → `opportunity_posts.deal_type` → 🤝 Partner badge and a Partnership feed tab. Announcements last 7 days (publish and renew). Forms are JSON files in `supabase/forms/post/` built into `supabase/seed/04_post_forms.sql` (`pnpm forms:build`, validated in `pnpm test`); `pnpm db:seed` reloads seeds without wiping data (local DB now current: all 46 E2E pass). Post sheet: swipe-down / Back / ✕ all ask before discarding a filled form (`usePreventRemove`). Migration `20261103000003`. Open decision: fold the Partner and Invest tabs into Need/Offer.
- **2026-11-03 (e)** — Post flow opens as a sheet from the bottom on Android too (was slide-from-right; iPhone keeps its native sheet). Every step has a ✕ close button (top right, back stays top left); if the user already filled something, it asks "Discard this post?" first.
- **2026-11-03 (d)** — Chat message box stayed tall on iPhone after sending a message with many line breaks (iOS doesn't shrink a grown multiline input when its text is cleared programmatically). The box now has an explicit height that follows its content (44–120) and resets to one line after sending or when emptied; keyboard stays open.
- **2026-11-03 (c)** — Chat: the swipe-to-reply arrow showed permanently beside my own (right-aligned) messages because nothing covered it; it is now invisible at rest and fades/grows in only while a message is dragged right (`ReplyArrow`, driven by the swipe progress).
- **2026-11-03 (b)** — Chat layout after device review: the post a message is about now sits inside that message's bubble (icon, "About this post", title, status tag when not live; tap opens it) instead of a free-floating card between messages. Reply like WhatsApp/Instagram: swipe a message right (reply arrow) or press and hold; the reply shows a quote inside its bubble, and tapping the quote scrolls to the original and flashes it. Tip about replying moved next to the message box (shown when a chat covers 2+ posts). Expired/completed/removed posts keep their title in chats via `chat_post_refs` (participants only, posts of the two businesses only; migration `20261103000002`). `MessageBubble` component + render tests.
- **2026-11-03** — One chat per pair of businesses (was one per post). Messages carry the post they are about (`messages.post_id`) and can quote an earlier message (`reply_to_id`); the thread shows a post card wherever the topic changes, a chat opened from a post shows a removable "About: <post>" chip so the next message is tagged, press-and-hold → Reply quotes a message (sender, text, its post), and a tip appears once a chat covers 2+ posts. `conversations.post_id` now = post discussed most recently (chat list line), kept by the message trigger; unique `(business_a, business_b)` with canonical order. Existing chats merged without loss (messages tagged with their old chat's post, response links and notification payloads repointed). Send policy checks the post belongs to one of the two businesses and a quote is from the same chat. Demo data reuses the pair chat and only deletes demo messages. Migration `20261103000001`.
- **2026-11-02 (f)** — Search results highlight what matched: only the typed letters, wherever they occur ("jale" → [Jale]bi, [jale]dar; whole-word marking replaced the same day on Surya's feedback) in post title, description, business name and category/city, offerings and business results (`Highlight` + `src/lib/highlight.ts`; terms ≥ 2 letters, case-insensitive, Hindi-safe). Other screens render unchanged (no terms passed). Language picker on My Business no longer shows "Optional" (`Field showOptional`). Open: WhatsApp on iPhone strips all text from a prefilled message that contains a link (tested 2026-11-02: link-only for every variant with a link, full text without); decision pending between copy-and-paste and link + preview card (needs fmbp.app, which does not resolve yet).
- **2026-11-02 (e)** — WhatsApp button never falls back silently to the share sheet any more (on iPhone that path keeps only the link): if neither `whatsapp://send` nor wa.me opens, an alert says so and offers Share. Unit tests cover route order, strict encoding (message decodes back intact) and the no-silent-fallback rule.
- **2026-11-02 (d)** — WhatsApp share on iPhone delivered only the link: iOS now opens WhatsApp's own scheme `whatsapp://send?text=` (fallbacks: wa.me, then the share sheet; dev log says which route failed), and the message is strictly percent-encoded (`*` for bold, `!'()` included). Feed header: app name at app-name size (18 px, 40 px logo; text block = logo height), "Opportunities" as a 16 px section title under it. Tab icons match their labels (Ionicons: house, search, plus, chats, storefront; filled when selected).
- **2026-11-02 (c)** — Quick actions are round icon buttons with a one-word label (`IconAction`, `@expo/vector-icons` Ionicons): WhatsApp (brand green), Share (phone's share menu, which includes Instagram DM), Save; same 52 px circle for every icon. No dedicated Instagram button: Instagram can't receive text + link (Stories image only, needs native setup). Bottom tabs use one short word (Home · Search · Post · Chats · Business; page titles unchanged), so iPhone no longer cuts them; the "…" stays as a fallback. Feed brand: 48 px logo with name + slogan filling its height.
- **2026-11-02 (b)** — Security: business phone/WhatsApp/email were readable by anyone with the anon key (row policy can't hide columns). Column-level grants now expose only public columns to anon/authenticated (`owner_id` to signed-in users only); the owner reads contacts via `get_my_business_details` (security definer, `auth.uid()` check). Migration `20261102000002`, E2E asserts the denial. Sharing: WhatsApp's iOS share extension keeps only the link when shared text contains one, so posts and businesses get a "WhatsApp" button (wa.me with the full message, bold title) next to the system "Share" (plain text + link); one `ShareActions` component on post, business and My Business. Feed header shows the full name "Find My Business Partner" with the slogan "Grow your business with the right partners".
- **2026-11-02** — Sharing: posts and businesses share `https://fmbp.app/post|business/<id>` links (tappable everywhere, open the app via Universal/App Links once deployed; `associatedDomains` + `intentFilters` in app.json); new `apps/share-web` (Cloudflare Pages) renders link previews (post photo → business cover → logo → FMBP mark) with store fallback, escaped output, CSP, UUID-validated reads through RLS; a shared link opened while signed out returns to it after login. Share business from My Business and the business page. Post photos are now uploaded at publish (they were saved as device `file://` paths nobody else could see) and shown on the post page. iOS 26: non-scroll pages under a header (My posts, chat) inset by the measured header overlap (`useHeaderInset`). Feed brand larger than the page title. Expiry/renewal dates and countdown visible to the owner only. "Interested" can be withdrawn (RLS delete for `interested` rows only). Business card on a post: Follow inline beside the business. Response rate explained ("Replies to N% of enquiries within 2 days") and shown only from 3 responses (`response_sample`). Following: follower count on business/profile, followers get a push when a followed business posts (max 1 per business per follower per 24 h, opt-out `notification_prefs.follows`). Migration `20261102000001`.
- **2026-11-01 (b)** — Post lifecycle display: My posts has Live / Expired / Completed tabs (expired posts no longer mixed into Completed; renew from the post page). Post page shows Posted on, Renewed on (new `renewed_at`, set by `renew_post`, migration `20261101000002`) and Expires on with days left; countdown pluralised ("1 day") and hidden on completed/archived posts. Expiry policy agreed: 30 days from publish/renew, editing never moves it, only Renew extends (future: membership for longer/more renewals). "Updated on" deferred until post editing exists (needs its own column; `updated_at` moves on counters/jobs). Feed header: brand row above the "Opportunities" title (side by side they collided on iPhone). Shared `formatDate`/`daysUntil` (identical output on iOS and Android).
- **2026-11-01** — Expo SDK 57 → 58 (React Native 0.88, React 19.3) so current Expo Go opens the app; steps recorded in `VERSION_UPGRADE.md`. Supabase requests (except storage uploads) time out after 20 s so an unreachable backend shows a network error instead of an endless loader. iOS layout: `Screen` content wrapper grows to the viewport and login/OTP centre with `flex-grow` (with `flex-1` the box shrank below its content on iPhone, so the top of the login page sat above the scroll origin, unreachable); login no longer auto-focuses the phone field, so the language switch is visible on first open; page scroll views use `contentInsetAdjustmentBehavior="automatic"` so content no longer hides behind the translucent iOS header; Edit business shows its title once (native header). Expo Go on Android detected with `isRunningInExpoGo()` (SDK 58 broke the old check, causing a notification-channel crash). Profile completion: any business photo completes the photos section (migration `20261101000001`). Found the local DB 5 migrations behind (completion stuck at 75%, prefix search missing): applied with `supabase migration up`; documented in `VERSION_UPGRADE.md` §2.
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
