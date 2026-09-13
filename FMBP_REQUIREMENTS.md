# FMBP (Find My Business Partner) — Product Requirements & Build Guide

Version: 1.0 (consolidated)
Status: Source of truth for AI agents and developers building the FMBP mobile app
Sources merged: Product Vision & Development Guide v2.0, Business Profile & Business Offering Architecture v3.0, Opportunity Posts Architecture v1.0, Tech Stack & Delivery Plan.

How to use this file:
- Read Part A before designing anything. It is the "why".
- Read Part B for the exact product behaviour. It is the "what".
- Read Part C for the technical stack, data model and delivery plan. It is the "how".
- Read Part D for the agent skills in `skills/`. Load the relevant skill before starting a task.

---

# PART A — VISION AND PRINCIPLES

## A1. One-line definition

FMBP is a hyperlocal **Business Opportunity Discovery Platform** for India. It helps anyone who wants to earn through business, grow a business, or help another business discover opportunities and collaborate from a single app.

## A2. The core problem

Every person has something (money, skill, space, products, machines, followers, experience, time, network).
Every person needs something (money, employees, customers, suppliers, manufacturers, distributors, influencers, mentors, marketing, technology, partners).
They do not know each other. FMBP makes these opportunities discoverable and actionable.

Examples of pairs the platform connects:
- Person with ₹20 lakh to invest ↔ profitable business needing ₹20 lakh
- Restaurant owner ↔ food influencer
- Manufacturer ↔ distributor
- Farmer needing cold storage ↔ warehouse owner with empty space
- Tailor needing work ↔ boutique needing a tailor
- Teacher needing students ↔ parents needing tuition

## A3. What FMBP is NOT

Not LinkedIn, Naukri, IndiaMART, Facebook Groups, WhatsApp Groups, Freelancer, Upwork or Justdial.
Not a job portal, investor platform, freelancer platform, social network or LinkedIn alternative.
Not a matching engine. It is a discovery platform.

## A4. Target users

Small and medium businesses, MSMEs, local shops, home businesses, manufacturers, traders, distributors, students, freelancers, women entrepreneurs, farmers, shop owners, startup founders, influencers, investors, mentors, professionals, agencies, service providers. In short: anyone who wants to earn through business.

Most users are NOT educated corporate professionals. Many have never used LinkedIn and do not know terms like angel investment, VC, ROI, valuation or pitch deck. The app must never assume business knowledge.

Language rule: ask "Need Money?" not "Looking for an Angel Investor?". Advanced vocabulary appears only when the user expands Advanced Details.

## A5. Three building blocks (never mix them)

| Block | Answers | Lifetime | Required? |
|---|---|---|---|
| Business Profile | Who am I? | Permanent | Yes (3 fields) |
| Business Offering | What do I continuously provide? | Long-term | Optional |
| Opportunity Post | What do I need or offer today? | Temporary | Primary content |

Hierarchy: User → Business Profile → Business Offerings (optional) → Opportunity Posts.

The Business Profile NEVER stores investment, mentorship, influencer, manufacturing, supplier or distributor information. Those belong to Business Offerings.

## A6. Product principles (apply to every feature)

1. Opportunity First — every feed, recommendation, notification and search revolves around Opportunities.
2. One Post = One Opportunity — one primary purpose per post; multiple needs mean multiple posts.
3. Discovery Over Matching — users must discover opportunities beyond their current requirement.
4. Collaboration Over Networking — every post is an invitation to start a business conversation.
5. Business First — users own businesses; users themselves carry no role (investor, mentor, etc.).
6. Simple Enough For Everyone — plain language, no assumed business knowledge.
7. Basic First, Advanced Later — progressive disclosure everywhere.
8. Tap More, Type Less — cards, chips, dropdowns, pickers, switches, image selection; typing is the last resort.
9. Progressive Profiling — never ask everything at once; collect gradually.
10. AI Assisted — AI helps, never replaces the user.
11. Structured Data Over Free Text — structured inputs generate descriptions.
12. Trust Through Activity — trust is earned by verification, reviews, deals, response rate, completion; never purchased.
13. Location is a filter, not a limitation — hyperlocal by default, never geographically restricted.
14. Posting must always be easier than profile creation.
15. Never block; reward completion with scores instead of mandatory forms.

