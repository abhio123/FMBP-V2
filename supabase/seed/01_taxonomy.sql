-- Categories (top level)
insert into public.categories (slug, name_en, name_hi, icon, sort) values
 ('food_restaurant','Food & Restaurant','खाना और रेस्टोरेंट','🍽️',1),
 ('retail_shop','Retail Shop','रिटेल दुकान','🏪',2),
 ('manufacturing','Manufacturing','निर्माण','🏭',3),
 ('garments_fashion','Garments & Fashion','कपड़े और फैशन','👗',4),
 ('agriculture','Agriculture & Farming','कृषि','🌾',5),
 ('education','Education & Training','शिक्षा','📚',6),
 ('health_wellness','Health & Wellness','स्वास्थ्य','🩺',7),
 ('beauty_salon','Beauty & Salon','ब्यूटी और सैलून','💇',8),
 ('technology','Technology & IT','टेक्नोलॉजी','💻',9),
 ('marketing_media','Marketing & Media','मार्केटिंग','📣',10),
 ('finance_investment','Finance & Investment','वित्त और निवेश','💰',11),
 ('legal_accounting','Legal & Accounting','कानूनी और अकाउंटिंग','⚖️',12),
 ('real_estate','Property & Real Estate','प्रॉपर्टी','🏢',13),
 ('logistics','Logistics & Transport','लॉजिस्टिक्स','🚚',14),
 ('construction','Construction & Interiors','निर्माण कार्य','🏗️',15),
 ('handicraft','Handicraft & Home Business','हस्तशिल्प और घरेलू व्यवसाय','🧵',16),
 ('events','Events & Photography','इवेंट और फोटोग्राफी','📸',17),
 ('automobile','Automobile','ऑटोमोबाइल','🚗',18),
 ('freelance','Freelance & Professional Services','फ्रीलांस सेवाएं','🧑‍💻',19),
 ('other','Other','अन्य','📦',99)
on conflict (slug) do update set name_en = excluded.name_en, name_hi = excluded.name_hi, icon = excluded.icon, sort = excluded.sort;

-- Intentions
insert into public.intentions (slug, name_en, name_hi, icon, sort) values
 ('need','Need Something','कुछ चाहिए','🙋',1),
 ('offer','Offer Something','कुछ देना है','🤝',2),
 ('sell','Sell Something','कुछ बेचना है','🏷️',3),
 ('buy','Buy Something','कुछ खरीदना है','🛒',4),
 ('partner','Partner With Someone','पार्टनर चाहिए','👥',5),
 ('invest','Invest','निवेश करना है','📈',6),
 ('raise','Raise Money','पैसा जुटाना है','💸',7),
 ('announce','Announce Something','कुछ बताना है','📢',8),
 ('learn','Learn Something','कुछ सीखना है','🎓',9),
 ('teach','Teach Something','कुछ सिखाना है','🧑‍🏫',10)
on conflict (slug) do update set name_en = excluded.name_en, name_hi = excluded.name_hi, icon = excluded.icon, sort = excluded.sort;

