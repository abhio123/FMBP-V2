-- Sent broadcasts (QA 2026-11-05): admins see what was sent, when, by whom, to whom and to how many people.
-- A push notification cannot be edited or recalled once phones received it (Apple / Google), so there is no edit or
-- delete; a mistake is corrected with a new broadcast (the app offers "Use as template"). Read from the admin log.
create or replace function public.admin_broadcasts(p_limit int default 50)
returns table (id bigint, created_at timestamptz, admin_phone text, admin_name text, city text, recipients int,
               title_en text, body_en text, title_hi text, body_hi text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform fmbp.assert_admin();
  return query
  select a.id, a.created_at, a.admin_phone, ad.name, a.data ->> 'city', (a.data ->> 'recipients')::int,
         a.data ->> 'title_en', a.data ->> 'body_en', nullif(a.data ->> 'title_hi', ''), nullif(a.data ->> 'body_hi', '')
    from admin_actions a left join admins ad on ad.phone = a.admin_phone
   where a.action = 'broadcast'
   order by a.created_at desc
   limit least(greatest(p_limit, 1), 200);
end $$;
revoke all on function public.admin_broadcasts(int) from public, anon;
grant execute on function public.admin_broadcasts(int) to authenticated;
