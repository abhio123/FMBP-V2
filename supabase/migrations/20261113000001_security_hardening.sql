-- Security review 2026-11-13: close the holes found in the review. No data is removed or changed; only what the app's
-- users (roles anon / authenticated) may write directly. Server functions and admins are not affected.

-- 1. Chat messages: the only thing a participant may change is "read", and only on messages written to them --------
--    (before: any participant could rewrite the text or the sender of any message in the conversation)
revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;
drop policy if exists "msg: recipient mark read" on public.messages;
create policy "msg: recipient mark read" on public.messages for update
  using (not fmbp.owns_business(sender_business_id)
         and exists (select 1 from public.conversations c where c.id = conversation_id and (fmbp.owns_business(c.business_a) or fmbp.owns_business(c.business_b))))
  with check (not fmbp.owns_business(sender_business_id)
         and exists (select 1 from public.conversations c where c.id = conversation_id and (fmbp.owns_business(c.business_a) or fmbp.owns_business(c.business_b))));

-- 2. Columns only the server writes, now also when a row is CREATED -----------------------------------------------
--    (before: a new profile could claim "member since 2015" and a 100% response rate; a new post could never expire)
--    and a deleted or admin-removed post stays deleted (before: the owner could bring a removed post back).
create or replace function fmbp.trg_business_protected()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') or pg_trigger_depth() > 1 then return new; end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'none'; new.completed_deals := 0; new.rating_avg := 0; new.rating_count := 0;
    new.boost_credits := 0; new.referral_count := 0; new.suspended_at := null; new.suspension_reason := null;
    new.response_rate := 0; new.response_sample := 0; new.member_since := now(); new.created_at := now(); new.deleted_at := null;
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

create or replace function fmbp.trg_post_protected()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') or pg_trigger_depth() > 1 then return new; end if;
  if tg_op = 'INSERT' then
    new.hidden_at := null; new.boosted_until := null; new.view_count := 0; new.response_count := 0;
    new.created_at := now(); new.deleted_at := null; new.renewed_at := null; new.renewed_count := 0; new.edited_at := null;
    -- at most the normal 30 days (posts_expiry, which runs first, already gave announcements their 7)
    new.expires_at := least(coalesce(new.expires_at, now() + interval '30 days'), now() + interval '30 days');
    return new;
  end if;
  if (new.business_id, new.hidden_at, new.boosted_until, new.view_count, new.response_count, new.expires_at,
      new.renewed_at, new.renewed_count, new.created_at)
     is distinct from
     (old.business_id, old.hidden_at, old.boosted_until, old.view_count, old.response_count, old.expires_at,
      old.renewed_at, old.renewed_count, old.created_at) then
    raise exception 'protected_column' using errcode = '42501';
  end if;
  -- the owner may delete a post, never undo a deletion (an admin's removal included); admins restore through their RPC
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'protected_column' using errcode = '42501';
  end if;
  return new;
end $$;

-- 3. Pictures of a profile must be its own uploads (before: any web address, so every viewer's phone loaded it) ----
create or replace function fmbp.trg_own_media_urls()
returns trigger language plpgsql as $$
declare
  folder text;
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  -- (each table's own column is read in its own branch: plpgsql cannot name a column the other table lacks)
  if tg_table_name = 'businesses' then
    folder := '/storage/v1/object/public/business-media/' || new.id || '/';
    if (new.logo_url is not null and position(folder in new.logo_url) = 0) or (new.cover_url is not null and position(folder in new.cover_url) = 0) then
      raise exception 'invalid_media_url' using errcode = '22023';
    end if;
  else
    folder := '/storage/v1/object/public/business-media/' || new.business_id || '/';
    if new.url is null or position(folder in new.url) = 0 then
      raise exception 'invalid_media_url' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists businesses_own_media on public.businesses;
create trigger businesses_own_media before insert or update of logo_url, cover_url on public.businesses
  for each row execute function fmbp.trg_own_media_urls();
drop trigger if exists business_media_own on public.business_media;
create trigger business_media_own before insert or update of url on public.business_media
  for each row execute function fmbp.trg_own_media_urls();

-- 4. Replies: the server sets the time and links the chat (before: a reply could carry any chat and any date) -------
create or replace function fmbp.trg_response_server_fields()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  new.created_at := now();
  new.replied_at := null;
  if new.conversation_id is not null and not exists (
       select 1 from public.conversations c where c.id = new.conversation_id and new.business_id in (c.business_a, c.business_b)) then
    new.conversation_id := null;
  end if;
  return new;
end $$;
drop trigger if exists responses_server_fields on public.post_responses;
create trigger responses_server_fields before insert on public.post_responses
  for each row execute function fmbp.trg_response_server_fields();

-- 5. A person may change only their own name and language (before: every column of their row) --------------------
revoke update on public.users from anon, authenticated;
grant update (name, language) on public.users to authenticated;

-- 6. AI limit (20 an hour) kept by the server (before: users could delete their own count and call without limit) --
drop policy if exists "ai_calls: self" on public.ai_calls;
drop policy if exists "ai_calls: self read" on public.ai_calls;
create policy "ai_calls: self read" on public.ai_calls for select using (user_id = auth.uid());
revoke insert, update, delete on public.ai_calls from anon, authenticated;

-- Takes one of the caller's 20 calls this hour, or returns null when none is left. Atomic: parallel calls cannot slip past.
create or replace function public.reserve_ai_call()
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); slot bigint;
begin
  if me is null then return null; end if;
  perform pg_advisory_xact_lock(hashtext('ai_calls:' || me::text));
  if (select count(*) from ai_calls where user_id = me and created_at > now() - interval '1 hour') >= 20 then return null; end if;
  insert into ai_calls (user_id) values (me) returning id into slot;
  return slot;
end $$;

-- The tokens a reserved call used (own calls only)
create or replace function public.record_ai_usage(p_id bigint, p_input integer, p_output integer)
returns void language sql security definer set search_path = public as $$
  update ai_calls set input_tokens = greatest(coalesce(p_input, 0), 0), output_tokens = greatest(coalesce(p_output, 0), 0)
   where id = p_id and user_id = auth.uid();
$$;
revoke all on function public.reserve_ai_call(), public.record_ai_usage(bigint, integer, integer) from public, anon;
grant execute on function public.reserve_ai_call(), public.record_ai_usage(bigint, integer, integer) to authenticated;

-- 7. One phone, one person: a push token saved for a new login stops going to the previous one (shared phones) -----
create or replace function fmbp.trg_push_token_single_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from push_tokens where expo_token = new.expo_token and user_id <> new.user_id;
  return new;
end $$;
revoke all on function fmbp.trg_push_token_single_owner() from public, anon, authenticated;
drop trigger if exists push_tokens_single_owner on public.push_tokens;
create trigger push_tokens_single_owner after insert or update of expo_token, user_id on public.push_tokens
  for each row execute function fmbp.trg_push_token_single_owner();

revoke all on function fmbp.trg_own_media_urls(), fmbp.trg_response_server_fields() from public, anon, authenticated;
