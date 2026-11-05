-- Admin (QA 2026-11-05). Admins sign in with their phone number and OTP like everyone else; a number listed in
-- public.admins is asked "Continue as: normal user / admin". That choice is only the app's layout: every admin
-- function below checks fmbp.is_admin() on the server and writes an entry to public.admin_actions.
-- One admin level (agreed): every admin can do everything, including adding other admins. See ADMIN.md.
--
-- Also closes a hole found while building this: signed-in users could update ANY column of their own business and
-- post (column grants), e.g. set verification_status = 'verified', ratings, deal counts, boost credits, or un-hide a
-- reported post. Those columns are now writable only by the server (functions and triggers).

-- 1. Who is an admin ------------------------------------------------------------------------------------------------
create table if not exists public.admins (
  phone text primary key check (phone ~ '^91[6-9][0-9]{9}$'), -- as stored by Supabase Auth: 91 + 10 digits
  name text not null check (char_length(name) between 2 and 60),
  added_by text,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);
alter table public.admins enable row level security; -- no policies: read and written only by the functions below

create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  admin_phone text not null,
  action text not null,
  target_type text,
  target_id text,
  note text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
create index if not exists admin_actions_target_idx on public.admin_actions (target_type, target_id, created_at desc);
alter table public.admin_actions enable row level security; -- no policies

create or replace function fmbp.my_phone()
returns text language sql stable security definer set search_path = public as $$
  select phone from auth.users where id = auth.uid()
$$;

create or replace function fmbp.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.phone = fmbp.my_phone() and a.disabled_at is null)
$$;
grant execute on function fmbp.is_admin() to authenticated;

create or replace function fmbp.assert_admin()
returns text language plpgsql stable security definer set search_path = public as $$
declare me text := fmbp.my_phone();
begin
  if me is null or not exists (select 1 from public.admins a where a.phone = me and a.disabled_at is null) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return me;
end $$;

