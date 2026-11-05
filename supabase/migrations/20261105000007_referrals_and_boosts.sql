-- QA round 2026-11-05 (Surya), agreed: referrals rewarded with visibility, no money.
--
-- Every business has a referral code (6 letters/digits, no look-alike characters). A new business can enter a code
-- within 14 days of signing up and before its first post. The referral counts when the referred business publishes
-- its first post (a real business, not just a sign-up). Each counted referral gives the referrer one Boost: a live
-- post of theirs is shown in the "⚡ Boosted" row at the top of Latest for 3 days. 5 counted referrals show a
-- "Community builder" badge on the referrer's profile. No payouts, so no KYC, tax or cash-fraud handling.

-- 1. Codes and counters on the business. referral_count is public (badge); code and boost credits are the owner's
--    (read through my_referral()).
alter table public.businesses add column if not exists referral_code text;
alter table public.businesses add column if not exists boost_credits int not null default 0 check (boost_credits >= 0);
alter table public.businesses add column if not exists referral_count int not null default 0;
grant select (referral_count) on public.businesses to anon, authenticated;

-- definer: runs inside sign-up (as the new user), who may not read other businesses' codes
create or replace function fmbp.new_referral_code()
returns text language plpgsql volatile security definer set search_path = public as $
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.businesses where referral_code = code);
  end loop;
  return code;
end $$;

create or replace function fmbp.trg_business_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then new.referral_code := fmbp.new_referral_code(); end if;
  return new;
end $$;
drop trigger if exists businesses_referral_code on public.businesses;
create trigger businesses_referral_code before insert on public.businesses for each row execute function fmbp.trg_business_referral_code();

update public.businesses set referral_code = fmbp.new_referral_code() where referral_code is null;
create unique index if not exists businesses_referral_code_key on public.businesses (referral_code);

-- appended column only; still no contacts, code or credits
create or replace view public.businesses_public with (security_invoker = true) as
  select id, name, category_id, city, state, pincode, country, logo_url, cover_url, description,
         service_available, delivery_available, pickup_available, completion_score, verification_status,
         member_since, response_rate, completed_deals, rating_avg, rating_count, created_at, response_sample,
         referral_count
  from public.businesses where deleted_at is null;

-- 2. Who referred whom
create table if not exists public.referrals (
  referred_business_id uuid primary key references public.businesses(id) on delete cascade,
  referrer_business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  check (referred_business_id <> referrer_business_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_business_id);
alter table public.referrals enable row level security;
drop policy if exists "referrals: either side reads" on public.referrals;
create policy "referrals: either side reads" on public.referrals for select
  using (fmbp.owns_business(referred_business_id) or fmbp.owns_business(referrer_business_id));
-- written only by apply_referral_code() and the first-post trigger

create or replace function public.apply_referral_code(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me public.businesses%rowtype;
  referrer public.businesses%rowtype;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into me from public.businesses where owner_id = auth.uid() and deleted_at is null order by created_at limit 1;
  if me.id is null then raise exception 'no_business' using errcode = 'P0001'; end if;
  if exists (select 1 from public.referrals where referred_business_id = me.id) then
    raise exception 'already_referred' using errcode = 'P0001';
  end if;
  if me.created_at < now() - interval '14 days' or exists (select 1 from public.opportunity_posts where business_id = me.id) then
    raise exception 'too_late' using errcode = 'P0001';
  end if;
  select * into referrer from public.businesses
   where referral_code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) and deleted_at is null;
  if referrer.id is null then raise exception 'invalid_code' using errcode = 'P0001'; end if;
  if referrer.owner_id = auth.uid() then raise exception 'own_code' using errcode = 'P0001'; end if;
  insert into public.referrals (referred_business_id, referrer_business_id) values (me.id, referrer.id);
end $$;

-- The owner's referral details: code, boosts left, counted referrals, sign-ups still waiting for their first post,
-- and whether this business may still enter someone's code.
create or replace function public.my_referral(p_business_id uuid)
returns table (code text, boost_credits int, referral_count int, pending int, can_enter_code boolean, referred_by text)
language sql stable security definer set search_path = public as $$
  select b.referral_code, b.boost_credits, b.referral_count,
         (select count(*)::int from public.referrals r where r.referrer_business_id = b.id and r.qualified_at is null),
         (not exists (select 1 from public.referrals r where r.referred_business_id = b.id)
          and b.created_at >= now() - interval '14 days'
          and not exists (select 1 from public.opportunity_posts p where p.business_id = b.id)),
         (select rb.name from public.referrals r join public.businesses rb on rb.id = r.referrer_business_id where r.referred_business_id = b.id)
    from public.businesses b
   where b.id = p_business_id and b.owner_id = auth.uid()
$$;

revoke all on function public.apply_referral_code(text) from public, anon;
revoke all on function public.my_referral(uuid) from public, anon;
grant execute on function public.apply_referral_code(text) to authenticated;
grant execute on function public.my_referral(uuid) to authenticated;

-- 3. The referred business's first post counts the referral and gives the referrer a Boost
create or replace function fmbp.trg_referral_first_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  referrer uuid;
begin
  update public.referrals set qualified_at = now()
   where referred_business_id = new.business_id and qualified_at is null
  returning referrer_business_id into referrer;
  if referrer is not null then
    update public.businesses set boost_credits = boost_credits + 1, referral_count = referral_count + 1 where id = referrer;
  end if;
  return null;
end $$;
drop trigger if exists posts_referral_first_post on public.opportunity_posts;
create trigger posts_referral_first_post after insert on public.opportunity_posts for each row execute function fmbp.trg_referral_first_post();

-- 4. Boost: one credit puts a live post in the Boosted row for 3 days (added to any boost still running)
alter table public.opportunity_posts add column if not exists boosted_until timestamptz;
create index if not exists posts_boosted_idx on public.opportunity_posts (boosted_until) where boosted_until is not null;

create or replace function public.boost_post(p_post_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  post public.opportunity_posts%rowtype;
  until timestamptz;
begin
  select * into post from public.opportunity_posts where id = p_post_id;
  if post.id is null or not fmbp.owns_business(post.business_id) then raise exception 'not_your_post' using errcode = '42501'; end if;
  if post.status <> 'active' or post.deleted_at is not null or post.hidden_at is not null then
    raise exception 'post_not_live' using errcode = 'P0001';
  end if;
  update public.businesses set boost_credits = boost_credits - 1 where id = post.business_id and boost_credits > 0;
  if not found then raise exception 'no_boosts' using errcode = 'P0001'; end if;
  until := greatest(coalesce(post.boosted_until, now()), now()) + interval '3 days';
  update public.opportunity_posts set boosted_until = until where id = p_post_id;
  return until;
end $$;
revoke all on function public.boost_post(uuid) from public, anon;
grant execute on function public.boost_post(uuid) to authenticated;
