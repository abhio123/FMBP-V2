-- Account deletion, part 2: photo files. Deleting storage rows from SQL leaves the files in place, so the daily
-- erase job queues each erased business and the erase-media Edge Function (service role) removes the files in its
-- folder <business_id>/ through the storage API, then marks the queue entry done.

create table if not exists fmbp.media_erase_queue (
  business_id uuid primary key,
  queued_at timestamptz not null default now()
);

-- queue the businesses erased by fmbp.erase_deleted_accounts (wrapper keeps that function unchanged)
create or replace function fmbp.erase_deleted_accounts_and_queue_media()
returns int language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  insert into fmbp.media_erase_queue (business_id)
  select b.id from public.businesses b join public.users u on u.id = b.owner_id
   where u.deletion_requested_at < now() - interval '30 days' and u.erased_at is null
  on conflict do nothing;
  n := fmbp.erase_deleted_accounts();
  return n;
end $$;
revoke all on function fmbp.erase_deleted_accounts_and_queue_media() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'fmbp_erase_accounts';
select cron.schedule('fmbp_erase_accounts', '45 0 * * *', 'select fmbp.erase_deleted_accounts_and_queue_media()');

-- for the Edge Function only
create or replace function public.media_to_erase(p_limit int default 50)
returns setof uuid language sql stable security definer set search_path = public as $$
  select business_id from fmbp.media_erase_queue order by queued_at limit p_limit
$$;
create or replace function public.media_erased(p_business_ids uuid[])
returns void language sql security definer set search_path = public as $$
  delete from fmbp.media_erase_queue where business_id = any(p_business_ids)
$$;
revoke all on function public.media_to_erase(int) from public, anon, authenticated;
revoke all on function public.media_erased(uuid[]) from public, anon, authenticated;
grant execute on function public.media_to_erase(int) to service_role;
grant execute on function public.media_erased(uuid[]) to service_role;
