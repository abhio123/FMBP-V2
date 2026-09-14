-- wipe the demo account so onboarding shows from scratch
with u as (select id from auth.users where phone='919999900003'),
     b as (select id from public.businesses where owner_id in (select id from u))
delete from public.messages where sender_business_id in (select id from b)
   or conversation_id in (select id from public.conversations where business_a in (select id from b) or business_b in (select id from b));
delete from public.post_responses where business_id in (select id from public.businesses where owner_id in (select id from auth.users where phone='919999900003'));
delete from auth.users where phone='919999900003';
select count(*) as leftover from public.businesses where name='Sharma Sweets';
