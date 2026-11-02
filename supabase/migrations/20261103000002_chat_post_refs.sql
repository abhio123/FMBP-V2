-- Chat post references (QA 2026-11-03): a chat should still name the post a message was about after that post expired,
-- was completed or paused. Row security hides such posts from the other business, which made the chat say
-- "This post is no longer available" without a title. This returns only title, status and icon, only to a participant
-- of the conversation, and only for posts that belong to one of its two businesses.
create or replace function public.chat_post_refs(p_conversation uuid, p_post_ids uuid[])
returns table (id uuid, title text, status public.post_status, deleted boolean, icon text)
language sql stable security definer set search_path = public as $$
  select p.id, p.title, p.status, p.deleted_at is not null, t.icon
    from public.conversations c
    join public.opportunity_posts p on p.id = any (p_post_ids) and p.business_id in (c.business_a, c.business_b)
    left join public.post_types t on t.id = p.post_type_id
   where c.id = p_conversation
     and (fmbp.owns_business(c.business_a) or fmbp.owns_business(c.business_b))
   limit 200;
$$;
revoke all on function public.chat_post_refs(uuid, uuid[]) from public, anon;
grant execute on function public.chat_post_refs(uuid, uuid[]) to authenticated;
