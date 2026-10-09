-- Scheduled jobs inside Postgres (pg_cron ships with Supabase, hosted and local), so production does not depend on an
-- external scheduler calling the expire-posts Edge Function. The function stays as a manual/CI trigger.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

-- Idempotent: re-running the migration (db reset) replaces the schedules.
select cron.unschedule(jobid) from cron.job where jobname in ('fmbp_expire_posts', 'fmbp_response_rates');
-- 00:15 UTC = 05:45 IST, before the morning traffic
select cron.schedule('fmbp_expire_posts', '15 0 * * *', 'select public.run_expire_posts()');
select cron.schedule('fmbp_response_rates', '30 0 * * *', 'select public.run_recompute_response_rates()');
