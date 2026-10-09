-- Demo data for the LOCAL stack: 14 businesses across 8 cities, ~40 posts over 25 post types, responses, chats,
-- follows, saves and views, so every tab, search and the chat have something to show.
-- Re-runnable: demo rows are removed first. Apply with `pnpm demo:data` (see scripts/demo/README.md).
--
-- Log in on a device as 9999900002 (Gupta Garments, Delhi) or 9999900003 (Sharma Sweets, Noida): both own posts,
-- have unread chats and follow other businesses. 9999900001 stays untouched for the first-time-user experience.
\set ON_ERROR_STOP on
begin;

-- ---------- helpers (session-local) ----------
create or replace function pg_temp.city_point(c text) returns geography language sql as $$
  select st_setsrid(st_makepoint(lng, lat), 4326)::geography from (values
    ('Noida', 28.5355, 77.3910), ('Delhi', 28.6139, 77.2090), ('Gurugram', 28.4595, 77.0266), ('Ghaziabad', 28.6692, 77.4538),
    ('Jaipur', 26.9124, 75.7873), ('Lucknow', 26.8467, 80.9462), ('Mumbai', 19.0760, 72.8777), ('Bengaluru', 12.9716, 77.5946)
  ) as t(city, lat, lng) where city = c
$$;
create or replace function pg_temp.city_state(c text) returns text language sql as $$
  select case c when 'Noida' then 'Uttar Pradesh' when 'Ghaziabad' then 'Uttar Pradesh' when 'Lucknow' then 'Uttar Pradesh'
    when 'Delhi' then 'Delhi' when 'Gurugram' then 'Haryana' when 'Jaipur' then 'Rajasthan' when 'Mumbai' then 'Maharashtra' else 'Karnataka' end
$$;
create or replace function pg_temp.loc(c text) returns jsonb language sql as $$
  select jsonb_build_object('lat', st_y(pg_temp.city_point(c)::geometry), 'lng', st_x(pg_temp.city_point(c)::geometry),
                            'city', c, 'state', pg_temp.city_state(c), 'country', 'IN', 'label', c)
$$;

-- user + business (phone is the key). Existing auth users (device logins) are kept; a missing one is created so the
-- number can still log in with the local test OTP.
create or replace function pg_temp.demo_business(p_phone text, p_name text, p_cat text, p_city text, p_desc text,
  p_verified boolean default false, p_rate numeric default 0, p_deals int default 0, p_rating numeric default 0, p_rating_n int default 0)
returns uuid language plpgsql as $$
declare uid uuid; bid uuid;
begin
  select id into uid from auth.users where phone = p_phone;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, encrypted_password, confirmation_token, recovery_token, email_change_token_new, email_change)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_phone, now() - interval '60 days', now() - interval '60 days', now(), now() - interval '1 day',
      '{"provider":"phone","providers":["phone"]}', jsonb_build_object('name', p_name, 'demo', true), '', '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), uid, jsonb_build_object('sub', uid::text, 'phone', p_phone), 'phone', uid::text, now(), now(), now());
  end if;
  select id into bid from public.businesses where owner_id = uid and deleted_at is null order by created_at limit 1;
  if bid is null then
    insert into public.businesses (owner_id, name, category_id, location, city, state, pincode, country, member_since)
    values (uid, p_name, (select id from public.categories where slug = p_cat), pg_temp.city_point(p_city), p_city, pg_temp.city_state(p_city), null, 'IN', now() - interval '45 days')
    returning id into bid;
  end if;
  update public.businesses set description = p_desc, phone = right(p_phone, 10), whatsapp = right(p_phone, 10), service_available = true,
    verification_status = case when p_verified then 'verified' else 'none' end::public.verification_status,
    response_rate = p_rate, completed_deals = p_deals, rating_avg = p_rating, rating_count = p_rating_n
  where id = bid;
  return bid;
end $$;

