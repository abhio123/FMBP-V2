-- QA round 2026-11-05 (Surya), agreed rule: a business cannot have two live posts of the same kind, or the feed fills
-- up with copies from one business and loses credibility. "Same kind" = same post type and the same sub-category
-- answer (the form field marked `kind`: Need Staff → Salesperson). "Need Staff → Cook" next to "→ Salesperson" is
-- fine. Types without a kind field allow one live post of the type. Live = active or paused. Once the post expires,
-- is completed or removed, a new one can be published, or the old one renewed / edited.
-- "Other" answers compare the typed text (case-insensitive); typed kinds ("<what> available") compare the text.

alter table public.opportunity_posts add column if not exists kind_key text not null default '';

create or replace function fmbp.post_kind_key(p_type uuid, p_basic jsonb, p_advanced jsonb)
returns text language sql stable security definer set search_path = public as $$
  with a as (select coalesce(p_advanced, '{}'::jsonb) || coalesce(p_basic, '{}'::jsonb) as v),
  k as (select x->>'key' as key from jsonb_array_elements(coalesce(fmbp.post_form_fields(p_type), '[]'::jsonb)) x
         where coalesce((x->>'kind')::boolean, false) limit 1)
  select coalesce((
    select case
      when jsonb_typeof(a.v->k.key) = 'array' then (select string_agg(e, ',' order by e) from jsonb_array_elements_text(a.v->k.key) e)
      when a.v->>k.key = 'other' then 'other:' || lower(trim(coalesce(a.v->>(k.key || '_other'), '')))
      else lower(trim(coalesce(a.v->>k.key, '')))
    end
    from k, a), '')
$$;

create or replace function fmbp.trg_one_live_post_per_kind()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  existing uuid;
begin
  new.kind_key := fmbp.post_kind_key(new.post_type_id, new.basic, new.advanced);
  if new.status not in ('active', 'paused') or new.deleted_at is not null then return new; end if;
  -- an edit that keeps a live post's type and kind is always fine (also for copies made before this rule)
  if tg_op = 'UPDATE' and old.status in ('active', 'paused') and old.deleted_at is null
     and new.post_type_id = old.post_type_id and new.kind_key = old.kind_key then
    return new;
  end if;
  -- restoring an account brings back exactly what it had (see account deletion)
  if current_setting('fmbp.skip_kind_check', true) = 'on' then return new; end if;
  -- two taps at once must not both pass the check
  perform pg_advisory_xact_lock(hashtext('one_live_post:' || new.business_id || ':' || new.post_type_id));
  select p.id into existing from public.opportunity_posts p
   where p.business_id = new.business_id and p.post_type_id = new.post_type_id and p.kind_key = new.kind_key
     and p.status in ('active', 'paused') and p.deleted_at is null and p.id <> new.id
   limit 1;
  if existing is not null then
    raise exception 'duplicate_live_post' using errcode = 'P0001', detail = existing::text,
      hint = 'This business already has a live post of this kind. Edit or renew it instead.';
  end if;
  return new;
end $$;

drop trigger if exists posts_one_live_per_kind on public.opportunity_posts;
create trigger posts_one_live_per_kind before insert or update of status, deleted_at, post_type_id, basic, advanced
  on public.opportunity_posts for each row execute function fmbp.trg_one_live_post_per_kind();

-- existing posts get their kind (copies made before this rule stay as they are)
update public.opportunity_posts set kind_key = fmbp.post_kind_key(post_type_id, basic, advanced);
create index if not exists posts_live_kind_idx on public.opportunity_posts (business_id, post_type_id, kind_key)
  where status in ('active', 'paused') and deleted_at is null;

-- For the app, before publishing: my live post of the same kind, if any (null = fine). Row security limits it to
-- the caller's own posts.
create or replace function public.find_live_duplicate(p_business_id uuid, p_post_type_id uuid, p_basic jsonb, p_advanced jsonb, p_exclude uuid default null)
returns uuid language sql stable security invoker set search_path = public as $$
  select p.id from public.opportunity_posts p
   where fmbp.owns_business(p_business_id)
     and p.business_id = p_business_id and p.post_type_id = p_post_type_id
     and p.kind_key = fmbp.post_kind_key(p_post_type_id, p_basic, p_advanced)
     and p.status in ('active', 'paused') and p.deleted_at is null
     and (p_exclude is null or p.id <> p_exclude)
   limit 1
$$;
grant execute on function public.find_live_duplicate(uuid, uuid, jsonb, jsonb, uuid) to authenticated;
