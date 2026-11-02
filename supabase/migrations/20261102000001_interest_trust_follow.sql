-- QA round 2026-11-02 (Surya).

-- 1. Withdraw interest. "Interested" is a lightweight signal, so (like a like or a save) the responder may undo it.
--    Only `interested` rows: a "Let's talk" response is tied to a conversation, which stays (the chat is the record).
--    The response counter trigger decrements post.response_count on delete. A push already sent is not recalled.
drop policy if exists "resp: responder withdraws interest" on public.post_responses;
create policy "resp: responder withdraws interest" on public.post_responses for delete
  using (fmbp.owns_business(business_id) and response_type = 'interested');

-- 2. Response rate needs its sample size: "100%" from a single response says little. The nightly job now also stores
--    how many responses the rate is based on (last 90 days); the app shows the rate only from 3 responses up.
alter table public.businesses add column if not exists response_sample int not null default 0;

create or replace function fmbp.recompute_response_rates()
returns void language sql security definer set search_path = public as $$
  update public.businesses b set response_rate = coalesce(s.rate, 0), response_sample = coalesce(s.n, 0)
  from (
    select p.business_id,
           count(*) as n,
           round(100.0 * count(*) filter (where r.replied_at is not null and r.replied_at - r.created_at <= interval '48 hours') / nullif(count(*),0), 2) as rate
      from public.post_responses r join public.opportunity_posts p on p.id = r.post_id
     where r.created_at > now() - interval '90 days'
     group by p.business_id
  ) s where s.business_id = b.id;
$$;

-- appended column only (create or replace view can add columns at the end); still no phone/whatsapp/email
create or replace view public.businesses_public with (security_invoker = true) as
  select id, name, category_id, city, state, pincode, country, logo_url, cover_url, description,
         service_available, delivery_available, pickup_available, completion_score, verification_status,
         member_since, response_rate, completed_deals, rating_avg, rating_count, created_at, response_sample
  from public.businesses where deleted_at is null;

select fmbp.recompute_response_rates();

-- 3. Following: when a business publishes a post, its followers get a push ("<business> posted: <title>"), at most
--    one per followed business per follower per 24 h so an active poster can't spam. Opt-out: users.notification_prefs
--    {"follows": false}. Never notifies the poster's own account.
create or replace function fmbp.trg_followed_post_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare f record; poster text; v_title text;
begin
  if new.status <> 'active' or new.deleted_at is not null then return null; end if;
  select name into poster from public.businesses where id = new.business_id;
  for f in
    select distinct u.id as user_id, u.language
      from public.follows fo
      join public.businesses fb on fb.id = fo.follower_business_id and fb.deleted_at is null
      join public.users u on u.id = fb.owner_id
     where fo.followed_business_id = new.business_id
       and u.id <> (select owner_id from public.businesses where id = new.business_id)
       and coalesce((u.notification_prefs->>'follows')::boolean, true)
       and not exists (
         select 1 from public.notifications n
          where n.user_id = u.id and n.kind = 'followed_post'
            and n.payload->>'business_id' = new.business_id::text
            and n.created_at > now() - interval '24 hours')
  loop
    v_title := case when f.language = 'hi' then poster || ' ने नई पोस्ट डाली' else poster || ' posted a new opportunity' end;
    perform fmbp.send_push(f.user_id, 'followed_post', v_title, left(new.title, 140),
      jsonb_build_object('kind', 'followed_post', 'post_id', new.id, 'business_id', new.business_id));
  end loop;
  return null;
end $$;
drop trigger if exists posts_followed_push on public.opportunity_posts;
create trigger posts_followed_push after insert on public.opportunity_posts for each row execute function fmbp.trg_followed_post_push();