create or replace function pg_temp.demo_post(p_phone text, p_type text, p_title text, p_desc text, p_basic jsonb, p_city text,
  p_amount_min numeric default null, p_amount_max numeric default null, p_days_ago int default 3, p_status text default 'active', p_tags text[] default '{}')
returns uuid language plpgsql as $$
declare bid uuid; pid uuid; created timestamptz := now() - (p_days_ago || ' days')::interval;
begin
  select b.id into bid from public.businesses b join auth.users u on u.id = b.owner_id where u.phone = p_phone and b.deleted_at is null limit 1;
  insert into public.opportunity_posts (business_id, post_type_id, title, description, basic, advanced, amount_min, amount_max, location, city, state, status, created_at, updated_at, expires_at)
  values (bid, (select id from public.post_types where slug = p_type), p_title, p_desc, p_basic || jsonb_build_object('location', pg_temp.loc(p_city)),
          '{"_demo": true}'::jsonb, p_amount_min, p_amount_max, pg_temp.city_point(p_city), p_city, pg_temp.city_state(p_city), p_status::public.post_status,
          created, created, created + interval '30 days')
  returning id into pid;
  insert into public.post_tags (post_id, tag) select pid, t from unnest(p_tags) t;
  -- views from other demo businesses so Trending has signal
  insert into public.post_views (post_id, business_id, viewed_at)
    select pid, b.id, created + (random() * least(p_days_ago, 7) || ' days')::interval
      from public.businesses b join auth.users u on u.id = b.owner_id
     where u.phone like '91999990%' and b.id <> bid order by random() limit (3 + floor(random() * 10))::int;
  return pid;
end $$;

create or replace function pg_temp.biz(p_phone text) returns uuid language sql as $$
  select b.id from public.businesses b join auth.users u on u.id = b.owner_id where u.phone = p_phone and b.deleted_at is null order by b.created_at limit 1
$$;
create or replace function pg_temp.post(p_phone text, p_type text) returns uuid language sql as $$
  select p.id from public.opportunity_posts p where p.business_id = pg_temp.biz(p_phone) and p.post_type_id = (select id from public.post_types where slug = p_type)
    and p.advanced ? '_demo' order by p.created_at desc limit 1
$$;

-- response (+ optional conversation with messages). m[i] alternates responder / owner, starting with the responder.
create or replace function pg_temp.demo_response(p_from text, p_owner text, p_type text, p_kind text, p_msgs text[] default '{}', p_last_read boolean default true)
returns void language plpgsql as $$
declare pid uuid := pg_temp.post(p_owner, p_type); a uuid; b uuid; cid uuid; i int; sender uuid; ts timestamptz;
begin
  if cardinality(p_msgs) > 0 then
    select least(pg_temp.biz(p_from), pg_temp.biz(p_owner)), greatest(pg_temp.biz(p_from), pg_temp.biz(p_owner)) into a, b;
    insert into public.conversations (business_a, business_b, post_id) values (a, b, pid) returning id into cid;
    for i in 1..cardinality(p_msgs) loop
      sender := case when i % 2 = 1 then pg_temp.biz(p_from) else pg_temp.biz(p_owner) end;
      ts := now() - ((cardinality(p_msgs) - i) * 40 || ' minutes')::interval;
      insert into public.messages (conversation_id, sender_business_id, body, created_at, read_at)
      values (cid, sender, p_msgs[i], ts, case when i = cardinality(p_msgs) and not p_last_read then null else ts + interval '5 minutes' end);
    end loop;
  end if;
  insert into public.post_responses (post_id, business_id, response_type, conversation_id, created_at)
  values (pid, pg_temp.biz(p_from), p_kind::public.response_type, cid, now() - interval '1 day');
end $$;

-- ---------- wipe previous demo rows ----------
delete from public.opportunity_posts where advanced ? '_demo';          -- cascades responses, views, tags, conversations' post_id → null
delete from public.conversations c where not exists (select 1 from public.messages m where m.conversation_id = c.id) or c.post_id is null;
delete from auth.users where phone between '919999900021' and '919999900039';  -- cascades users → businesses → everything

