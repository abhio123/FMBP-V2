-- Post types an individual (a person, not a business) can create: their own work, skills, buying / selling a few
-- things, a vehicle, a partner... (migration 20261105000015). Kept here as well because on a brand-new database the
-- seeds create post_types AFTER the migrations ran. Idempotent: run as often as you like (pnpm db:seed).
update public.post_types set for_individuals = (slug in (
  'offer_work', 'offer_service', 'offer_delivery', 'offer_vehicle', 'offer_sales_agent', 'offer_professional', 'offer_influencer',
  'offer_marketing', 'offer_mentoring', 'offer_money', 'offer_other', 'teach_skill', 'learn_skill', 'need_training', 'need_mentor',
  'need_skilled_person', 'need_vehicle', 'need_shop', 'buy_product', 'sell_product', 'partner_business', 'need_other'));
