-- Service-role wrapper for the daily account erasure (same pattern as run_expire_posts): lets ops run it on demand
-- and the E2E suite check it. Not callable by app users.
create or replace function public.run_erase_deleted_accounts()
returns int language sql security definer set search_path = public as $$
  select fmbp.erase_deleted_accounts_and_queue_media()
$$;
revoke all on function public.run_erase_deleted_accounts() from public, anon, authenticated;
grant execute on function public.run_erase_deleted_accounts() to service_role;
