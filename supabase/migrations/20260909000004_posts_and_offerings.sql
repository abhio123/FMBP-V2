-- Layer 3: Business Offerings + Opportunity Posts
create type public.post_status as enum ('active','paused','completed','expired','archived');
create type public.offering_status as enum ('active','paused','archived');

create table public.opportunity_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  post_type_id uuid not null references public.post_types(id),
  category_id uuid references public.categories(id),
  title text not null,
  description text,
  basic jsonb not null default '{}',
  advanced jsonb not null default '{}',
  amount_min numeric(14,2),
  amount_max numeric(14,2),
  location geography(Point, 4326) not null,
  city text not null,
  state text,
  pincode text,
  status public.post_status not null default 'active',
  expires_at timestamptz not null default (now() + interval '30 days'),
  renewed_count int not null default 0,
  view_count int not null default 0,
  response_count int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city,'')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index posts_business_idx on public.opportunity_posts(business_id);
create index posts_type_idx on public.opportunity_posts(post_type_id);
create index posts_category_idx on public.opportunity_posts(category_id);
create index posts_status_created_idx on public.opportunity_posts(status, created_at desc);
create index posts_location_gix on public.opportunity_posts using gist(location);
create index posts_search_gin on public.opportunity_posts using gin(search_tsv);
create index posts_pincode_idx on public.opportunity_posts(pincode);
create index posts_amount_idx on public.opportunity_posts(amount_min, amount_max);
create trigger posts_updated before update on public.opportunity_posts for each row execute function fmbp.set_updated_at();

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.opportunity_posts(id) on delete cascade,
  kind public.media_kind not null default 'photo',
  url text not null,
  sort int not null default 0
);
create index post_media_post_idx on public.post_media(post_id);

create table public.post_tags (
  post_id uuid not null references public.opportunity_posts(id) on delete cascade,
  tag text not null,
  primary key (post_id, tag)
);
create index post_tags_tag_idx on public.post_tags(tag);

create table public.business_offerings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  offering_type_id uuid not null references public.offering_types(id),
  title text not null,
  description text,
  basic jsonb not null default '{}',
  advanced jsonb not null default '{}',
  location geography(Point, 4326) not null,
  city text not null,
  state text,
  status public.offering_status not null default 'active',
  completion_score int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city,'')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index offerings_business_idx on public.business_offerings(business_id);
create index offerings_type_idx on public.business_offerings(offering_type_id);
create index offerings_location_gix on public.business_offerings using gist(location);
create index offerings_search_gin on public.business_offerings using gin(search_tsv);
create trigger offerings_updated before update on public.business_offerings for each row execute function fmbp.set_updated_at();

-- RLS
alter table public.opportunity_posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_tags enable row level security;
alter table public.business_offerings enable row level security;

create policy "posts: public read active" on public.opportunity_posts for select
  using (deleted_at is null and (status = 'active' or fmbp.owns_business(business_id)));
create policy "posts: owner insert" on public.opportunity_posts for insert with check (fmbp.owns_business(business_id));
create policy "posts: owner update" on public.opportunity_posts for update using (fmbp.owns_business(business_id));

create policy "post_media: read" on public.post_media for select using (true);
create policy "post_media: owner write" on public.post_media for all
  using (exists (select 1 from public.opportunity_posts p where p.id = post_id and fmbp.owns_business(p.business_id)))
  with check (exists (select 1 from public.opportunity_posts p where p.id = post_id and fmbp.owns_business(p.business_id)));
create policy "post_tags: read" on public.post_tags for select using (true);
create policy "post_tags: owner write" on public.post_tags for all
  using (exists (select 1 from public.opportunity_posts p where p.id = post_id and fmbp.owns_business(p.business_id)))
  with check (exists (select 1 from public.opportunity_posts p where p.id = post_id and fmbp.owns_business(p.business_id)));

create policy "offerings: public read active" on public.business_offerings for select
  using (deleted_at is null and (status = 'active' or fmbp.owns_business(business_id)));
create policy "offerings: owner insert" on public.business_offerings for insert with check (fmbp.owns_business(business_id));
create policy "offerings: owner update" on public.business_offerings for update using (fmbp.owns_business(business_id));

-- expiry job (called by cron/edge function)
create or replace function fmbp.expire_posts()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.opportunity_posts set status = 'expired'
   where status = 'active' and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- renew: owner only, extends 30 days
create or replace function public.renew_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.opportunity_posts p where p.id = p_post_id and fmbp.owns_business(p.business_id)) then
    raise exception 'not owner';
  end if;
  update public.opportunity_posts
     set status = 'active', expires_at = now() + interval '30 days', renewed_count = renewed_count + 1
   where id = p_post_id;
end $$;
