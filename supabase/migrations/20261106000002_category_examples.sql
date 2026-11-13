-- Business categories: what belongs where (QA 2026-11-06). "Shakti LED Works" found no Electrical category. Agreed:
-- keep broad categories (no product-specific types like "LED" or "motor"), add the missing ones (Electrical &
-- Electronics, Repair & Home Services, Travel, Hotels & PG; seed 06_category_examples.sql) and show, behind an ⓘ next
-- to each category, what comes under it ("motor, fan, cooler, AC, LED, TV, remote…").
--   * categories.examples_en / examples_hi: what belongs in the category, shown in the ⓘ pop-up
--   * categories.keywords: search words (the examples plus Hindi / Hinglish names: "bijli", "pankha"), so typing
--     "LED" in the picker or in search finds Electrical & Electronics
--   * search_all: a business is also found by its category's search words, and an individual by their trade

alter table public.categories add column if not exists keywords text;
alter table public.categories add column if not exists examples_en text[] not null default '{}';
alter table public.categories add column if not exists examples_hi text[] not null default '{}';

-- search: also the category's search words, and an individual's trade
CREATE OR REPLACE FUNCTION public.search_all(p_q text, p_limit integer DEFAULT 10)
 RETURNS TABLE(entity text, id uuid, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with q as (
    select websearch_to_tsquery('english', p_q) as tsq,
           fmbp.prefix_tsquery(p_q) as pq,
           lower(trim(p_q)) as raw,
           array(select w from regexp_split_to_table(lower(trim(p_q)), '\s+') w where w <> '') as words
  )
  (select 'post'::text, p.id,
          (greatest(ts_rank(p.search_tsv, q.tsq), coalesce(ts_rank(p.search_tsv, q.pq), 0), word_similarity(q.raw, lower(p.title)) * 0.5)
           + (case when p.title ilike '%' || q.raw || '%' then 0.3 else 0 end)
           + (case when p.created_at > now() - interval '7 days' then 0.1 else 0 end)
           + fmbp.trust_bonus(b.completed_deals, b.rating_avg, b.rating_count))::real as rank
     from public.opportunity_posts p
     join public.post_types pt on pt.id = p.post_type_id
     join public.businesses b on b.id = p.business_id, q
    where p.status = 'active' and p.deleted_at is null
      and (p.search_tsv @@ q.tsq
           or (q.pq is not null and p.search_tsv @@ q.pq)
           or (cardinality(q.words) > 0 and (
                 select bool_and(p.title ilike '%' || w || '%'
                              or coalesce(p.description, '') ilike '%' || w || '%'
                              or p.city ilike '%' || w || '%'
                              or p.search_terms ilike '%' || w || '%'
                              or pt.name_en ilike '%' || w || '%' or pt.name_hi ilike '%' || w || '%' or pt.plain_label_en ilike '%' || w || '%')
                   from unnest(q.words) w))
           or (length(q.raw) >= 4 and word_similarity(q.raw, lower(p.title)) >= 0.5)
           or exists (select 1 from public.post_tags t where t.post_id = p.id
                        and (t.tag ilike p_q || '%' or to_tsvector('english', t.tag) @@ q.tsq or (length(q.raw) >= 4 and word_similarity(q.raw, t.tag) >= 0.5))))
    order by rank desc limit p_limit)
  union all
  (select 'offering', o.id,
          (greatest(ts_rank(o.search_tsv, q.tsq), coalesce(ts_rank(o.search_tsv, q.pq), 0))
           + (case when o.title ilike '%' || q.raw || '%' then 0.3 else 0 end))::real as rank
     from public.business_offerings o, q
    where o.status = 'active' and o.deleted_at is null
      and (o.search_tsv @@ q.tsq or (q.pq is not null and o.search_tsv @@ q.pq)
           or (cardinality(q.words) > 0 and (
                 select bool_and(o.title ilike '%' || w || '%' or coalesce(o.description, '') ilike '%' || w || '%' or o.city ilike '%' || w || '%')
                   from unnest(q.words) w))
           or (length(q.raw) >= 4 and word_similarity(q.raw, lower(o.title)) >= 0.5))
    order by rank desc limit p_limit)
  union all
  (select 'business', b.id, (similarity(b.name, p_q) + (case when b.verification_status = 'verified' then 0.2 else 0 end)
                             + fmbp.trust_bonus(b.completed_deals, b.rating_avg, b.rating_count))::real as rank
     from public.businesses b where b.deleted_at is null and (b.name % p_q or b.name ilike '%' || p_q || '%'
       or exists (select 1 from public.categories c where c.id = b.category_id
                  and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%' or c.keywords ilike '%' || p_q || '%'))
       or (b.kind = 'individual' and (b.trade ilike '%' || p_q || '%' or b.trade_other ilike '%' || p_q || '%')))
    order by rank desc limit p_limit);
$function$;
