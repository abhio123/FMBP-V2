-- Announcements get their own view on Home (agreed 2026-11-19): Opportunities keeps needs and offers; announcements
-- (news, opening, offer, event, new stock, price update) are listed apart, businesses I follow first, then the newest.
-- No location. One announcement a day per business keeps the view from being flooded.
-- The two new types (announce_new_stock, announce_price_list) and their forms come with the seeds (01, 04, 07).

-- 1. One announcement a day per business (India's calendar day). Admins and server jobs are not limited.
create or replace function fmbp.trg_one_announcement_a_day()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if not exists (select 1 from post_types t join intentions i on i.id = t.intention_id where t.id = new.post_type_id and i.slug = 'announce') then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('announce:' || new.business_id::text));
  if exists (select 1 from opportunity_posts p
               join post_types t on t.id = p.post_type_id join intentions i on i.id = t.intention_id
              where p.business_id = new.business_id and i.slug = 'announce'
                and (p.created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date) then
    raise exception 'one_announcement_a_day' using errcode = 'P0001',
      hint = 'This business already announced something today. It can announce again tomorrow.';
  end if;
  return new;
end $$;
revoke all on function fmbp.trg_one_announcement_a_day() from public, anon, authenticated;
drop trigger if exists posts_one_announcement_a_day on public.opportunity_posts;
create trigger posts_one_announcement_a_day before insert on public.opportunity_posts
  for each row execute function fmbp.trg_one_announcement_a_day();

-- 2. The Announcements view: live announcements, businesses I follow first, then the newest. Runs as the caller, so the
--    posts' own rules apply (hidden, reported by me, blocked, suspended are left out). Optional search words and the
--    business's category. Returns ids in order; the app loads the cards.
create or replace function public.feed_announcements(p_q text default null, p_category uuid default null, p_limit integer default 20, p_offset integer default 0)
returns table (id uuid) language sql stable security invoker set search_path = public as $$
  with mine as (
    select fmbp.my_business_ids() as id -- my profiles (nothing when signed out)
  ), followed as (
    select distinct f.followed_business_id as bid from follows f where f.follower_business_id in (select mine.id from mine)
  ), words as (
    select '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%' as w
      from unnest(regexp_split_to_array(lower(btrim(left(coalesce(p_q, ''), 60))), '\s+')) w where w <> ''
  )
  select p.id
    from opportunity_posts p
    join post_types t on t.id = p.post_type_id
    join intentions i on i.id = t.intention_id
    join businesses_public b on b.id = p.business_id
   where i.slug = 'announce' and p.status = 'active' and p.deleted_at is null and p.hidden_at is null
     and (p_category is null or coalesce(p.category_id, b.category_id) = p_category)
     and not exists (select 1 from words where lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '') || ' ' || b.name) not like words.w)
   order by (p.business_id in (select bid from followed)) desc, p.created_at desc, p.id
   limit least(greatest(coalesce(p_limit, 20), 1), 50) offset least(greatest(coalesce(p_offset, 0), 0), 2000)
$$;
revoke all on function public.feed_announcements(text, uuid, integer, integer) from public;
grant execute on function public.feed_announcements(text, uuid, integer, integer) to anon, authenticated;

-- 3. An announcement lasts 48 hours (was 7 days): what a shop announces is about now (today's stock, today's offer),
--    and a fresh one every day or two keeps the view honest. Renewing gives another 48 hours. Other posts keep 30 days.
--    Announcements already live keep the end date they had.
create or replace function fmbp.trg_post_expiry()
returns trigger language plpgsql as $$
begin
  if fmbp.is_announcement(new.post_type_id) then
    new.expires_at := now() + interval '48 hours';
  end if;
  return new;
end $$;

create or replace function public.renew_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.opportunity_posts p where p.id = p_post_id and fmbp.owns_business(p.business_id)) then
    raise exception 'not owner';
  end if;
  update public.opportunity_posts
     set status = 'active',
         expires_at = now() + case when fmbp.is_announcement(post_type_id) then interval '48 hours' else interval '30 days' end,
         renewed_count = renewed_count + 1, renewed_at = now()
   where id = p_post_id;
end $$;