## A7. Engineering philosophy (feature gate)

Before adding any feature ask: **Does this help someone discover a business opportunity or create a business opportunity?**
If yes, it belongs in FMBP. If no, it probably belongs somewhere else.

## A8. UX rules (hard constraints)

- UX1: People install FMBP to solve a business problem, not to build a profile. Posting must be easier than profile creation.
- UX2: Progressive profiling. Never ask everything at once.
- UX3: Progressive disclosure. Essentials first; the rest lives under "Advanced Options" or "Complete Later".
- UX4: Every field must answer "Can this be skipped?" If yes, it is optional.
- UX5: Never ask for information before it becomes useful (e.g. no GST at onboarding; ask when verification improves trust).
- UX6: Users mostly TAP, not TYPE. Prefer cards, dropdowns, chips, search, location picker, switches, image selection, auto-generated content.
- UX7: Never ask users to write what the app can generate, infer, suggest, remember or auto-fill.
- UX8: Reward users for improving profiles (Profile Completion, Offering Completion, Verification Score, Trust Score). Never force completion.
- The app must never feel like filling government forms.
- Basic details for any post or offering must take about one minute or less.
- Hindi and English from the first build.

---

# PART B — FUNCTIONAL REQUIREMENTS

## B1. Layer 1 — User (authentication only)

Required: Name, Mobile Number (OTP login).
Optional: Email, Preferred Language, Notification Preferences.
Nothing else. No roles. Users simply own businesses.

## B2. Layer 2 — Business Profile

Goal: creation takes under one minute; user can post immediately after.

Required (3 fields only): Business Name, Business Category, Location.

Optional groups, shown later as "Complete Your Profile" suggestions:
- Contact: Phone, WhatsApp, Email, Website
- Branding: Logo, Cover Image, Business Description
- Business Information: Working Hours, Service Available, Delivery Available, Pickup Available
- Verification: GST, Udyam, FSSAI, Trade License, Import Export Code, Other Certificates → Verification Badge
- Social: Instagram, Facebook, LinkedIn, YouTube, X
- Gallery: Photos, Videos, Brochures, Catalogues

Profile Completion: show a percentage plus suggestions (Add Logo, Add Description, Upload Photos, Verify Business). Every completed item increases trust. Never block on completion.

## B3. Layer 3 — Business Offerings

Purpose: persistent, searchable capabilities a business continuously provides. They remain discoverable after posts expire. Offerings are optional.

Offering types: Investment, Mentorship, Influencer, Manufacturing, Supplier, Distributor, Marketing, Technology, Training, Legal, Accounting, Freelancer, Agency, Property, Equipment, Products, Import, Export, Consultancy, Professional Service, Others.

Two creation paths:
1. Suggested: app detects recurring post activity (e.g. "Looking to Invest ₹10,00,000") → asks "Create Investment Offering? We'll automatically fill most information." → [Create] [Later] → auto-fills from post data → user reviews → publish.
2. Manual: Choose Offering Type → Basic Information → Publish → Complete Advanced Details Later.

Every offering: own Basic form, own Advanced form, same architecture, auto-generated description, AI suggestions, improvable later. Basic ≈ one minute. Advanced never blocks publishing. Description is optional and generated; user may Accept, Edit or Delete it.

Offering form definitions (asterisk = required in Basic):

| Type | Basic | Advanced |
|---|---|---|
| Investment | Investment Range*, Preferred Industries*, Preferred Location* | Investment Type, Business Stage, Equity Preference, ROI Preference, Revenue Preference, Preferred Team Size, Business Age, Due Diligence, Pitch Deck Required, Portfolio |
| Mentor | Expertise*, Experience*, Location* | Industries, Languages, Online/Offline, Paid/Free, Availability, Session Duration, Certificates, Portfolio |
| Influencer | Platform*, Followers*, Primary Niche*, Location* | Audience Age, Audience Gender, Audience Location, Languages, Media Kit, Rate Card, Previous Brands, Campaign Types, Portfolio |
| Manufacturing | Industry*, Manufacturing Type*, Location* | OEM, ODM, Private Label, White Label, MOQ, Production Capacity, Lead Time, Export Available, Packaging, Certifications, Factory Images |
| Supplier | Product Categories*, Service Location* | MOQ, Lead Time, Warehouse Capacity, Payment Terms, GST, IEC, Delivery Areas, Certifications |
| Marketing | Marketing Service*, Location* | Industries, Platforms, Pricing, Languages, Portfolio, Case Studies, Availability |
| Technology | Technology Service*, Location* | Tech Stack, Frameworks, API Support, Cloud, Maintenance, Support, Portfolio |
| Professional Service | Service Type*, Experience*, Location* | Qualification, License, Languages, Consultation Mode, Pricing, Certificates, Portfolio |

