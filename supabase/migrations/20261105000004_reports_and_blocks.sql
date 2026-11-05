-- QA round 2026-11-05 (Surya), agreed approach for reporting and blocking.
--
-- Report (a post, a business or a message): the reporter picks a reason (+ optional note). A post they report
-- disappears for them at once. When 3 different businesses have open reports on the same post, it is hidden for
-- everyone (hidden_at) until an admin reviews it; the owner still sees it, marked "under review". Admins work from
-- the dashboard (see README → Moderation): dismiss (unhide) or action (remove the post / suspend the business).
--
-- Block (a business): until the blocker unblocks. Neither side can message the other, the blocked business cannot
-- respond to the blocker's posts, and the blocked business's posts are hidden for the blocker. Nobody is notified.

-- 1. Reports: fixed reasons, a note, one report per reporter and target, reporters see their own reports.
alter table public.reports add column if not exists details text check (details is null or length(details) <= 500);
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason in ('fraud', 'abusive', 'inappropriate', 'spam', 'wrong_info', 'other')) not valid;
create unique index if not exists reports_one_per_reporter on public.reports (reporter_business_id, target_type, target_id);
create index if not exists reports_target_idx on public.reports (target_type, target_id) where status = 'open';
drop policy if exists "reports: reporter reads own" on public.reports;
create policy "reports: reporter reads own" on public.reports for select using (fmbp.owns_business(reporter_business_id));

-- 2. Posts hidden after enough reports
alter table public.opportunity_posts add column if not exists hidden_at timestamptz;

create or replace function fmbp.trg_report_hides_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'post' and (
    select count(distinct reporter_business_id) from public.reports
     where target_type = 'post' and target_id = new.target_id and status = 'open') >= 3 then
    update public.opportunity_posts set hidden_at = now() where id = new.target_id and hidden_at is null;
  end if;
  return null;
end $$;
drop trigger if exists reports_hide_post on public.reports;
create trigger reports_hide_post after insert on public.reports for each row execute function fmbp.trg_report_hides_post();

-- 3. Blocks
create table if not exists public.business_blocks (
  blocker_business_id uuid not null references public.businesses(id) on delete cascade,
  blocked_business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_business_id, blocked_business_id),
  check (blocker_business_id <> blocked_business_id)
);
create index if not exists business_blocks_blocked_idx on public.business_blocks (blocked_business_id);
alter table public.business_blocks enable row level security;
drop policy if exists "blocks: blocker manages" on public.business_blocks;
create policy "blocks: blocker manages" on public.business_blocks for all
  using (fmbp.owns_business(blocker_business_id)) with check (fmbp.owns_business(blocker_business_id));

-- either business blocked the other (the blocked side cannot read the block row, so this runs as definer)
create or replace function fmbp.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_blocks
                  where (blocker_business_id = a and blocked_business_id = b) or (blocker_business_id = b and blocked_business_id = a))
$$;

create or replace function fmbp.trg_block_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me uuid; other uuid;
begin
  if tg_table_name = 'messages' then
    select new.sender_business_id, case when c.business_a = new.sender_business_id then c.business_b else c.business_a end
      into me, other from public.conversations c where c.id = new.conversation_id;
  elsif tg_table_name = 'post_responses' then
    select new.business_id, p.business_id into me, other from public.opportunity_posts p where p.id = new.post_id;
  else -- conversations
    me := new.business_a; other := new.business_b;
  end if;
  if me is not null and other is not null and fmbp.blocked_between(me, other) then
    raise exception 'blocked' using errcode = 'P0001', hint = 'One of these businesses has blocked the other.';
  end if;
  return new;
end $$;
drop trigger if exists messages_block_guard on public.messages;
create trigger messages_block_guard before insert on public.messages for each row execute function fmbp.trg_block_guard();
drop trigger if exists responses_block_guard on public.post_responses;
create trigger responses_block_guard before insert on public.post_responses for each row execute function fmbp.trg_block_guard();
drop trigger if exists conversations_block_guard on public.conversations;
create trigger conversations_block_guard before insert on public.conversations for each row execute function fmbp.trg_block_guard();

-- 4. Who sees a post: the owner always; others only live posts that are not hidden after reports, not reported by
--    them, and not from a business they blocked.
drop policy if exists "posts: public read active" on public.opportunity_posts;
create policy "posts: public read active" on public.opportunity_posts for select
  using (
    fmbp.owns_business(business_id)
    or (deleted_at is null and status = 'active' and hidden_at is null
        and not exists (select 1 from public.reports r
                         where r.target_type = 'post' and r.target_id = opportunity_posts.id
                           and r.reporter_business_id in (select fmbp.my_business_ids()))
        and not exists (select 1 from public.business_blocks bl
                         where bl.blocked_business_id = opportunity_posts.business_id
                           and bl.blocker_business_id in (select fmbp.my_business_ids())))
  );
