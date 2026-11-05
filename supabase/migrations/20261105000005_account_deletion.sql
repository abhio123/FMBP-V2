-- QA round 2026-11-05 (Surya), agreed: delete account with a 30-day grace period (required by the App Store and
-- Google Play, and the user's right to erasure under the DPDP Act 2023).
--
--   request_account_deletion()  Profile → Delete account. The business, its posts and offerings disappear at once
--                               (deleted_at = the request time), push tokens are removed; the app logs out.
--   cancel_account_deletion()   Signing in again within 30 days offers "Restore my account": everything that was
--                               removed by the request (same timestamp) comes back as it was.
--   fmbp.erase_deleted_accounts()  Daily: after 30 days, personal data is erased for good. The business row stays as
--                               "Deleted business" (chats, deals and reports point to it) with nothing that identifies
--                               it; posts, photos list, follows and saved posts are deleted; the phone number is
--                               released (it can sign up again as a new account) and nobody can sign in to the old one.
--   Photo files in storage cannot be removed from SQL: erased businesses are queued and the erase-media Edge
--   Function deletes their folders (migration 20261105000006, README → Account deletion).

alter table public.users add column if not exists deletion_requested_at timestamptz;
alter table public.users add column if not exists erased_at timestamptz;

create or replace function public.request_account_deletion()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  at timestamptz := now();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  update public.users set deletion_requested_at = at where id = uid and deletion_requested_at is null;
  if not found then  -- already requested: nothing more to do
    return (select deletion_requested_at + interval '30 days' from public.users where id = uid);
  end if;
  update public.businesses set deleted_at = at where owner_id = uid and deleted_at is null;
  update public.opportunity_posts p set deleted_at = at
    from public.businesses b where b.id = p.business_id and b.owner_id = uid and p.deleted_at is null;
  update public.business_offerings o set deleted_at = at
    from public.businesses b where b.id = o.business_id and b.owner_id = uid and o.deleted_at is null;
  delete from public.push_tokens where user_id = uid;
  return at + interval '30 days';
end $$;

create or replace function public.cancel_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  at timestamptz;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select deletion_requested_at into at from public.users where id = uid and erased_at is null;
  if at is null then return; end if;
  -- bring back exactly what the request removed, as it was (also posts that were duplicates before that rule)
  perform set_config('fmbp.skip_kind_check', 'on', true);
  update public.businesses set deleted_at = null where owner_id = uid and deleted_at = at;
  update public.opportunity_posts p set deleted_at = null
    from public.businesses b where b.id = p.business_id and b.owner_id = uid and p.deleted_at = at;
  update public.business_offerings o set deleted_at = null
    from public.businesses b where b.id = o.business_id and b.owner_id = uid and o.deleted_at = at;
  update public.users set deletion_requested_at = null where id = uid;
end $$;

revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

create or replace function fmbp.erase_deleted_accounts()
returns int language plpgsql security definer set search_path = public as $$
declare
  u record;
  n int := 0;
begin
  for u in select id from public.users where deletion_requested_at < now() - interval '30 days' and erased_at is null loop
    -- the business row stays (chats, deals, reports reference it) without anything that identifies it
    update public.businesses set name = 'Deleted business', phone = null, whatsapp = null, email = null, website = null,
           logo_url = null, cover_url = null, description = null, working_hours = null, social = '{}'::jsonb,
           location = 'SRID=4326;POINT(0 0)'::geography, city = '-', state = null, pincode = null,
           deleted_at = coalesce(deleted_at, now())
     where owner_id = u.id;
    delete from public.opportunity_posts where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.business_offerings where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.business_media where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.follows where follower_business_id in (select id from public.businesses where owner_id = u.id)
                                  or followed_business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.saved_posts where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.notifications where user_id = u.id;
    delete from public.push_tokens where user_id = u.id;
    update public.users set name = '', phone = null, email = null, erased_at = now() where id = u.id;
    -- sign-in: the phone number is released and the old account can no longer be used
    delete from auth.identities where user_id = u.id;
    delete from auth.sessions where user_id = u.id;
    delete from auth.refresh_tokens where user_id = u.id::text;
    update auth.users set phone = null, email = null, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = u.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function fmbp.erase_deleted_accounts() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'fmbp_erase_accounts';
-- 00:45 UTC = 06:15 IST, after the other nightly jobs
select cron.schedule('fmbp_erase_accounts', '45 0 * * *', 'select fmbp.erase_deleted_accounts()');
