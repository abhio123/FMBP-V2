-- QA round 2026-11-05 (Surya), agreed: trust from CONFIRMED deals.
--
-- Closing a post (Mark as completed, or after it expired) asks "Did you find someone on FMBP?": the owner picks a
-- business that responded to or chatted about this post (one tap), or "someone outside FMBP" / "no" (the post just
-- closes, nothing is counted). The picked business gets a push and confirms with one tap. Only then the deal counts:
-- "✔ N deals" on both profiles, a better place in search / For you / Nearby, the Trusted badge (3+ deals, no average
-- below 4★), and each side may rate the other once (1–5★). Ratings stay hidden until both have rated, or 14 days pass,
-- so nobody rates in revenge.
-- Against fake deals: both sides must confirm; only businesses that talked about that post in the app can be picked;
-- one deal per post; the same pair counts once per 30 days; deals give trust and ranking only, no Boosts or perks.

-- 1. Deals are written only by the functions below (the old "participants: all" policy let either side write
--    status = completed directly).
drop policy if exists "deals: participants" on public.deals;
drop policy if exists "deals: participants read" on public.deals;
create policy "deals: participants read" on public.deals for select
  using (fmbp.owns_business(business_a) or fmbp.owns_business(business_b));

alter table public.deals add column if not exists completed_at timestamptz;
alter table public.deals add column if not exists counted boolean not null default false;
create unique index if not exists deals_one_per_post on public.deals (post_id) where post_id is not null and status <> 'cancelled';
create index if not exists deals_pair_counted_idx on public.deals (least(business_a, business_b), greatest(business_a, business_b), completed_at) where counted;
create index if not exists deals_business_b_idx on public.deals (business_b, status);

-- counted = the first completed deal of this pair in 30 days
create or replace function fmbp.trg_deal_completed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
    new.counted := not exists (
      select 1 from public.deals d
       where d.id <> new.id and d.counted and d.completed_at > now() - interval '30 days'
         and least(d.business_a, d.business_b) = least(new.business_a, new.business_b)
         and greatest(d.business_a, d.business_b) = greatest(new.business_a, new.business_b));
  end if;
  return new;
end $$;
create or replace function fmbp.trg_deal_counted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.counted and not old.counted then
    update public.businesses set completed_deals = completed_deals + 1 where id in (new.business_a, new.business_b);
  end if;
  return null;
end $$;
drop trigger if exists deals_completed on public.deals;
create trigger deals_completed before update on public.deals for each row execute function fmbp.trg_deal_completed();
drop trigger if exists deals_counted on public.deals;
create trigger deals_counted after update on public.deals for each row execute function fmbp.trg_deal_counted();

-- who can be picked: businesses that responded to the post or chatted about it
create or replace function fmbp.talked_about_post(p_post_id uuid, p_business uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.post_responses r where r.post_id = p_post_id and r.business_id = p_business)
      or exists (select 1 from public.messages m join public.conversations c on c.id = m.conversation_id
                  where m.post_id = p_post_id and (c.business_a = p_business or c.business_b = p_business))
$$;

create or replace function public.deal_candidates(p_post_id uuid)
returns table (business_id uuid, name text, logo_url text)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.logo_url
    from public.opportunity_posts p
    join public.businesses b on b.id <> p.business_id and b.deleted_at is null
   where p.id = p_post_id and fmbp.owns_business(p.business_id) and fmbp.talked_about_post(p_post_id, b.id)
   order by b.name
$$;

