---
name: fmbp-db-migration
description: Add or change Supabase Postgres tables, RLS policies, indexes and seed data for FMBP. Use for any schema change.
---

# FMBP Database Migrations

Source of truth for tables: `FMBP_REQUIREMENTS.md` C3 and C7. Never add a column that stores role information on `users` (users only own businesses).

## Conventions
- One migration per change: `supabase migration new <verb_noun>` → `supabase/migrations/<ts>_<verb_noun>.sql`.
- Every table: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` with the shared `set_updated_at()` trigger, `deleted_at timestamptz` for soft delete where users can delete.
- Enums as Postgres `enum` types named `<table>_<column>` (e.g. `opportunity_posts_status`).
- Location: `location geography(Point, 4326)` + `city text`, `state text`, `pincode text`; GIST index on `location`.
- Search: `search_tsv tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored`; GIN index. Add `gin_trgm_ops` index on `businesses.name`.
- Form answers: `basic jsonb not null default '{}'`, `advanced jsonb not null default '{}'`. Promote filterable fields to real columns (amount_min, amount_max, category_id).
- Bilingual taxonomy rows carry `name_en` and `name_hi`.

## RLS (mandatory on every table)
```sql
alter table <t> enable row level security;
```
Standard policies:
- Owner-write: `business_id in (select id from businesses where owner_id = auth.uid())`.
- Public-read for `opportunity_posts` / `business_offerings` only where `status = 'active' and deleted_at is null`; owners always read their own.
- `messages`: read/write only if `auth.uid()` owns `business_a` or `business_b` of the conversation.
- `post_responses`: readable by post owner and responder.
- `business_verifications`, `reports`, `push_tokens`, `notifications`: owner only. Admin access via `service_role` from Edge Functions, never from the app.

## Counters and derived fields
- `response_count`, `view_count` updated by triggers on `post_responses` / `post_views`.
- `businesses.response_rate` = responses replied within 48h / responses received, recomputed nightly by `expire-posts` cron function (rename if a dedicated job is added).
- `completion_score` recomputed by trigger on `businesses`, `business_media`, `business_verifications`.

## Seed data
- Place in `supabase/seed/*.sql`, idempotent (`on conflict (slug) do update`).
- Any new `post_types` / `offering_types` row must have a matching `form_schemas` row (see `fmbp-form-schema`).

## Checklist before finishing
- [ ] RLS enabled and policies written for the new table
- [ ] Indexes for every column used in a filter (C7 filters list)
- [ ] Types regenerated: `supabase gen types typescript --local > packages/shared/src/database.types.ts`
- [ ] Zod schema added/updated in `packages/shared`
- [ ] `supabase db reset` passes
