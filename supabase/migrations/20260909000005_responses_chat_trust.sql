-- Responses, chat, deals, reviews, saved, follows, views, reports, push, notifications
create type public.response_type as enum ('interested','lets_talk','call_me','send_proposal','apply','collaborate','offer_service','invest','partner','chat');
create type public.deal_status as enum ('proposed','confirmed','completed','cancelled');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_a uuid not null references public.businesses(id) on delete cascade,
  business_b uuid not null references public.businesses(id) on delete cascade,
  post_id uuid references public.opportunity_posts(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (business_a <> business_b),
  unique (business_a, business_b, post_id)
);
create index conversations_a_idx on public.conversations(business_a, last_message_at desc);
create index conversations_b_idx on public.conversations(business_b, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_business_id uuid not null references public.businesses(id),
  body text,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or attachment_url is not null)
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

create table public.post_responses (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.opportunity_posts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  response_type public.response_type not null,
  message text,
  conversation_id uuid references public.conversations(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, business_id)
);
create index post_responses_post_idx on public.post_responses(post_id, created_at desc);
create index post_responses_biz_idx on public.post_responses(business_id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.opportunity_posts(id) on delete set null,
  response_id uuid references public.post_responses(id) on delete set null,
  business_a uuid not null references public.businesses(id),
  business_b uuid not null references public.businesses(id),
  status public.deal_status not null default 'proposed',
  confirmed_by_a boolean not null default false,
  confirmed_by_b boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger deals_updated before update on public.deals for each row execute function fmbp.set_updated_at();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  reviewer_business_id uuid not null references public.businesses(id),
  reviewee_business_id uuid not null references public.businesses(id),
  rating int not null check (rating between 1 and 5),
  text text,
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_business_id)
);
create index reviews_reviewee_idx on public.reviews(reviewee_business_id);

create table public.saved_posts (
  business_id uuid not null references public.businesses(id) on delete cascade,
  post_id uuid not null references public.opportunity_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, post_id)
);

create table public.follows (
  follower_business_id uuid not null references public.businesses(id) on delete cascade,
  followed_business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_business_id, followed_business_id),
  check (follower_business_id <> followed_business_id)
);

create table public.post_views (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.opportunity_posts(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index post_views_post_idx on public.post_views(post_id, viewed_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_business_id uuid not null references public.businesses(id),
  target_type text not null check (target_type in ('post','business','message')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  expo_token text not null,
  platform text not null check (platform in ('ios','android')),
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_token)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- counters
create or replace function fmbp.trg_response_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.opportunity_posts set response_count = response_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.opportunity_posts set response_count = greatest(0, response_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger post_responses_count after insert or delete on public.post_responses
  for each row execute function fmbp.trg_response_count();

create or replace function fmbp.trg_view_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.opportunity_posts set view_count = view_count + 1 where id = new.post_id;
  return null;
end $$;
create trigger post_views_count after insert on public.post_views
  for each row execute function fmbp.trg_view_count();

create or replace function fmbp.trg_message_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  -- mark the originating response as replied when the post owner writes back
  update public.post_responses r set replied_at = coalesce(r.replied_at, new.created_at)
    from public.opportunity_posts p
   where r.conversation_id = new.conversation_id and r.post_id = p.id and p.business_id = new.sender_business_id;
  return null;
end $$;
create trigger messages_touch after insert on public.messages
  for each row execute function fmbp.trg_message_touch();

-- rating + completed deals aggregate
create or replace function fmbp.trg_review_agg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.businesses b set
    rating_avg = coalesce((select avg(rating) from public.reviews where reviewee_business_id = new.reviewee_business_id), 0),
    rating_count = (select count(*) from public.reviews where reviewee_business_id = new.reviewee_business_id)
  where b.id = new.reviewee_business_id;
  return null;
end $$;
create trigger reviews_agg after insert or update on public.reviews for each row execute function fmbp.trg_review_agg();

create or replace function fmbp.trg_deal_completed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    update public.businesses set completed_deals = completed_deals + 1 where id in (new.business_a, new.business_b);
  end if;
  return null;
end $$;
create trigger deals_completed after update on public.deals for each row execute function fmbp.trg_deal_completed();

-- nightly: response rate = replied within 48h / received (last 90 days)
create or replace function fmbp.recompute_response_rates()
returns void language sql security definer set search_path = public as $$
  update public.businesses b set response_rate = coalesce(s.rate, 0)
  from (
    select p.business_id,
           round(100.0 * count(*) filter (where r.replied_at is not null and r.replied_at - r.created_at <= interval '48 hours') / nullif(count(*),0), 2) as rate
      from public.post_responses r join public.opportunity_posts p on p.id = r.post_id
     where r.created_at > now() - interval '90 days'
     group by p.business_id
  ) s where s.business_id = b.id;
$$;

-- RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.post_responses enable row level security;
alter table public.deals enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_posts enable row level security;
alter table public.follows enable row level security;
alter table public.post_views enable row level security;
alter table public.reports enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

create policy "conv: participants" on public.conversations for select
  using (fmbp.owns_business(business_a) or fmbp.owns_business(business_b));
create policy "conv: create as participant" on public.conversations for insert
  with check (fmbp.owns_business(business_a) or fmbp.owns_business(business_b));

create policy "msg: participants read" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (fmbp.owns_business(c.business_a) or fmbp.owns_business(c.business_b))));
create policy "msg: participant send" on public.messages for insert
  with check (fmbp.owns_business(sender_business_id) and exists (select 1 from public.conversations c where c.id = conversation_id and (c.business_a = sender_business_id or c.business_b = sender_business_id)));
create policy "msg: recipient mark read" on public.messages for update
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (fmbp.owns_business(c.business_a) or fmbp.owns_business(c.business_b))));

create policy "resp: owner or responder read" on public.post_responses for select
  using (fmbp.owns_business(business_id) or exists (select 1 from public.opportunity_posts p where p.id = post_id and fmbp.owns_business(p.business_id)));
create policy "resp: responder insert" on public.post_responses for insert
  with check (fmbp.owns_business(business_id) and not exists (select 1 from public.opportunity_posts p where p.id = post_id and p.business_id = business_id));

create policy "deals: participants" on public.deals for all
  using (fmbp.owns_business(business_a) or fmbp.owns_business(business_b))
  with check (fmbp.owns_business(business_a) or fmbp.owns_business(business_b));
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: reviewer insert" on public.reviews for insert
  with check (fmbp.owns_business(reviewer_business_id) and exists (select 1 from public.deals d where d.id = deal_id and d.status = 'completed' and (d.business_a = reviewer_business_id or d.business_b = reviewer_business_id)));
create policy "saved: owner" on public.saved_posts for all using (fmbp.owns_business(business_id)) with check (fmbp.owns_business(business_id));
create policy "follows: public read" on public.follows for select using (true);
create policy "follows: owner write" on public.follows for all using (fmbp.owns_business(follower_business_id)) with check (fmbp.owns_business(follower_business_id));
create policy "views: insert" on public.post_views for insert with check (business_id is null or fmbp.owns_business(business_id));
create policy "reports: reporter" on public.reports for insert with check (fmbp.owns_business(reporter_business_id));
create policy "push: self" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif: self" on public.notifications for select using (user_id = auth.uid());
create policy "notif: self update" on public.notifications for update using (user_id = auth.uid());

-- realtime for chat
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.post_responses;