-- 2. Close a post, optionally with the business it was done with (that business then confirms)
create or replace function public.close_post_with_deal(p_post_id uuid, p_partner_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  post public.opportunity_posts%rowtype;
  deal uuid;
  recipient uuid; lang text; prefs jsonb; owner_name text;
begin
  select * into post from public.opportunity_posts where id = p_post_id and deleted_at is null;
  if post.id is null or not fmbp.owns_business(post.business_id) then raise exception 'not_your_post' using errcode = '42501'; end if;
  if post.status not in ('completed', 'archived') then
    update public.opportunity_posts set status = 'completed' where id = p_post_id;
  end if;
  if p_partner_id is null then return null; end if;
  if p_partner_id = post.business_id or not fmbp.talked_about_post(p_post_id, p_partner_id) then
    raise exception 'not_a_candidate' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deals where post_id = p_post_id and status <> 'cancelled') then
    raise exception 'deal_exists' using errcode = 'P0001';
  end if;
  insert into public.deals (post_id, response_id, business_a, business_b, status, confirmed_by_a)
  values (p_post_id, (select id from public.post_responses where post_id = p_post_id and business_id = p_partner_id),
          post.business_id, p_partner_id, 'proposed', true)
  returning id into deal;
  -- ask the other business to confirm
  select owner_id into recipient from public.businesses where id = p_partner_id;
  select language, notification_prefs into lang, prefs from public.users where id = recipient;
  select name into owner_name from public.businesses where id = post.business_id;
  if coalesce((prefs->>'responses')::boolean, true) then
    perform fmbp.send_push(recipient, 'deal_proposed',
      case when lang = 'hi' then 'क्या आपका सौदा हुआ?' else 'Did you do a deal?' end,
      owner_name || case when lang = 'hi' then ' कहते हैं कि “' || left(post.title, 60) || '” पर आपसे सौदा हुआ। पुष्टि के लिए दबाएँ।'
                          else ' says you did a deal on “' || left(post.title, 60) || '”. Tap to confirm.' end,
      jsonb_build_object('kind', 'deal_proposed', 'deal_id', deal));
  end if;
  return deal;
end $$;