-- ---------- businesses ----------
select pg_temp.demo_business('919999900002', 'Gupta Garments', 'garments_fashion', 'Delhi', 'Ladies and kids wear, wholesale and retail, Gandhi Nagar market since 2009.', false, 90, 2, 4.5, 6);
select pg_temp.demo_business('919999900003', 'Sharma Sweets', 'food_restaurant', 'Noida', 'Family-run sweet shop since 1998. Bulk orders for weddings and offices.', true, 100, 4, 4.7, 12);
select pg_temp.demo_business('919999900021', 'Rajesh Agarwal Investments', 'finance_investment', 'Delhi', 'Investing my own money in small, profitable Delhi NCR businesses. Food, retail, manufacturing.', true, 85, 3, 4.8, 5);
select pg_temp.demo_business('919999900022', 'Priya Foods', 'food_restaurant', 'Noida', 'Home-style tiffin and catering for offices in Sector 62 and 63.', false, 70, 1, 4.2, 9);
select pg_temp.demo_business('919999900023', 'Khan Tailors', 'garments_fashion', 'Delhi', 'Gents and ladies tailoring, uniforms in bulk. Lajpat Nagar.', false, 95, 7, 4.6, 21);
select pg_temp.demo_business('919999900024', 'Foodie Delhi', 'marketing_media', 'Delhi', 'Food and travel creator. Reels, reviews and restaurant visits across Delhi NCR.', true, 100, 9, 4.9, 15);
select pg_temp.demo_business('919999900025', 'Verma Packaging', 'manufacturing', 'Ghaziabad', 'Corrugated boxes, food-grade containers and printed packaging. Sahibabad industrial area.', true, 80, 11, 4.4, 18);
select pg_temp.demo_business('919999900026', 'Sharma Electricals', 'freelance', 'Gurugram', 'Electrician for homes and shops. AC, wiring, inverter installation.', false, 60, 2, 4.1, 4);
select pg_temp.demo_business('919999900027', 'Mehta & Co Consulting', 'legal_accounting', 'Mumbai', 'Chartered accountants. GST, ITR, company registration for small businesses.', true, 90, 14, 4.7, 30);
select pg_temp.demo_business('919999900028', 'Green Farms Jaipur', 'agriculture', 'Jaipur', 'Organic vegetables and grains from 40 acres near Jaipur. Supplying hotels and stores.', false, 50, 1, 0, 0);
select pg_temp.demo_business('919999900029', 'TechSpark Studio', 'technology', 'Bengaluru', 'Websites, online stores and WhatsApp bots for small businesses.', false, 75, 5, 4.3, 8);
select pg_temp.demo_business('919999900030', 'Lucknow Chikan House', 'handicraft', 'Lucknow', 'Hand-embroidered chikankari kurtas and sarees. Looking to grow beyond Lucknow.', false, 65, 0, 0, 0);
select pg_temp.demo_business('919999900031', 'Sunrise Academy', 'education', 'Noida', 'Computer and spoken English classes for students and working people.', false, 80, 3, 4.5, 11);
select pg_temp.demo_business('919999900032', 'Bright Beauty Salon', 'beauty_salon', 'Gurugram', 'Ladies salon in Sector 14. Bridal packages, hair and skin.', false, 70, 2, 4.0, 7);

-- ---------- posts ----------
-- investors / money
select pg_temp.demo_post('919999900021', 'looking_to_invest', 'Looking to invest ₹25 lakh in Delhi', 'Looking to invest up to ₹25 lakh in Food & Restaurant, Retail Shop, Manufacturing businesses in Delhi. Equity or profit share, growing businesses preferred.',
  '{"amount": 2500000, "industries": ["food_restaurant", "retail_shop", "manufacturing"]}', 'Delhi', null, 2500000, 2, 'active', '{investor,investment,funding,delhi}');
