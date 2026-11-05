-- Duplicate form questions removed (QA 2026-11-05): some forms asked the same thing twice, in Basic and in More details
-- (e.g. "For" on an event). The forms keep one of the two (supabase/forms/post, new versions). Posts already published
-- may hold the answer only under the removed question, which the post page no longer shows, so it is copied to the
-- question that stays:
--   * only when that question is unanswered (an owner's answer is never overwritten); lists (several choices) are merged;
--   * the old answer stays where it was (nothing is deleted, older form versions still read it);
--   * "Updated on" does not move (this is not an owner's edit) and the one-live-post rule is not re-checked.

create function pg_temp.move_answer(p_slug text, p_from_sec text, p_from text, p_to_sec text, p_to text, p_map jsonb default null)
returns void language plpgsql as $$
declare
  r record;
  src jsonb; dst jsonb; v jsonb;
  b jsonb; a jsonb;
begin
  for r in
    select p.id, p.basic, p.advanced from public.opportunity_posts p
      join public.post_types t on t.id = p.post_type_id
     where t.slug = p_slug and p.deleted_at is null
  loop
    b := coalesce(r.basic, '{}'); a := coalesce(r.advanced, '{}');
    src := case p_from_sec when 'basic' then b else a end -> p_from;
    if src is null or src = 'null'::jsonb or src = '""'::jsonb or src = '[]'::jsonb then continue; end if;
    -- answers whose wording changed: map old option values to the kept question's values (unmapped ones are skipped)
    if p_map is not null then
      if jsonb_typeof(src) = 'array' then
        select coalesce(jsonb_agg(distinct p_map -> e), '[]') into v from jsonb_array_elements_text(src) e where p_map ? e;
        if v = '[]'::jsonb then continue; end if;
      else
        v := p_map -> (src #>> '{}');
        if v is null then continue; end if;
      end if;
    else
      v := src;
    end if;
    dst := case p_to_sec when 'basic' then b else a end -> p_to;
    if dst is null or dst = 'null'::jsonb or dst = '""'::jsonb or dst = '[]'::jsonb then
      null; -- unanswered: take the old answer
    elsif jsonb_typeof(dst) = 'array' and jsonb_typeof(v) = 'array' then
      select coalesce(jsonb_agg(distinct e), '[]') into v from (select jsonb_array_elements(dst) e union select jsonb_array_elements(v)) u;
      if v = dst then continue; end if;
    else
      continue; -- already answered: keep the owner's answer
    end if;
    if p_to_sec = 'basic' then
      update public.opportunity_posts set basic = b || jsonb_build_object(p_to, v) where id = r.id;
    else
      update public.opportunity_posts set advanced = a || jsonb_build_object(p_to, v) where id = r.id;
    end if;
  end loop;
end $$;

alter table public.opportunity_posts disable trigger posts_edited;
select set_config('fmbp.skip_kind_check', 'on', false);

select pg_temp.move_answer('announce_event', 'advanced', 'audience', 'basic', 'for_whom');
select pg_temp.move_answer('need_employee', 'advanced', 'work_type', 'basic', 'shift');
select pg_temp.move_answer('need_influencer', 'advanced', 'min_followers', 'basic', 'followers_min');
select pg_temp.move_answer('need_manufacturer', 'advanced', 'certification', 'advanced', 'certifications');
select pg_temp.move_answer('need_supplier', 'advanced', 'delivery_required', 'basic', 'delivery_needed');
select pg_temp.move_answer('need_supplier', 'advanced', 'gst_bill', 'advanced', 'gst_required');
select pg_temp.move_answer('buy_product', 'advanced', 'gst_bill', 'advanced', 'gst');
select pg_temp.move_answer('sell_product', 'advanced', 'gst_bill', 'advanced', 'gst');
select pg_temp.move_answer('offer_distribution', 'advanced', 'team', 'advanced', 'team_size');
select pg_temp.move_answer('offer_franchise', 'advanced', 'years_in_business', 'advanced', 'brand_age');
select pg_temp.move_answer('sell_machine', 'advanced', 'year', 'basic', 'age', '{"y1": "lt1", "y3": "y1_3", "y5": "y3", "y5p": "y3"}');
select pg_temp.move_answer('need_skilled_person', 'advanced', 'security_guard_shift', 'basic', 'time_of_day', '{"night": "night"}');
select pg_temp.move_answer('offer_work', 'advanced', 'security_guard_shift', 'basic', 'time_of_day', '{"night": "night"}');
select pg_temp.move_answer('offer_work', 'advanced', 'mason_team', 'advanced', 'team_size', '{"alone": "alone", "with_team": "2_5"}');
select pg_temp.move_answer('offer_manufacturing', 'advanced', 'manufacturing_certs', 'basic', 'certification', '{"udyam": "udyam", "iso": "iso", "bis": "isi"}');
select pg_temp.move_answer('need_accountant', 'advanced', 'shop_gst', 'basic', 'gst_registered');
select pg_temp.move_answer('need_vehicle', 'advanced', 'e_rickshaw_erick_use', 'basic', 'purpose', '{"passengers": "taxi", "loader": "goods"}');

-- need_employee: "Number of openings" (a number) becomes "How many people?" (ranges)
update public.opportunity_posts p
   set basic = coalesce(p.basic, '{}') || jsonb_build_object('count', case
         when (p.advanced ->> 'openings')::numeric <= 1 then '1'
         when (p.advanced ->> 'openings')::numeric <= 3 then '2_3'
         when (p.advanced ->> 'openings')::numeric <= 10 then '4_10'
         else '10_plus' end)
  from public.post_types t
 where t.id = p.post_type_id and t.slug = 'need_employee' and p.deleted_at is null
   and jsonb_typeof(p.advanced -> 'openings') = 'number' and (p.advanced ->> 'openings')::numeric > 0
   and coalesce(p.basic ->> 'count', '') = '';

-- need_employee: "Special skills needed" joins "Skills needed" (both free text)
update public.opportunity_posts p
   set advanced = p.advanced || jsonb_build_object('skills', case
         when coalesce(btrim(p.advanced ->> 'skills'), '') = '' then p.advanced ->> 'skills_needed'
         else (p.advanced ->> 'skills') || ', ' || (p.advanced ->> 'skills_needed') end)
  from public.post_types t
 where t.id = p.post_type_id and t.slug = 'need_employee' and p.deleted_at is null
   and coalesce(btrim(p.advanced ->> 'skills_needed'), '') <> ''
   and position(lower(btrim(p.advanced ->> 'skills_needed')) in lower(coalesce(p.advanced ->> 'skills', ''))) = 0;

alter table public.opportunity_posts enable trigger posts_edited;
select set_config('fmbp.skip_kind_check', 'off', false);
