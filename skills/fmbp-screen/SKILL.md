---
name: fmbp-screen
description: Build or modify any FMBP mobile screen or UI component in the Expo app, enforcing the tap-not-type and progressive-disclosure UX rules. Use for every UI task.
---

# FMBP Screens and Components

Read `FMBP_REQUIREMENTS.md` A6, A8 and the Part B section for the feature. The audience is non-technical Indian small-business owners; assume no business vocabulary.

## Hard rules (fail the review if broken)
1. **Tap, not type.** Free-text `TextInput` is allowed only for: business name, OTP, chat messages, search box, and editing an AI-generated description. Everything else uses `Chip`, `ChipGroup`, `Select`, `AmountPicker`, `LocationPicker`, `ImagePicker`, `Switch`.
2. **Progressive disclosure.** Basic fields visible; advanced behind a single "More details (optional)" expander. Publish/Save is enabled once basic required fields are set.
3. **Never block.** No mandatory step beyond the 3 profile fields and the basic fields of a post/offering. Completion is shown as a `ProgressCard` with suggestions, never a wall.
4. **Plain language.** Basic labels use everyday words from `post_types.plain_label_*`. Advanced labels may use domain terms.
5. **i18n.** All copy via `t('key')`; add keys to BOTH `en.json` and `hi.json` in the same change. No hard-coded strings.
6. **One post, one purpose.** Create flow: intention → type → basic → (advanced) → preview → publish. Never a multi-purpose form.
7. **Trust everywhere.** Any post or business card uses `TrustRow` (verified badge, location, category, response rate, member since, rating, completed deals).
8. **Discovery.** Feed and search screens must not filter to only matching items by default; Recommended is one tab among Latest, Trending, Nearby, Category, Following, Saved.

## Structure
- Routes in `apps/mobile/app/...` are thin; logic lives in `src/features/<feature>/` (hooks, api, components).
- Server data via TanStack Query hooks named `useXxxQuery` / `useXxxMutation` in `src/features/<feature>/api.ts`.
- Forms via `src/forms/SchemaForm` fed by a `FormSchema` from the DB; do not hand-build post/offering forms.
- Loading, empty and error states are required for every list screen. Empty states suggest an action ("Create your first post").
- Touch targets ≥ 44pt; body text ≥ 16sp; works on 360×640 Android.
- Images: compress before upload (`expo-image-manipulator`, max 1600px, 0.8 quality).

## Analytics
Fire PostHog events named in `fmbp-bootstrap` step 7 with `post_type`, `intention`, `city` properties where relevant.

## Checklist
- [ ] No `TextInput` outside the allowed list
- [ ] Advanced section collapsed by default
- [ ] `en.json` and `hi.json` both updated
- [ ] Loading / empty / error states present
- [ ] Trust row on every post/business card
- [ ] Tested on a small Android viewport