-- 3. The other business confirms (deal counts) or says it was not with them
create or replace function public.respond_to_deal(p_deal_id uuid, p_confirm boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.deals%rowtype;
  recipient uuid; lang text; partner_name text;
begin
  select * into d from public.deals where id = p_deal_id;
  if d.id is null or not fmbp.owns_business(d.business_b) then raise exception 'not_your_deal' using errcode = '42501'; end if;
  if d.status <> 'proposed' then raise exception 'deal_not_open' using errcode = 'P0001'; end if;
  if not p_confirm then
    update public.deals set status = 'cancelled' where id = p_deal_id;
    return;
  end if;
  update public.deals set confirmed_by_b = true, status = 'completed' where id = p_deal_id;
  select owner_id into recipient from public.businesses where id = d.business_a;
  select language into lang from public.users where id = recipient;
  select name into partner_name from public.businesses where id = d.business_b;
  perform fmbp.send_push(recipient, 'deal_confirmed',
    case when lang = 'hi' then 'सौदे की पुष्टि हुई ✔' else 'Deal confirmed ✔' end,
    partner_name || case when lang = 'hi' then ' ने सौदे की पुष्टि की। उन्हें रेटिंग दें।' else ' confirmed your deal. Rate them now.' end,
    jsonb_build_object('kind', 'deal_confirmed', 'deal_id', p_deal_id));
end $$;

-- reopening a closed post withdraws a deal that was not confirmed yet
create or replace function fmbp.trg_post_reopened_cancels_deal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'completed' and new.status in ('active', 'paused') then
    update public.deals set status = 'cancelled' where post_id = new.id and status = 'proposed';
  end if;
  return null;
end $$;
drop trigger if exists posts_reopened_cancel_deal on public.opportunity_posts;
create trigger posts_reopened_cancel_deal after update of status on public.opportunity_posts
  for each row execute function fmbp.trg_post_reopened_cancels_deal();

-- 4. Ratings: one per side per confirmed deal, hidden until both rated or 14 days passed
alter table public.reviews add column if not exists revealed_at timestamptz;
alter table public.reviews drop constraint if exists reviews_text_length;
alter table public.reviews add constraint reviews_text_length check (text is null or length(text) <= 300);
drop policy if exists "reviews: public read" on public.reviews;
drop policy if exists "reviews: reviewer insert" on public.reviews;
drop policy if exists "reviews: revealed or own" on public.reviews;
create policy "reviews: revealed or own" on public.reviews for select
  using (revealed_at is not null or fmbp.owns_business(reviewer_business_id));

-- the average and count use revealed ratings only
create or replace function fmbp.recompute_rating(p_business uuid)
returns void language sql security definer set search_path = public as $$
  update public.businesses b set
    rating_avg = coalesce((select avg(rating) from public.reviews where reviewee_business_id = p_business and revealed_at is not null), 0),
    rating_count = (select count(*) from public.reviews where reviewee_business_id = p_business and revealed_at is not null)
   where b.id = p_business
$$;
drop trigger if exists reviews_agg on public.reviews;

create or replace function public.rate_deal(p_deal_id uuid, p_rating int, p_text text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.deals%rowtype;
  me uuid; other uuid;
begin
  select * into d from public.deals where id = p_deal_id;
  if d.id is null or d.status <> 'completed' then raise exception 'deal_not_completed' using errcode = 'P0001'; end if;
  if fmbp.owns_business(d.business_a) then me := d.business_a; other := d.business_b;
  elsif fmbp.owns_business(d.business_b) then me := d.business_b; other := d.business_a;
  else raise exception 'not_your_deal' using errcode = '42501'; end if;
  if p_rating not between 1 and 5 then raise exception 'bad_rating' using errcode = 'P0001'; end if;
  insert into public.reviews (deal_id, reviewer_business_id, reviewee_business_id, rating, text)
  values (p_deal_id, me, other, p_rating, nullif(left(trim(coalesce(p_text, '')), 300), ''));
  -- both sides rated: show both
  if exists (select 1 from public.reviews where deal_id = p_deal_id and reviewer_business_id = other) then
    update public.reviews set revealed_at = now() where deal_id = p_deal_id and revealed_at is null;
    perform fmbp.recompute_rating(me);
    perform fmbp.recompute_rating(other);
  end if;
exception when unique_violation then
  raise exception 'already_rated' using errcode = 'P0001';
end $$;

-- nightly: ratings older than 14 days are shown even if the other side never rated
create or replace function fmbp.reveal_old_reviews()
returns int language plpgsql security definer set search_path = public as $$
declare
  b uuid; n int := 0;
begin
  for b in update public.reviews set revealed_at = now()
            where revealed_at is null and created_at < now() - interval '14 days'
          returning reviewee_business_id loop
    perform fmbp.recompute_rating(b);
    n := n + 1;
  end loop;
  return n;
end $$;
select cron.unschedule(jobid) from cron.job where jobname = 'fmbp_reveal_reviews';
select cron.schedule('fmbp_reveal_reviews', '15 1 * * *', 'select fmbp.reveal_old_reviews()');

-- 5. Reading deals
-- mine: what to confirm, what to rate, and history (the other business's name even if its post is closed)
create or replace function public.my_deals(p_business_id uuid)
returns table (id uuid, status public.deal_status, post_id uuid, post_title text, post_icon text, i_am_owner boolean,
               other_id uuid, other_name text, other_logo text, created_at timestamptz, completed_at timestamptz,
               counted boolean, my_rating int, their_rating int)
language sql stable security definer set search_path = public as $$
  select d.id, d.status, d.post_id, p.title, pt.icon, d.business_a = p_business_id,
         ob.id, coalesce(ob.name, 'Deleted business'), ob.logo_url, d.created_at, d.completed_at, d.counted,
         (select rating from public.reviews r where r.deal_id = d.id and r.reviewer_business_id = p_business_id),
         (select rating from public.reviews r where r.deal_id = d.id and r.reviewee_business_id = p_business_id and r.revealed_at is not null)
    from public.deals d
    left join public.opportunity_posts p on p.id = d.post_id
    left join public.post_types pt on pt.id = p.post_type_id
    left join public.businesses ob on ob.id = case when d.business_a = p_business_id then d.business_b else d.business_a end and ob.deleted_at is null
   where fmbp.owns_business(p_business_id) and (d.business_a = p_business_id or d.business_b = p_business_id)
     and d.status <> 'cancelled'
   order by (d.status = 'proposed' and d.business_b = p_business_id) desc, coalesce(d.completed_at, d.created_at) desc
   limit 100
$$;

-- public: a business's counted deals (post title and month only; the other business is not named)
create or replace function public.business_deals(p_business_id uuid, p_limit int default 20)
returns table (post_title text, post_icon text, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select coalesce(p.title, ''), pt.icon, d.completed_at
    from public.deals d
    left join public.opportunity_posts p on p.id = d.post_id and p.deleted_at is null
    left join public.post_types pt on pt.id = p.post_type_id
   where d.counted and (d.business_a = p_business_id or d.business_b = p_business_id)
   order by d.completed_at desc
   limit least(p_limit, 50)
$$;

-- public: confirmed deals in the last 30 days, in a city (null = everywhere), for the line on the feed
create or replace function public.deals_done_count(p_city text default null)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.deals d
    left join public.opportunity_posts p on p.id = d.post_id
   where d.counted and d.completed_at > now() - interval '30 days'
     and (p_city is null or p.city ilike p_city)
$$;

revoke all on function public.deal_candidates(uuid) from public, anon;
revoke all on function public.close_post_with_deal(uuid, uuid) from public, anon;
revoke all on function public.respond_to_deal(uuid, boolean) from public, anon;
revoke all on function public.rate_deal(uuid, int, text) from public, anon;
revoke all on function public.my_deals(uuid) from public, anon;
grant execute on function public.deal_candidates(uuid) to authenticated;
grant execute on function public.close_post_with_deal(uuid, uuid) to authenticated;
grant execute on function public.respond_to_deal(uuid, boolean) to authenticated;
grant execute on function public.rate_deal(uuid, int, text) to authenticated;
grant execute on function public.my_deals(uuid) to authenticated;
grant execute on function public.business_deals(uuid, int) to anon, authenticated;
grant execute on function public.deals_done_count(text) to anon, authenticated;

-- 6. Ranking: trusted businesses (3+ counted deals, average 4★ or no ratings yet) and businesses with deals rank higher
create or replace function fmbp.trust_bonus(p_deals int, p_rating_avg numeric, p_rating_count int)
returns numeric language sql immutable as $$
  select (case when p_deals >= 3 and (p_rating_count = 0 or p_rating_avg >= 4) then 0.15 else 0 end) + least(p_deals, 10) * 0.01
$$;

-- Nearby: still nearest first, in 2 km bands; inside a band, trusted businesses first
create or replace function public.feed_nearby(p_lat double precision, p_lng double precision, p_radius_km int default 25, p_limit int default 20, p_offset int default 0)
returns table (id uuid, distance_km double precision)
language sql stable security invoker set search_path = public as $$
  select p.id, st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000.0 as distance_km
    from public.opportunity_posts p
    join public.businesses b on b.id = p.business_id
   where p.status = 'active' and p.deleted_at is null
     and st_dwithin(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
   order by floor(st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 2000.0) asc,
            fmbp.trust_bonus(b.completed_deals, b.rating_avg, b.rating_count) desc,
            distance_km asc, p.created_at desc
   limit p_limit offset p_offset;
$$;

-- For you: same score as before; the trust part now also counts confirmed deals
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
      (case when b.verification_status = 'verified' then 0.1 else 0 end) + greatest(0, (b.rating_avg - 3)) * 0.05
        + fmbp.trust_bonus(b.completed_deals, b.rating_avg, b.rating_count) * 2 as trust,
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

-- Search: same as 20261105000002 plus the trust bonus in the post rank
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
       or exists (select 1 from public.categories c where c.id = b.category_id and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%')))
    order by rank desc limit p_limit);
$$;
