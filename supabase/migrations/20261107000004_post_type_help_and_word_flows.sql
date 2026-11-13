-- Post types get what business categories have: an ⓘ list of what each covers and search words, so "barber" or "child
-- care" finds the right choice on "What do you need?" / "What can you offer?" (filled by seed 07_post_type_examples.sql).
-- Words people use now say which flow and section they came from, and admins can correct or delete a word.
-- Nothing is removed: existing words keep their counts, under an empty section.

-- 1. What each post type covers ---------------------------------------------------------------------------------------
alter table public.post_types
  add column if not exists examples_en text[] not null default '{}',
  add column if not exists examples_hi text[] not null default '{}',
  add column if not exists keywords text;

-- 2. Where a word came from ------------------------------------------------------------------------------------------
-- source: the kind of place. section: which one, e.g. 'need' (the post type list) or 'offer_work.job' (a form field).
alter table public.word_counts add column if not exists section text not null default '';
alter table public.word_counts drop constraint word_counts_pkey;
alter table public.word_counts add primary key (word, source, section, state, city);
alter table public.word_counts drop constraint word_counts_source_check;
alter table public.word_counts add constraint word_counts_source_check
  check (source in ('search', 'category_list', 'trade_list', 'type_list', 'form_list', 'other_trade', 'other_form', 'other_category'));

-- The three flows admins filter by
create or replace function fmbp.word_flow(p_source text)
returns text language sql immutable set search_path = public as $$
  select case
    when p_source = 'search' then 'search'
    when p_source in ('category_list', 'trade_list', 'other_trade', 'other_category') then 'profile'
    else 'post'
  end
$$;

