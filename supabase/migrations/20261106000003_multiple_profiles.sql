-- Several profiles under one login (QA 2026-11-06, agreed): a shopkeeper with a clothes shop and a tea stall, or a tailor
-- who also looks for work, keeps each as its own profile with its own category, posts, chats, ratings and verification.
-- Up to 3 live profiles per login, any mix of business and person. Which profile is in use is the app's choice; rights
-- come from owning the profile (fmbp.owns_business), as before. "Delete account" already covers all profiles of a login.
--
-- More profiles must not mean more power, so everything counted "per business" that could be gamed now counts per person:
--   * own profiles cannot reply to, chat with, follow or do deals with each other (no fake deals, ratings or followers)
--   * the 3-reports rule that hides a post counts different people, not profiles
--   * a block covers all profiles of the blocked person
--   * one person enters one referral code (on the first profile)
--   * no new profile while one is suspended (a suspension cannot be dodged)

-- 1. The limit (the lock: two taps at once must not both pass)
create or replace function fmbp.trg_profile_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('profiles:' || new.owner_id));
  if exists (select 1 from businesses where owner_id = new.owner_id and deleted_at is null and suspended_at is not null) then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;
  if (select count(*) from businesses where owner_id = new.owner_id and deleted_at is null) >= 3 then
    raise exception 'profile_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists businesses_profile_limit on public.businesses;
create trigger businesses_profile_limit before insert on public.businesses
  for each row execute function fmbp.trg_profile_limit();

-- 2. Own profiles do not interact
create or replace function fmbp.same_owner(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses x join businesses y on y.owner_id = x.owner_id where x.id = a and y.id = b)
$$;

create or replace function fmbp.trg_own_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'post_responses' then
    a := new.business_id; select p.business_id into b from opportunity_posts p where p.id = new.post_id;
  elsif tg_table_name = 'follows' then
    a := new.follower_business_id; b := new.followed_business_id;
  else -- conversations, deals
    a := new.business_a; b := new.business_b;
  end if;
  if a is not null and b is not null and fmbp.same_owner(a, b) then
    raise exception 'own_profile' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists responses_own_profile on public.post_responses;
create trigger responses_own_profile before insert on public.post_responses for each row execute function fmbp.trg_own_profile_guard();
drop trigger if exists conversations_own_profile on public.conversations;
create trigger conversations_own_profile before insert on public.conversations for each row execute function fmbp.trg_own_profile_guard();
drop trigger if exists follows_own_profile on public.follows;
create trigger follows_own_profile before insert on public.follows for each row execute function fmbp.trg_own_profile_guard();
drop trigger if exists deals_own_profile on public.deals;
create trigger deals_own_profile before insert on public.deals for each row execute function fmbp.trg_own_profile_guard();

-- 3. Reports count people
CREATE OR REPLACE FUNCTION fmbp.trg_report_hides_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.target_type = 'post' and (
    select count(distinct b.owner_id) from public.reports r join public.businesses b on b.id = r.reporter_business_id
     where r.target_type = 'post' and r.target_id = new.target_id and r.status = 'open') >= 3 then
    update public.opportunity_posts set hidden_at = now() where id = new.target_id and hidden_at is null;
  end if;
  return null;
end $function$;

-- 4. A block covers all profiles of the blocked person (messages, replies, chats and their posts in my feed)
create or replace function fmbp.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_blocks bl join businesses blocked on blocked.id = bl.blocked_business_id
     where (bl.blocker_business_id = a and blocked.owner_id = (select owner_id from businesses where id = b))
        or (bl.blocker_business_id = b and blocked.owner_id = (select owner_id from businesses where id = a)))
$$;

create or replace function fmbp.i_blocked_owner_of(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_blocks bl
      join businesses blocked on blocked.id = bl.blocked_business_id
      join businesses target on target.owner_id = blocked.owner_id
     where target.id = b and bl.blocker_business_id in (select fmbp.my_business_ids()))
