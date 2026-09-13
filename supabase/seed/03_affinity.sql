-- Category → post-type affinity for rule-based recommendations (v1). 0–1 weights.
insert into public.category_affinity (source_category_slug, target_post_type_slug, weight) values
 ('food_restaurant','need_influencer',0.9),('food_restaurant','offer_service',0.6),('food_restaurant','looking_to_invest',0.7),('food_restaurant','need_supplier',0.5),('food_restaurant','offer_collaboration',0.8),('food_restaurant','need_delivery',0.7),
 ('retail_shop','need_supplier',0.8),('retail_shop','sell_product',0.7),('retail_shop','looking_to_invest',0.6),('retail_shop','offer_space',0.4),('retail_shop','need_influencer',0.5),
 ('manufacturing','need_distributor',0.9),('manufacturing','buy_product',0.8),('manufacturing','looking_to_invest',0.7),('manufacturing','need_employee',0.5),('manufacturing','offer_space',0.4),
 ('garments_fashion','need_influencer',0.8),('garments_fashion','need_manufacturer',0.7),('garments_fashion','need_employee',0.6),('garments_fashion','buy_product',0.6),
 ('agriculture','offer_space',0.8),('agriculture','buy_product',0.8),('agriculture','need_distributor',0.7),('agriculture','looking_to_invest',0.5),
 ('education','need_customer',0.7),('education','learn_skill',0.9),('education','offer_collaboration',0.5),
 ('technology','need_technology',0.9),('technology','need_customer',0.6),('technology','partner_business',0.6),
 ('marketing_media','need_marketing',0.9),('marketing_media','need_influencer',0.7),('marketing_media','need_customer',0.5),
 ('finance_investment','need_money',0.9),('finance_investment','raise_money',0.9),('finance_investment','partner_business',0.6),
 ('legal_accounting','need_accountant',0.9),('legal_accounting','need_lawyer',0.9),
 ('real_estate','need_shop',0.9),('real_estate','need_warehouse',0.9),('real_estate','offer_space',0.6),
 ('logistics','need_delivery',0.9),('logistics','need_warehouse',0.6),('logistics','need_distributor',0.6),
 ('freelance','need_freelancer',0.9),('freelance','need_technology',0.6),('freelance','need_marketing',0.6)
on conflict (source_category_slug, target_post_type_slug) do update set weight = excluded.weight;
