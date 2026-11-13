// What belongs in each business category: shown behind the ⓘ next to a category, and used as search words, so a
// shopkeeper typing "LED", "motor" or "bijli" finds Electrical & Electronics. Categories stay broad (agreed
// 2026-11-06: no product-specific categories). Builds supabase/seed/06_category_examples.sql.
// Run: pnpm categories:build   (then pnpm db:seed).
// Per category: [English examples], [Hindi examples] (same order), extra search words (Hindi, Hinglish, other names).
import { writeFileSync } from "node:fs";

/** New broad categories (emoji icon: older app versions show the category list as text). */
const NEW_GROUPS = [
  ["electrical_electronics", "Electrical & Electronics", "इलेक्ट्रिकल और इलेक्ट्रॉनिक्स", "💡", 20],
  ["home_services", "Repair & Home Services", "रिपेयर और घरेलू सेवाएँ", "🔧", 21],
  ["travel_hospitality", "Travel, Hotels & PG", "ट्रैवल, होटल और PG", "🏨", 22],
];

const EXAMPLES = {
  food_restaurant: [
    ["Restaurant / dhaba", "Sweet shop / halwai", "Bakery & cakes", "Fast food / street food", "Tea, juice & snacks", "Tiffin & catering", "Home kitchen", "Dairy / milk", "Ice cream", "Meat, chicken & fish", "Pickles, papad & spices"],
    ["रेस्टोरेंट / ढाबा", "मिठाई / हलवाई", "बेकरी और केक", "फ़ास्ट फ़ूड / स्ट्रीट फ़ूड", "चाय, जूस और नाश्ता", "टिफ़िन और कैटरिंग", "घर का किचन", "डेयरी / दूध", "आइसक्रीम", "मीट, चिकन और मछली", "अचार, पापड़ और मसाले"],
    "dhaba hotel khana mithai halwai cake chai momos chaat tiffin dabba doodh paneer",
  ],
  retail_shop: [
    ["Kirana / grocery", "Fruits & vegetables", "Mobile & accessories", "Hardware, paint & sanitary", "Stationery & books", "Gifts & toys", "Footwear", "Jewellery", "Cosmetics & bangles", "Furniture", "Home decor & furnishing", "Utensils", "Pooja items", "Optical", "Watches", "Sports goods", "Pet shop", "Wholesale / distributor", "Online seller"],
    ["किराना / ग्रोसरी", "फल और सब्ज़ी", "मोबाइल और एक्सेसरीज़", "हार्डवेयर, पेंट और सैनिटरी", "स्टेशनरी और किताबें", "गिफ़्ट और खिलौने", "जूते-चप्पल", "ज्वेलरी", "कॉस्मेटिक्स और चूड़ियाँ", "फ़र्नीचर", "होम डेकोर", "बर्तन", "पूजा सामग्री", "चश्मे", "घड़ियाँ", "खेल का सामान", "पेट शॉप", "होलसेल / डिस्ट्रीब्यूटर", "ऑनलाइन सेलर"],
    "kirana general store dukan sabzi mobile hardware stationery khilone joote sona chandi bartan chashma wholesale thok",
  ],
  manufacturing: [
    ["Small factory / workshop", "Packaging & boxes", "Plastic products", "Metal & steel fabrication", "Furniture & woodwork", "Printing press", "Soap & detergent", "Paper products & disposables", "Candles & agarbatti", "Food processing"],
    ["छोटी फ़ैक्ट्री / वर्कशॉप", "पैकेजिंग और डिब्बे", "प्लास्टिक प्रोडक्ट्स", "मेटल और स्टील फ़ैब्रिकेशन", "फ़र्नीचर और लकड़ी", "प्रिंटिंग प्रेस", "साबुन और डिटर्जेंट", "पेपर प्रोडक्ट्स और डिस्पोज़ेबल", "मोमबत्ती और अगरबत्ती", "फ़ूड प्रोसेसिंग"],
    "factory karkhana unit msme packing carton plastic lohe steel welding press sabun",
  ],
  garments_fashion: [
    ["Clothing / readymade", "Boutique & designer wear", "Tailoring", "Saree, suit & fabric", "Kids wear", "Garment stitching unit", "Embroidery & zari", "Laundry & dry clean", "Bags & accessories"],
    ["कपड़े / रेडीमेड", "बुटीक और डिज़ाइनर", "सिलाई", "साड़ी, सूट और कपड़ा", "बच्चों के कपड़े", "गारमेंट सिलाई यूनिट", "कढ़ाई और ज़री", "लॉन्ड्री और ड्राई क्लीन", "बैग और एक्सेसरीज़"],
    "kapde readymade darzi silai saree suit than boutique dhobi press",
  ],
  agriculture: [
    ["Farming", "Dairy & cattle", "Poultry & goats", "Seeds & fertilizer", "Plant nursery", "Tractor & farm machines", "Organic produce", "Fish farming & honey"],
    ["खेती", "डेयरी और पशुपालन", "मुर्गी और बकरी पालन", "बीज और खाद", "नर्सरी", "ट्रैक्टर और खेती की मशीनें", "ऑर्गेनिक उत्पाद", "मछली पालन और शहद"],
    "kisan kheti gaay bhains murgi bakri beej khad urea nursery tractor",
  ],
  education: [
    ["Coaching & tuition", "School / play school", "Computer training", "Spoken English", "Skill training", "Music, dance & art classes", "Competitive exams", "Library / study centre", "Driving school"],
    ["कोचिंग और ट्यूशन", "स्कूल / प्ले स्कूल", "कंप्यूटर ट्रेनिंग", "स्पोकन इंग्लिश", "हुनर ट्रेनिंग", "संगीत, डांस और आर्ट क्लास", "प्रतियोगी परीक्षा", "लाइब्रेरी / स्टडी सेंटर", "ड्राइविंग स्कूल"],
    "coaching tuition classes school computer course english ssc upsc library",
  ],
  health_wellness: [
    ["Pharmacy / medical store", "Clinic & doctor", "Dental", "Pathology lab", "Ayurveda & homeopathy", "Gym & yoga", "Physiotherapy", "Nursing & home care", "Eye clinic"],
    ["मेडिकल स्टोर / केमिस्ट", "क्लिनिक और डॉक्टर", "दाँतों का डॉक्टर", "पैथोलॉजी लैब", "आयुर्वेद और होम्योपैथी", "जिम और योग", "फ़िज़ियोथेरेपी", "नर्सिंग और घर पर देखभाल", "आँखों का क्लिनिक"],
    "chemist dawai medicine doctor hospital lab test gym yoga nurse",
  ],
  beauty_salon: [
    ["Men's salon / barber", "Beauty parlour", "Unisex salon & spa", "Mehndi & makeup", "Cosmetics shop"],
    ["जेंट्स सैलून / नाई", "ब्यूटी पार्लर", "यूनिसेक्स सैलून और स्पा", "मेहंदी और मेकअप", "कॉस्मेटिक्स की दुकान"],
    "nai barber hair cutting parlour facial threading spa mehndi makeup",
  ],
  technology: [
    ["Computer & laptop shop", "Cyber cafe, online forms & printouts", "Software, website & apps", "CCTV & security systems", "Internet, Wi-Fi & DTH", "Mobile repair"],
    ["कंप्यूटर और लैपटॉप की दुकान", "साइबर कैफ़े, ऑनलाइन फ़ॉर्म और प्रिंट", "सॉफ़्टवेयर, वेबसाइट और ऐप", "CCTV और सिक्योरिटी सिस्टम", "इंटरनेट, वाई-फ़ाई और DTH", "मोबाइल रिपेयर"],
    "computer laptop cyber cafe xerox photocopy print website app cctv wifi broadband",
  ],
  marketing_media: [
    ["Printing, flex & signboards", "Digital marketing", "Advertising", "YouTuber / influencer", "Local news"],
    ["प्रिंटिंग, फ़्लेक्स और साइनबोर्ड", "डिजिटल मार्केटिंग", "विज्ञापन", "यूट्यूबर / इन्फ़्लुएंसर", "लोकल न्यूज़"],
    "flex banner signboard visiting card social media ads youtube instagram akhbar",
  ],
  finance_investment: [
    ["Loan agent", "Insurance", "Investor", "Money transfer / CSC banking point", "Mutual funds & shares"],
    ["लोन एजेंट", "बीमा", "निवेशक", "मनी ट्रांसफ़र / CSC बैंकिंग", "म्यूचुअल फ़ंड और शेयर"],
    "loan bima lic insurance investor csc aadhaar aeps sip share",
  ],
  legal_accounting: [
    ["CA & accountant", "Tax & GST", "Lawyer / advocate", "Documents & licences", "Notary & stamp paper"],
    ["CA और अकाउंटेंट", "टैक्स और GST", "वकील", "दस्तावेज़ और लाइसेंस", "नोटरी और स्टाम्प पेपर"],
    "ca munim gst itr tax vakil court licence registration notary affidavit",
  ],
  real_estate: [
    ["Property dealer / broker", "Builder / developer", "Shop or flat for rent", "Warehouse / godown"],
    ["प्रॉपर्टी डीलर / ब्रोकर", "बिल्डर / डेवलपर", "किराए की दुकान या फ़्लैट", "गोदाम"],
    "property dealer broker builder flat kiraya rent godown plot",
  ],
  logistics: [
    ["Transport & trucks", "Courier & delivery", "Packers & movers", "Taxi, auto & e-rickshaw", "Cold storage"],
    ["ट्रांसपोर्ट और ट्रक", "कूरियर और डिलीवरी", "पैकर्स और मूवर्स", "टैक्सी, ऑटो और ई-रिक्शा", "कोल्ड स्टोरेज"],
    "transport truck tempo courier parcel delivery shifting taxi auto",
  ],
  construction: [
    ["Building contractor", "Cement, sand & bricks", "Tiles & marble", "Interior & modular kitchen", "Plywood, glass & aluminium", "Architect / map", "Borewell & waterproofing"],
    ["बिल्डिंग ठेकेदार", "सीमेंट, रेत और ईंट", "टाइल और मार्बल", "इंटीरियर और मॉड्यूलर किचन", "प्लाईवुड, शीशा और एल्युमिनियम", "आर्किटेक्ट / नक्शा", "बोरवेल और वाटरप्रूफ़िंग"],
    "thekedar contractor cement bajri eent sariya tiles marble pop interior naksha",
  ],
  handicraft: [
    ["Handicrafts", "Home-based business", "Pottery & clay items", "Handloom & weaving", "Handmade gifts & decor"],
    ["हस्तशिल्प", "घर से चलने वाला काम", "मिट्टी के बर्तन", "हैंडलूम और बुनाई", "हाथ से बने गिफ़्ट और सजावट"],
    "handmade craft ghar se kumhar mitti handloom bunai",
  ],
  events: [
    ["Photographer & studio", "Tent house & decoration", "Banquet / marriage hall", "DJ, sound & band", "Event / wedding planner", "Caterer"],
    ["फ़ोटोग्राफ़र और स्टूडियो", "टेंट हाउस और सजावट", "बैंक्वेट / मैरिज हॉल", "DJ, साउंड और बैंड", "इवेंट / वेडिंग प्लानर", "कैटरर"],
    "photo studio tent decoration shaadi banquet dj band baja catering",
  ],
  automobile: [
    ["Car repair & garage", "Bike & scooter repair", "Auto parts", "Tyres & puncture", "Car wash", "Vehicle dealer / used vehicles", "E-rickshaw / EV"],
    ["कार रिपेयर और गैराज", "बाइक और स्कूटर रिपेयर", "ऑटो पार्ट्स", "टायर और पंक्चर", "कार वॉश", "वाहन डीलर / पुरानी गाड़ियाँ", "ई-रिक्शा / EV"],
    "garage mechanic gaadi bike scooter spare parts tyre puncture showroom erickshaw",
  ],
  freelance: [
    ["Freelancer", "Consultant", "Graphic & logo design", "Translation & typing"],
    ["फ़्रीलांसर", "सलाहकार", "ग्राफ़िक और लोगो डिज़ाइन", "अनुवाद और टाइपिंग"],
    "freelance consultant designer logo typing translation",
  ],
  electrical_electronics: [
    ["Wires, switches & fittings", "LED, bulbs & lights", "Fans & coolers", "Motors & pumps", "AC & fridge", "TV & remote", "Washing machine & appliances", "Inverter & battery", "Solar panels", "Speakers & sound", "Electrician & wiring work", "Repair of electrical & electronic items"],
    ["तार, स्विच और फ़िटिंग", "LED, बल्ब और लाइट", "पंखे और कूलर", "मोटर और पंप", "AC और फ़्रिज", "TV और रिमोट", "वॉशिंग मशीन और उपकरण", "इन्वर्टर और बैटरी", "सोलर पैनल", "स्पीकर और साउंड", "इलेक्ट्रीशियन और वायरिंग", "बिजली और इलेक्ट्रॉनिक सामान की रिपेयर"],
    "electrical electric electronics bijli light led bulb tubelight wire switch fan pankha cooler motor pump ac fridge tv remote inverter battery ups solar speaker",
  ],
  home_services: [
    ["AC & fridge repair", "Plumber", "Carpenter", "Painter", "Cleaning & housekeeping", "Pest control", "RO / water purifier", "Key & lock", "Shoe & bag repair", "Maid / domestic help"],
    ["AC और फ़्रिज रिपेयर", "प्लंबर", "बढ़ई", "पेंटर", "सफ़ाई", "पेस्ट कंट्रोल", "RO / वाटर प्यूरीफ़ायर", "चाबी और ताला", "जूते और बैग रिपेयर", "घरेलू काम"],
    "repair plumber badhai putai safai pest control deemak ro chabi tala mochi maid",
  ],
  travel_hospitality: [
    ["Hotel & guest house", "PG & hostel", "Travel agency & tickets", "Tours & taxi booking"],
    ["होटल और गेस्ट हाउस", "PG और हॉस्टल", "ट्रैवल एजेंसी और टिकट", "टूर और टैक्सी बुकिंग"],
    "hotel lodge guest house pg hostel room travel agent ticket booking tour",
  ],
  other: [
    ["Anything that fits no other category"],
    ["कुछ भी जो किसी और कैटेगरी में न आए"],
    "other anya",
  ],
};