select pg_temp.demo_post('919999900022', 'need_money', 'Need ₹5 lakh to Expand shop in Noida', 'Looking for ₹5 lakh to expand shop in Noida. Adding a second kitchen to double tiffin capacity for Sector 62 offices.',
  '{"amount": 500000, "purpose": "expand_shop"}', 'Noida', 500000, null, 1, 'active', '{investment,tiffin,catering,noida}');
select pg_temp.demo_post('919999900002', 'need_money', 'Need ₹3 lakh to Buy stock in Delhi', 'Looking for ₹3 lakh to buy stock in Delhi. Winter collection for the wedding season, repayable in 6 months.',
  '{"amount": 300000, "purpose": "new_stock"}', 'Delhi', 300000, null, 4, 'active', '{loan,garments,stock}');
select pg_temp.demo_post('919999900030', 'partner_business', 'Need an investing partner in Lucknow', 'Looking for an investing partner for a growing chikankari business in Lucknow, investment around ₹10 lakh. Profit share, I run the operations.',
  '{"role": "investing", "stage": "growth", "investment": 1000000}', 'Lucknow', 1000000, null, 6, 'active', '{partner,handicraft,chikan,lucknow}');
select pg_temp.demo_post('919999900003', 'need_money', 'Need ₹10 lakh to Buy machine in Noida', 'Looking for ₹10 lakh to buy an automatic sweet-making machine in Noida.',
  '{"amount": 1000000, "purpose": "machinery"}', 'Noida', 1000000, null, 40, 'expired', '{machine,sweets}');
-- staff
select pg_temp.demo_post('919999900003', 'need_employee', 'Need Cook in Noida', 'Hiring a cook in Noida, salary ₹18,000 per month. Experience with Indian sweets and namkeen, 6-day week.',
  '{"role": "cook", "salary": 18000}', 'Noida', 18000, null, 1, 'active', '{cook,halwai,job,noida}');
select pg_temp.demo_post('919999900023', 'need_employee', 'Need Tailor in Delhi', 'Hiring a tailor in Delhi, salary ₹15,000 per month. Ladies suits and blouses, Lajpat Nagar shop.',
  '{"role": "tailor", "salary": 15000}', 'Delhi', 15000, null, 2, 'active', '{tailor,job,delhi}');
select pg_temp.demo_post('919999900032', 'need_employee', 'Need Helper in Gurugram', 'Hiring a helper in Gurugram, salary ₹12,000 per month. Salon assistant, training provided.',
  '{"role": "helper", "salary": 12000}', 'Gurugram', 12000, null, 5, 'active', '{helper,salon,job}');
select pg_temp.demo_post('919999900022', 'need_employee', 'Need Delivery in Noida', 'Hiring delivery staff in Noida, salary ₹14,000 per month. Morning tiffin route, own two-wheeler.',
  '{"role": "delivery", "salary": 14000}', 'Noida', 14000, null, 9, 'active', '{delivery,job}');
-- influencers and marketing
select pg_temp.demo_post('919999900022', 'need_influencer', 'Need Food influencer in Noida', 'Looking for a Food influencer on Instagram in Noida, budget ₹10,000. One reel and a story about our new tiffin menu.',
  '{"platform": ["instagram"], "niche": "food", "budget": 10000}', 'Noida', null, 10000, 2, 'active', '{influencer,instagram,food,reel}');
select pg_temp.demo_post('919999900024', 'offer_influencer', 'Food influencer on Instagram available in Delhi', 'Food influencer on Instagram with 20K–100K followers, audience in Delhi. Open to Paid promotion, Barter / free product, from ₹5,000 per post.',
  '{"platform": "instagram", "niche": "food", "followers": "f100k"}', 'Delhi', 5000, null, 3, 'active', '{influencer,food,instagram,creator}');
select pg_temp.demo_post('919999900030', 'need_marketing', 'Need Social media marketing in Lucknow', 'Looking for social media marketing help in Lucknow, monthly budget ₹15,000. Instagram page for chikankari kurtas.',
  '{"service": "social_media", "monthly_budget": 15000}', 'Lucknow', null, 15000, 7, 'active', '{marketing,instagram,social}');
