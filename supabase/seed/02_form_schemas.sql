-- Form schemas: forms are data. Basic ≤ 4 tap fields; advanced optional.
insert into public.form_schemas (target, type_slug, version, fields, title_template, description_template, title_template_hi, description_template_hi) values
-- Generic fallbacks: used by the app and ai-generate for any type without a dedicated schema.
-- `{{type}}` is filled with the post/offering type name at render time.
('post','_generic',1,$$[
 {"key":"timeline","type":"chips","label_en":"When do you need it?","label_hi":"कब चाहिए?","section":"basic","required":true,"options":[
   {"value":"this_week","label_en":"This week","label_hi":"इसी हफ्ते"},{"value":"this_month","label_en":"This month","label_hi":"इस महीने"},{"value":"flexible","label_en":"Flexible","label_hi":"कभी भी"}]},
 {"key":"budget","type":"amount","label_en":"Budget (if any)","label_hi":"बजट (यदि हो)","section":"basic","presets":[5000,25000,100000,500000,1000000,2500000],"promote_to":"amount_max"},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"details","type":"text_long","label_en":"Any details","label_hi":"कोई विवरण","section":"advanced"},
 {"key":"photos","type":"image","label_en":"Photos","label_hi":"फोटो","section":"advanced"}
]$$,'{{type}} in {{city}}','{{type}} in {{city}}. Needed: {{timeline}}. Budget: {{budget}}.','{{city}} में {{type}}','{{city}} में {{type}}। समय: {{timeline}}। बजट: {{budget}}।'),