-- A word counts once per person per day IN EACH FLOW: searching a word in a post form and writing it under Other is one
-- person asking once, but using it in Search and in a post shows two places that are missing it. The first section of
-- that flow gets the count. word_seen.source holds the flow from now on.
drop function fmbp.count_word(uuid, text, text, boolean, text, text);
create function fmbp.count_word(p_user uuid, p_word text, p_source text, p_found boolean, p_city text, p_state text, p_section text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  w text := fmbp.clean_word(p_word);
  flow text := fmbp.word_flow(p_source);
  daily_cap constant integer := 50; -- one person cannot flood the list
  added integer;
begin
  if w is null then return; end if;
  if p_user is not null then
    if (select count(*) from word_seen s where s.user_id = p_user and s.seen_on = current_date) >= daily_cap then return; end if;
    insert into word_seen (user_id, word, source) values (p_user, w, flow) on conflict do nothing;
    get diagnostics added = row_count;
    if added = 0 then return; end if; -- already counted today in this flow
  end if;
  insert into word_insights (word) values (w) on conflict (word) do update set last_seen = now();
  insert into word_counts (word, source, section, state, city, uses, found_nothing)
  values (w, p_source, coalesce(p_section, ''), coalesce(btrim(p_state), ''), coalesce(btrim(p_city), ''), 1, case when p_found is false then 1 else 0 end)
  on conflict (word, source, section, state, city) do update
    set uses = word_counts.uses + 1, found_nothing = word_counts.found_nothing + excluded.found_nothing;
end $$;

-- For the app. The section is only a label chosen by the app: anything that does not look like one is dropped.
drop function public.record_word(text, text, boolean, uuid);
create function public.record_word(p_word text, p_source text, p_found boolean, p_business_id uuid default null, p_section text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text; s text;
begin
  if me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_source not in ('search', 'category_list', 'trade_list', 'type_list', 'form_list') then raise exception 'invalid' using errcode = '22023'; end if;
  select b.city, b.state into c, s from businesses b
   where b.owner_id = me and b.deleted_at is null
   order by (b.id is not distinct from p_business_id) desc, b.created_at desc limit 1;
  perform fmbp.count_word(me, p_word, p_source, p_found, c, s, case when p_section ~ '^[a-z0-9_.]{1,80}$' then p_section else '' end);
end $$;

-- Words written under Other on a post: which post type and field
create or replace function fmbp.words_from_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  answers jsonb := coalesce(new.advanced, '{}') || coalesce(new.basic, '{}');
  before_edit jsonb := '{}';
  owner uuid;
  type_slug text;
  a record;
begin
  if tg_op = 'UPDATE' then before_edit := coalesce(old.advanced, '{}') || coalesce(old.basic, '{}'); end if;
  if jsonb_typeof(answers) <> 'object' then return new; end if;
  select b.owner_id into owner from businesses b where b.id = new.business_id;
  select t.slug into type_slug from post_types t where t.id = new.post_type_id;
  -- form answers: "<field>_other" holds the words written next to "Other" (otherTextKey in packages/shared)
  for a in select key, value from jsonb_each_text(answers) where key like '%\_other' and value is distinct from before_edit ->> key loop
    perform fmbp.count_word(owner, a.value, 'other_form', false, new.city, new.state, left(type_slug || '.' || regexp_replace(a.key, '_other$', ''), 80));
  end loop;
  return new;
exception when others then
  raise warning 'words_from_post: %', sqlerrm;
  return new;
end $$;

revoke all on function fmbp.word_flow(text), fmbp.count_word(uuid, text, text, boolean, text, text, text), fmbp.words_from_post() from public, anon, authenticated;
revoke all on function public.record_word(text, text, boolean, uuid, text) from public, anon;
grant execute on function public.record_word(text, text, boolean, uuid, text) to authenticated;

-- 3. Admin area ------------------------------------------------------------------------------------------------------
create or replace function fmbp.check_word_filter(p_status text, p_flow text)
returns void language plpgsql immutable set search_path = public as $$
begin
  if p_status is not null and p_status not in ('new', 'added', 'new_item', 'ignored') then raise exception 'invalid' using errcode = '22023'; end if;
  if p_flow is not null and p_flow not in ('search', 'profile', 'post') then raise exception 'invalid' using errcode = '22023'; end if;
end $$;
revoke all on function fmbp.check_word_filter(text, text) from public, anon, authenticated;

drop function public.admin_words(text, text, text, boolean, integer, integer);
create function public.admin_words(
  p_status text default 'new', p_state text default null, p_city text default null, p_only_nothing boolean default false,
  p_limit integer default 50, p_offset integer default 0, p_flow text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); res jsonb;
begin
  perform fmbp.check_word_filter(p_status, p_flow);
  with c as (
    select wc.* from word_counts wc join word_insights w on w.word = wc.word
     where w.status = p_status and (p_state is null or wc.state = p_state) and (p_city is null or wc.city = p_city)
       and (p_flow is null or fmbp.word_flow(wc.source) = p_flow)
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
          select c.city, c.state, sum(c.uses)::int as uses from c where c.word = t.word group by c.city, c.state order by 3 desc limit 3) r),
      -- where it was used, with the names of the post type and form field when there are any
      'places', (select coalesce(jsonb_agg(p), '[]') from (
          select c.source, c.section, sum(c.uses)::int as uses, pt.name_en as type_en, pt.name_hi as type_hi, ff.label_en as field_en, ff.label_hi as field_hi
            from c
            left join post_types pt on pt.slug = split_part(c.section, '.', 1)
            left join lateral (
              select f ->> 'label_en' as label_en, f ->> 'label_hi' as label_hi
                from form_schemas fs cross join lateral jsonb_array_elements(fs.fields) f
               where fs.target = 'post' and fs.active and fs.type_slug = pt.slug and f ->> 'key' = split_part(c.section, '.', 2)
               order by fs.version desc limit 1) ff on true
           where c.word = t.word
           group by c.source, c.section, pt.name_en, pt.name_hi, ff.label_en, ff.label_hi
           order by 3 desc limit 6) p)
    ) order by t.uses desc, t.word), '[]') into res from t;
  return res;
end $$;

-- How many words each status tab holds, under the same filters
create or replace function public.admin_word_status_counts(p_state text default null, p_city text default null, p_only_nothing boolean default false, p_flow text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); res jsonb;
begin
  perform fmbp.check_word_filter(null, p_flow);
  select coalesce(jsonb_object_agg(x.status, x.n), '{}') into res from (
    select g.status, count(*)::int as n from (
      select w.word, w.status from word_counts wc join word_insights w on w.word = wc.word
       where (p_state is null or wc.state = p_state) and (p_city is null or wc.city = p_city)
         and (p_flow is null or fmbp.word_flow(wc.source) = p_flow)
       group by w.word, w.status
      having not coalesce(p_only_nothing, false) or sum(wc.found_nothing) > 0) g
    group by g.status) x;
  return res;
end $$;

