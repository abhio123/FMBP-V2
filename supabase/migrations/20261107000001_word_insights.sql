-- Words people use (agreed 2026-11-07): what people search for and what they write under "Other", counted by city and
-- state, so admins can see what is missing and which region looks for what (ADMIN.md 3.9).
--   * Counts only: no name, phone or user id is kept with a word. Region is city + state; never an address or GPS point.
--   * word_seen links a person to a word for about a day, only to count them once and to cap how much one person sends.
--     It is emptied every night and goes with the account when it is deleted.
--   * Phone numbers, e-mail addresses and links are never stored (fmbp.clean_word).
--   * A word is never added to the app by itself: an admin reviews it.

-- 1. Tables: no policies, so the app can only reach them through the functions below --------------------------------
create table public.word_insights (
  word text primary key check (char_length(word) between 2 and 40),
  status text not null default 'new' check (status in ('new', 'added', 'new_item', 'ignored')),
  reviewed_by text,
  reviewed_at timestamptz,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index word_insights_status_idx on public.word_insights (status);
create index word_insights_last_seen_idx on public.word_insights (last_seen);

create table public.word_counts (
  word text not null references public.word_insights (word) on delete cascade,
  source text not null check (source in ('search', 'category_list', 'trade_list', 'form_list', 'other_trade', 'other_form')),
  state text not null default '',
  city text not null default '',
  uses integer not null default 0,
  found_nothing integer not null default 0,
  primary key (word, source, state, city)
);
create index word_counts_region_idx on public.word_counts (state, city);

create table public.word_seen (
  user_id uuid not null references public.users (id) on delete cascade,
  seen_on date not null default current_date,
  word text not null,
  source text not null,
  primary key (user_id, seen_on, word, source)
);

alter table public.word_insights enable row level security;
alter table public.word_counts enable row level security;
alter table public.word_seen enable row level security;
revoke all on public.word_insights, public.word_counts, public.word_seen from anon, authenticated;

-- 2. Cleaning and counting -------------------------------------------------------------------------------------------
-- The word as it is stored, or null when it must not be kept. Keep in step with cleanWord (packages/shared/src/words.ts).
create or replace function fmbp.clean_word(p_raw text)
returns text language plpgsql immutable set search_path = public as $$
declare w text := lower(btrim(regexp_replace(normalize(left(coalesce(p_raw, ''), 200)), '[[:cntrl:][:space:]]+', ' ', 'g')));
begin
  if char_length(w) < 2 or char_length(w) > 40 then return null; end if;
  if char_length(regexp_replace(w, '[^0-9०-९]', '', 'g')) >= 5 then return null; end if; -- phone numbers, ids
  if w ~ '@|https?:|www\.' then return null; end if;                                     -- e-mail addresses, links
  if w ~ '^[0-9०-९[:punct:] ]+$' then return null; end if;                               -- no letters at all
  return w;
end $$;

-- p_found = false: the list or search had nothing for it (null: not applicable). p_user null: no once-a-day rule.
create or replace function fmbp.count_word(p_user uuid, p_word text, p_source text, p_found boolean, p_city text, p_state text)
returns void language plpgsql security definer set search_path = public as $$
declare
  w text := fmbp.clean_word(p_word);
  daily_cap constant integer := 50; -- one person cannot flood the list
  added integer;
begin
  if w is null then return; end if;
  if p_user is not null then
    if (select count(*) from word_seen s where s.user_id = p_user and s.seen_on = current_date) >= daily_cap then return; end if;
    insert into word_seen (user_id, word, source) values (p_user, w, p_source) on conflict do nothing;
    get diagnostics added = row_count;
    if added = 0 then return; end if; -- already counted today
  end if;
  insert into word_insights (word) values (w) on conflict (word) do update set last_seen = now();
  insert into word_counts (word, source, state, city, uses, found_nothing)
  values (w, p_source, coalesce(btrim(p_state), ''), coalesce(btrim(p_city), ''), 1, case when p_found is false then 1 else 0 end)
  on conflict (word, source, state, city) do update
    set uses = word_counts.uses + 1, found_nothing = word_counts.found_nothing + excluded.found_nothing;
end $$;

-- For the app. The region comes from the caller's own profile on the server: the phone cannot say where it is.
create or replace function public.record_word(p_word text, p_source text, p_found boolean, p_business_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text; s text;
begin
  if me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_source not in ('search', 'category_list', 'trade_list', 'form_list') then raise exception 'invalid' using errcode = '22023'; end if;
  select b.city, b.state into c, s from businesses b
   where b.owner_id = me and b.deleted_at is null
   order by (b.id is not distinct from p_business_id) desc, b.created_at desc limit 1;
  perform fmbp.count_word(me, p_word, p_source, p_found, c, s);
end $$;

-- 3. What people write under "Other": counted on the server. A problem here must never stop a profile or post saving --
create or replace function fmbp.words_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.trade_other is not null and (tg_op = 'INSERT' or new.trade_other is distinct from old.trade_other) then
    perform fmbp.count_word(new.owner_id, new.trade_other, 'other_trade', false, new.city, new.state);
  end if;
  return new;
exception when others then
  raise warning 'words_from_profile: %', sqlerrm;
  return new;
end $$;
create trigger businesses_word_counts after insert or update of trade_other on public.businesses
  for each row execute function fmbp.words_from_profile();

create or replace function fmbp.words_from_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  answers jsonb := coalesce(new.advanced, '{}') || coalesce(new.basic, '{}');
  before_edit jsonb := '{}';
  owner uuid;
  a record;
begin
  if tg_op = 'UPDATE' then before_edit := coalesce(old.advanced, '{}') || coalesce(old.basic, '{}'); end if;
  if jsonb_typeof(answers) <> 'object' then return new; end if;
  select b.owner_id into owner from businesses b where b.id = new.business_id;
  -- form answers: "<field>_other" holds the words written next to "Other" (otherTextKey in packages/shared)
  for a in select key, value from jsonb_each_text(answers) where key like '%\_other' and value is distinct from before_edit ->> key loop
    perform fmbp.count_word(owner, a.value, 'other_form', false, new.city, new.state);
  end loop;
  return new;
exception when others then
  raise warning 'words_from_post: %', sqlerrm;
  return new;
end $$;
create trigger posts_word_counts after insert or update of basic, advanced on public.opportunity_posts
  for each row execute function fmbp.words_from_post();

revoke all on function fmbp.clean_word(text), fmbp.count_word(uuid, text, text, boolean, text, text),
  fmbp.words_from_profile(), fmbp.words_from_post() from public, anon, authenticated;
revoke all on function public.record_word(text, text, boolean, uuid) from public, anon;
grant execute on function public.record_word(text, text, boolean, uuid) to authenticated;

-- "Other" words already saved before this migration (nothing to do on a fresh database)
do $$
declare r record;
begin
  for r in select trade_other, city, state from public.businesses where trade_other is not null and deleted_at is null loop
    perform fmbp.count_word(null, r.trade_other, 'other_trade', false, r.city, r.state);
  end loop;
  for r in
    select a.value, p.city, p.state
      from public.opportunity_posts p
      cross join lateral jsonb_each_text(coalesce(p.advanced, '{}') || coalesce(p.basic, '{}')) a
     where p.deleted_at is null and a.key like '%\_other'
  loop
    perform fmbp.count_word(null, r.value, 'other_form', false, r.city, r.state);
  end loop;
end $$;

-- 4. Admin area ------------------------------------------------------------------------------------------------------
-- Most used first. Counts follow the filters: with a city chosen, they are the counts of that city.
create or replace function public.admin_words(
  p_status text default 'new', p_state text default null, p_city text default null, p_only_nothing boolean default false,
  p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); res jsonb;
begin
  if p_status not in ('new', 'added', 'new_item', 'ignored') then raise exception 'invalid' using errcode = '22023'; end if;
  with c as (
    select wc.* from word_counts wc join word_insights w on w.word = wc.word
     where w.status = p_status and (p_state is null or wc.state = p_state) and (p_city is null or wc.city = p_city)
  ), t as (
    select c.word, sum(c.uses)::int as uses, sum(c.found_nothing)::int as found_nothing, array_agg(distinct c.source) as sources
      from c group by c.word
    having not coalesce(p_only_nothing, false) or sum(c.found_nothing) > 0
     order by 2 desc, 1
     limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'word', t.word, 'status', p_status, 'uses', t.uses, 'found_nothing', t.found_nothing, 'sources', t.sources,
      'last_seen', (select w.last_seen from word_insights w where w.word = t.word),
      'regions', (select coalesce(jsonb_agg(r), '[]') from (
          select c.city, c.state, sum(c.uses)::int as uses from c where c.word = t.word group by c.city, c.state order by 3 desc limit 3) r)
    ) order by t.uses desc, t.word), '[]') into res from t;
  return res;