-- Post types (plain labels for basic users)
with i as (select slug, id from public.intentions)
insert into public.post_types (intention_id, slug, name_en, name_hi, plain_label_en, plain_label_hi, advanced_label_en, icon, sort) values
 ((select id from i where slug='need'),'need_money','Need Investment','निवेश चाहिए','Need Money?','पैसा चाहिए?','Investment / Loan / Funding','💰',1),
 ((select id from i where slug='need'),'need_employee','Need Employee','कर्मचारी चाहिए','Need Staff?','स्टाफ चाहिए?','Hiring','👷',2),
 ((select id from i where slug='need'),'need_customer','Need Customers','ग्राहक चाहिए','Need Customers?','ग्राहक चाहिए?','Lead Generation','🛍️',3),
 ((select id from i where slug='need'),'need_supplier','Need Supplier','सप्लायर चाहिए','Need Supplier?','सप्लायर चाहिए?','Procurement','📦',4),
 ((select id from i where slug='need'),'need_manufacturer','Need Manufacturer','निर्माता चाहिए','Need Someone to Make Products?','प्रोडक्ट बनवाना है?','OEM / ODM / Contract Manufacturing','🏭',5),
 ((select id from i where slug='need'),'need_distributor','Need Distributor','डिस्ट्रीब्यूटर चाहिए','Need Distributor?','डिस्ट्रीब्यूटर चाहिए?','Distribution Channel','🚚',6),
 ((select id from i where slug='need'),'need_influencer','Need Influencer','इन्फ्लुएंसर चाहिए','Need Influencer?','इन्फ्लुएंसर चाहिए?','Influencer Marketing','📱',7),
 ((select id from i where slug='need'),'need_mentor','Need Mentor','मेंटर चाहिए','Need Guidance?','मार्गदर्शन चाहिए?','Mentorship / Advisory','🧭',8),
 ((select id from i where slug='need'),'need_marketing','Need Marketing','मार्केटिंग चाहिए','Need Marketing Help?','मार्केटिंग चाहिए?','Marketing Agency','📣',9),
 ((select id from i where slug='need'),'need_technology','Need Website / App','वेबसाइट / ऐप चाहिए','Need Website or App?','वेबसाइट या ऐप चाहिए?','Technology Partner','💻',10),
 ((select id from i where slug='need'),'need_shop','Need Shop / Office','दुकान / ऑफिस चाहिए','Need Space?','जगह चाहिए?','Commercial Property','🏬',11),
 ((select id from i where slug='need'),'need_warehouse','Need Warehouse','गोदाम चाहिए','Need Storage?','स्टोरेज चाहिए?','Warehousing','🏚️',12),
 ((select id from i where slug='need'),'need_machine','Need Machine','मशीन चाहिए','Need Machine?','मशीन चाहिए?','Equipment','⚙️',13),
 ((select id from i where slug='need'),'need_accountant','Need Accountant','अकाउंटेंट चाहिए','Need Accounts / GST Help?','अकाउंट / GST मदद चाहिए?','CA / Accounting','🧾',14),
 ((select id from i where slug='need'),'need_lawyer','Need Lawyer','वकील चाहिए','Need Legal Help?','कानूनी मदद चाहिए?','Legal Services','⚖️',15),
 ((select id from i where slug='need'),'need_freelancer','Need Freelancer','फ्रीलांसर चाहिए','Need Freelancer?','फ्रीलांसर चाहिए?','Freelance Work','🧑‍💻',16),
 ((select id from i where slug='need'),'need_delivery','Need Delivery Partner','डिलीवरी पार्टनर चाहिए','Need Delivery?','डिलीवरी चाहिए?','Logistics','🛵',17),
 ((select id from i where slug='need'),'need_training','Need Training','ट्रेनिंग चाहिए','Need Training?','ट्रेनिंग चाहिए?','Skill Training','🎓',18),
 ((select id from i where slug='need'),'need_franchise','Need Franchise','फ्रैंचाइज़ चाहिए','Want to Take a Franchise?','फ्रैंचाइज़ लेनी है?','Franchise','🏷️',19),
 ((select id from i where slug='need'),'need_other','Need Something Else','कुछ और चाहिए','Need Something Else?','कुछ और चाहिए?','Other','❓',99),
 ((select id from i where slug='invest'),'looking_to_invest','Looking to Invest','निवेश करना है','Have Money to Invest?','निवेश के लिए पैसा है?','Angel / Loan / Partnership','📈',1),
 ((select id from i where slug='offer'),'offer_service','Offering a Service','सेवा दे रहे हैं','Offering a Service?','सेवा देनी है?','Service Provider','🛠️',1),
 ((select id from i where slug='offer'),'offer_collaboration','Looking for Collaboration','सहयोग चाहिए','Want to Collaborate?','साथ काम करना है?','Brand / Business Collaboration','🤝',2),
 ((select id from i where slug='offer'),'offer_space','Space Available','जगह उपलब्ध','Have Empty Space?','खाली जगह है?','Warehouse / Shop / Office','🏢',3),
 ((select id from i where slug='offer'),'offer_franchise','Offering Franchise','फ्रैंचाइज़ दे रहे हैं','Want to Give Franchise?','फ्रैंचाइज़ देनी है?','Franchise Opportunity','🏷️',4),
 ((select id from i where slug='sell'),'sell_product','Selling Products','प्रोडक्ट बेचना है','Selling Products?','प्रोडक्ट बेचना है?','Wholesale / B2B','🏷️',1),
 ((select id from i where slug='sell'),'sell_machine','Selling Machine','मशीन बेचनी है','Selling a Machine?','मशीन बेचनी है?','Used Equipment','⚙️',2),
 ((select id from i where slug='buy'),'buy_product','Buying Products','प्रोडक्ट खरीदना है','Buying in Bulk?','थोक में खरीदना है?','Bulk Purchase','🛒',1),
 ((select id from i where slug='partner'),'partner_business','Need Business Partner','बिज़नेस पार्टनर चाहिए','Need a Business Partner?','बिज़नेस पार्टनर चाहिए?','Co-founder / Partner','👥',1),
 ((select id from i where slug='raise'),'raise_money','Raise Money','पैसा जुटाना है','Need Money for Business?','बिज़नेस के लिए पैसा चाहिए?','Fundraising','💸',1),
 ((select id from i where slug='announce'),'announce_news','Announcement','घोषणा','Share Business News?','बिज़नेस की खबर बतानी है?','Announcement','📢',1),
 ((select id from i where slug='learn'),'learn_skill','Want to Learn','सीखना है','Want to Learn a Skill?','कोई हुनर सीखना है?','Learning','🎓',1),
 ((select id from i where slug='teach'),'teach_skill','Offering Training','ट्रेनिंग दे रहे हैं','Can You Teach?','क्या आप सिखा सकते हैं?','Training Provider','🧑‍🏫',1)
