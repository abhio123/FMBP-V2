-- Social proof line on Opportunities, only when the number is big enough to help (QA 2026-11-05).
-- A tiny number ("1 deal done this month") makes the app look empty, so:
--   1. confirmed deals this month in my city, if at least deals_city_min;
--   2. else confirmed deals this month on all of FMBP, if at least deals_all_min;
--   3. else the biggest of: new posts this week, replies this week, businesses (in my city, else on all of FMBP),
--      each only if at least its own minimum;
--   4. else nothing (the app shows no line).
-- The minimums live in fmbp.app_settings (not exposed through the API), so they can be tuned with one SQL update,
-- without an app release:
--   update fmbp.app_settings set value = value || '{"deals_city_min": 5}' where key = 'social_proof';
-- deals_done_count stays for app builds that still call it.

create table if not exists fmbp.app_settings (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);
alter table fmbp.app_settings enable row level security; -- no policies: read only by security-definer functions

insert into fmbp.app_settings (key, value, note) values (
  'social_proof',
  '{"deals_city_min": 10, "deals_all_min": 25, "posts_week_min": 10, "replies_week_min": 10, "businesses_min": 20}',
  'Minimum counts before the Opportunities page shows a social-proof line (feed_social_proof).'
) on conflict (key) do nothing;

-- kind: deals (this month) | posts_week | replies_week | businesses; city null = all of FMBP. 0 or 1 row.
create or replace function public.feed_social_proof(p_city text default null)
returns table (kind text, count int, city text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  cfg jsonb := coalesce((select value from fmbp.app_settings where key = 'social_proof'), '{}'::jsonb);
  v_city text := nullif(btrim(p_city), '');
  n int;
  scope text;
  posts_n int; replies_n int; biz_n int;
begin
  if v_city is not null then
    n := public.deals_done_count(v_city);
    if n >= coalesce((cfg->>'deals_city_min')::int, 10) then
      return query select 'deals'::text, n, v_city; return;
    end if;
  end if;
  n := public.deals_done_count(null);
  if n >= coalesce((cfg->>'deals_all_min')::int, 25) then
    return query select 'deals'::text, n, null::text; return;
  end if;

  -- activity: in my city, or on all of FMBP when I have no city
  foreach scope in array case when v_city is null then array[null::text] else array[v_city, null::text] end loop
    select count(*)::int into posts_n from public.opportunity_posts p
     where p.created_at > now() - interval '7 days' and p.status = 'active' and p.deleted_at is null and p.hidden_at is null
       and (scope is null or p.city ilike scope);
    select count(*)::int into replies_n from public.post_responses r
      join public.opportunity_posts p on p.id = r.post_id
     where r.created_at > now() - interval '7 days' and p.deleted_at is null and p.hidden_at is null
       and (scope is null or p.city ilike scope);
    select count(*)::int into biz_n from public.businesses b
     where b.deleted_at is null and (scope is null or b.city ilike scope);
    if posts_n < coalesce((cfg->>'posts_week_min')::int, 10) then posts_n := 0; end if;
    if replies_n < coalesce((cfg->>'replies_week_min')::int, 10) then replies_n := 0; end if;
    if biz_n < coalesce((cfg->>'businesses_min')::int, 20) then biz_n := 0; end if;
    if greatest(posts_n, replies_n, biz_n) > 0 then
      return query select k, c, scope from (values ('posts_week', posts_n, 1), ('replies_week', replies_n, 2), ('businesses', biz_n, 3)) v(k, c, o)
        order by c desc, o asc limit 1;
      return;
    end if;
  end loop;
end
$$;

revoke all on function public.feed_social_proof(text) from public;
grant execute on function public.feed_social_proof(text) to anon, authenticated;