end $$;

-- The places that have words, for the filter
create or replace function public.admin_word_regions()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); res jsonb;
begin
  select coalesce(jsonb_agg(r), '[]') into res from (
    select state, city, sum(uses)::int as uses from word_counts group by state, city order by 3 desc limit 500) r;
  return res;
end $$;

-- One row per word, source and place (for a spreadsheet). The most used 2000 rows.
create or replace function public.admin_words_export(p_status text default 'new', p_state text default null, p_city text default null, p_only_nothing boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); res jsonb;
begin
  if p_status not in ('new', 'added', 'new_item', 'ignored') then raise exception 'invalid' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(r), '[]') into res from (
    select wc.word, wc.source, wc.city, wc.state, wc.uses, wc.found_nothing
      from word_counts wc join word_insights w on w.word = wc.word
     where w.status = p_status and (p_state is null or wc.state = p_state) and (p_city is null or wc.city = p_city)
       and (not coalesce(p_only_nothing, false) or wc.found_nothing > 0)
     order by wc.uses desc, wc.word limit 2000) r;
  perform fmbp.log_admin(me, 'export_words', null, null, null, jsonb_build_object('status', p_status, 'state', p_state, 'city', p_city));
  return res;
end $$;

-- The admin's decision on a word. It marks the word; adding it to the app is a separate step (ADMIN.md 3.9).
create or replace function public.admin_set_word_status(p_word text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin();
begin
  if p_status not in ('new', 'added', 'new_item', 'ignored') then raise exception 'invalid' using errcode = '22023'; end if;
  update word_insights set status = p_status, reviewed_by = me, reviewed_at = now() where word = p_word;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform fmbp.log_admin(me, 'word_status', 'word', p_word, null, jsonb_build_object('status', p_status));
end $$;

revoke all on function public.admin_words(text, text, text, boolean, integer, integer), public.admin_word_regions(),
  public.admin_words_export(text, text, text, boolean), public.admin_set_word_status(text, text) from public, anon;
grant execute on function public.admin_words(text, text, text, boolean, integer, integer), public.admin_word_regions(),
  public.admin_words_export(text, text, text, boolean), public.admin_set_word_status(text, text) to authenticated;

-- 5. Nightly clean-up: the person-to-word links after a day; words nobody decided to keep after 6 months ---------------
create or replace function fmbp.clean_word_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from word_seen where seen_on < current_date;
  delete from word_insights where status in ('new', 'ignored') and last_seen < now() - interval '6 months';
end $$;
revoke all on function fmbp.clean_word_data() from public, anon, authenticated;
select cron.schedule('fmbp_word_data', '30 2 * * *', 'select fmbp.clean_word_data()');