select pg_temp.demo_post('919999900032', 'offer_collaboration', 'Cross promotion with a boutique in Gurugram', 'Open to cross promotion in Gurugram. Bridal clients get a discount at a partner boutique and vice versa.',
  '{"collab_type": "cross_promotion", "looking_for": "garments_fashion"}', 'Gurugram', null, null, 8, 'active', '{collaboration,bridal,boutique}');
-- services offered
select pg_temp.demo_post('919999900023', 'offer_service', 'Tailoring service in Delhi', 'Offering tailoring services in Delhi with 10+ years experience, starting at ₹500. Ladies suits, blouses, bulk uniforms, home pickup.',
  '{"service": "tailoring", "experience": "e10p", "price": 500}', 'Delhi', 500, null, 1, 'active', '{tailor,stitching,uniforms,delhi}');
select pg_temp.demo_post('919999900026', 'offer_service', 'Repair & maintenance service in Gurugram', 'Offering repair & maintenance services in Gurugram with 1–3 years experience, starting at ₹300. AC, wiring, inverter, same-day visit.',
  '{"service": "repair", "experience": "e3", "price": 300}', 'Gurugram', 300, null, 2, 'active', '{electrician,repair,ac,gurugram}');
select pg_temp.demo_post('919999900027', 'offer_service', 'Accounts / legal service in Mumbai', 'Offering accounts / legal services in Mumbai with 10+ years experience, starting at ₹2,500. GST filing, ITR, company registration, online across India.',
  '{"service": "accounts", "experience": "e10p", "price": 2500}', 'Mumbai', 2500, null, 4, 'active', '{ca,gst,itr,accounts,registration}');
select pg_temp.demo_post('919999900029', 'offer_service', 'Digital marketing / IT service in Bengaluru', 'Offering digital marketing / IT services in Bengaluru with 1–3 years experience, starting at ₹10,000. Websites, online stores and WhatsApp bots.',
  '{"service": "digital", "experience": "e3", "price": 10000}', 'Bengaluru', 10000, null, 5, 'active', '{website,app,whatsapp,ecommerce}');
select pg_temp.demo_post('919999900032', 'offer_service', 'Beauty / salon service in Gurugram', 'Offering beauty / salon services in Gurugram with 1–3 years experience, starting at ₹1,000. Bridal makeup and mehendi at home.',
  '{"service": "beauty", "experience": "e3", "price": 1000}', 'Gurugram', 1000, null, 6, 'active', '{bridal,makeup,mehendi,salon}');
select pg_temp.demo_post('919999900022', 'offer_service', 'Cooking / catering service in Noida', 'Offering cooking / catering services in Noida with 3–10 years experience, starting at ₹200. Office tiffin, parties up to 200 people.',
  '{"service": "cooking", "experience": "e10", "price": 200}', 'Noida', 200, null, 10, 'active', '{catering,tiffin,party,noida}');
-- products, suppliers, manufacturing, distribution
select pg_temp.demo_post('919999900025', 'sell_product', 'Selling Packaging in Ghaziabad', 'Selling packaging in Ghaziabad, minimum order 100 units, price ₹2,000. Food-grade boxes and printed cartons, delivery in NCR.',
  '{"product": "packaging", "min_order": "m100", "price": 2000}', 'Ghaziabad', 2000, null, 2, 'active', '{packaging,boxes,cartons,wholesale}');
select pg_temp.demo_post('919999900022', 'need_supplier', 'Need Packaging supplier in Noida', 'Looking for a packaging supplier in Noida, monthly purchase ₹50,000. Leak-proof tiffin containers and paper bags.',
  '{"product": "packaging", "monthly_budget": 50000}', 'Noida', null, 50000, 3, 'active', '{supplier,packaging,containers}');
