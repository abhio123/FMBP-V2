-- Notifications list in the app (QA 2026-11-06): the bell on Home shows every notification sent to me (broadcasts,
-- replies, deals, verification, …), newest first, also when the phone showed no push (switched off, swiped away,
-- Expo Go on Android). Rows already exist: fmbp.send_push and admin_broadcast write one per person
-- (public.notifications, readable and updatable only by its owner). Chat messages have their own tab and are not listed.
--
-- 1. Live badge: new rows reach the app over realtime (RLS still applies: only my own rows).
-- 2. Housekeeping: notifications older than 90 days are deleted every night (the list never grows without limit).

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create or replace function fmbp.delete_old_notifications()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.notifications where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function fmbp.delete_old_notifications() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'fmbp_old_notifications';
select cron.schedule('fmbp_old_notifications', '0 2 * * *', 'select fmbp.delete_old_notifications()');
