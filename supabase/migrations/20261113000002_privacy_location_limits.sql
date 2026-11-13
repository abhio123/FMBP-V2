-- Privacy and limits (security review 2026-11-13, agreed with the owner):
--   1. Places are kept to about 1 km: nobody can find a home or a shop's exact spot from the app.
--   2. Text has a sensible maximum length everywhere people write (TEXT_LIMITS in packages/shared/src/limits.ts).
--   3. Erasing an account also removes what the person wrote to others, their verification documents and other traces.
--   4. Server notification texts do not write the app's name (it comes from one place: packages/shared/src/brand.ts).

-- 1. Location to a 0.01 degree grid (about 1 km) on every save, and for the places already saved -------------------
create or replace function fmbp.trg_coarse_location()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.location is not null then
    new.location := st_snaptogrid(new.location::geometry, 0.01)::geography;
  end if;
  return new;
end $$;
revoke all on function fmbp.trg_coarse_location() from public, anon, authenticated;
drop trigger if exists businesses_coarse_location on public.businesses;
create trigger businesses_coarse_location before insert or update of location on public.businesses
  for each row execute function fmbp.trg_coarse_location();
drop trigger if exists posts_coarse_location on public.opportunity_posts;
create trigger posts_coarse_location before insert or update of location on public.opportunity_posts
  for each row execute function fmbp.trg_coarse_location();

update public.businesses set location = location
 where location is not null and not st_equals(location::geometry, st_snaptogrid(location::geometry, 0.01));
update public.opportunity_posts set location = location
 where location is not null and not st_equals(location::geometry, st_snaptogrid(location::geometry, 0.01));

-- 2. Longest text per place. NOT VALID: new and changed rows are checked at once; old rows are checked below and the
--    rule stays "new rows only" if some old text is longer (nothing is cut or lost).
alter table public.opportunity_posts
  add constraint opportunity_posts_title_len check (char_length(title) <= 150) not valid,
  add constraint opportunity_posts_description_len check (description is null or char_length(description) <= 2000) not valid,
  add constraint opportunity_posts_answers_size check (octet_length(coalesce(basic, '{}')::text) <= 20000 and octet_length(coalesce(advanced, '{}')::text) <= 20000) not valid;
alter table public.messages add constraint messages_body_len check (body is null or char_length(body) <= 2000) not valid;
alter table public.post_responses add constraint post_responses_message_len check (message is null or char_length(message) <= 500) not valid;
alter table public.businesses
  add constraint businesses_name_len check (char_length(name) <= 80) not valid,
  add constraint businesses_description_len check (description is null or char_length(description) <= 1000) not valid;
alter table public.reviews add constraint reviews_text_len check (text is null or char_length(text) <= 300) not valid;
alter table public.reports add constraint reports_details_len check (details is null or char_length(details) <= 500) not valid;

do $$
declare c record;
begin
  for c in select conrelid::regclass as tbl, conname from pg_constraint
            where conname in ('opportunity_posts_title_len', 'opportunity_posts_description_len', 'opportunity_posts_answers_size',
                              'messages_body_len', 'post_responses_message_len', 'businesses_name_len', 'businesses_description_len',
                              'reviews_text_len', 'reports_details_len') and not convalidated loop
    begin
      execute format('alter table %s validate constraint %I', c.tbl, c.conname);
    exception when check_violation then
      raise notice 'kept % for new rows only: some existing rows are longer', c.conname;
    end;
  end loop;
end $$;

-- 3. Erasing an account (30 days after "Delete account"): everything that identifies the person ---------------------
create or replace function fmbp.erase_deleted_accounts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  u record;
  n int := 0;
begin
  for u in select id from public.users where deletion_requested_at < now() - interval '30 days' and erased_at is null loop
    -- the business row stays (chats, deals, reports reference it) without anything that identifies it
    update public.businesses set name = 'Deleted business', phone = null, whatsapp = null, email = null, website = null,
           logo_url = null, cover_url = null, description = null, working_hours = null, social = '{}'::jsonb,
           trade_other = null, category_other = null, referral_code = null,
           location = 'SRID=4326;POINT(0 0)'::geography, city = '-', state = null, pincode = null,
           deleted_at = coalesce(deleted_at, now())
     where owner_id = u.id;
    delete from public.opportunity_posts where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.business_offerings where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.business_media where business_id in (select id from public.businesses where owner_id = u.id);
    -- documents sent for Verified: the rows here, the files by the erase-media job (same queue as the photos)
    delete from public.business_verifications where business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.follows where follower_business_id in (select id from public.businesses where owner_id = u.id)
                                  or followed_business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.saved_posts where business_id in (select id from public.businesses where owner_id = u.id);
    -- what they wrote to others: the text goes; the other side keeps the conversation ("Message deleted"), the deal and
    -- the star rating (other people's trust numbers depend on them)
    -- (empty text, not null: a message must have text or a file; the app shows "Message deleted")
    update public.messages set body = '', attachment_url = null where sender_business_id in (select id from public.businesses where owner_id = u.id);
    update public.post_responses set message = null where business_id in (select id from public.businesses where owner_id = u.id);
    update public.reviews set text = null where reviewer_business_id in (select id from public.businesses where owner_id = u.id);
    update public.reports set details = null where reporter_business_id in (select id from public.businesses where owner_id = u.id);
    delete from public.notifications where user_id = u.id;
    delete from public.push_tokens where user_id = u.id;
    delete from public.word_seen where user_id = u.id;
    delete from public.ai_calls where user_id = u.id;
    update public.users set name = '', phone = null, email = null, erased_at = now() where id = u.id;
    -- sign-in: the phone number is released and the old account can no longer be used
    delete from auth.identities where user_id = u.id;
    delete from auth.sessions where user_id = u.id;
    delete from auth.refresh_tokens where user_id = u.id::text;
    update auth.users set phone = null, email = null, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = u.id;
    begin -- the sign-in log keeps phone numbers; best effort (its layout belongs to Supabase)
      delete from auth.audit_log_entries where payload ->> 'actor_id' = u.id::text;
    exception when others then
      raise warning 'erase: audit log of % not removed: %', u.id, sqlerrm;
    end;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function fmbp.erase_deleted_accounts() from public, anon, authenticated;

-- 4. Suspension notices without the app's name (the notification already shows which app it is) -------------------
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
    case when lang = 'hi' then 'आपका खाता रोका गया' else 'Your account is suspended' end,
    (select name from businesses where id = p_business_id) || ': ' || left(btrim(p_reason), 110), jsonb_build_object('kind', 'account_suspended', 'business_id', p_business_id));
end $function$

;
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
    case when lang = 'hi' then 'आपका खाता फिर से चालू है' else 'Your account is active again' end,
    case when lang = 'hi' then 'आप फिर से पोस्ट और चैट कर सकते हैं।' else 'You can post and chat again.' end,
    jsonb_build_object('kind', 'account_restored', 'business_id', p_business_id));
end $function$

;
