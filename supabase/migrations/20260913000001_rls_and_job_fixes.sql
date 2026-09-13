-- Fixes found by the end-to-end suite (2026-09-13)

-- 1. Nobody could respond to any post: inside the policy, the unqualified `business_id` bound to
--    opportunity_posts.business_id (always equal to itself), so `not exists` was always false.
drop policy if exists "resp: responder insert" on public.post_responses;
create policy "resp: responder insert" on public.post_responses for insert
  with check (
    fmbp.owns_business(post_responses.business_id)
    and not exists (
      select 1 from public.opportunity_posts p
       where p.id = post_responses.post_id and p.business_id = post_responses.business_id
    )
  );

-- 2. Owners could not soft-delete (or otherwise update into a non-public state) their own rows,
--    because the SELECT policy hid the new row from them. Owners now always see their own rows;
--    everyone else sees only active, non-deleted rows.
drop policy if exists "posts: public read active" on public.opportunity_posts;
create policy "posts: public read active" on public.opportunity_posts for select
  using ((deleted_at is null and status = 'active') or fmbp.owns_business(business_id));

drop policy if exists "offerings: public read active" on public.business_offerings;
create policy "offerings: public read active" on public.business_offerings for select
  using ((deleted_at is null and status = 'active') or fmbp.owns_business(business_id));

-- 3. The scheduled jobs live in schema `fmbp`, which PostgREST does not expose, so the expire-posts
--    Edge Function always failed with 500. Expose service-role-only wrappers in `public`.
create or replace function public.run_expire_posts()
returns int language sql security definer set search_path = public as $$
  select fmbp.expire_posts();
$$;
create or replace function public.run_recompute_response_rates()
returns void language sql security definer set search_path = public as $$
  select fmbp.recompute_response_rates();
$$;
revoke all on function public.run_expire_posts() from public, anon, authenticated;
revoke all on function public.run_recompute_response_rates() from public, anon, authenticated;
grant execute on function public.run_expire_posts() to service_role;
grant execute on function public.run_recompute_response_rates() to service_role;
