-- Individuals (QA 2026-11-05): not everyone on FMBP runs a business. A cook, barber or electrician looking for work
-- signs up as an individual: their own name, their trade, city and photo. Internally it is the same profile row
-- (`businesses`, kind = 'individual'), so posts, replies, chat, deals and ratings work exactly as for businesses.
--   * kind: 'business' (default, every existing profile) | 'individual'
--   * trade: what the individual does, a value of the shared TRADES list (packages/shared/src/trades.ts, the same
--     values as the "Looking for work" form); trade_other: their own words when the trade is "other"
--   * post_types.for_individuals: the post types an individual can create (their own work, skills, buying / selling
--     a few things, a vehicle, a partner…). Business-only types (hire staff, distributors, franchise, machines,
--     announcements…) are refused on the server too. Replying to any post stays open to everyone.
--   * An individual can later become a business (kind → business); a business cannot turn into an individual, as
--     its business-only posts would no longer fit.

alter table public.businesses add column if not exists kind text not null default 'business' check (kind in ('business', 'individual'));
alter table public.businesses add column if not exists trade text check (trade ~ '^[a-z_]{2,30}$');
alter table public.businesses add column if not exists trade_other text check (char_length(trade_other) <= 40);
grant select (kind, trade, trade_other) on public.businesses to anon, authenticated;

create or replace function fmbp.trg_business_kind()
returns trigger language plpgsql as $$
begin
  if new.kind = 'individual' and new.trade is null then raise exception 'trade_required' using errcode = '22023'; end if;
  if new.kind = 'business' then new.trade := null; new.trade_other := null; end if;
  if tg_op = 'UPDATE' and old.kind = 'business' and new.kind = 'individual' then
    raise exception 'cannot_become_individual' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists businesses_kind on public.businesses;
create trigger businesses_kind before insert or update of kind, trade, trade_other on public.businesses
  for each row execute function fmbp.trg_business_kind();

-- the public view used by business pages (security invoker: the table's rules apply); new columns at the end
create or replace view public.businesses_public with (security_invoker = true) as
  select id, name, category_id, city, state, pincode, country, logo_url, cover_url, description, service_available,
         delivery_available, pickup_available, completion_score, verification_status, member_since, response_rate,
         completed_deals, rating_avg, rating_count, created_at, response_sample, referral_count, kind, trade, trade_other
    from public.businesses
   where deleted_at is null;

-- which post types fit an individual
alter table public.post_types add column if not exists for_individuals boolean not null default false;
update public.post_types set for_individuals = true where slug in (
  'offer_work', 'offer_service', 'offer_delivery', 'offer_vehicle', 'offer_sales_agent', 'offer_professional', 'offer_influencer',
  'offer_marketing', 'offer_mentoring', 'offer_money', 'offer_other', 'teach_skill', 'learn_skill', 'need_training', 'need_mentor',
  'need_skilled_person', 'need_vehicle', 'need_shop', 'buy_product', 'sell_product', 'partner_business', 'need_other');

create or replace function fmbp.trg_post_for_kind()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from businesses b where b.id = new.business_id and b.kind = 'individual')
     and not exists (select 1 from post_types t where t.id = new.post_type_id and t.for_individuals) then
    raise exception 'not_for_individuals' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists posts_for_kind on public.opportunity_posts;
create trigger posts_for_kind before insert or update of post_type_id, business_id on public.opportunity_posts
  for each row execute function fmbp.trg_post_for_kind();

-- admins see the profile type too
create or replace function public.admin_business(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform fmbp.assert_admin();
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'city', b.city, 'pincode', b.pincode, 'description', b.description, 'logo_url', b.logo_url,
    'phone', b.phone, 'owner_phone', u.phone, 'owner_name', pu.name, 'created_at', b.created_at, 'kind', b.kind, 'trade', b.trade,
    'trade_other', b.trade_other,
    'verification_status', b.verification_status, 'suspended_at', b.suspended_at, 'suspension_reason', b.suspension_reason,
    'deleted_at', b.deleted_at, 'completed_deals', b.completed_deals, 'rating_avg', b.rating_avg, 'rating_count', b.rating_count,
    'referral_count', b.referral_count, 'category', c.name_en,
    'posts_live', (select count(*) from opportunity_posts p where p.business_id = b.id and p.deleted_at is null and p.status = 'active'),
    'posts_total', (select count(*) from opportunity_posts p where p.business_id = b.id),
    'reports_against', (select count(*) from reports r where (r.target_type = 'business' and r.target_id = b.id)
                          or (r.target_type = 'post' and r.target_id in (select id from opportunity_posts where business_id = b.id))
                          or (r.target_type = 'message' and r.target_id in (select id from messages where sender_business_id = b.id))),
    'reports_made', (select count(*) from reports r where r.reporter_business_id = b.id),
    'verifications', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'doc_type', v.doc_type, 'doc_number', v.doc_number,
                         'file_path', v.file_url, 'status', v.status, 'note', v.note, 'created_at', v.created_at, 'reviewed_at', v.reviewed_at) order by v.created_at desc)
                         from business_verifications v where v.business_id = b.id), '[]'),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'note', a.note, 'admin', a.admin_phone, 'at', a.created_at) order by a.created_at desc)
                         from (select * from admin_actions a where a.target_type = 'business' and a.target_id = b.id::text order by a.created_at desc limit 20) a), '[]')
  ) into r
  from businesses b left join auth.users u on u.id = b.owner_id left join users pu on pu.id = b.owner_id left join categories c on c.id = b.category_id
  where b.id = p_business_id;
  if r is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return r;
end $$;