for (const [slug, [en, hi]] of Object.entries(EXAMPLES)) {
  if (en.length !== hi.length) throw new Error(`${slug}: ${en.length} English vs ${hi.length} Hindi examples`);
}
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const arr = (a) => `array[${a.map(q).join(", ")}]::text[]`;
const sql = `-- GENERATED by scripts/category-examples.mjs (pnpm categories:build). Do not edit by hand. Idempotent.
-- Business categories stay broad; this adds the missing ones and what belongs in each (migration 20261106000002).

insert into public.categories (slug, name_en, name_hi, icon, sort) values
${NEW_GROUPS.map(([s, en, hi, icon, n]) => `  (${q(s)}, ${q(en)}, ${q(hi)}, ${q(icon)}, ${n})`).join(",\n")}
on conflict (slug) do update set name_en = excluded.name_en, name_hi = excluded.name_hi, icon = excluded.icon, sort = excluded.sort;

-- what belongs in each category (the ⓘ pop-up) and its search words (examples + Hindi / Hinglish names)
${Object.entries(EXAMPLES).map(([slug, [en, hi, words]]) =>
  `update public.categories set examples_en = ${arr(en)},\n  examples_hi = ${arr(hi)},\n  keywords = ${q([...en, ...hi, words].join(" ").toLowerCase())}\n  where slug = ${q(slug)} and parent_id is null;`).join("\n")}

-- recommendations for the new categories (which post types to show first)
insert into public.category_affinity (source_category_slug, target_post_type_slug, weight) values
  ('electrical_electronics', 'need_supplier', 0.8), ('electrical_electronics', 'need_skilled_person', 0.7), ('electrical_electronics', 'need_customer', 0.6),
  ('electrical_electronics', 'offer_service', 0.6), ('electrical_electronics', 'need_employee', 0.5),
  ('home_services', 'need_customer', 0.8), ('home_services', 'offer_service', 0.7), ('home_services', 'need_skilled_person', 0.6),
  ('home_services', 'offer_work', 0.5),
  ('travel_hospitality', 'need_customer', 0.8), ('travel_hospitality', 'need_employee', 0.6), ('travel_hospitality', 'offer_space', 0.5),
  ('travel_hospitality', 'need_marketing', 0.5)
on conflict (source_category_slug, target_post_type_slug) do update set weight = excluded.weight;
`;
writeFileSync(new URL("../supabase/seed/06_category_examples.sql", import.meta.url), sql);
console.log(`${NEW_GROUPS.length} new categories, examples for ${Object.keys(EXAMPLES).length} -> supabase/seed/06_category_examples.sql`);
