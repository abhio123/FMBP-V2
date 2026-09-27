-- Search: "investment" should find "invest" (stemming) and partial words should match (prefix).
-- Rebuild the generated tsvectors with the english config and add a safe prefix-query helper.
drop index if exists public.posts_search_gin;
alter table public.opportunity_posts drop column if exists search_tsv;
alter table public.opportunity_posts add column search_tsv tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
  setweight(to_tsvector('simple', coalesce(city,'')), 'C')
) stored;
create index posts_search_gin on public.opportunity_posts using gin(search_tsv);

drop index if exists public.offerings_search_gin;
alter table public.business_offerings drop column if exists search_tsv;
alter table public.business_offerings add column search_tsv tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
  setweight(to_tsvector('simple', coalesce(city,'')), 'C')
) stored;
create index offerings_search_gin on public.business_offerings using gin(search_tsv);

-- "inves" -> 'inves':* & ..., never throws on punctuation, empty -> null
create or replace function fmbp.prefix_tsquery(q text)
returns tsquery language sql immutable as $$
  select case when length(trim(regexp_replace(q, '[^[:alnum:][:space:]]', ' ', 'g'))) = 0 then null
         else to_tsquery('english', array_to_string(array(
           select w || ':*' from regexp_split_to_table(lower(trim(regexp_replace(q, '[^[:alnum:][:space:]]', ' ', 'g'))), '\s+') w where w <> ''), ' & '))
         end
$$;

create or replace function public.search_all(p_q text, p_limit int default 10)
returns table (entity text, id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with q as (select websearch_to_tsquery('english', p_q) as tsq, fmbp.prefix_tsquery(p_q) as pq)
  (select 'post'::text, p.id,
          greatest(ts_rank(p.search_tsv, q.tsq), coalesce(ts_rank(p.search_tsv, q.pq), 0)) + (case when p.created_at > now() - interval '7 days' then 0.1 else 0 end) as rank
     from public.opportunity_posts p, q
    where p.status = 'active' and p.deleted_at is null
      and (p.search_tsv @@ q.tsq or (q.pq is not null and p.search_tsv @@ q.pq) or p.title ilike '%' || p_q || '%' or p.city ilike '%' || p_q || '%'
           or exists (select 1 from public.post_tags t where t.post_id = p.id and (t.tag ilike p_q || '%' or to_tsvector('english', t.tag) @@ q.tsq)))
    order by rank desc limit p_limit)
  union all
  (select 'offering', o.id, greatest(ts_rank(o.search_tsv, q.tsq), coalesce(ts_rank(o.search_tsv, q.pq), 0)) as rank
     from public.business_offerings o, q
    where o.status = 'active' and o.deleted_at is null and (o.search_tsv @@ q.tsq or (q.pq is not null and o.search_tsv @@ q.pq) or o.title ilike '%' || p_q || '%')
    order by rank desc limit p_limit)
  union all
  (select 'business', b.id, (similarity(b.name, p_q) + (case when b.verification_status = 'verified' then 0.2 else 0 end))::real as rank
     from public.businesses b where b.deleted_at is null and (b.name % p_q or b.name ilike '%' || p_q || '%'
       or exists (select 1 from public.categories c where c.id = b.category_id and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%')))
    order by rank desc limit p_limit);
$$;
