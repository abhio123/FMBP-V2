-- LOCAL ONLY (pnpm e2e:clean). Removes everything the automated test suite created: its logins 9999900011-13, the
-- temporary 9177/9178/9179 numbers and accounts it erased (no phone left). Profiles of 9999900000-09 are kept. One transaction.
begin;
create temp table e2e_biz as
  select b.id from public.businesses b
   where b.owner_id in (select id from auth.users where phone in ('919999900011', '919999900012', '919999900013') or phone ~ '^917[789]')
      or b.owner_id in (select id from auth.users where phone is null)
      or b.name like 'E2E %';
create temp table e2e_conv as
  select c.id from public.conversations c where c.business_a in (select id from e2e_biz) or c.business_b in (select id from e2e_biz);
delete from public.messages where conversation_id in (select id from e2e_conv) or sender_business_id in (select id from e2e_biz);
delete from public.conversations where id in (select id from e2e_conv);
delete from public.reviews where deal_id in (select id from public.deals where business_a in (select id from e2e_biz) or business_b in (select id from e2e_biz));
delete from public.deals where business_a in (select id from e2e_biz) or business_b in (select id from e2e_biz);
delete from public.post_responses where business_id in (select id from e2e_biz) or post_id in (select id from public.opportunity_posts where business_id in (select id from e2e_biz));
delete from public.reports where reporter_business_id in (select id from e2e_biz) or target_id in (select id from e2e_biz)
   or target_id in (select id from public.opportunity_posts where business_id in (select id from e2e_biz));
delete from public.opportunity_posts where business_id in (select id from e2e_biz);
delete from public.businesses where id in (select id from e2e_biz);
delete from auth.users where phone in ('919999900011', '919999900012', '919999900013') or phone ~ '^917[789]' or phone is null;
select (select count(*) from auth.users) users, (select count(*) from public.businesses) profiles, (select count(*) from public.opportunity_posts) posts,
       (select string_agg(name, ', ') from public.businesses) names;
commit;
