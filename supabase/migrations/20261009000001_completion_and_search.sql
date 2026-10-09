-- QA round 2026-10-09 (Surya).
--
-- 1. Profile completion topped out at 75%: verification (20) and working hours (5) counted towards the score
--    but neither can be set in the app. The percentage now covers only what the owner can fill in today, so a
--    fully filled profile reads 100%. Verification stays a trust signal (badge on the trust row).
create or replace function fmbp.recompute_completion(b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s int := 20; -- name, category, location
begin
  select s
    + (case when logo_url is not null then 10 else 0 end)
    + (case when cover_url is not null then 10 else 0 end)
    + (case when description is not null and length(description) > 20 then 15 else 0 end)
    + (case when phone is not null or whatsapp is not null then 15 else 0 end)
    + (case when website is not null or email is not null or social <> '{}'::jsonb then 10 else 0 end)
    + least(20, (select count(*) from public.business_media m where m.business_id = b) * 5)
  into s from public.businesses where id = b;
  update public.businesses set completion_score = least(100, s) where id = b;
end $$;

-- email now counts, so it must re-trigger the score
drop trigger if exists businesses_completion on public.businesses;
create trigger businesses_completion after insert or update of logo_url, cover_url, description, phone, whatsapp, email, website, social, verification_status
  on public.businesses for each row execute function fmbp.trg_business_completion();

do $$ declare r record;
begin
  for r in select id from public.businesses loop perform fmbp.recompute_completion(r.id); end loop;
end $$;

-- 2. Search: substring matching on the post title (and description, city, post type name) for every word of
--    the query, on top of stemmed / prefix / fuzzy full-text matching. "sweets maker" finds "Custom sweets
--    maker available in Noida"; "cake" finds a description that mentions cakes. Whole-query title hits rank first.
create index if not exists posts_title_trgm on public.opportunity_posts using gin (title gin_trgm_ops);
create index if not exists offerings_title_trgm on public.business_offerings using gin (title gin_trgm_ops);

create or replace function public.search_all(p_q text, p_limit int default 10)
returns table (entity text, id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with q as (
    select websearch_to_tsquery('english', p_q) as tsq,
           fmbp.prefix_tsquery(p_q) as pq,
           lower(trim(p_q)) as raw,
           array(select w from regexp_split_to_table(lower(trim(p_q)), '\s+') w where w <> '') as words
  )
  (select 'post'::text, p.id,
          (greatest(ts_rank(p.search_tsv, q.tsq), coalesce(ts_rank(p.search_tsv, q.pq), 0), word_similarity(q.raw, lower(p.title)) * 0.5)
           + (case when p.title ilike '%' || q.raw || '%' then 0.3 else 0 end)
           + (case when p.created_at > now() - interval '7 days' then 0.1 else 0 end))::real as rank
     from public.opportunity_posts p
     join public.post_types pt on pt.id = p.post_type_id, q
    where p.status = 'active' and p.deleted_at is null
      and (p.search_tsv @@ q.tsq
           or (q.pq is not null and p.search_tsv @@ q.pq)
           or (cardinality(q.words) > 0 and (
                 select bool_and(p.title ilike '%' || w || '%'
                              or coalesce(p.description, '') ilike '%' || w || '%'
                              or p.city ilike '%' || w || '%'
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
  (select 'business', b.id, (similarity(b.name, p_q) + (case when b.verification_status = 'verified' then 0.2 else 0 end))::real as rank
     from public.businesses b where b.deleted_at is null and (b.name % p_q or b.name ilike '%' || p_q || '%'
       or exists (select 1 from public.categories c where c.id = b.category_id and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%')))
    order by rank desc limit p_limit);
$$;
