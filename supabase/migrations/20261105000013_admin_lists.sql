-- Admin dashboard tiles open lists (QA 2026-11-05): businesses (all / new this week / suspended / being deleted /
-- verified), posts (live / new this week / hidden / removed), confirmed deals and replies. Newest first, paged.
-- Chat messages are private and are not listed (only reported messages are shown to admins, under Reports).

create or replace function public.admin_list_businesses(p_filter text default 'all', p_limit int default 50, p_offset int default 0)
returns table (id uuid, name text, city text, logo_url text, owner_phone text, created_at timestamptz, verification_status text,
               suspended_at timestamptz, suspension_reason text, deleted_at timestamptz, erase_on timestamptz, posts_live int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  if p_filter not in ('all', 'new', 'suspended', 'deleting', 'verified') then raise exception 'invalid' using errcode = '22023'; end if;
  return query
  select b.id, b.name, b.city, b.logo_url, au.phone::text, b.created_at, b.verification_status::text, b.suspended_at, b.suspension_reason,
         b.deleted_at, u.deletion_requested_at + interval '30 days',
         (select count(*)::int from opportunity_posts p where p.business_id = b.id and p.deleted_at is null and p.status = 'active')
    from businesses b
    left join users u on u.id = b.owner_id
    left join auth.users au on au.id = b.owner_id
   where case p_filter
           when 'all' then b.deleted_at is null
           when 'new' then b.deleted_at is null and b.created_at > now() - interval '7 days'
           when 'suspended' then b.deleted_at is null and b.suspended_at is not null
           when 'deleting' then u.deletion_requested_at is not null and u.erased_at is null
           when 'verified' then b.deleted_at is null and b.verification_status = 'verified'
         end
   order by case when p_filter = 'suspended' then b.suspended_at end desc nulls last, b.created_at desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_list_posts(p_filter text default 'live', p_limit int default 50, p_offset int default 0)
returns table (id uuid, title text, status text, created_at timestamptz, hidden boolean, removed boolean, icon text,
               business_id uuid, business_name text, city text, response_count int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  if p_filter not in ('live', 'new', 'hidden', 'removed') then raise exception 'invalid' using errcode = '22023'; end if;
  return query
  select p.id, p.title, p.status::text, p.created_at, p.hidden_at is not null, p.deleted_at is not null, t.icon,
         p.business_id, b.name, p.city, p.response_count
    from opportunity_posts p
    join businesses b on b.id = p.business_id
    left join post_types t on t.id = p.post_type_id
   where case p_filter
           when 'live' then p.deleted_at is null and p.status = 'active'
           when 'new' then p.deleted_at is null and p.created_at > now() - interval '7 days'
           when 'hidden' then p.deleted_at is null and p.hidden_at is not null
           when 'removed' then p.deleted_at is not null and b.deleted_at is null
         end
   order by p.created_at desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

-- confirmed deals of the last 30 days (the dashboard number), counted or not (the same pair counts once per 30 days)
create or replace function public.admin_list_deals(p_limit int default 50, p_offset int default 0)
returns table (id uuid, post_title text, post_icon text, business_a uuid, business_a_name text, business_b uuid, business_b_name text,
               completed_at timestamptz, counted boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query
  select d.id, p.title, t.icon, d.business_a, ba.name, d.business_b, bb.name, d.completed_at, d.counted
    from deals d
    left join opportunity_posts p on p.id = d.post_id
    left join post_types t on t.id = p.post_type_id
    join businesses ba on ba.id = d.business_a
    join businesses bb on bb.id = d.business_b
   where d.status = 'completed' and d.completed_at > now() - interval '30 days'
   order by d.completed_at desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

-- replies to posts in the last 7 days: who replied to which post (the post owner sees the same)
create or replace function public.admin_list_responses(p_limit int default 50, p_offset int default 0)
returns table (id uuid, response_type text, created_at timestamptz, post_id uuid, post_title text, post_icon text,
               owner_id uuid, owner_name text, responder_id uuid, responder_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query
  select r.id, r.response_type::text, r.created_at, p.id, p.title, t.icon, p.business_id, ob.name, r.business_id, rb.name
    from post_responses r
    join opportunity_posts p on p.id = r.post_id
    left join post_types t on t.id = p.post_type_id
    join businesses ob on ob.id = p.business_id
    join businesses rb on rb.id = r.business_id
   where r.created_at > now() - interval '7 days'
   order by r.created_at desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

do $$
declare f text;
begin
  foreach f in array array['admin_list_businesses(text, int, int)', 'admin_list_posts(text, int, int)', 'admin_list_deals(int, int)', 'admin_list_responses(int, int)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