('offering','_generic',1,$$[
 {"key":"availability","type":"chips","label_en":"Available","label_hi":"उपलब्ध","section":"basic","required":true,"options":[
   {"value":"now","label_en":"Right now","label_hi":"अभी"},{"value":"this_month","label_en":"This month","label_hi":"इस महीने"},{"value":"on_request","label_en":"On request","label_hi":"मांग पर"}]},
 {"key":"price","type":"amount","label_en":"Starting price (if any)","label_hi":"शुरुआती कीमत (यदि हो)","section":"basic","presets":[500,2000,5000,25000,100000]},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true},
 {"key":"details","type":"text_long","label_en":"Any details","label_hi":"कोई विवरण","section":"advanced"},
 {"key":"photos","type":"image","label_en":"Photos","label_hi":"फोटो","section":"advanced"}
]$$,'{{type}} available in {{city}}','{{type}} available in {{city}}. Starting price: {{price}}. Available: {{availability}}.','{{city}} में {{type}} उपलब्ध','{{city}} में {{type}} उपलब्ध। शुरुआती कीमत: {{price}}। उपलब्धता: {{availability}}।'),
('post','need_money',1,$$[
 {"key":"amount","type":"amount","label_en":"How much money do you need?","label_hi":"कितना पैसा चाहिए?","section":"basic","required":true,"presets":[100000,300000,500000,1000000,2500000,5000000],"promote_to":"amount_min"},
 {"key":"purpose","type":"chips","label_en":"For what?","label_hi":"किस लिए?","section":"basic","required":true,"options":[
   {"value":"expand_shop","label_en":"Expand shop","label_hi":"दुकान बढ़ाना"},{"value":"new_stock","label_en":"Buy stock","label_hi":"माल खरीदना"},
   {"value":"machinery","label_en":"Buy machine","label_hi":"मशीन खरीदना"},{"value":"marketing","label_en":"Marketing","label_hi":"मार्केटिंग"},
   {"value":"working_capital","label_en":"Daily expenses","label_hi":"रोज़ का खर्च"},{"value":"new_business","label_en":"Start new business","label_hi":"नया बिज़नेस"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"funding_type","type":"chips","label_en":"Type of funding","label_hi":"फंडिंग का प्रकार","section":"advanced","options":[
   {"value":"loan","label_en":"Loan","label_hi":"लोन"},{"value":"angel","label_en":"Angel investor","label_hi":"एंजल निवेशक"},{"value":"partner","label_en":"Partner (equity)","label_hi":"पार्टनर (हिस्सेदारी)"},{"value":"government_scheme","label_en":"Government scheme","label_hi":"सरकारी योजना"}]},
 {"key":"business_stage","type":"chips","label_en":"Business stage","label_hi":"बिज़नेस का चरण","section":"advanced","options":[
   {"value":"idea","label_en":"Idea","label_hi":"आइडिया"},{"value":"early","label_en":"Just started","label_hi":"अभी शुरू"},{"value":"growth","label_en":"Growing","label_hi":"बढ़ रहा"},{"value":"established","label_en":"Established","label_hi":"स्थापित"}]},
 {"key":"monthly_revenue","type":"amount","label_en":"Monthly revenue","label_hi":"मासिक आय","section":"advanced","presets":[50000,100000,300000,500000,1000000]},
 {"key":"equity_offered","type":"number","label_en":"Equity offered (%)","label_hi":"हिस्सेदारी (%)","section":"advanced"},
 {"key":"expected_roi","type":"number","label_en":"Expected return (%)","label_hi":"अपेक्षित रिटर्न (%)","section":"advanced"},
 {"key":"pitch_deck","type":"file","label_en":"Pitch deck","label_hi":"पिच डेक","section":"advanced"}
]$$,'Need {{amount}} to {{purpose}} in {{city}}','Looking for {{amount}} to {{purpose}} in {{city}}.','{{city}} में {{purpose}} के लिए {{amount}} चाहिए','{{city}} में {{purpose}} के लिए {{amount}} की तलाश है।'),

('post','need_employee',1,$$[
 {"key":"role","type":"chips","label_en":"Who do you need?","label_hi":"कौन चाहिए?","section":"basic","required":true,"options":[
   {"value":"sales","label_en":"Sales","label_hi":"सेल्स"},{"value":"helper","label_en":"Helper","label_hi":"हेल्पर"},{"value":"delivery","label_en":"Delivery","label_hi":"डिलीवरी"},
   {"value":"accountant","label_en":"Accountant","label_hi":"अकाउंटेंट"},{"value":"tailor","label_en":"Tailor","label_hi":"दर्ज़ी"},{"value":"cook","label_en":"Cook","label_hi":"कुक"},
   {"value":"technician","label_en":"Technician","label_hi":"टेक्नीशियन"},{"value":"manager","label_en":"Manager","label_hi":"मैनेजर"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"salary","type":"amount","label_en":"Monthly salary","label_hi":"मासिक वेतन","section":"basic","required":true,"presets":[8000,12000,15000,20000,30000,50000],"promote_to":"amount_min"},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"openings","type":"number","label_en":"Number of openings","label_hi":"कितने लोग","section":"advanced"},
 {"key":"experience","type":"chips","label_en":"Experience","label_hi":"अनुभव","section":"advanced","options":[{"value":"fresher","label_en":"Fresher","label_hi":"फ्रेशर"},{"value":"1_3","label_en":"1-3 years","label_hi":"1-3 साल"},{"value":"3_plus","label_en":"3+ years","label_hi":"3+ साल"}]},
 {"key":"work_type","type":"chips","label_en":"Work type","label_hi":"काम का प्रकार","section":"advanced","options":[{"value":"full_time","label_en":"Full time","label_hi":"फुल टाइम"},{"value":"part_time","label_en":"Part time","label_hi":"पार्ट टाइम"},{"value":"contract","label_en":"Contract","label_hi":"कॉन्ट्रैक्ट"}]},
 {"key":"skills","type":"text_short","label_en":"Skills needed","label_hi":"ज़रूरी हुनर","section":"advanced"}
]$$,'Need {{role}} in {{city}}','Hiring {{role}} in {{city}}, salary {{salary}} per month.','{{city}} में {{role}} चाहिए','{{city}} में {{role}} की भर्ती, वेतन {{salary}} प्रति माह।'),

('post','need_influencer',1,$$[
 {"key":"platform","type":"multichips","label_en":"Which platform?","label_hi":"कौन सा प्लेटफॉर्म?","section":"basic","required":true,"options":[
   {"value":"instagram","label_en":"Instagram","label_hi":"इंस्टाग्राम"},{"value":"youtube","label_en":"YouTube","label_hi":"यूट्यूब"},{"value":"facebook","label_en":"Facebook","label_hi":"फेसबुक"},{"value":"any","label_en":"Any","label_hi":"कोई भी"}]},
 {"key":"niche","type":"chips","label_en":"What kind of influencer?","label_hi":"किस तरह का इन्फ्लुएंसर?","section":"basic","required":true,"options":[
   {"value":"food","label_en":"Food","label_hi":"खाना"},{"value":"fashion","label_en":"Fashion","label_hi":"फैशन"},{"value":"beauty","label_en":"Beauty","label_hi":"ब्यूटी"},{"value":"tech","label_en":"Tech","label_hi":"टेक"},
   {"value":"lifestyle","label_en":"Lifestyle","label_hi":"लाइफस्टाइल"},{"value":"local","label_en":"Local / City","label_hi":"लोकल"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"budget","type":"amount","label_en":"Budget","label_hi":"बजट","section":"basic","presets":[2000,5000,10000,25000,50000,100000],"promote_to":"amount_max"},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"min_followers","type":"chips","label_en":"Minimum followers","label_hi":"न्यूनतम फॉलोअर्स","section":"advanced","options":[{"value":"1k","label_en":"1K+","label_hi":"1K+"},{"value":"10k","label_en":"10K+","label_hi":"10K+"},{"value":"50k","label_en":"50K+","label_hi":"50K+"},{"value":"100k","label_en":"100K+","label_hi":"100K+"}]},
 {"key":"campaign_type","type":"multichips","label_en":"Campaign type","label_hi":"कैंपेन का प्रकार","section":"advanced","options":[{"value":"reel","label_en":"Reel / Short","label_hi":"रील"},{"value":"post","label_en":"Post","label_hi":"पोस्ट"},{"value":"visit","label_en":"Store visit","label_hi":"स्टोर विज़िट"},{"value":"review","label_en":"Review","label_hi":"रिव्यू"}]},
 {"key":"barter","type":"switch","label_en":"Barter (free product/service) OK","label_hi":"बार्टर (मुफ्त प्रोडक्ट/सेवा) ठीक है","section":"advanced"}
]$$,'Need {{niche}} influencer in {{city}}','Looking for a {{niche}} influencer on {{platform}} in {{city}}, budget {{budget}}.','{{city}} में {{niche}} इन्फ्लुएंसर चाहिए','{{city}} में {{platform}} पर {{niche}} इन्फ्लुएंसर की तलाश, बजट {{budget}}।'),

('post','looking_to_invest',1,$$[
 {"key":"amount","type":"amount","label_en":"How much can you invest?","label_hi":"कितना निवेश कर सकते हैं?","section":"basic","required":true,"presets":[100000,500000,1000000,2500000,5000000,10000000],"promote_to":"amount_max"},
 {"key":"industries","type":"multichips","label_en":"Which businesses?","label_hi":"कौन से बिज़नेस?","section":"basic","required":true,"options_source":"categories"},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"investment_type","type":"chips","label_en":"Investment type","label_hi":"निवेश का प्रकार","section":"advanced","options":[{"value":"equity","label_en":"Equity / Partnership","label_hi":"हिस्सेदारी"},{"value":"loan","label_en":"Loan with interest","label_hi":"ब्याज पर लोन"},{"value":"profit_share","label_en":"Profit share","label_hi":"मुनाफ़े में हिस्सा"}]},
 {"key":"business_stage","type":"multichips","label_en":"Preferred stage","label_hi":"पसंदीदा चरण","section":"advanced","options":[{"value":"idea","label_en":"Idea","label_hi":"आइडिया"},{"value":"early","label_en":"Just started","label_hi":"अभी शुरू"},{"value":"growth","label_en":"Growing","label_hi":"बढ़ रहा"},{"value":"established","label_en":"Established","label_hi":"स्थापित"}]},
 {"key":"expected_roi","type":"number","label_en":"Expected return (%)","label_hi":"अपेक्षित रिटर्न (%)","section":"advanced"}
]$$,'Looking to invest {{amount}} in {{city}}','Looking to invest up to {{amount}} in {{industries}} businesses in {{city}}.','{{city}} में {{amount}} निवेश करना है','{{city}} में {{industries}} बिज़नेस में {{amount}} तक निवेश करना चाहते हैं।'),

('post','need_supplier',1,$$[
 {"key":"product","type":"chips","label_en":"What do you need?","label_hi":"क्या चाहिए?","section":"basic","required":true,"options":[
   {"value":"raw_material","label_en":"Raw material","label_hi":"कच्चा माल"},{"value":"packaging","label_en":"Packaging","label_hi":"पैकेजिंग"},{"value":"finished_goods","label_en":"Finished goods","label_hi":"तैयार माल"},{"value":"grocery","label_en":"Grocery / Food items","label_hi":"किराना / खाद्य"},{"value":"fabric","label_en":"Fabric","label_hi":"कपड़ा"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"monthly_budget","type":"amount","label_en":"Monthly purchase","label_hi":"मासिक खरीद","section":"basic","presets":[10000,50000,100000,500000,1000000],"promote_to":"amount_max"},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"quantity","type":"text_short","label_en":"Quantity / MOQ","label_hi":"मात्रा","section":"advanced"},
 {"key":"gst_required","type":"switch","label_en":"GST bill required","label_hi":"GST बिल चाहिए","section":"advanced"},
 {"key":"delivery_required","type":"switch","label_en":"Delivery required","label_hi":"डिलीवरी चाहिए","section":"advanced"}
]$$,'Need {{product}} supplier in {{city}}','Looking for a {{product}} supplier in {{city}}, monthly purchase around {{monthly_budget}}.','{{city}} में {{product}} सप्लायर चाहिए','{{city}} में {{product}} सप्लायर की तलाश, मासिक खरीद लगभग {{monthly_budget}}।'),

('post','need_other',1,$$[
 {"key":"what","type":"chips","label_en":"What do you need?","label_hi":"क्या चाहिए?","section":"basic","required":true,"options":[
   {"value":"packaging","label_en":"Packaging","label_hi":"पैकेजिंग"},{"value":"printing","label_en":"Printing","label_hi":"प्रिंटिंग"},{"value":"photography","label_en":"Photography","label_hi":"फोटोग्राफी"},{"value":"design","label_en":"Graphic design","label_hi":"डिज़ाइन"},
   {"value":"consultant","label_en":"Consultant","label_hi":"कंसल्टेंट"},{"value":"event","label_en":"Event partner","label_hi":"इवेंट पार्टनर"},{"value":"export_partner","label_en":"Export partner","label_hi":"निर्यात पार्टनर"},{"value":"govt_scheme","label_en":"Government scheme info","label_hi":"सरकारी योजना जानकारी"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"budget","type":"amount","label_en":"Budget","label_hi":"बजट","section":"basic","presets":[2000,5000,10000,25000,50000,100000],"promote_to":"amount_max"},
 {"key":"location","type":"location","label_en":"Where?","label_hi":"कहाँ?","section":"basic","required":true,"default_from_business":true,"promote_to":"location"},
 {"key":"details","type":"text_long","label_en":"Any details","label_hi":"कोई विवरण","section":"advanced"}
]$$,'Need {{what}} in {{city}}','Looking for {{what}} in {{city}}, budget {{budget}}.','{{city}} में {{what}} चाहिए','{{city}} में {{what}} की तलाश, बजट {{budget}}।'),

('offering','investment',1,$$[
 {"key":"range_min","type":"amount","label_en":"Minimum investment","label_hi":"न्यूनतम निवेश","section":"basic","required":true,"presets":[100000,500000,1000000,2500000]},
 {"key":"range_max","type":"amount","label_en":"Maximum investment","label_hi":"अधिकतम निवेश","section":"basic","required":true,"presets":[500000,1000000,5000000,10000000]},
 {"key":"industries","type":"multichips","label_en":"Preferred businesses","label_hi":"पसंदीदा बिज़नेस","section":"basic","required":true,"options_source":"categories"},
 {"key":"location","type":"location","label_en":"Preferred location","label_hi":"पसंदीदा जगह","section":"basic","required":true,"default_from_business":true},
 {"key":"investment_type","type":"chips","label_en":"Investment type","label_hi":"निवेश का प्रकार","section":"advanced","options":[{"value":"angel","label_en":"Angel","label_hi":"एंजल"},{"value":"loan","label_en":"Loan","label_hi":"लोन"},{"value":"equity","label_en":"Equity","label_hi":"हिस्सेदारी"},{"value":"profit_share","label_en":"Profit share","label_hi":"मुनाफ़ा हिस्सा"}]},
 {"key":"business_stage","type":"multichips","label_en":"Business stage","label_hi":"बिज़नेस चरण","section":"advanced","options":[{"value":"idea","label_en":"Idea","label_hi":"आइडिया"},{"value":"early","label_en":"Early","label_hi":"शुरुआती"},{"value":"growth","label_en":"Growth","label_hi":"विकास"},{"value":"established","label_en":"Established","label_hi":"स्थापित"}]},
 {"key":"equity_preference","type":"number","label_en":"Equity preference (%)","label_hi":"हिस्सेदारी (%)","section":"advanced"},
 {"key":"roi_preference","type":"number","label_en":"ROI preference (%)","label_hi":"ROI (%)","section":"advanced"},
 {"key":"pitch_deck_required","type":"switch","label_en":"Pitch deck required","label_hi":"पिच डेक ज़रूरी","section":"advanced"},
 {"key":"portfolio","type":"text_long","label_en":"Portfolio","label_hi":"पोर्टफोलियो","section":"advanced"}
]$$,'Investor: {{range_min}} to {{range_max}}','Looking to invest between {{range_min}} and {{range_max}} in {{industries}} businesses in {{city}}.','निवेशक: {{range_min}} से {{range_max}}','{{city}} में {{industries}} बिज़नेस में {{range_min}} से {{range_max}} तक निवेश करना चाहते हैं।'),

('offering','influencer',1,$$[
 {"key":"platform","type":"chips","label_en":"Platform","label_hi":"प्लेटफॉर्म","section":"basic","required":true,"options":[{"value":"instagram","label_en":"Instagram","label_hi":"इंस्टाग्राम"},{"value":"youtube","label_en":"YouTube","label_hi":"यूट्यूब"},{"value":"facebook","label_en":"Facebook","label_hi":"फेसबुक"}]},
 {"key":"followers","type":"chips","label_en":"Followers","label_hi":"फॉलोअर्स","section":"basic","required":true,"options":[{"value":"1k","label_en":"1K-10K","label_hi":"1K-10K"},{"value":"10k","label_en":"10K-50K","label_hi":"10K-50K"},{"value":"50k","label_en":"50K-100K","label_hi":"50K-100K"},{"value":"100k","label_en":"100K+","label_hi":"100K+"}]},
 {"key":"niche","type":"chips","label_en":"Primary niche","label_hi":"मुख्य विषय","section":"basic","required":true,"options":[{"value":"food","label_en":"Food","label_hi":"खाना"},{"value":"fashion","label_en":"Fashion","label_hi":"फैशन"},{"value":"beauty","label_en":"Beauty","label_hi":"ब्यूटी"},{"value":"tech","label_en":"Tech","label_hi":"टेक"},{"value":"lifestyle","label_en":"Lifestyle","label_hi":"लाइफस्टाइल"},{"value":"local","label_en":"Local","label_hi":"लोकल"}]},
 {"key":"location","type":"location","label_en":"Location","label_hi":"जगह","section":"basic","required":true,"default_from_business":true},
 {"key":"audience_age","type":"multichips","label_en":"Audience age","label_hi":"दर्शक आयु","section":"advanced","options":[{"value":"13_17","label_en":"13-17","label_hi":"13-17"},{"value":"18_24","label_en":"18-24","label_hi":"18-24"},{"value":"25_34","label_en":"25-34","label_hi":"25-34"},{"value":"35_plus","label_en":"35+","label_hi":"35+"}]},
 {"key":"languages","type":"multichips","label_en":"Languages","label_hi":"भाषाएँ","section":"advanced","options":[{"value":"hi","label_en":"Hindi","label_hi":"हिंदी"},{"value":"en","label_en":"English","label_hi":"अंग्रेज़ी"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"rate_card","type":"file","label_en":"Rate card","label_hi":"रेट कार्ड","section":"advanced"},
 {"key":"media_kit","type":"file","label_en":"Media kit","label_hi":"मीडिया किट","section":"advanced"},
 {"key":"previous_brands","type":"text_short","label_en":"Previous brands","label_hi":"पिछले ब्रांड","section":"advanced"}
]$$,'{{niche}} influencer on {{platform}}','{{niche}} influencer on {{platform}} with {{followers}} followers based in {{city}}.','{{platform}} पर {{niche}} इन्फ्लुएंसर','{{city}} के {{platform}} पर {{niche}} इन्फ्लुएंसर, {{followers}} फॉलोअर्स।'),

('offering','manufacturing',1,$$[
 {"key":"industry","type":"chips","label_en":"Industry","label_hi":"उद्योग","section":"basic","required":true,"options_source":"categories"},
 {"key":"manufacturing_type","type":"chips","label_en":"Manufacturing type","label_hi":"निर्माण प्रकार","section":"basic","required":true,"options":[{"value":"oem","label_en":"OEM","label_hi":"OEM"},{"value":"odm","label_en":"ODM","label_hi":"ODM"},{"value":"private_label","label_en":"Private label","label_hi":"प्राइवेट लेबल"},{"value":"job_work","label_en":"Job work","label_hi":"जॉब वर्क"}]},
 {"key":"location","type":"location","label_en":"Factory location","label_hi":"फैक्ट्री की जगह","section":"basic","required":true,"default_from_business":true},
 {"key":"moq","type":"text_short","label_en":"MOQ","label_hi":"न्यूनतम ऑर्डर","section":"advanced"},
 {"key":"capacity","type":"text_short","label_en":"Production capacity","label_hi":"उत्पादन क्षमता","section":"advanced"},
 {"key":"lead_time","type":"chips","label_en":"Lead time","label_hi":"डिलीवरी समय","section":"advanced","options":[{"value":"1w","label_en":"Under 1 week","label_hi":"1 हफ्ते से कम"},{"value":"2w","label_en":"1-2 weeks","label_hi":"1-2 हफ्ते"},{"value":"1m","label_en":"2-4 weeks","label_hi":"2-4 हफ्ते"},{"value":"1m_plus","label_en":"Over a month","label_hi":"1 महीने से ज़्यादा"}]},
 {"key":"export_available","type":"switch","label_en":"Export available","label_hi":"निर्यात उपलब्ध","section":"advanced"},
 {"key":"certifications","type":"multichips","label_en":"Certifications","label_hi":"प्रमाणपत्र","section":"advanced","options":[{"value":"iso","label_en":"ISO","label_hi":"ISO"},{"value":"fssai","label_en":"FSSAI","label_hi":"FSSAI"},{"value":"bis","label_en":"BIS","label_hi":"BIS"},{"value":"other","label_en":"Other","label_hi":"अन्य"}]},
 {"key":"factory_images","type":"image","label_en":"Factory photos","label_hi":"फैक्ट्री की तस्वीरें","section":"advanced"}
]$$,'{{manufacturing_type}} {{industry}} manufacturer in {{city}}','{{manufacturing_type}} {{industry}} manufacturer serving businesses in {{city}}.','{{city}} में {{manufacturing_type}} {{industry}} निर्माता','{{city}} में {{manufacturing_type}} {{industry}} निर्माता, बिज़नेस के लिए सेवा।')
on conflict (target, type_slug, version) do update set fields = excluded.fields, title_template = excluded.title_template, description_template = excluded.description_template;