on conflict (slug) do update set intention_id = excluded.intention_id, name_en = excluded.name_en, name_hi = excluded.name_hi,
  plain_label_en = excluded.plain_label_en, plain_label_hi = excluded.plain_label_hi, advanced_label_en = excluded.advanced_label_en, icon = excluded.icon, sort = excluded.sort;

-- Offering types
insert into public.offering_types (slug, name_en, name_hi, icon, sort) values
 ('investment','Investment','निवेश','💰',1),
 ('mentorship','Mentorship','मेंटरशिप','🧭',2),
 ('influencer','Influencer','इन्फ्लुएंसर','📱',3),
 ('manufacturing','Manufacturing','निर्माण','🏭',4),
 ('supplier','Supplier','सप्लायर','📦',5),
 ('distributor','Distributor','डिस्ट्रीब्यूटर','🚚',6),
 ('marketing','Marketing','मार्केटिंग','📣',7),
 ('technology','Technology','टेक्नोलॉजी','💻',8),
 ('training','Training','ट्रेनिंग','🎓',9),
 ('legal','Legal','कानूनी','⚖️',10),
 ('accounting','Accounting','अकाउंटिंग','🧾',11),
 ('freelancer','Freelancer','फ्रीलांसर','🧑‍💻',12),
 ('agency','Agency','एजेंसी','🏢',13),
 ('property','Property','प्रॉपर्टी','🏬',14),
 ('equipment','Equipment','उपकरण','⚙️',15),
 ('products','Products','प्रोडक्ट','🏷️',16),
 ('import','Import','आयात','🛳️',17),
 ('export','Export','निर्यात','✈️',18),
 ('consultancy','Consultancy','कंसल्टेंसी','💼',19),
 ('professional_service','Professional Service','पेशेवर सेवा','🧑‍⚕️',20),
 ('other','Other','अन्य','📦',99)
on conflict (slug) do update set name_en = excluded.name_en, name_hi = excluded.name_hi, icon = excluded.icon, sort = excluded.sort;