select pg_temp.demo_post('919999900025', 'need_distributor', 'Need Packaging distributor in Ghaziabad', 'Looking for a distributor for packaging across the state. Stock on credit for established traders.',
  '{"product": "packaging", "area": "state"}', 'Ghaziabad', null, null, 12, 'active', '{distributor,packaging,up}');
select pg_temp.demo_post('919999900025', 'need_machine', 'Need Packaging machine in Ghaziabad', 'Looking for a used packaging machine in Ghaziabad, budget ₹5 lakh. Carton folding and gluing.',
  '{"machine": "packaging", "condition": "used", "budget": 500000}', 'Ghaziabad', null, 500000, 14, 'active', '{machine,packaging,used}');
select pg_temp.demo_post('919999900030', 'need_manufacturer', 'Need Garments manufacturer in Lucknow', 'Looking for someone to make 100+ garments in Lucknow. Plain kurtas for chikankari embroidery, cotton and georgette.',
  '{"product": "garments", "quantity": "q100"}', 'Lucknow', null, null, 4, 'active', '{manufacturer,kurta,garments}');
select pg_temp.demo_post('919999900002', 'sell_product', 'Selling Garments in Delhi', 'Selling garments in Delhi, minimum order 10 pieces, price ₹350. Ladies kurtis and kids wear, wholesale rates.',
  '{"product": "garments", "min_order": "m10", "price": 350}', 'Delhi', 350, null, 2, 'active', '{kurti,wholesale,garments,delhi}');
select pg_temp.demo_post('919999900028', 'sell_product', 'Selling Agri produce in Jaipur', 'Selling organic vegetables and grains in Jaipur, minimum order 100 kg, price ₹50 per kg. Weekly supply to hotels and stores.',
  '{"product": "agri", "min_order": "m100", "price": 50}', 'Jaipur', 50, null, 3, 'active', '{organic,vegetables,farm,jaipur}');
select pg_temp.demo_post('919999900003', 'need_customer', 'Need Wholesale customers in Noida', 'Looking for wholesale customers in Noida for sweets and namkeen, marketing budget ₹10,000.',
  '{"customer_type": "wholesale", "offer_type": "products", "monthly_budget": 10000}', 'Noida', null, 10000, 20, 'completed', '{wholesale,sweets}');
select pg_temp.demo_post('919999900026', 'need_customer', 'Need Retail customers in Gurugram', 'Looking for retail customers in Gurugram for electrical services, budget ₹5,000.',
  '{"customer_type": "retail", "offer_type": "services", "monthly_budget": 5000}', 'Gurugram', null, 5000, 11, 'active', '{customers,electrician}');
-- space, logistics
select pg_temp.demo_post('919999900003', 'offer_space', 'Kitchen available in Noida', 'Small commercial kitchen available in Noida, rent ₹15,000 per month. Evening slot, Sector 18.',
  '{"kind": "kitchen", "size": "small", "rent": 15000}', 'Noida', 15000, null, 15, 'paused', '{kitchen,space,rent}');
select pg_temp.demo_post('919999900031', 'need_shop', 'Need Office in Noida', 'Looking for a medium office in Noida, rent up to ₹25,000. Two classrooms, ground floor, Sector 15 or nearby.',
  '{"kind": "office", "size": "medium", "rent": 25000}', 'Noida', null, 25000, 5, 'active', '{office,rent,classroom}');
select pg_temp.demo_post('919999900028', 'need_warehouse', 'Need Cold storage in Jaipur', 'Looking for 2,000 sq ft of cold storage near Jaipur, rent up to ₹30,000 per month.',
  '{"size": "s2000", "purpose": "cold", "rent": 30000}', 'Jaipur', null, 30000, 2, 'active', '{cold storage,warehouse,jaipur}');
select pg_temp.demo_post('919999900028', 'need_delivery', 'Need Intercity delivery partner in Jaipur', 'Looking for an intercity delivery partner in Jaipur, weekly. Jaipur to Delhi, 1 ton refrigerated.',
  '{"kind": "intercity", "frequency": "weekly"}', 'Jaipur', null, null, 6, 'active', '{delivery,transport,intercity}');
