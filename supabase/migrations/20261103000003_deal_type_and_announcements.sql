-- QA round 2026-11-03 (Surya).
--
-- 1. "How do you want to work?" on every post: paid, rent, partnership (share profit) or exchange. Stored as a column
--    (promoted from the form's `deal` answer) so the 🤝 Partner badge and the Partnership feed tab can filter on it.
alter table public.opportunity_posts add column if not exists deal_type text
  check (deal_type in ('pay', 'rent', 'partnership', 'exchange'));
create index if not exists posts_partnership_feed_idx on public.opportunity_posts (created_at desc)
  where deal_type = 'partnership' and status = 'active' and deleted_at is null;

-- 2. Announcements (shop opening, discount, event, news) are short-lived: 7 days instead of 30, on publish and on renew.
create or replace function fmbp.is_announcement(p_post_type uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.post_types t join public.intentions i on i.id = t.intention_id
                  where t.id = p_post_type and i.slug = 'announce');
$$;

create or replace function fmbp.trg_post_expiry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if fmbp.is_announcement(new.post_type_id) then
    new.expires_at := now() + interval '7 days';
  end if;
  return new;
end $$;
drop trigger if exists posts_expiry on public.opportunity_posts;
create trigger posts_expiry before insert on public.opportunity_posts for each row execute function fmbp.trg_post_expiry();

-- Same as 20261101000002, with the announcement period.
create or replace function public.renew_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.opportunity_posts p where p.id = p_post_id and fmbp.owns_business(p.business_id)) then
    raise exception 'not owner';
  end if;
  update public.opportunity_posts
     set status = 'active',
         expires_at = now() + case when fmbp.is_announcement(post_type_id) then interval '7 days' else interval '30 days' end,
         renewed_count = renewed_count + 1, renewed_at = now()
   where id = p_post_id;
end $$;