create or replace function fmbp.log_admin(p_admin text, p_action text, p_target_type text, p_target_id text, p_note text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.admin_actions (admin_phone, action, target_type, target_id, note, data)
  values (p_admin, p_action, p_target_type, p_target_id, nullif(btrim(p_note), ''), coalesce(p_data, '{}'))
$$;

-- for the app: show "Continue as admin" after the OTP
create or replace function public.am_i_admin()
returns boolean language sql stable security definer set search_path = public as $$ select fmbp.is_admin() $$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

-- 2. Suspension ------------------------------------------------------------------------------------------------------
-- A suspended business disappears for everyone (business, posts) and its owner can do nothing but read the reason.
-- Not the same as deleted_at (the owner's own "Delete account", erased after 30 days).
alter table public.businesses add column if not exists suspended_at timestamptz;
alter table public.businesses add column if not exists suspension_reason text;
grant select (suspended_at, suspension_reason) on public.businesses to anon, authenticated;

create or replace function fmbp.business_visible(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and deleted_at is null and suspended_at is null)
$$;
grant execute on function fmbp.business_visible(uuid) to anon, authenticated;

-- owning a suspended business gives no rights (every owner policy and function goes through these two)
create or replace function fmbp.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid() and suspended_at is null)
$$;
create or replace function fmbp.my_business_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.businesses where owner_id = auth.uid() and deleted_at is null and suspended_at is null
$$;

drop policy if exists "businesses: public read" on public.businesses;
create policy "businesses: public read" on public.businesses for select
  using (deleted_at is null and (suspended_at is null or owner_id = auth.uid()));

drop policy if exists "posts: public read active" on public.opportunity_posts;
create policy "posts: public read active" on public.opportunity_posts for select using (
  fmbp.owns_business(business_id) or (
    deleted_at is null and status = 'active' and hidden_at is null
    and fmbp.business_visible(business_id)
    and not exists (select 1 from public.reports r where r.target_type = 'post' and r.target_id = opportunity_posts.id
                     and r.reporter_business_id in (select fmbp.my_business_ids()))
    and not exists (select 1 from public.business_blocks bl where bl.blocked_business_id = opportunity_posts.business_id
                     and bl.blocker_business_id in (select fmbp.my_business_ids()))
  )
);

-- 3. Columns only the server writes ----------------------------------------------------------------------------------
-- Applies to app users (roles anon / authenticated) writing the table directly. Functions (security definer) and
-- triggers (nested updates) are not affected.
create or replace function fmbp.trg_business_protected()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') or pg_trigger_depth() > 1 then return new; end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'none'; new.completed_deals := 0; new.rating_avg := 0; new.rating_count := 0;
    new.boost_credits := 0; new.referral_count := 0; new.suspended_at := null; new.suspension_reason := null;
    return new;
  end if;
  if (new.owner_id, new.verification_status, new.completed_deals, new.rating_avg, new.rating_count, new.response_rate,
      new.response_sample, new.boost_credits, new.referral_code, new.referral_count, new.member_since, new.suspended_at,
      new.suspension_reason, new.deleted_at, new.created_at)
     is distinct from
     (old.owner_id, old.verification_status, old.completed_deals, old.rating_avg, old.rating_count, old.response_rate,
      old.response_sample, old.boost_credits, old.referral_code, old.referral_count, old.member_since, old.suspended_at,
      old.suspension_reason, old.deleted_at, old.created_at) then
    raise exception 'protected_column' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists businesses_protected on public.businesses;
create trigger businesses_protected before insert or update on public.businesses
  for each row execute function fmbp.trg_business_protected();

create or replace function fmbp.trg_post_protected()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') or pg_trigger_depth() > 1 then return new; end if;
  if tg_op = 'INSERT' then
    new.hidden_at := null; new.boosted_until := null; new.view_count := 0; new.response_count := 0;
    return new;
  end if;
  if (new.business_id, new.hidden_at, new.boosted_until, new.view_count, new.response_count, new.expires_at,
      new.renewed_at, new.renewed_count, new.created_at)
     is distinct from
     (old.business_id, old.hidden_at, old.boosted_until, old.view_count, old.response_count, old.expires_at,
      old.renewed_at, old.renewed_count, old.created_at) then
    raise exception 'protected_column' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists posts_protected on public.opportunity_posts;
create trigger posts_protected before insert or update on public.opportunity_posts
  for each row execute function fmbp.trg_post_protected();

-- 4. Verification ----------------------------------------------------------------------------------------------------
-- The business uploads a document photo to the PRIVATE bucket verification-docs/<business id>/...; only that business
-- and admins can read it (admins through short-lived signed links).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "verification docs: owner write" on storage.objects;
create policy "verification docs: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and fmbp.owns_business(((storage.foldername(name))[1])::uuid));
drop policy if exists "verification docs: owner or admin read" on storage.objects;
create policy "verification docs: owner or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (fmbp.owns_business(((storage.foldername(name))[1])::uuid) or fmbp.is_admin()));

-- requests are made only through request_verification (the old policy let an owner write any status)
drop policy if exists "verif: owner all" on public.business_verifications;
drop policy if exists "verif: owner read" on public.business_verifications;
create policy "verif: owner read" on public.business_verifications for select using (fmbp.owns_business(business_id));

create or replace function public.request_verification(p_business_id uuid, p_doc_type public.verification_doc_type, p_doc_number text, p_file_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare b public.businesses; id uuid;
begin
  select * into b from public.businesses where public.businesses.id = p_business_id;
  if b.id is null or not fmbp.owns_business(p_business_id) then raise exception 'not_owner' using errcode = '42501'; end if;
  if b.verification_status = 'verified' then raise exception 'already_verified' using errcode = 'P0001'; end if;
  if exists (select 1 from public.business_verifications v where v.business_id = p_business_id and v.status = 'pending') then
    raise exception 'already_pending' using errcode = 'P0001';
  end if;
  if p_file_path is null or split_part(p_file_path, '/', 1) <> p_business_id::text then raise exception 'invalid' using errcode = '22023'; end if;
  insert into public.business_verifications (business_id, doc_type, doc_number, file_url)
  values (p_business_id, p_doc_type, nullif(left(btrim(p_doc_number), 40), ''), p_file_path) returning business_verifications.id into id;
  update public.businesses set verification_status = 'pending' where public.businesses.id = p_business_id;
  return id;
end $$;

-- 5. Admin: dashboard ------------------------------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return jsonb_build_object(
    'businesses', (select count(*) from businesses where deleted_at is null),
    'businesses_today', (select count(*) from businesses where deleted_at is null and created_at > date_trunc('day', now())),
    'businesses_week', (select count(*) from businesses where deleted_at is null and created_at > now() - interval '7 days'),
    'posts_live', (select count(*) from opportunity_posts where deleted_at is null and status = 'active'),
    'posts_today', (select count(*) from opportunity_posts where deleted_at is null and created_at > date_trunc('day', now())),
    'posts_week', (select count(*) from opportunity_posts where deleted_at is null and created_at > now() - interval '7 days'),
    'responses_week', (select count(*) from post_responses where created_at > now() - interval '7 days'),
    'messages_week', (select count(*) from messages where created_at > now() - interval '7 days'),
    'deals_month', (select count(*) from deals where counted and completed_at > now() - interval '30 days'),
    'open_reports', (select count(distinct (target_type, target_id)) from reports where status = 'open'),
    'hidden_posts', (select count(*) from opportunity_posts where deleted_at is null and hidden_at is not null),
    'pending_verifications', (select count(*) from business_verifications where status = 'pending'),
    'suspended', (select count(*) from businesses where suspended_at is not null and deleted_at is null),
    'deletions_pending', (select count(*) from users where deletion_requested_at is not null and erased_at is null)
  );
end $$;

-- 6. Admin: reports --------------------------------------------------------------------------------------------------
-- One row per reported thing (post, business, message), most reported first.
create or replace function public.admin_reports(p_status text default 'open')
returns table (target_type text, target_id uuid, reports int, reasons text[], details text[], first_at timestamptz, last_at timestamptz,
               title text, body text, business_id uuid, business_name text, hidden boolean, removed boolean, suspended boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query
  with g as (
    select r.target_type, r.target_id, count(*)::int n, array_agg(distinct r.reason) rs,
           array_remove(array_agg(r.details order by r.created_at desc), null) ds, min(r.created_at) f, max(r.created_at) l
      from reports r where r.status = p_status group by 1, 2
  )
  select g.target_type, g.target_id, g.n, g.rs, g.ds[1:5], g.f, g.l,
         coalesce(p.title, b.name, '…'),
         coalesce(p.description, m.body, b.description),
         coalesce(p.business_id, m.sender_business_id, b.id),
         ob.name,
         p.hidden_at is not null, p.deleted_at is not null, ob.suspended_at is not null
    from g
    left join opportunity_posts p on g.target_type = 'post' and p.id = g.target_id
    left join messages m on g.target_type = 'message' and m.id = g.target_id
    left join businesses b on g.target_type = 'business' and b.id = g.target_id
    left join businesses ob on ob.id = coalesce(p.business_id, m.sender_business_id, b.id)
   order by g.n desc, g.f asc
   limit 200;
end $$;

-- p_action: dismiss (nothing wrong: the post shows again) | remove_post | suspend_business
create or replace function public.admin_resolve_report(p_target_type text, p_target_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); owner_biz uuid;
begin
  if p_action not in ('dismiss', 'remove_post', 'suspend_business') or p_target_type not in ('post', 'business', 'message') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select coalesce(p.business_id, m.sender_business_id, b.id) into owner_biz
    from (select 1) x
    left join opportunity_posts p on p_target_type = 'post' and p.id = p_target_id
    left join messages m on p_target_type = 'message' and m.id = p_target_id
    left join businesses b on p_target_type = 'business' and b.id = p_target_id;
  if p_action = 'dismiss' then
    update reports set status = 'dismissed' where target_type = p_target_type and target_id = p_target_id and status = 'open';
    if p_target_type = 'post' then update opportunity_posts set hidden_at = null where id = p_target_id; end if;
  elsif p_action = 'remove_post' then
    if p_target_type <> 'post' then raise exception 'invalid' using errcode = '22023'; end if;
    perform public.admin_remove_post(p_target_id, p_note);
    update reports set status = 'actioned' where target_type = p_target_type and target_id = p_target_id and status = 'open';
  else
    if owner_biz is null then raise exception 'not_found' using errcode = 'P0002'; end if;
    perform public.admin_suspend_business(owner_biz, coalesce(p_note, 'Reported content'));
    update reports set status = 'actioned' where target_type = p_target_type and target_id = p_target_id and status = 'open';
  end if;
  perform fmbp.log_admin(me, 'report_' || p_action, p_target_type, p_target_id::text, p_note);
end $$;

-- 7. Admin: businesses and posts -------------------------------------------------------------------------------------
-- Search businesses (name, business phone or the owner's login phone) and posts (title). Includes suspended, deleted
-- and hidden ones: admins must find them.
create or replace function public.admin_search(p_q text)
returns table (kind text, id uuid, business_id uuid, title text, subtitle text, flags text[], created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare q text := btrim(coalesce(p_q, '')); digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
begin
  perform fmbp.assert_admin();
  if char_length(q) < 2 then return; end if;
  return query
  (select 'business'::text, b.id, b.id, b.name, concat_ws(' · ', b.city, '+' || u.phone),
          array_remove(array[case when b.suspended_at is not null then 'suspended' end, case when b.deleted_at is not null then 'deleted' end,
                             case when b.verification_status = 'verified' then 'verified' when b.verification_status = 'pending' then 'pending' end], null),
          b.created_at
     from businesses b left join auth.users u on u.id = b.owner_id
    where b.name ilike '%' || q || '%'
       or (char_length(digits) >= 6 and (right(u.phone, 10) like '%' || right(digits, 10) || '%' or regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') like '%' || right(digits, 10) || '%'))
    order by b.created_at desc limit 30)
  union all
  (select 'post'::text, p.id, p.business_id, p.title, concat_ws(' · ', b.name, p.city, p.status::text),
          array_remove(array[case when p.hidden_at is not null then 'hidden' end, case when p.deleted_at is not null then 'removed' end], null),
          p.created_at
     from opportunity_posts p join businesses b on b.id = p.business_id
    where p.title ilike '%' || q || '%'
    order by p.created_at desc limit 30);
end $$;

create or replace function public.admin_business(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform fmbp.assert_admin();
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'city', b.city, 'pincode', b.pincode, 'description', b.description, 'logo_url', b.logo_url,
    'phone', b.phone, 'owner_phone', u.phone, 'owner_name', pu.name, 'created_at', b.created_at,
    'verification_status', b.verification_status, 'suspended_at', b.suspended_at, 'suspension_reason', b.suspension_reason,
    'deleted_at', b.deleted_at, 'completed_deals', b.completed_deals, 'rating_avg', b.rating_avg, 'rating_count', b.rating_count,
    'referral_count', b.referral_count, 'category', c.name_en,
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
end $$;

create or replace function public.admin_business_posts(p_business_id uuid)
returns table (id uuid, title text, status text, created_at timestamptz, hidden boolean, removed boolean, icon text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query select p.id, p.title, p.status::text, p.created_at, p.hidden_at is not null, p.deleted_at is not null, t.icon
    from opportunity_posts p left join post_types t on t.id = p.post_type_id
   where p.business_id = p_business_id order by p.created_at desc limit 100;
end $$;

create or replace function public.admin_suspend_business(p_business_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
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
    left(btrim(p_reason), 120), jsonb_build_object('kind', 'account_suspended'));
end $$;

create or replace function public.admin_unsuspend_business(p_business_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); owner uuid; lang text;
begin
  update businesses set suspended_at = null, suspension_reason = null where id = p_business_id and suspended_at is not null returning owner_id into owner;
  if owner is null then return; end if;
  perform fmbp.log_admin(me, 'unsuspend', 'business', p_business_id::text, p_note);
  select language into lang from users where id = owner;
  perform fmbp.send_push(owner, 'account_restored',
    case when lang = 'hi' then 'आपका FMBP खाता फिर से चालू है' else 'Your FMBP account is active again' end,
    case when lang = 'hi' then 'आप फिर से पोस्ट और चैट कर सकते हैं।' else 'You can post and chat again.' end,
    jsonb_build_object('kind', 'account_restored'));
end $$;

create or replace function public.admin_remove_post(p_post_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); post opportunity_posts; owner uuid; lang text;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  select * into post from opportunity_posts where id = p_post_id;
  if post.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if post.deleted_at is not null then return; end if;
  perform set_config('fmbp.skip_kind_check', 'on', true);
  update opportunity_posts set deleted_at = now() where id = p_post_id;
  perform fmbp.log_admin(me, 'remove_post', 'post', p_post_id::text, p_reason, jsonb_build_object('business_id', post.business_id, 'title', post.title));
  perform fmbp.log_admin(me, 'remove_post', 'business', post.business_id::text, p_reason, jsonb_build_object('post_id', p_post_id, 'title', post.title));
  select owner_id into owner from businesses where id = post.business_id;
  select language into lang from users where id = owner;
  perform fmbp.send_push(owner, 'post_removed',
    case when lang = 'hi' then 'आपकी पोस्ट हटाई गई' else 'Your post was removed' end,
    left(post.title, 60) || ' — ' || left(btrim(p_reason), 100), jsonb_build_object('kind', 'post_removed', 'post_id', p_post_id));
end $$;

-- undo a removal made by mistake (the post comes back as it was; it still expires on its own date)
create or replace function public.admin_restore_post(p_post_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); biz uuid;
begin
  perform set_config('fmbp.skip_kind_check', 'on', true);
  update opportunity_posts set deleted_at = null, hidden_at = null where id = p_post_id and deleted_at is not null returning business_id into biz;
  if biz is null then return; end if;
  update reports set status = 'dismissed' where target_type = 'post' and target_id = p_post_id and status = 'open';
  perform fmbp.log_admin(me, 'restore_post', 'post', p_post_id::text, p_note);
  perform fmbp.log_admin(me, 'restore_post', 'business', biz::text, p_note, jsonb_build_object('post_id', p_post_id));
end $$;

-- 8. Admin: verification ---------------------------------------------------------------------------------------------
create or replace function public.admin_verifications(p_status public.verification_status default 'pending')
returns table (id uuid, business_id uuid, business_name text, city text, doc_type text, doc_number text, file_path text,
               status text, note text, created_at timestamptz, reviewed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query select v.id, v.business_id, b.name, b.city, v.doc_type::text, v.doc_number, v.file_url, v.status::text, v.note, v.created_at, v.reviewed_at
    from business_verifications v join businesses b on b.id = v.business_id
   where v.status = p_status
   order by case when p_status = 'pending' then v.created_at end asc, v.reviewed_at desc nulls last
   limit 100;
end $$;

create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
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
    jsonb_build_object('kind', 'verification_result', 'approved', p_approve));
end $$;

-- take the badge away (e.g. a document turned out to be fake)
create or replace function public.admin_revoke_verification(p_business_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin();
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  update businesses set verification_status = 'none' where id = p_business_id and verification_status = 'verified';
  if not found then return; end if;
  perform fmbp.log_admin(me, 'revoke_verification', 'business', p_business_id::text, p_note);
end $$;

-- 9. Admin: broadcast ------------------------------------------------------------------------------------------------
-- One push to everyone (or one city), in each person's language. Expo takes up to 100 messages per request.
-- At most one broadcast per 10 minutes, so a double tap or a mistake cannot spam everyone twice.
create or replace function public.admin_broadcast(p_title_en text, p_body_en text, p_title_hi text, p_body_hi text, p_city text default null)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare me text := fmbp.assert_admin(); n int; chunk jsonb;
begin
  if char_length(btrim(coalesce(p_title_en, ''))) < 3 or char_length(btrim(coalesce(p_body_en, ''))) < 3
     or char_length(p_title_en) > 65 or char_length(p_body_en) > 180
     or char_length(coalesce(p_title_hi, '')) > 65 or char_length(coalesce(p_body_hi, '')) > 180 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if exists (select 1 from admin_actions where action = 'broadcast' and created_at > now() - interval '10 minutes') then
    raise exception 'too_soon' using errcode = 'P0001';
  end if;
  create temp table _bc on commit drop as
    select u.id user_id, coalesce(u.language, 'en') lang
      from users u
     where u.erased_at is null and u.deletion_requested_at is null
       and (p_city is null or exists (select 1 from businesses b where b.owner_id = u.id and b.deleted_at is null and b.city ilike btrim(p_city)));
  select count(*) into n from _bc;
  insert into notifications (user_id, kind, payload)
  select user_id, 'broadcast', jsonb_build_object('kind', 'broadcast',
           'title', case when lang = 'hi' and coalesce(btrim(p_title_hi), '') <> '' then p_title_hi else p_title_en end,
           'body', case when lang = 'hi' and coalesce(btrim(p_body_hi), '') <> '' then p_body_hi else p_body_en end)
    from _bc;
  for chunk in
    select jsonb_agg(m) from (
      select jsonb_build_object('to', t.expo_token,
               'title', case when b.lang = 'hi' and coalesce(btrim(p_title_hi), '') <> '' then p_title_hi else p_title_en end,
               'body', case when b.lang = 'hi' and coalesce(btrim(p_body_hi), '') <> '' then p_body_hi else p_body_en end,
               'data', jsonb_build_object('kind', 'broadcast'), 'sound', 'default', 'channelId', 'default') m,
             (row_number() over () - 1) / 100 grp
        from _bc b join push_tokens t on t.user_id = b.user_id
    ) x group by grp
  loop
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb, body := chunk);
  end loop;
  perform fmbp.log_admin(me, 'broadcast', 'app', coalesce(p_city, 'all'), p_title_en,
    jsonb_build_object('title_en', p_title_en, 'body_en', p_body_en, 'title_hi', p_title_hi, 'body_hi', p_body_hi, 'city', p_city, 'recipients', n));
  return n;
end $$;

-- 10. Admin: settings ------------------------------------------------------------------------------------------------
create or replace function public.admin_settings()
returns table (key text, value jsonb, note text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query select s.key, s.value, s.note, s.updated_at from fmbp.app_settings s order by s.key;
end $$;

-- only known settings, only whole numbers 0–100000 (social_proof minimums)
create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); old jsonb; k text; v jsonb;
begin
  select value into old from fmbp.app_settings where key = p_key;
  if old is null or jsonb_typeof(p_value) <> 'object' then raise exception 'invalid' using errcode = '22023'; end if;
  for k, v in select * from jsonb_each(p_value) loop
    if not old ? k or jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric <> floor((v #>> '{}')::numeric)
       or (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric > 100000 then
      raise exception 'invalid' using errcode = '22023';
    end if;
  end loop;
  update fmbp.app_settings set value = old || p_value, updated_at = now() where key = p_key;
  perform fmbp.log_admin(me, 'update_setting', 'setting', p_key, null, jsonb_build_object('from', old, 'to', old || p_value));
end $$;

-- 11. Admin: admins and the log --------------------------------------------------------------------------------------
create or replace function public.admin_list_admins()
returns table (phone text, name text, added_by text, created_at timestamptz, disabled_at timestamptz, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare me text := fmbp.assert_admin();
begin
  return query select a.phone, a.name, a.added_by, a.created_at, a.disabled_at, a.phone = me from admins a order by a.disabled_at nulls first, a.created_at;
end $$;

create or replace function public.admin_add_admin(p_phone text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if char_length(digits) = 10 then digits := '91' || digits; end if;
  if digits !~ '^91[6-9][0-9]{9}$' then raise exception 'bad_phone' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'invalid' using errcode = '22023'; end if;
  insert into admins (phone, name, added_by) values (digits, left(btrim(p_name), 60), me)
  on conflict (phone) do update set disabled_at = null, name = excluded.name;
  perform fmbp.log_admin(me, 'add_admin', 'admin', digits, p_name);
end $$;

create or replace function public.admin_disable_admin(p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin();
begin
  if p_phone = me then raise exception 'cannot_disable_self' using errcode = 'P0001'; end if;
  update admins set disabled_at = now() where phone = p_phone and disabled_at is null;
  if found then perform fmbp.log_admin(me, 'disable_admin', 'admin', p_phone, null); end if;
end $$;

create or replace function public.admin_log(p_limit int default 100)
returns table (id bigint, admin_phone text, admin_name text, action text, target_type text, target_id text, note text, data jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query select a.id, a.admin_phone, ad.name, a.action, a.target_type, a.target_id, a.note, a.data, a.created_at
    from admin_actions a left join admins ad on ad.phone = a.admin_phone
   order by a.created_at desc limit least(greatest(p_limit, 1), 500);
end $$;

-- 12. Who may call what -----------------------------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'request_verification(uuid, public.verification_doc_type, text, text)', 'admin_stats()', 'admin_reports(text)',
    'admin_resolve_report(text, uuid, text, text)', 'admin_search(text)', 'admin_business(uuid)', 'admin_business_posts(uuid)',
    'admin_suspend_business(uuid, text)', 'admin_unsuspend_business(uuid, text)', 'admin_remove_post(uuid, text)',
    'admin_restore_post(uuid, text)', 'admin_verifications(public.verification_status)', 'admin_review_verification(uuid, boolean, text)',
    'admin_revoke_verification(uuid, text)', 'admin_broadcast(text, text, text, text, text)', 'admin_settings()',
    'admin_update_setting(text, jsonb)', 'admin_list_admins()', 'admin_add_admin(text, text)', 'admin_disable_admin(text)', 'admin_log(int)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function fmbp.assert_admin() from public, anon;
revoke all on function fmbp.log_admin(text, text, text, text, text, jsonb) from public, anon, authenticated;
