-- Layer 2: Business Profile (identity only)
create type public.verification_status as enum ('none','pending','verified','rejected');
create type public.verification_doc_type as enum ('gst','udyam','fssai','trade_license','iec','other');
create type public.media_kind as enum ('photo','video','brochure','catalogue');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category_id uuid not null references public.categories(id),
  location geography(Point, 4326) not null,
  city text not null,
  state text,
  pincode text,
  country text not null default 'IN',
  phone text,
  whatsapp text,
  email text,
  website text,
  logo_url text,
  cover_url text,
  description text,
  working_hours jsonb,
  service_available boolean not null default false,
  delivery_available boolean not null default false,
  pickup_available boolean not null default false,
  social jsonb not null default '{}',
  completion_score int not null default 0,
  verification_status public.verification_status not null default 'none',
  member_since timestamptz not null default now(),
  response_rate numeric(5,2) not null default 0,
  completed_deals int not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index businesses_owner_idx on public.businesses(owner_id);
create index businesses_location_gix on public.businesses using gist(location);
create index businesses_name_trgm on public.businesses using gin(name gin_trgm_ops);
create index businesses_category_idx on public.businesses(category_id);
create index businesses_pincode_idx on public.businesses(pincode);
create trigger businesses_updated before update on public.businesses for each row execute function fmbp.set_updated_at();

create table public.business_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind public.media_kind not null default 'photo',
  url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index business_media_biz_idx on public.business_media(business_id);

create table public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  doc_type public.verification_doc_type not null,
  doc_number text,
  file_url text,
  status public.verification_status not null default 'pending',
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index business_verifications_biz_idx on public.business_verifications(business_id);

-- helpers that depend on businesses
create or replace function fmbp.my_business_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.businesses where owner_id = auth.uid() and deleted_at is null
$$;
create or replace function fmbp.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid())
$$;

-- completion score: 3 required = 20%, each optional item adds
create or replace function fmbp.recompute_completion(b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s int := 20;
begin
  select s
    + (case when logo_url is not null then 10 else 0 end)
    + (case when cover_url is not null then 5 else 0 end)
    + (case when description is not null and length(description) > 20 then 10 else 0 end)
    + (case when phone is not null or whatsapp is not null then 10 else 0 end)
    + (case when website is not null or social <> '{}'::jsonb then 5 else 0 end)
    + (case when working_hours is not null then 5 else 0 end)
    + (case when verification_status = 'verified' then 20 else 0 end)
    + least(15, (select count(*) from public.business_media m where m.business_id = b) * 5)
  into s from public.businesses where id = b;
  update public.businesses set completion_score = least(100, s) where id = b;
end $$;

create or replace function fmbp.trg_completion()
returns trigger language plpgsql as $$
begin
  perform fmbp.recompute_completion(coalesce(new.business_id, new.id, old.business_id, old.id));
  return null;
end $$;
create trigger business_media_completion after insert or delete on public.business_media
  for each row execute function fmbp.trg_completion();
create trigger business_verif_completion after insert or update on public.business_verifications
  for each row execute function fmbp.trg_completion();

create or replace function fmbp.trg_business_completion()
returns trigger language plpgsql as $$
begin
  perform fmbp.recompute_completion(new.id);
  return null;
end $$;
create trigger businesses_completion after insert or update of logo_url, cover_url, description, phone, whatsapp, website, social, working_hours, verification_status
  on public.businesses for each row execute function fmbp.trg_business_completion();

-- RLS
alter table public.businesses enable row level security;
alter table public.business_media enable row level security;
alter table public.business_verifications enable row level security;

create policy "businesses: public read" on public.businesses for select using (deleted_at is null);
create policy "businesses: owner insert" on public.businesses for insert with check (owner_id = auth.uid());
create policy "businesses: owner update" on public.businesses for update using (owner_id = auth.uid());
create policy "media: public read" on public.business_media for select using (true);
create policy "media: owner write" on public.business_media for all using (fmbp.owns_business(business_id)) with check (fmbp.owns_business(business_id));
create policy "verif: owner all" on public.business_verifications for all using (fmbp.owns_business(business_id)) with check (fmbp.owns_business(business_id));

-- public view that never leaks phone/whatsapp/email
create view public.businesses_public with (security_invoker = true) as
  select id, name, category_id, city, state, pincode, country, logo_url, cover_url, description,
         service_available, delivery_available, pickup_available, completion_score, verification_status,
         member_since, response_rate, completed_deals, rating_avg, rating_count, created_at
  from public.businesses where deleted_at is null;