Other types follow the same pattern (Basic = 2–4 tap fields + location; Advanced = detail fields).

Generated description examples:
- Investment: range ₹5L–₹10L, industries Retail/Manufacturing/Food, location Delhi NCR → "Looking to invest between ₹5 lakh and ₹10 lakh in Retail, Manufacturing and Food businesses in Delhi NCR."
- Influencer: Instagram, 50K, Fashion, Delhi → "Fashion influencer on Instagram with 50K followers based in Delhi."
- Manufacturer: OEM, Garments, Noida → "OEM garment manufacturer serving businesses in Noida."

AI-assisted improvement nudges (all optional): "We noticed you've completed five manufacturing projects. Add them to your Manufacturing Offering?", "Adding Pricing may increase responses."

## B4. Opportunity Posts (the heart of the product)

Definition: a temporary post answering "What do I need?" or "What am I offering right now?". If there is no opportunity there is no reason to post.

One Post = One Purpose. Examples of purposes: Need Investment, Employee, Manufacturer, Supplier, Customer, Distributor, Influencer, Mentor, Machine, Shop, Warehouse, Freelancer, Accountant, Lawyer, Marketing, Technology, Business Partner, Franchise, Training, Export Partner, Import Partner, Consultant, Delivery Partner, Packaging, Equipment, Office Space, Event Partner, Printing, Photography, Graphic Designer, Website, Mobile App, Loan, Government Scheme Information, and the mirror "offer" side (Looking to Invest, Looking for Restaurant Collaboration, etc.).

### B4.1 Creation journey (Intention First)

Tap Create Post → Choose Intention → Fill Basic Details → (Optional) Advanced Details → Publish.

First question is always "What do you want to do?" with tappable intentions:
Need Something, Offer Something, Sell Something, Buy Something, Partner With Someone, Announce Something, Learn Something, Teach Something, Invest, Raise Money.
The chosen intention (then sub-type, e.g. Need → Money) determines which form appears. Users never start with a large form.

### B4.2 Progressive forms

Basic fields: under one minute, built from dropdowns, cards, search, chips, checkboxes, location picker, image upload, AI suggestions. Advanced fields are hidden by default and meant for experienced users (Investment Type, ROI, Business Stage, Equity, Manufacturing Capacity, MOQ, Audience Demographics, Technical Skills, Licenses, Certifications, etc.).

Basic user example: Need Money → Amount ₹5 lakh → Purpose Expand Shop → Location Delhi → Publish.
Advanced user example: Need Investment → Angel → Growth stage → Revenue ₹30 lakh → Equity 10% → Pitch Deck upload → Expected ROI 15% → Publish.
Both must feel equally comfortable.

### B4.3 Auto-generated content

Structured inputs generate the description (and title). Example: Need Investment, ₹5 lakh, Expand Restaurant, Noida → "Looking for ₹5 lakh to expand my restaurant in Noida." User can Accept, Edit or Remove.

AI assistance on posts: generate title, generate description, suggest better category, suggest tags, suggest missing information, improve discoverability, suggest similar opportunities, recommend interested businesses.

### B4.4 Lifecycle and status

Lifecycle: Create → Discover → Respond → Chat → Deal → Complete → Review → Archive.
Statuses: Active, Paused, Completed, Expired, Archived. Users can renew expired posts.
Posts are temporary; a default expiry applies (see C3 for the assumed default).

### B4.5 Responses

Every post allows expressing interest through intent-specific actions: Interested, Let's Talk, Call Me, Send Proposal, Apply, Collaborate, Offer Service, Invest, Partner, Chat. Objective: start a conversation. A response opens (or joins) a chat between the two businesses.

### B4.6 Trust layer on every post

Business Name, Verification Badge, Location, Business Category, Response Rate, Member Since, Reviews, Completed Deals. (Mutual Connections: future.)

## B5. Feed