-- One row per word, status, source, section and place, for a spreadsheet: every status unless one is asked for
drop function public.admin_words_export(text, text, text, boolean);
create function public.admin_words_export(p_status text default null, p_state text default null, p_city text default null, p_only_nothing boolean default false, p_flow text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin(); res jsonb;
begin
  perform fmbp.check_word_filter(p_status, p_flow);
  select coalesce(jsonb_agg(r), '[]') into res from (
    select wc.word, w.status, fmbp.word_flow(wc.source) as flow, wc.source, wc.section, wc.city, wc.state, wc.uses, wc.found_nothing
      from word_counts wc join word_insights w on w.word = wc.word
     where (p_status is null or w.status = p_status) and (p_state is null or wc.state = p_state) and (p_city is null or wc.city = p_city)
       and (p_flow is null or fmbp.word_flow(wc.source) = p_flow)
       and (not coalesce(p_only_nothing, false) or wc.found_nothing > 0)
     order by wc.uses desc, wc.word limit 2000) r;
  perform fmbp.log_admin(me, 'export_words', null, null, null, jsonb_build_object('status', p_status, 'state', p_state, 'city', p_city, 'flow', p_flow));
  return res;
end $$;

-- Correct a spelling. If the new spelling already exists the two become one word and their counts are added together.
create or replace function public.admin_rename_word(p_word text, p_new_word text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me text := fmbp.assert_admin();
  old_row word_insights;
  target text := fmbp.clean_word(p_new_word);
begin
  if target is null then raise exception 'invalid' using errcode = '22023'; end if;
  select * into old_row from word_insights where word = p_word for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if target = p_word then return; end if;
  insert into word_insights (word, status, reviewed_by, reviewed_at, first_seen, last_seen)
  values (target, old_row.status, me, now(), old_row.first_seen, old_row.last_seen)
  on conflict (word) do update set first_seen = least(word_insights.first_seen, excluded.first_seen), last_seen = greatest(word_insights.last_seen, excluded.last_seen);
  insert into word_counts (word, source, section, state, city, uses, found_nothing)
  select target, source, section, state, city, uses, found_nothing from word_counts where word = p_word
  on conflict (word, source, section, state, city) do update
    set uses = word_counts.uses + excluded.uses, found_nothing = word_counts.found_nothing + excluded.found_nothing;
  delete from word_insights where word = p_word; -- its counts go with it
  update word_seen s set word = target where s.word = p_word
    and not exists (select 1 from word_seen d where d.user_id = s.user_id and d.seen_on = s.seen_on and d.word = target and d.source = s.source);
  delete from word_seen where word = p_word;
  perform fmbp.log_admin(me, 'word_rename', 'word', p_word, null, jsonb_build_object('to', target));
end $$;

-- Remove a word and all its counts (a name typed by mistake, rubbish). If someone uses it again it comes back as new.
create or replace function public.admin_delete_word(p_word text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := fmbp.assert_admin();
begin
  delete from word_insights where word = p_word;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  delete from word_seen where word = p_word;
  perform fmbp.log_admin(me, 'word_delete', 'word', p_word, null, '{}'::jsonb);
end $$;

revoke all on function public.admin_words(text, text, text, boolean, integer, integer, text), public.admin_word_status_counts(text, text, boolean, text),
  public.admin_words_export(text, text, text, boolean, text), public.admin_rename_word(text, text), public.admin_delete_word(text) from public, anon;
grant execute on function public.admin_words(text, text, text, boolean, integer, integer, text), public.admin_word_status_counts(text, text, boolean, text),
  public.admin_words_export(text, text, text, boolean, text), public.admin_rename_word(text, text), public.admin_delete_word(text) to authenticated;

-- 4. Dashboard: the words waiting for review -----------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return jsonb_build_object(
    'businesses', (select count(*) from businesses where deleted_at is null),
    'businesses_today', (select count(*) from businesses where deleted_at is null and created_at > date_trunc('day', now())),
    'businesses_week', (select count(*) from businesses where deleted_at is null and created_at > now() - interval '7 days'),
    'posts_live', (select count(*) from opportunity_posts where deleted_at is null and status = 'active'),
    'posts_today', (select count(*) from opportunity_posts where deleted_at is null and created_at > date_trunc('day', now())),
    'posts_week', (select count(*) from opportunity_posts where deleted_at is null and created_at > now() - interval '7 days'),
    'responses_week', (select count(*) from post_responses where created_at > now() - interval '7 days'),
    'messages_week', (select count(*) from messages where created_at > now() - interval '7 days'),
    'deals_month', (select count(*) from deals where counted and completed_at > now() - interval '30 days'),
    'open_reports', (select count(distinct (target_type, target_id)) from reports where status = 'open'),
    'hidden_posts', (select count(*) from opportunity_posts where deleted_at is null and hidden_at is not null),
    'pending_verifications', (select count(*) from business_verifications where status = 'pending'),
    'suspended', (select count(*) from businesses where suspended_at is not null and deleted_at is null),
    'deletions_pending', (select count(*) from users where deletion_requested_at is not null and erased_at is null),
    'words_new', (select count(*) from word_insights where status = 'new')
  );
end $$;
