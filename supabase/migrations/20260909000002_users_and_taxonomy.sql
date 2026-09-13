-- Layer 1: users (auth only) + taxonomy
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  email text,
  language text not null default 'en' check (language in ('en','hi')),
  notification_prefs jsonb not null default '{"responses":true,"messages":true,"expiry":true,"digest":true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_updated before update on public.users for each row execute function fmbp.set_updated_at();

create or replace function fmbp.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, phone, name)
  values (new.id, new.phone, coalesce(new.raw_user_meta_data->>'name',''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function fmbp.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name_en text not null,
  name_hi text not null,
  icon text,
  sort int not null default 0
);

create table public.intentions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('need','offer','sell','buy','partner','announce','learn','teach','invest','raise')),
  name_en text not null,
  name_hi text not null,
  icon text,
  sort int not null default 0
);

create table public.post_types (
  id uuid primary key default gen_random_uuid(),
  intention_id uuid not null references public.intentions(id),
  slug text not null unique,
  name_en text not null,
  name_hi text not null,
  plain_label_en text not null,
  plain_label_hi text not null,
  advanced_label_en text,
  icon text,
  category_hint uuid references public.categories(id),
  sort int not null default 0,
  active boolean not null default true
);

create table public.offering_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_hi text not null,
  icon text,
  sort int not null default 0,
  active boolean not null default true
);

create table public.form_schemas (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('post','offering')),
  type_slug text not null,
  version int not null default 1,
  fields jsonb not null,
  title_template text not null,
  description_template text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (target, type_slug, version)
);

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.intentions enable row level security;
alter table public.post_types enable row level security;
alter table public.offering_types enable row level security;
alter table public.form_schemas enable row level security;

create policy "users: self read" on public.users for select using (id = auth.uid());
create policy "users: self update" on public.users for update using (id = auth.uid());
create policy "taxonomy read" on public.categories for select using (true);
create policy "taxonomy read" on public.intentions for select using (true);
create policy "taxonomy read" on public.post_types for select using (true);
create policy "taxonomy read" on public.offering_types for select using (true);
create policy "taxonomy read" on public.form_schemas for select using (true);
