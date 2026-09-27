-- Fuzzy matching: "investor" should reach "investment", and small typos should still find the post.
-- Adds trigram word-similarity on titles and tags to search_all (pg_trgm is already installed).
create or replace function public.search_all(p_q text, p_limit int default 10)
returns table (entity text, id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with q as (select websearch_to_tsquery('english', p_q) as tsq, fmbp.prefix_tsquery(p_q) as pq, lower(trim(p_q)) as raw)
  (select 'post'::text, p.id,
          greatest(ts_rank(p.search_tsv, q.tsq), coalesce(ts_rank(p.search_tsv, q.pq), 0), word_similarity(q.raw, lower(p.title)) * 0.5)
          + (case when p.created_at > now() - interval '7 days' then 0.1 else 0 end) as rank
     from public.opportunity_posts p, q
    where p.status = 'active' and p.deleted_at is null
      and (p.search_tsv @@ q.tsq or (q.pq is not null and p.search_tsv @@ q.pq)
           or p.title ilike '%' || p_q || '%' or p.city ilike '%' || p_q || '%'
           or (length(q.raw) >= 4 and word_similarity(q.raw, lower(p.title)) >= 0.5)
           or exists (select 1 from public.post_tags t where t.post_id = p.id
                        and (t.tag ilike p_q || '%' or to_tsvector('english', t.tag) @@ q.tsq or (length(q.raw) >= 4 and word_similarity(q.raw, t.tag) >= 0.5))))
    order by rank desc limit p_limit)
  union all
  (select 'offering', o.id, greatest(ts_rank(o.search_tsv, q.tsq), coalesce(ts_rank(o.search_tsv, q.pq), 0)) as rank
     from public.business_offerings o, q
    where o.status = 'active' and o.deleted_at is null
      and (o.search_tsv @@ q.tsq or (q.pq is not null and o.search_tsv @@ q.pq) or o.title ilike '%' || p_q || '%' or (length(q.raw) >= 4 and word_similarity(q.raw, lower(o.title)) >= 0.5))
    order by rank desc limit p_limit)
  union all
  (select 'business', b.id, (similarity(b.name, p_q) + (case when b.verification_status = 'verified' then 0.2 else 0 end))::real as rank
     from public.businesses b where b.deleted_at is null and (b.name % p_q or b.name ilike '%' || p_q || '%'
       or exists (select 1 from public.categories c where c.id = b.category_id and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%')))
    order by rank desc limit p_limit);
$$;