The feed is an Opportunity Discovery Feed, NOT a matching engine. It must surface opportunities beyond the user's current requirement (a restaurant owner who posted "Need Investment" still sees influencers, packaging suppliers, technology, training, government schemes, nearby businesses, trending opportunities).

Feed sections: Recommended, Latest, Trending, Nearby, Category-wise, Popular, Following Businesses, Saved Posts.

## B6. Recommendations

Separate from the feed. Personalized using Business Category, Location, Offerings, Posts, Languages, Budget, Verification, Past Activity, Interests. Example: Restaurant Owner → Food Influencers, Restaurant Consultants, Packaging Suppliers, Delivery Partners. The feed still shows everything else.

## B7. Filters

Latest, Trending, Nearby, Category, Subcategory, Pincode, City, State, Country, Verified Businesses, Following, Saved, Most Viewed, Most Responded, Most Recent, Budget Range, Industry, Business Type.

## B8. Search

Covers Opportunity Posts, Business Profiles, Business Offerings, Categories, Industries, Tags, Location, Business Name, Verified Businesses. Example: "Fashion Influencer Delhi" → Influencer Offerings + relevant Posts + relevant Businesses. Search should encourage discovery, not only lookup.

## B9. Trust

Built from Business Verification, Reviews, Ratings, Completed Deals, Response Rate, Profile Completion, Offering Completion, Activity. Earned, not purchased.

## B10. Chat, Deals and Reviews

- Chat: 1:1 between two businesses, optionally anchored to a post. Realtime. Push notification on new message and new response.
- Deal: either party can mark a post response as a Deal; both confirm; post can then be Completed.
- Review: after a Completed deal, each side can rate and review the other. Reviews feed the trust layer.

## B11. Notifications

New response on my post, new message, post expiring soon, post expired (offer renew), suggested offering, profile improvement nudge, recommended opportunities digest.

## B12. Out of scope for v1

Mutual connections, payments/monetization, multi-business accounts, semantic (embedding) search, advanced admin moderation (v1 has report-flag + admin review table only).

---

# PART C — TECHNICAL ARCHITECTURE AND PLAN

## C1. Tech stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| Mobile | React Native + Expo (TypeScript), Expo Router | One codebase iOS + Android; EAS Build/Submit; OTA updates |
| UI | NativeWind + custom component kit (Card, Chip, ChipGroup, Select, AmountPicker, LocationPicker, ImagePicker, Switch) | Tap-first primitives are the design system |
| State/data | TanStack Query (server state), Zustand (UI state), react-hook-form + Zod (forms) | |
| i18n | i18next, Hindi + English from day one | All copy in locale files, never hard-coded |
| Backend | Supabase: Postgres (+PostGIS, pg_trgm, pgvector later), Auth (phone OTP), Storage, Realtime, Edge Functions (Deno/TS) | RLS on every table |
| SMS OTP | MSG91 via Supabase Auth SMS hook | Start DLT registration in week 0 |
| AI | Claude via official `@anthropic-ai/sdk`, model `claude-opus-5`, called ONLY from Edge Functions, structured outputs via `client.messages.parse` + `zodOutputFormat` | API key never in the app |
| Location | Google Places Autocomplete + pincode table; PostGIS point on businesses and posts | |
| Push | Expo Push Notifications (FCM + APNs) | |
| Observability | Sentry (crashes), PostHog (product analytics) | |
| CI/CD | GitHub Actions: lint, typecheck, tests, EAS builds; Supabase migrations via CLI | |

## C2. Repository layout (monorepo)

```
MobileApp/
  FMBP_REQUIREMENTS.md        # this file
  skills/                     # agent skills (Part D)
  apps/mobile/                # Expo app
    app/                      # Expo Router routes
    src/components/ui/        # component kit
    src/features/<feature>/   # auth, business, posts, offerings, feed, search, chat, trust
    src/forms/                # schema-driven form renderer
    src/lib/supabase.ts
    src/i18n/{en,hi}.json
  supabase/
    migrations/               # SQL migrations
    functions/                # Edge Functions: ai-generate, feed, recommend, expire-posts, push
    seed/                     # taxonomy + form_schemas seed data
  packages/shared/            # Zod schemas + TS types shared by app and functions
```

## C3. Data model (v1)

