---
name: fmbp-review
description: Review any FMBP change against the product principles, UX rules and architecture before merging. Run at the end of every task.
---

# FMBP Change Review

Apply to the diff you just produced. Answer each item yes/no; fix every "no" before reporting done.

## Feature gate (A7)
- Does this help someone discover or create a business opportunity? If not, remove it or justify explicitly.

## Building blocks (A5)
- Business Profile stores only identity data; no investment/mentor/influencer/manufacturing fields leaked in.
- Users table stores only auth/profile data; no roles.
- Posts stay one-purpose; no multi-intention forms.
- Offerings and posts are distinct tables and screens.

## UX rules (A8)
- Basic path is tap-based and takes about a minute; no free-text except the allowed list in `fmbp-screen`.
- Advanced fields collapsed by default; nothing mandatory beyond documented required fields.
- No information asked before it is useful (no GST/verification at onboarding).
- Plain labels in basic; domain vocabulary only in advanced.
- Hindi and English strings both present.
- Completion shown as progress and suggestions, never as a blocker.

## Discovery (B5–B8)
- Feed still mixes non-matching opportunities; recommended keeps the 30% discovery guarantee.
- Location used as a filter, never as a hard restriction.

## Trust and safety (B4.6, C7)
- Trust row present on post/business cards.
- RLS policies exist for any new table; phone numbers not in public payloads.
- AI calls happen server-side only; outputs are editable; no invented facts.

## Engineering
- Forms come from `form_schemas`, not hard-coded screens.
- Zod schemas in `packages/shared` updated; DB types regenerated.
- Loading/empty/error states; analytics events; tests for new logic.
- Migration applies on `supabase db reset`.

## Report format
List: what shipped, what was deferred and why, any principle you consciously bent and the reason.
