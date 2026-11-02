-- QA round 2026-11-01 (Surya): the post page shows "Posted on", "Renewed on" (if renewed) and "Expires on".
--
-- Expiry policy (agreed): a post lives 30 days from publish; only Renew extends it (30 days from the renew).
-- Editing a post must NOT move expires_at, so a small edit can't keep a post alive forever.
-- `updated_at` is not shown to users: it also changes on status changes, counters and the nightly expiry job.
-- A user-facing "Updated on" needs its own column, set only on content edits, when post editing is built.
alter table public.opportunity_posts add column if not exists renewed_at timestamptz;

-- Same as 20260909000004, plus renewed_at. Posts renewed before this migration keep renewed_at null (date unknown).
create or replace function public.renew_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.opportunity_posts p where p.id = p_post_id and fmbp.owns_business(p.business_id)) then
    raise exception 'not owner';
  end if;
  update public.opportunity_posts
     set status = 'active', expires_at = now() + interval '30 days', renewed_count = renewed_count + 1, renewed_at = now()
   where id = p_post_id;
end $$;