-- technology, freelancers, professionals, mentoring, training
select pg_temp.demo_post('919999900031', 'need_technology', 'Need Website in Noida', 'Looking for a website in Noida, budget ₹30,000, this month. Course list, fee payment and WhatsApp enquiry.',
  '{"what": "website", "budget": 30000, "timeline": "this_month"}', 'Noida', null, 30000, 1, 'active', '{website,technology}');
select pg_temp.demo_post('919999900029', 'need_freelancer', 'Need Design freelancer in Bengaluru', 'Looking for a design freelancer in Bengaluru for a project, budget ₹20,000. Logo and social media kit for a client.',
  '{"skill": "design", "duration": "project", "budget": 20000}', 'Bengaluru', null, 20000, 4, 'active', '{design,freelancer,logo}');
select pg_temp.demo_post('919999900002', 'need_mentor', 'Need Export guidance in Delhi', 'Looking for guidance on export for a growing garments business in Delhi, online or in person.',
  '{"topic": "export", "stage": "growth", "mode": "either"}', 'Delhi', null, null, 7, 'active', '{mentor,export,garments}');
select pg_temp.demo_post('919999900027', 'teach_skill', 'Offering Accounts training in Mumbai', 'Offering accounts training online, fee ₹3,000. GST and bookkeeping basics for shop owners, 4 sessions.',
  '{"skill": "accounts", "mode": "online", "fee": 3000}', 'Mumbai', 3000, null, 9, 'active', '{training,gst,accounts}');
select pg_temp.demo_post('919999900031', 'teach_skill', 'Offering Computer training in Noida', 'Offering computer training in person in Noida, fee ₹5,000. Tally, Excel and basic computer for shop staff.',
  '{"skill": "computer", "mode": "in_person", "fee": 5000}', 'Noida', 5000, null, 3, 'active', '{training,computer,tally}');
select pg_temp.demo_post('919999900022', 'need_accountant', 'Need GST help in Noida', 'Looking for monthly GST filing help in Noida for a catering business.',
  '{"help": "gst", "frequency": "monthly"}', 'Noida', null, null, 13, 'active', '{gst,accountant}');
-- announcements, buying, learning
select pg_temp.demo_post('919999900022', 'announce_news', 'New opening in Noida', 'Priya Foods opens a second kitchen in Sector 63 this week. 20% off on the first office tiffin order.',
  '{"kind": "opening", "when": "this_week"}', 'Noida', null, null, 1, 'active', '{opening,offer,tiffin}');
select pg_temp.demo_post('919999900024', 'buy_product', 'Buying Food products in Delhi', 'Buying food products in Delhi, sample quantity, budget ₹5,000. Looking for new snack brands to feature in reels.',
  '{"product": "food", "quantity": "sample", "budget": 5000}', 'Delhi', null, 5000, 6, 'active', '{snacks,brands,review}');
select pg_temp.demo_post('919999900032', 'learn_skill', 'Want to learn Digital marketing in Gurugram', 'Want to learn digital marketing online, budget ₹5,000. Instagram ads for a salon.',
  '{"skill": "digital_marketing", "mode": "online", "budget": 5000}', 'Gurugram', null, 5000, 8, 'active', '{learn,instagram,ads}');

-- ---------- responses, chats ----------
select pg_temp.demo_response('919999900021', '919999900022', 'need_money', 'lets_talk',
  array['Hi Priya, I read your post. What is the monthly revenue from the Sector 62 tiffins?', 'Hello Rajesh ji. Around ₹2.4 lakh a month, 180 daily tiffins. The second kitchen doubles it.', 'Good numbers. Can we meet at your kitchen on Saturday 11am?'], false);
select pg_temp.demo_response('919999900024', '919999900022', 'need_influencer', 'lets_talk',
  array['Hi! I do food reels in Noida every week. ₹8,000 for one reel + story, I can visit next Tuesday.', 'That works. Please share two of your recent restaurant reels.'], true);