Conventions: `uuid` PKs, `created_at`/`updated_at` timestamps, soft delete via `deleted_at`, RLS on all tables, JSONB for form answers with hot fields promoted to columns.

- `users` — id (auth.uid), name, phone, email?, language ('en'|'hi'), notification_prefs jsonb
- `businesses` — id, owner_id→users, name, category_id→categories, location geography(Point), city, state, pincode, country, phone?, whatsapp?, email?, website?, logo_url?, cover_url?, description?, working_hours jsonb?, service_available bool, delivery_available bool, pickup_available bool, social jsonb?, completion_score int, verification_status ('none'|'pending'|'verified'), member_since, response_rate numeric, completed_deals int, rating_avg numeric, rating_count int
- `business_media` — business_id, kind ('photo'|'video'|'brochure'|'catalogue'), url
- `business_verifications` — business_id, doc_type ('gst'|'udyam'|'fssai'|'trade_license'|'iec'|'other'), file_url, status, reviewed_at
- `categories` — id, parent_id?, name_en, name_hi, slug, icon
- `intentions` — id, slug (need|offer|sell|buy|partner|announce|learn|teach|invest|raise), name_en, name_hi, icon, sort
- `post_types` — id, intention_id, slug (e.g. need_money, need_employee, looking_to_invest), name_en, name_hi, plain_label_en/hi ("Need Money?"), advanced_label, icon, category_hint
- `offering_types` — id, slug, name_en, name_hi, icon
- `form_schemas` — id, target ('post'|'offering'), type_slug, version, fields jsonb (see skill fmbp-form-schema), description_template, title_template, active
- `opportunity_posts` — id, business_id, post_type_id, category_id, title, description, basic jsonb, advanced jsonb, amount_min?, amount_max?, location geography(Point), city, state, pincode, status ('active'|'paused'|'completed'|'expired'|'archived'), expires_at (default now()+30 days), renewed_count, view_count, response_count, search_tsv tsvector (generated)
- `post_media` — post_id, url, kind
- `post_tags` — post_id, tag
- `business_offerings` — id, business_id, offering_type_id, basic jsonb, advanced jsonb, description, location geography(Point), city, state, status ('active'|'paused'|'archived'), completion_score, search_tsv
- `post_responses` — id, post_id, business_id (responder), response_type ('interested'|'lets_talk'|'call_me'|'send_proposal'|'apply'|'collaborate'|'offer_service'|'invest'|'partner'|'chat'), message?, conversation_id?
- `conversations` — id, business_a, business_b, post_id?, last_message_at
- `messages` — id, conversation_id, sender_business_id, body, attachment_url?, read_at?
- `deals` — id, post_id, response_id, business_a, business_b, status ('proposed'|'confirmed'|'completed'|'cancelled')
- `reviews` — id, deal_id, reviewer_business_id, reviewee_business_id, rating 1–5, text?
- `saved_posts` — business_id, post_id
- `follows` — follower_business_id, followed_business_id
- `post_views` — post_id, business_id?, viewed_at
- `reports` — reporter_business_id, target_type ('post'|'business'|'message'), target_id, reason, status
- `push_tokens` — user_id, expo_token, platform
- `notifications` — user_id, kind, payload jsonb, read_at?

Assumed defaults (change if product decides otherwise): post expiry 30 days; renew extends 30 days; "nearby" = 25 km radius; "trending" = responses + views in last 7 days, decayed.

## C4. Schema-driven forms (key architectural decision)

Every intention/post type and every offering type has its own Basic and Advanced form. Forms are DATA, not code:
- `form_schemas.fields` is an ordered list of field definitions (key, label_en, label_hi, type, options, required, section 'basic'|'advanced', promote_to column?).
- Field types: `chips` (single), `multichips`, `select`, `amount` (₹ picker with lakh/crore presets), `range`, `number`, `location`, `image`, `file`, `switch`, `date`, `text_short` (last resort), `text_long` (last resort, usually generated).
- The app has ONE generic renderer that turns a schema into the tap-first UI.
- Answers are stored in `basic`/`advanced` JSONB; fields marked `promote_to` are copied to real columns for filtering.
- `description_template`/`title_template` use `{{key}}` placeholders and are the seed for AI generation.
Adding a new type = adding rows to `post_types`/`offering_types` + `form_schemas`. No app release needed.

