-- QA round 2026-11-03 (Surya): one chat per pair of businesses, not one per post.
--
-- Model (as in WhatsApp Business / LinkedIn): a conversation belongs to two businesses. Each message may say which post
-- it is about (`messages.post_id`) and may quote an earlier message (`messages.reply_to_id`). The app shows a post card
-- in the thread wherever the topic changes, an "About: <post>" chip when a chat is opened from a post, and
-- press-and-hold → Reply to point back at an earlier message. `conversations.post_id` now means "post discussed most
-- recently" (shown under the business name in the chat list) and is kept up to date by the message trigger.
--
-- Existing data is merged, nothing is lost: every message keeps the post its old chat was about, messages and response
-- links move to the pair's oldest conversation, notification links are repointed, then the emptied duplicates go.

-- 1. message context columns
alter table public.messages add column if not exists post_id uuid references public.opportunity_posts(id) on delete set null;
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;
create index if not exists messages_post_idx on public.messages(post_id) where post_id is not null;

-- 2. every existing message is about its conversation's post (so merged threads show the right card at each switch)
update public.messages m set post_id = c.post_id
  from public.conversations c
 where c.id = m.conversation_id and m.post_id is null and c.post_id is not null;

-- 3. merge: one keeper per unordered pair (oldest), everything else repointed to it
create temporary table conv_merge on commit drop as
select id, first_value(id) over (partition by least(business_a, business_b), greatest(business_a, business_b) order by created_at, id) as keeper
  from public.conversations;

update public.messages m set conversation_id = k.keeper from conv_merge k where m.conversation_id = k.id and k.id <> k.keeper;
update public.post_responses r set conversation_id = k.keeper from conv_merge k where r.conversation_id = k.id and k.id <> k.keeper;
update public.notifications n set payload = jsonb_set(n.payload, '{conversation_id}', to_jsonb(k.keeper::text))
  from conv_merge k where n.payload->>'conversation_id' = k.id::text and k.id <> k.keeper;
delete from public.conversations c using conv_merge k where c.id = k.id and k.id <> k.keeper;

-- keepers: canonical order (a < b), latest activity and latest topic from their (now merged) messages
update public.conversations set business_a = least(business_a, business_b), business_b = greatest(business_a, business_b)
 where business_a > business_b;
update public.conversations c set
  last_message_at = (select max(m.created_at) from public.messages m where m.conversation_id = c.id),
  post_id = coalesce((select m.post_id from public.messages m where m.conversation_id = c.id and m.post_id is not null
                       order by m.created_at desc limit 1), c.post_id);

-- 4. one conversation per pair, stored in canonical order
alter table public.conversations drop constraint if exists conversations_business_a_business_b_post_id_key;
alter table public.conversations add constraint conversations_canonical_pair check (business_a < business_b);
create unique index if not exists conversations_pair_key on public.conversations(business_a, business_b);

-- 5. the message trigger also moves the conversation's "current topic"
create or replace function fmbp.trg_message_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at, post_id = coalesce(new.post_id, post_id)
   where id = new.conversation_id;
  -- mark the originating response as replied when the post owner writes back
  update public.post_responses r set replied_at = coalesce(r.replied_at, new.created_at)
    from public.opportunity_posts p
   where r.conversation_id = new.conversation_id and r.post_id = p.id and p.business_id = new.sender_business_id;
  return null;
end $$;

-- 6. integrity on send: a message may only reference a post of one of the two businesses, and only quote a message
--    from the same conversation. Security definer so the checks see rows the sender's RLS hides (e.g. the other
--    business's paused post); they return only a boolean.
create or replace function fmbp.post_in_conversation(p_post uuid, p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.opportunity_posts p join public.conversations c on c.id = p_conv
                  where p.id = p_post and p.business_id in (c.business_a, c.business_b));
$$;
create or replace function fmbp.message_in_conversation(p_msg uuid, p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.messages m where m.id = p_msg and m.conversation_id = p_conv);
$$;

drop policy if exists "msg: participant send" on public.messages;
create policy "msg: participant send" on public.messages for insert
  with check (
    fmbp.owns_business(sender_business_id)
    and exists (select 1 from public.conversations c
                 where c.id = messages.conversation_id and (c.business_a = messages.sender_business_id or c.business_b = messages.sender_business_id))
    and (messages.post_id is null or fmbp.post_in_conversation(messages.post_id, messages.conversation_id))
    and (messages.reply_to_id is null or fmbp.message_in_conversation(messages.reply_to_id, messages.conversation_id))
  );