$$;
grant execute on function fmbp.i_blocked_owner_of(uuid) to anon, authenticated;

drop policy if exists "posts: public read active" on public.opportunity_posts;
create policy "posts: public read active" on public.opportunity_posts for select using (
  fmbp.owns_business(business_id) or (
    deleted_at is null and status = 'active' and hidden_at is null
    and fmbp.business_visible(business_id)
    and not exists (select 1 from public.reports r where r.target_type = 'post' and r.target_id = opportunity_posts.id
                     and r.reporter_business_id in (select fmbp.my_business_ids()))
    and not fmbp.i_blocked_owner_of(business_id)
  )
);

-- 5. One referral code per person
CREATE OR REPLACE FUNCTION public.my_referral(p_business_id uuid)
 RETURNS TABLE(code text, boost_credits integer, referral_count integer, pending integer, can_enter_code boolean, referred_by text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select b.referral_code, b.boost_credits, b.referral_count,
         (select count(*)::int from public.referrals r where r.referrer_business_id = b.id and r.qualified_at is null),
         (not exists (select 1 from public.referrals r where r.referred_business_id = b.id)
          and b.created_at >= now() - interval '14 days'
          and not exists (select 1 from public.opportunity_posts p where p.business_id = b.id)
          -- apply_referral_code works on the owner's first profile: one person enters one code
          and not exists (select 1 from public.businesses o where o.owner_id = b.owner_id and o.deleted_at is null and o.created_at < b.created_at)),
         (select rb.name from public.referrals r join public.businesses rb on rb.id = r.referrer_business_id where r.referred_business_id = b.id)
    from public.businesses b
   where b.id = p_business_id and b.owner_id = auth.uid()
$function$;

-- 6. Notifications say which profile they are about, so opening one switches to it
CREATE OR REPLACE FUNCTION public.admin_review_verification(p_id uuid, p_approve boolean, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me text := fmbp.assert_admin(); v business_verifications; owner uuid; lang text;
begin
  select * into v from business_verifications where id = p_id;
  if v.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v.status <> 'pending' then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  if not p_approve and char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  update business_verifications set status = case when p_approve then 'verified' else 'rejected' end::verification_status,
         reviewed_at = now(), note = nullif(left(btrim(coalesce(p_note, '')), 300), '') where id = p_id;
  update businesses set verification_status = case when p_approve then 'verified' else 'rejected' end::verification_status where id = v.business_id;
  perform fmbp.log_admin(me, case when p_approve then 'verify' else 'reject_verification' end, 'business', v.business_id::text, p_note,
                         jsonb_build_object('verification_id', p_id, 'doc_type', v.doc_type));
  select owner_id into owner from businesses where id = v.business_id;
  select language into lang from users where id = owner;
  perform fmbp.send_push(owner, 'verification_result',
    case when p_approve then (case when lang = 'hi' then '✔ आपका बिज़नेस वेरिफ़ाइड है' else '✔ Your business is verified' end)
         else (case when lang = 'hi' then 'वेरिफ़िकेशन नहीं हो सका' else 'Verification not approved' end) end,
    case when p_approve then (case when lang = 'hi' then 'अब आपकी प्रोफ़ाइल और पोस्ट पर ✔ दिखेगा।' else 'Your profile and posts now show ✔ Verified.' end)
         else left(btrim(p_note), 120) end,
    jsonb_build_object('kind', 'verification_result', 'approved', p_approve, 'business_id', v.business_id));
end $function$;

CREATE OR REPLACE FUNCTION public.admin_suspend_business(p_business_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me text := fmbp.assert_admin(); owner uuid; lang text;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  if (select u.phone from businesses b join auth.users u on u.id = b.owner_id where b.id = p_business_id) = me then
    raise exception 'cannot_suspend_self' using errcode = 'P0001';
  end if;
  update businesses set suspended_at = now(), suspension_reason = left(btrim(p_reason), 300)
   where id = p_business_id and suspended_at is null returning owner_id into owner;
  if owner is null then
    if not exists (select 1 from businesses where id = p_business_id) then raise exception 'not_found' using errcode = 'P0002'; end if;
    return; -- already suspended
  end if;
  perform fmbp.log_admin(me, 'suspend', 'business', p_business_id::text, p_reason);
  select language into lang from users where id = owner;
  perform fmbp.send_push(owner, 'account_suspended',
    case when lang = 'hi' then 'आपका FMBP खाता रोका गया' else 'Your FMBP account is suspended' end,
    (select name from businesses where id = p_business_id) || ': ' || left(btrim(p_reason), 110), jsonb_build_object('kind', 'account_suspended', 'business_id', p_business_id));
end $function$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_business(p_business_id uuid, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me text := fmbp.assert_admin(); owner uuid; lang text;
begin
  update businesses set suspended_at = null, suspension_reason = null where id = p_business_id and suspended_at is not null returning owner_id into owner;
  if owner is null then return; end if;
  perform fmbp.log_admin(me, 'unsuspend', 'business', p_business_id::text, p_note);
  select language into lang from users where id = owner;
  perform fmbp.send_push(owner, 'account_restored',
    case when lang = 'hi' then 'आपका FMBP खाता फिर से चालू है' else 'Your FMBP account is active again' end,
    case when lang = 'hi' then 'आप फिर से पोस्ट और चैट कर सकते हैं।' else 'You can post and chat again.' end,
    jsonb_build_object('kind', 'account_restored', 'business_id', p_business_id));
end $function$;

-- 7. Admins see the owner's other profiles
CREATE OR REPLACE FUNCTION public.admin_business(p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  perform fmbp.assert_admin();
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'city', b.city, 'pincode', b.pincode, 'description', b.description, 'logo_url', b.logo_url,
    'phone', b.phone, 'owner_phone', u.phone, 'owner_name', pu.name, 'created_at', b.created_at, 'kind', b.kind, 'trade', b.trade,
    'trade_other', b.trade_other,
    'verification_status', b.verification_status, 'suspended_at', b.suspended_at, 'suspension_reason', b.suspension_reason,
    'deleted_at', b.deleted_at, 'completed_deals', b.completed_deals, 'rating_avg', b.rating_avg, 'rating_count', b.rating_count,
    'referral_count', b.referral_count,
    'other_profiles', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'kind', o.kind, 'suspended_at', o.suspended_at) order by o.created_at)
                         from businesses o where o.owner_id = b.owner_id and o.id <> b.id and o.deleted_at is null), '[]'), 'category', c.name_en,
    'posts_live', (select count(*) from opportunity_posts p where p.business_id = b.id and p.deleted_at is null and p.status = 'active'),
    'posts_total', (select count(*) from opportunity_posts p where p.business_id = b.id),
    'reports_against', (select count(*) from reports r where (r.target_type = 'business' and r.target_id = b.id)
                          or (r.target_type = 'post' and r.target_id in (select id from opportunity_posts where business_id = b.id))
                          or (r.target_type = 'message' and r.target_id in (select id from messages where sender_business_id = b.id))),
    'reports_made', (select count(*) from reports r where r.reporter_business_id = b.id),
    'verifications', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'doc_type', v.doc_type, 'doc_number', v.doc_number,
                         'file_path', v.file_url, 'status', v.status, 'note', v.note, 'created_at', v.created_at, 'reviewed_at', v.reviewed_at) order by v.created_at desc)
                         from business_verifications v where v.business_id = b.id), '[]'),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'note', a.note, 'admin', a.admin_phone, 'at', a.created_at) order by a.created_at desc)
                         from (select * from admin_actions a where a.target_type = 'business' and a.target_id = b.id::text order by a.created_at desc limit 20) a), '[]')
  ) into r
  from businesses b left join auth.users u on u.id = b.owner_id left join users pu on pu.id = b.owner_id left join categories c on c.id = b.category_id
  where b.id = p_business_id;
  if r is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return r;
end $function$;