## C5. AI generation contract (Edge Function `ai-generate`)

Input: `{ target: 'post'|'offering', type_slug, locale, basic: {...}, advanced?: {...}, business: {name, category, city} }`
Output (structured, validated): `{ title: string, description: string, suggested_category_slug?: string, tags: string[], missing_fields: {key, reason}[] }`
Rules: plain language, ≤ 2 sentences description, Indian number formatting (₹5 lakh), locale-aware, never invent facts not in inputs. Always show the result as editable; user can Accept / Edit / Remove.

## C6. Feed and ranking (v1)

- Feed tabs: Recommended, Latest, Trending, Nearby, Category, Following, Saved.
- Recommended v1 = rule-based score: same-category affinity map (e.g. restaurant → influencer/packaging/delivery) + distance decay + freshness + verification bonus; explicitly mixes in 30% posts outside the user's category to preserve discovery.
- Nearby = PostGIS `ST_DWithin` on active posts.
- Search = Postgres FTS (`search_tsv`) + `pg_trgm` for fuzzy business names, unioned across posts, offerings, businesses; results grouped by entity type.

## C7. Security and privacy

- RLS: businesses editable only by owner; posts/offerings readable by all when active, writable by owner; messages readable only by the two participants; responses visible to post owner and responder.
- Phone numbers never exposed in public payloads; "Call Me" shares number only after both agree in chat.
- Verification documents in a private storage bucket; only owner and admins read.
- All AI calls server-side; rate-limit per user.

## C8. Delivery plan (≈18 weeks, 2 mobile + 1 backend)

| Phase | Weeks | Ships |
|---|---|---|
| 0 Foundation | 1 | Monorepo, Expo shell, Supabase project, migrations + seed taxonomy, component kit, i18n, CI, Sentry/PostHog |
| 1 Onboarding | 1.5 | Phone OTP, one-minute business profile, profile completion card |
| 2 Create Post | 3 | Intention picker, schema-driven forms, AI title/description (accept/edit/remove), publish, My Posts |
| 3 Discover | 3 | Feed tabs, filters, search, post detail with trust card, report flag |
| 4 Respond & Chat | 2 | Response actions, realtime chat, push, response-rate tracking |
| 5 Offerings | 2 | Manual offering creation, suggest-offering-from-post with auto-fill, offering pages in search |
| 6 Lifecycle & Trust | 2 | Expiry/renew/pause/complete/archive, saved, follows, deals, reviews, verification upload + badge |
| 7 Recommendations & AI polish | 2 | Rule-based recommendations, AI category/tag/missing-field suggestions, profile nudges |
| 8 Beta & Launch | 2 | Closed beta, analytics review, perf/offline, store listings, submission |

Definition of done for every phase: installable build, migrations applied, RLS tested, Hindi + English strings present, analytics events fired, no hard-coded copy.

## C9. Risks

- SMS OTP deliverability/cost in India → start DLT + MSG91 in week 0.
- Spam/low-quality posts → report flag + admin review from phase 3.
- AI cost → generation runs once per publish/edit; cache prompt prefix; cap max_tokens.
- Non-technical users → usability test every form with 5 real shop owners before phase exit.

---

# PART D — AGENT SKILLS (in `skills/`)

These skills live in the project folder so any AI agent working on this repo can load them. Each is a `SKILL.md` with frontmatter. Load the skill whose name matches the task before writing code.

| Skill | Use when |
|---|---|
| `skills/fmbp-bootstrap` | Starting phase 0: scaffold the monorepo, Expo app, Supabase project, CI |
| `skills/fmbp-db-migration` | Adding or changing tables, RLS policies, indexes, seed data |
| `skills/fmbp-form-schema` | Adding a new post type or offering type, or changing a form |
| `skills/fmbp-screen` | Building any mobile screen or component (enforces tap-not-type UX rules) |
| `skills/fmbp-ai-generate` | Implementing or extending AI generation/suggestions in Edge Functions |
| `skills/fmbp-feed-search` | Feed ranking, nearby, recommendations, search queries |
| `skills/fmbp-review` | Reviewing any change against product principles before merging |

Agent workflow: (1) read this file's Part A and the relevant Part B section, (2) load the matching skill, (3) implement, (4) run `skills/fmbp-review` checklist, (5) report what shipped and what was deferred.
