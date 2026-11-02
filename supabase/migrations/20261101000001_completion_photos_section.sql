-- QA round 2026-11-01 (Surya).
--
-- Profile completion: the photos section counts as complete once the owner adds at least one photo. Owners rarely
-- fill every slot (up to 6), and the score should reflect filled sections, not how many images were uploaded.
-- Previously each photo added 5 points up to 20, so a profile with 1-3 photos never reached 100%.
-- All other weights are unchanged (2026-10-09 migration): basics 20, logo 10, cover 10, description 15,
-- phone/WhatsApp 15, website/email/social 10, photos 20 = 100.
create or replace function fmbp.recompute_completion(b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s int := 20; -- name, category, location
begin
  select s
    + (case when logo_url is not null then 10 else 0 end)
    + (case when cover_url is not null then 10 else 0 end)
    + (case when description is not null and length(description) > 20 then 15 else 0 end)
    + (case when phone is not null or whatsapp is not null then 15 else 0 end)
    + (case when website is not null or email is not null or social <> '{}'::jsonb then 10 else 0 end)
    + (case when exists (select 1 from public.business_media m where m.business_id = b) then 20 else 0 end)
  into s from public.businesses where id = b;
  update public.businesses set completion_score = least(100, s) where id = b;
end $$;

do $$ declare r record;
begin
  for r in select id from public.businesses loop perform fmbp.recompute_completion(r.id); end loop;
end $$;
