---
name: fmbp-feed-search
description: Implement feed tabs, nearby and trending queries, rule-based recommendations, filters and unified search over posts, offerings and businesses. Use for any discovery, ranking or search task.
---

# FMBP Feed, Recommendations and Search

Read `FMBP_REQUIREMENTS.md` B5–B8 and C6. The feed is a discovery feed, NOT a matching engine. Recommendations are the personalized layer; the feed must keep showing everything else.

## Feed (Edge Function `feed`, or Postgres RPCs)
Expose one RPC per tab, each returning active, non-deleted posts with the business trust fields joined:
- `feed_latest(cursor)` — `order by created_at desc`, keyset pagination.
- `feed_trending(cursor)` — score = `response_count*3 + view_count*0.2`, counted over last 7 days, times `exp(-age_days/7)`.
- `feed_nearby(lat, lng, radius_km=25, cursor)` — `ST_DWithin(location, point, radius)` ordered by distance then freshness.
- `feed_category(category_id, cursor)`, `feed_following(business_id, cursor)`, `feed_saved(business_id, cursor)`.
- `feed_recommended(business_id, cursor)` — see below.
All accept the filter object from B7 (`pincode, city, state, country, verified_only, budget_min, budget_max, industry, business_type, post_type`). Never return `phone`/`whatsapp`.

## Recommended (v1, rule-based; no ML yet)
Score each active post from other businesses:
- `affinity` from a `category_affinity` table (source_category → target post_type, weight 0–1). Seed e.g. restaurant → need_influencer 0.9, offer_packaging 0.8, offer_delivery 0.8, offer_consulting 0.6.
- `distance` = `1 / (1 + km/25)`.
- `freshness` = `exp(-age_days/14)`.
- `trust` = +0.1 if verified, +0.05 per rating star above 3.
- `activity` = +0.2 if the user viewed/saved/responded to this post_type before.
Final = `0.4*affinity + 0.2*distance + 0.2*freshness + 0.1*trust + 0.1*activity`.
Discovery guarantee: at least 30% of each page comes from post types with `affinity < 0.3` (sampled by freshness). This is intentional; do not "optimize" it away.

## Search (RPC `search_all(q, filters, cursor)`)
Union of three queries, each limited and tagged with `entity`:
- posts: `search_tsv @@ websearch_to_tsquery('simple', q)` ranked by `ts_rank` + freshness.
- offerings: same on `business_offerings.search_tsv`.
- businesses: `name % q` (pg_trgm) or category/tag match, ranked by similarity + verification.
Also match `categories.name_en/hi`, `post_tags.tag`, and city/pincode tokens (strip a matched city token from `q` and apply it as a filter). Return grouped: `{ posts:[], offerings:[], businesses:[] }`. Search must run for Hindi input too (`'simple'` config, no stemming assumptions).

## Client
- `useFeedQuery(tab, filters)` with `useInfiniteQuery`; prefetch the next page at 70% scroll.
- Filters persisted in Zustand and reflected as chips above the list; "Nearby" asks for location permission lazily, never at app start.
- Every impression writes to `post_views` (batched, debounced) to feed trending and response-rate metrics.

## Checklist
- [ ] Discovery guarantee (30% outside affinity) present in recommended
- [ ] All queries use keyset pagination, indexed columns only
- [ ] No phone/whatsapp in payloads
- [ ] Hindi query returns results
- [ ] Explain-analyze on nearby and search under 50 ms with 100k posts seeded
