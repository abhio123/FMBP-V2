-- QA round 2026-11-05 (Surya): searching "partnership" found nothing although a partnership post was live. Search
-- only looked at the title, description, city and the type's name, not at the answers picked in the form.
-- Every post now keeps the words of its answers in `search_terms`, written by the database on insert and edit:
--   * the type's names and sub-label (English + Hindi),
--   * the label (and sentence wording) of every option picked, English + Hindi ("Salesperson", "सेल्समैन / सेल्सगर्ल"),
--   * text typed after picking "Other",
--   * common words for how they want to work (partnership → partner, साझेदारी, …).
-- The words are part of the full-text index (weight C, below title and description) and of the word-by-word match.

alter table public.opportunity_posts add column if not exists search_terms text not null default '';

-- Form fields of a post type: its active form, else the generic one (same choice as the app and ai-generate).
create or replace function fmbp.post_form_fields(p_type uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select s.fields from public.form_schemas s
   where s.target = 'post' and s.active
     and s.type_slug in ((select slug from public.post_types where id = p_type), '_generic')
   order by (s.type_slug = '_generic'), s.version desc
   limit 1
$$;

create or replace function fmbp.post_search_terms(p_type uuid, p_basic jsonb, p_advanced jsonb, p_deal text)
returns text language sql stable security definer set search_path = public as $$
  with a as (select coalesce(p_advanced, '{}'::jsonb) || coalesce(p_basic, '{}'::jsonb) as v),
  f as (select x from jsonb_array_elements(coalesce(fmbp.post_form_fields(p_type), '[]'::jsonb)) x),
  picked as (
    select o from f, a, jsonb_array_elements(coalesce(f.x->'options', '[]'::jsonb)) o
     where (jsonb_typeof(a.v->(f.x->>'key')) = 'string' and a.v->>(f.x->>'key') = o->>'value')
        or (jsonb_typeof(a.v->(f.x->>'key')) = 'array' and a.v->(f.x->>'key') ? (o->>'value'))
  ),
  typed as (select a.v->>(f.x->>'key' || '_other') as t from f, a where jsonb_typeof(a.v->(f.x->>'key' || '_other')) = 'string')
  select concat_ws(' ',
    (select concat_ws(' ', name_en, name_hi, plain_label_en, plain_label_hi, advanced_label_en, advanced_label_hi) from public.post_types where id = p_type),
    (select string_agg(concat_ws(' ', o->>'label_en', o->>'label_hi', o->>'phrase_en', o->>'phrase_hi'), ' ') from picked),
    (select string_agg(t, ' ') from typed),
    case p_deal
      when 'partnership' then 'partnership partner partners profit share साझेदारी साझेदार पार्टनर पार्टनरशिप हिस्सेदारी'
      when 'pay' then 'paid payment cash पैसे भुगतान'
      when 'rent' then 'rent rental lease किराया किराये'
      when 'exchange' then 'exchange barter swap अदला-बदली'
    end)
$$;

create or replace function fmbp.trg_post_search_terms()
returns trigger language plpgsql as $$
begin
  new.search_terms := coalesce(fmbp.post_search_terms(new.post_type_id, new.basic, new.advanced, new.deal_type), '');
  return new;
end $$;
drop trigger if exists posts_search_terms on public.opportunity_posts;
create trigger posts_search_terms before insert or update of post_type_id, basic, advanced, deal_type on public.opportunity_posts
  for each row execute function fmbp.trg_post_search_terms();

-- existing posts (search_terms itself does not fire the trigger above, nor the edited_at trigger)
update public.opportunity_posts set search_terms = coalesce(fmbp.post_search_terms(post_type_id, basic, advanced, deal_type), '');

-- full-text index with the answer words (weight C)
drop index if exists public.posts_search_gin;
alter table public.opportunity_posts drop column if exists search_tsv;
alter table public.opportunity_posts add column search_tsv tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
  setweight(to_tsvector('simple', coalesce(city,'')), 'C') ||
  setweight(to_tsvector('english', coalesce(search_terms,'')), 'C')
) stored;
create index posts_search_gin on public.opportunity_posts using gin(search_tsv);

-- Same as 20261009000001 plus `search_terms` in the word-by-word match (Hindi words and partial words).
create or replace function public.search_all(p_q text, p_limit int default 10)
returns table (entity text, id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with q as (
    select websearch_to_tsquery('english', p_q) as tsq,
           fmbp.prefix_tsquery(p_q) as pq,
           lower(trim(p_q)) as raw,
           array(select w from regexp_split_to_table(lower(trim(p_q)), '\s+') w where w <> '') as words
  )
  (select 'post'::text, p.id,
          (greatest(ts_rank(p.search_tsv, q.tsq), coalesce(ts_rank(p.search_tsv, q.pq), 0), word_similarity(q.raw, lower(p.title)) * 0.5)
           + (case when p.title ilike '%' || q.raw || '%' then 0.3 else 0 end)
           + (case when p.created_at > now() - interval '7 days' then 0.1 else 0 end))::real as rank
     from public.opportunity_posts p
     join public.post_types pt on pt.id = p.post_type_id, q
    where p.status = 'active' and p.deleted_at is null
      and (p.search_tsv @@ q.tsq
           or (q.pq is not null and p.search_tsv @@ q.pq)
           or (cardinality(q.words) > 0 and (
                 select bool_and(p.title ilike '%' || w || '%'
                              or coalesce(p.description, '') ilike '%' || w || '%'
                              or p.city ilike '%' || w || '%'
                              or p.search_terms ilike '%' || w || '%'
                              or pt.name_en ilike '%' || w || '%' or pt.name_hi ilike '%' || w || '%' or pt.plain_label_en ilike '%' || w || '%')
                   from unnest(q.words) w))
           or (length(q.raw) >= 4 and word_similarity(q.raw, lower(p.title)) >= 0.5)
           or exists (select 1 from public.post_tags t where t.post_id = p.id
                        and (t.tag ilike p_q || '%' or to_tsvector('english', t.tag) @@ q.tsq or (length(q.raw) >= 4 and word_similarity(q.raw, t.tag) >= 0.5))))
    order by rank desc limit p_limit)
  union all
  (select 'offering', o.id,
          (greatest(ts_rank(o.search_tsv, q.tsq), coalesce(ts_rank(o.search_tsv, q.pq), 0))
           + (case when o.title ilike '%' || q.raw || '%' then 0.3 else 0 end))::real as rank
     from public.business_offerings o, q
    where o.status = 'active' and o.deleted_at is null
      and (o.search_tsv @@ q.tsq or (q.pq is not null and o.search_tsv @@ q.pq)
           or (cardinality(q.words) > 0 and (
                 select bool_and(o.title ilike '%' || w || '%' or coalesce(o.description, '') ilike '%' || w || '%' or o.city ilike '%' || w || '%')
                   from unnest(q.words) w))
           or (length(q.raw) >= 4 and word_similarity(q.raw, lower(o.title)) >= 0.5))
    order by rank desc limit p_limit)
  union all
  (select 'business', b.id, (similarity(b.name, p_q) + (case when b.verification_status = 'verified' then 0.2 else 0 end))::real as rank
     from public.businesses b where b.deleted_at is null and (b.name % p_q or b.name ilike '%' || p_q || '%'
       or exists (select 1 from public.categories c where c.id = b.category_id and (c.name_en ilike '%' || p_q || '%' or c.name_hi ilike '%' || p_q || '%')))
    order by rank desc limit p_limit);
$$;