select pg_temp.demo_response('919999900025', '919999900022', 'need_supplier', 'lets_talk',
  array['We make leak-proof 750 ml containers, ₹6.5 each for 5,000 pcs with your logo. Sample box can reach Noida tomorrow.'], false);
select pg_temp.demo_response('919999900021', '919999900002', 'need_money', 'interested');
select pg_temp.demo_response('919999900023', '919999900002', 'sell_product', 'lets_talk',
  array['Do you have cotton kurtis in sizes M to XXL? I need 60 pieces for a uniform order.', 'Yes, three prints in all sizes. ₹320 each for 60 pieces, ready stock.', 'Please send photos of the three prints on WhatsApp, I will confirm by evening.'], false);
select pg_temp.demo_response('919999900024', '919999900003', 'need_employee', 'lets_talk',
  array['Sharma ji, my cousin is a halwai with 8 years in Agra. He is moving to Noida next month. Can he visit?'], false);
select pg_temp.demo_response('919999900031', '919999900003', 'need_employee', 'interested');
select pg_temp.demo_response('919999900022', '919999900025', 'sell_product', 'interested');
select pg_temp.demo_response('919999900030', '919999900021', 'looking_to_invest', 'lets_talk',
  array['Namaste. Lucknow Chikan House, 3 years old, ₹6 lakh yearly profit. Looking for ₹10 lakh for an online store and stock.', 'Thanks for the details. Share last year''s sales and I will revert this week.'], true);
select pg_temp.demo_response('919999900002', '919999900023', 'offer_service', 'interested');
select pg_temp.demo_response('919999900026', '919999900031', 'need_shop', 'interested');
select pg_temp.demo_response('919999900029', '919999900031', 'need_technology', 'lets_talk',
  array['We built sites for 12 coaching centres. ₹28,000 with fee payment and WhatsApp enquiry, 2 weeks. Portfolio: techspark.in/edu'], true);

-- ---------- follows, saves ----------
insert into public.follows (follower_business_id, followed_business_id) values
  (pg_temp.biz('919999900002'), pg_temp.biz('919999900021')), (pg_temp.biz('919999900002'), pg_temp.biz('919999900025')), (pg_temp.biz('919999900002'), pg_temp.biz('919999900023')),
  (pg_temp.biz('919999900003'), pg_temp.biz('919999900024')), (pg_temp.biz('919999900003'), pg_temp.biz('919999900022')), (pg_temp.biz('919999900003'), pg_temp.biz('919999900021')),
  (pg_temp.biz('919999900022'), pg_temp.biz('919999900025')), (pg_temp.biz('919999900030'), pg_temp.biz('919999900021'))
on conflict do nothing;
insert into public.saved_posts (business_id, post_id) values
  (pg_temp.biz('919999900002'), pg_temp.post('919999900021', 'looking_to_invest')), (pg_temp.biz('919999900002'), pg_temp.post('919999900025', 'sell_product')),
  (pg_temp.biz('919999900003'), pg_temp.post('919999900024', 'offer_influencer')), (pg_temp.biz('919999900003'), pg_temp.post('919999900025', 'sell_product')),
  (pg_temp.biz('919999900003'), pg_temp.post('919999900022', 'offer_service'))
on conflict do nothing;

commit;

select (select count(*) from public.businesses b join auth.users u on u.id = b.owner_id where u.phone like '91999990%') as demo_businesses,
       (select count(*) from public.opportunity_posts where advanced ? '_demo') as demo_posts,
       (select count(distinct post_type_id) from public.opportunity_posts where advanced ? '_demo') as post_types_covered,
       (select count(*) from public.post_responses r join public.opportunity_posts p on p.id = r.post_id where p.advanced ? '_demo') as responses,
       (select count(*) from public.conversations c join public.opportunity_posts p on p.id = c.post_id where p.advanced ? '_demo') as conversations,
       (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id join public.opportunity_posts p on p.id = c.post_id where p.advanced ? '_demo') as messages;
