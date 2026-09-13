-- Discovery RPCs: nearby feed, recommended feed (rule-based with discovery guarantee), unified search
create table public.category_affinity (
  source_category_slug text not null,
  target_post_type_slug text not null,
  weight numeric(3,2) not null check (weight between 0 and 1),
  primary key (source_category_slug, target_post_type_slug)
);
alter table public.category_affinity enable row level security;
create policy "affinity read" on public.category_affinity for select using (true);

create or replace function public.feed_nearby(p_lat double precision, p_lng double precision, p_radius_km int default 25, p_limit int default 20, p_offset int default 0)
returns table (id uuid, distance_km double precision)
language sql stable security invoker set search_path = public as $$
  select p.id, st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000.0 as distance_km
    from public.opportunity_posts p
   where p.status = 'active' and p.deleted_at is null
     and st_dwithin(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
   order by distance_km asc, p.created_at desc
   limit p_limit offset p_offset;
$$;

-- Recommended: 0.4 affinity + 0.2 distance + 0.2 freshness + 0.1 trust + 0.1 activity, with >=30% discovery mix.
create or replace function public.feed_recommended(p_business_id uuid, p_limit int default 20, p_offset int default 0)
returns table (id uuid, score numeric, discovery boolean)
language plpgsql stable security invoker set search_path = public as $$
declare
  v_cat text; v_loc geography; v_core int := ceil(p_limit * 0.7); v_disc int := p_limit - ceil(p_limit * 0.7);
begin
  select c.slug, b.location into v_cat, v_loc from public.businesses b join public.categories c on c.id = b.category_id where b.id = p_business_id;
  return query
  with scored as (
    select p.id,
      coalesce(a.weight, 0) as affinity,
      1.0 / (1.0 + st_distance(p.location, v_loc) / 25000.0) as distance,
      exp(-extract(epoch from (now() - p.created_at)) / 86400.0 / 14.0) as freshness,
      (case when b.verification_status = 'verified' then 0.1 else 0 end) + greatest(0, (b.rating_avg - 3)) * 0.05 as trust,
      (case when exists (select 1 from public.post_views v join public.opportunity_posts pv on pv.id = v.post_id
                          where v.business_id = p_business_id and pv.post_type_id = p.post_type_id) then 0.2 else 0 end) as activity
    from public.opportunity_posts p
    join public.businesses b on b.id = p.business_id
    join public.post_types pt on pt.id = p.post_type_id
    left join public.category_affinity a on a.source_category_slug = v_cat and a.target_post_type_slug = pt.slug
    where p.status = 'active' and p.deleted_at is null and p.business_id <> p_business_id
  ),
  ranked as (
    select s.id, (0.4*s.affinity + 0.2*s.distance + 0.2*s.freshness + 0.1*s.trust + 0.1*s.activity)::numeric as score, s.affinity, s.freshness from scored s
  ),
  core as (select r.id, r.score, false as discovery from ranked r where r.affinity >= 0.3 order by r.score desc limit v_core offset p_offset),
  disc as (select r.id, r.score, true as discovery from ranked r where r.affinity < 0.3 order by r.freshness desc limit v_disc offset p_offset)
  select * from core union all select * from disc;
end $$;

-- Unified search across posts, offerings, businesses. Returns typed rows; client groups by entity.
create or replace function public.search_all(p_q text, p_limit int default 10)
returns table (entity text, id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with q as (select websearch_to_tsquery('simple', p_q) as tsq)
  (select 'post'::text, p.id, ts_rank(p.search_tsv, q.tsq) + (case when p.created_at > now() - interval '7 days' then 0.1 else 0 end) as rank
     from public.opportunity_posts p, q where p.status = 'active' and p.deleted_at is null and (p.search_tsv @@ q.tsq or p.city ilike '%' || p_q || '%'
       or exists (select 1 from public.post_tags t where t.post_id = p.id and t.tag ilike p_q || '%'))
     order by rank desc limit p_limit)
  union all
  (select 'offering', o.id, ts_rank(o.search_tsv, q.tsq) as rank
     from public.business_offerings o, q where o.status = 'active' and o.deleted_at is null and o.search_tsv @@ q.tsq
     order by rank desc limit p_limit)
  union all
  (select 'business', b.id, (similarity(b.name, p_q) + (case when b.verification_status = 'verified' then 0.2 else 0 end))::real as rank
     from public.businesses b where b.deleted_at is null and (b.name % p_q or b.name ilike '%' || p_q || '%'
       or exists (select 1 from public.categories c where c.id = b.category_id and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%')))
     order by rank desc limit p_limit);
$$;

grant execute on function public.feed_nearby(double precision, double precision, int, int, int) to authenticated;
grant execute on function public.feed_recommended(uuid, int, int) to authenticated;
grant execute on function public.search_all(text, int) to authenticated;
grant execute on function public.renew_post(uuid) to authenticated;
