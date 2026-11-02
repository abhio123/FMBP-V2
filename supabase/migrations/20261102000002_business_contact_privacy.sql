-- Security fix 2026-11-02: business contact details (phone, WhatsApp, email) were readable by anyone holding the public
-- anon key, straight from `public.businesses` ("businesses: public read" is a row policy; it cannot hide columns).
-- `businesses_public` never exposed them, but the base table did.
--
-- Fix (least privilege, column-level):
--  * anon / authenticated lose table-wide SELECT and get SELECT on the non-sensitive columns only.
--    phone / whatsapp / email are readable by nobody through the API; owner_id only by signed-in users (the app
--    finds its own business with it). Row policies are unchanged.
--  * The owner reads their full row, contacts included, through `get_my_business_details` (security definer,
--    checks auth.uid()).
--  * INSERT / UPDATE privileges are untouched, so onboarding and the edit screen keep writing these fields.
-- When adding a column to `businesses`: add it to the grants below if the app or businesses_public must read it.

revoke select on public.businesses from anon, authenticated;

grant select (id, name, category_id, location, city, state, pincode, country, website, logo_url, cover_url, description,
              working_hours, service_available, delivery_available, pickup_available, social, completion_score,
              verification_status, member_since, response_rate, response_sample, completed_deals, rating_avg,
              rating_count, created_at, updated_at, deleted_at)
  on public.businesses to anon, authenticated;
grant select (owner_id) on public.businesses to authenticated;

create or replace function public.get_my_business_details(p_business_id uuid)
returns table (
  id uuid, name text, category_id uuid, city text, phone text, whatsapp text, email text, website text,
  logo_url text, cover_url text, description text, working_hours jsonb, service_available boolean,
  delivery_available boolean, pickup_available boolean, social jsonb, completion_score int,
  verification_status public.verification_status
)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.category_id, b.city, b.phone, b.whatsapp, b.email, b.website, b.logo_url, b.cover_url,
         b.description, b.working_hours, b.service_available, b.delivery_available, b.pickup_available, b.social,
         b.completion_score, b.verification_status
    from public.businesses b
   where b.id = p_business_id and b.owner_id = auth.uid() and b.deleted_at is null;
$$;
revoke all on function public.get_my_business_details(uuid) from public, anon;
grant execute on function public.get_my_business_details(uuid) to authenticated;
