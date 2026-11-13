// What each post type covers: shown behind the ⓘ on "What do you need?" / "What can you offer?", and used as search words,
// so "barber", "tandoor maker" or "child care" finds the right choice. Builds supabase/seed/07_post_type_examples.sql.
// Run: pnpm post-types:build   (then pnpm db:seed).
// Search words come from four places: the examples, the choices in that post's form, the trades (packages/shared),
// and the Hindi / Hinglish words below. A word admins mark in "Words people use" is added here.
import { readFileSync, writeFileSync } from "node:fs";
import { TRADES, tradeSearchText } from "../packages/shared/src/trades.ts";

/** Everyday names of skilled work that the trade list does not spell out. */
const SKILL_WORDS = `hair cutter haircut nai naai hajjam salon parlour darzi silai masterji rasoiya khansama bawarchi maharaj kitchen
  bijli bijliwala wireman nalsaaz nal badhai mistri rajmistri raj karigar kaarigar mazdoor beldar safai jhadu pocha kaamwali bai maid servant househelp
  chef child care childcare kids creche daycare nanny aaya ayah japa old age attendant patient chauffeur chowkidar watchman guard dhobi laundry ironing
  sunar mochi mali pandit pujari peon tandoor tandoori bhatti roti maker painter pop tailor bartan vehicle lift`;

/** Goods people buy, sell, get made or supply. */
const PRODUCT_WORDS = `rice chawal atta flour dal pulses oil tel sugar cheeni ghee spices masala tea chai coffee milk doodh paneer vegetables sabzi fruits phal
  sweets mithai snacks namkeen biscuit bakery grocery kirana cloth kapda fabric saree suit shirt garments readymade uniform shoes joote chappal bags
  plastic packaging packing box carton dabba paper disposable steel iron loha cement bricks eent sand balu wood lakdi plywood paint tiles marble hardware
  wire cable led bulb light fan pankha motor pump battery inverter solar mobile phone laptop computer furniture sofa toys khilone stationery books soap sabun
  detergent cosmetics bangles jewellery gold silver sona chandi utensils bartan medicine seeds beej fertilizer khad candles agarbatti pickle achar papad
  चावल आटा दाल तेल चीनी घी मसाले चाय दूध पनीर सब्ज़ी फल मिठाई नमकीन कपड़ा साड़ी जूते प्लास्टिक डिब्बा लोहा सीमेंट ईंट लकड़ी पेंट तार बल्ब पंखा मोटर बैटरी मोबाइल फ़र्नीचर खिलौने साबुन बर्तन दवाई बीज खाद`;

const ROOM_WORDS = "dukan makan kiraya kiraye rent lease plot jagah kamra room shop office godown kiosk stall counter";
const MONEY_WORDS = "paisa loan udhaar karz fund funding invest investor capital mudra bank nivesh";
const VEHICLE_WORDS = "gaadi bike scooter auto rickshaw e-rickshaw tempo truck pickup car van bolero tractor cycle kiraya";
const TEACH_WORDS = "sikhna sikhana course class coaching tuition tutor teacher trainer training cooking tailoring silai computer english beauty parlour driving mehndi yoga";

/** post type: [English examples], [Hindi examples] (same order), extra search words, include every trade? */
const TYPES = {
  // Need ------------------------------------------------------------------------------------------------------------
  need_skilled_person: [["Cook, halwai, tandoor maker", "Tailor & embroidery", "Barber & beautician", "Electrician & plumber", "Carpenter, painter, mason", "Driver & delivery", "AC, mobile & computer repair", "Babysitter & patient caretaker", "Security guard & cleaner"],
    ["रसोइया, हलवाई, तंदूर वाला", "दर्ज़ी और कढ़ाई", "नाई और ब्यूटीशियन", "इलेक्ट्रीशियन और प्लंबर", "बढ़ई, पेंटर, मिस्त्री", "ड्राइवर और डिलीवरी", "AC, मोबाइल और कंप्यूटर रिपेयर", "बच्चों और मरीज़ की देखभाल", "सिक्योरिटी गार्ड और सफ़ाई"], SKILL_WORDS, true],
  partner_business: [["Someone to run the business with you", "Working partner", "Partner who invests money", "Partner for a new shop", "Share profit together"],
    ["साथ में बिज़नेस चलाने वाला", "काम करने वाला पार्टनर", "पैसा लगाने वाला पार्टनर", "नई दुकान के लिए पार्टनर", "मुनाफ़े में हिस्सेदारी"], "sajhedar saajhedar bhagidar hissedar partnership co-founder cofounder sleeping साझेदार"],
  need_money: [["Business loan", "Investor", "Partner money", "Money to start a shop", "Machine or stock finance"],
    ["बिज़नेस लोन", "निवेशक", "पार्टनर का पैसा", "दुकान शुरू करने के लिए पैसा", "मशीन या माल के लिए फ़ाइनेंस"], MONEY_WORDS],
  need_employee: [["Shop & showroom staff", "Salesman & cashier", "Restaurant & kitchen staff", "Office & computer staff", "Factory & workshop workers", "Helper & cleaner"],
    ["दुकान और शोरूम का स्टाफ", "सेल्समैन और कैशियर", "रेस्टोरेंट और किचन का स्टाफ", "ऑफ़िस और कंप्यूटर स्टाफ", "फ़ैक्ट्री और वर्कशॉप के कारीगर", "हेल्पर और सफ़ाई"], `${SKILL_WORDS} naukar karamchari employee worker staff boy ladka ladki manager supervisor`, true],
  need_customer: [["Buyers for your products", "Regular customers", "Bulk orders", "Shops to buy from you", "More people for your service"],
    ["आपके प्रोडक्ट के ख़रीदार", "नियमित ग्राहक", "थोक ऑर्डर", "आपसे ख़रीदने वाली दुकानें", "आपकी सेवा के लिए ज़्यादा लोग"], "grahak kharidar buyer client orders sale bikri leads"],
  need_supplier: [["Raw material", "Shop stock", "Wholesale goods", "Packaging material", "Food & grocery items", "Cloth & garments"],
    ["कच्चा माल", "दुकान का सामान", "थोक का माल", "पैकिंग का सामान", "खाने और किराने का सामान", "कपड़ा और गारमेंट"], `${PRODUCT_WORDS} wholesaler thok vendor maal`],
  need_manufacturer: [["Get products made in a factory", "Your own brand (private label)", "Stitching unit for clothes", "Food products made for you", "Packaging & boxes made"],
    ["फ़ैक्ट्री में प्रोडक्ट बनवाना", "अपना ब्रांड (प्राइवेट लेबल)", "कपड़ों की सिलाई यूनिट", "आपके लिए खाने के प्रोडक्ट बनवाना", "पैकिंग और डिब्बे बनवाना"], `${PRODUCT_WORDS} factory karkhana maker banwana oem job work jobwork`],
  need_distributor: [["Someone to reach shops", "Distributor for your area", "Wholesaler for your goods", "Dealer network", "Stockist"],
    ["दुकानों तक पहुँचाने वाला", "आपके इलाके का डिस्ट्रीब्यूटर", "आपके माल का थोक व्यापारी", "डीलर नेटवर्क", "स्टॉकिस्ट"], `${PRODUCT_WORDS} dealer agency wholesaler stockist`],
  need_influencer: [["Instagram promotion", "YouTube review", "Facebook pages", "Local food or fashion bloggers", "Reels for your shop"],
    ["इंस्टाग्राम पर प्रचार", "यूट्यूब रिव्यू", "फ़ेसबुक पेज", "लोकल फ़ूड या फ़ैशन ब्लॉगर", "आपकी दुकान की रील"], "blogger vlogger reel reels youtuber creator instagram facebook promotion"],
  need_mentor: [["Advice from an experienced person", "Help to start a business", "Help when business is slow", "Pricing & growth advice", "Career guidance"],
    ["अनुभवी व्यक्ति से सलाह", "बिज़नेस शुरू करने में मदद", "काम मंदा हो तो मदद", "दाम और बढ़ोतरी की सलाह", "करियर की सलाह"], "salah margdarshan advice mentor guide consultant consultancy सलाह"],
  need_marketing: [["Social media handling", "Google & Facebook ads", "Pamphlets & banners", "WhatsApp marketing", "Local promotion"],
    ["सोशल मीडिया संभालना", "गूगल और फ़ेसबुक विज्ञापन", "पर्चे और बैनर", "व्हाट्सऐप मार्केटिंग", "लोकल प्रचार"], "ads advertisement vigyapan prachar poster flyer hoarding seo digital"],
  need_technology: [["Website for your business", "Mobile app", "Billing software", "Online store", "Computer setup"],
    ["आपके बिज़नेस की वेबसाइट", "मोबाइल ऐप", "बिलिंग सॉफ़्टवेयर", "ऑनलाइन स्टोर", "कंप्यूटर सेटअप"], "software developer programmer ecommerce tally pos it amazon flipkart"],
  need_shop: [["Shop on rent", "Office space", "Kiosk or stall", "Room for a small workshop"],
    ["किराए पर दुकान", "ऑफ़िस की जगह", "कियोस्क या स्टॉल", "छोटी वर्कशॉप के लिए कमरा"], ROOM_WORDS],
  need_warehouse: [["Godown on rent", "Cold storage", "Storage for stock", "Space to keep goods"],
    ["किराए पर गोदाम", "कोल्ड स्टोरेज", "माल रखने की जगह", "सामान रखने की जगह"], `${ROOM_WORDS} warehouse cold`],
  need_machine: [["Buy a new or used machine", "Machine on rent", "Sewing, food or packing machine", "Printing machine", "Generator"],
    ["नई या पुरानी मशीन ख़रीदना", "किराए पर मशीन", "सिलाई, फ़ूड या पैकिंग मशीन", "प्रिंटिंग मशीन", "जनरेटर"], "machinery equipment mixer oven sewing silai generator atta chakki"],
  need_accountant: [["GST filing", "Income tax return", "Tally & bookkeeping", "Company or shop registration", "Salary & accounts"],
    ["GST फ़ाइलिंग", "इनकम टैक्स रिटर्न", "टैली और बहीखाता", "कंपनी या दुकान का रजिस्ट्रेशन", "वेतन और हिसाब"], "ca chartered accountant munim hisab khata itr audit bahi tax"],
  need_lawyer: [["Agreements & contracts", "Licences (FSSAI, shop)", "Disputes & court cases", "Trademark", "Property papers"],
    ["एग्रीमेंट और कॉन्ट्रैक्ट", "लाइसेंस (FSSAI, दुकान)", "विवाद और कोर्ट केस", "ट्रेडमार्क", "प्रॉपर्टी के काग़ज़"], "vakil advocate court legal notice registry stamp licence license"],
  need_freelancer: [["Graphic design & logo", "Video editing", "Content writing", "Translation", "Data entry", "Photography"],
    ["ग्राफ़िक डिज़ाइन और लोगो", "वीडियो एडिटिंग", "कंटेंट राइटिंग", "अनुवाद", "डेटा एंट्री", "फ़ोटोग्राफ़ी"], "designer editor writer photographer part time parttime typing"],
  need_delivery: [["Local goods delivery", "Courier & parcels", "Tempo for goods", "Food delivery", "Transport to another city"],
    ["लोकल माल डिलीवरी", "कूरियर और पार्सल", "सामान के लिए टेम्पो", "खाने की डिलीवरी", "दूसरे शहर तक ट्रांसपोर्ट"], `${VEHICLE_WORDS} courier parcel transport shifting loader`],
  need_training: [["Staff training", "Sales training", "Computer training", "Skill courses", "Business training"],
    ["स्टाफ की ट्रेनिंग", "सेल्स ट्रेनिंग", "कंप्यूटर ट्रेनिंग", "हुनर के कोर्स", "बिज़नेस ट्रेनिंग"], TEACH_WORDS],
  need_franchise: [["Open a known brand's shop", "Food or tea franchise", "Retail store franchise", "Education franchise"],
    ["जाने-माने ब्रांड की दुकान खोलना", "फ़ूड या चाय की फ्रैंचाइज़", "रिटेल स्टोर फ्रैंचाइज़", "एजुकेशन फ्रैंचाइज़"], "brand outlet dealership agency"],
  buy_product: [["Goods in large quantity", "Grocery & food items", "Cloth & garments", "Hardware & electrical goods", "Raw material"],
    ["ज़्यादा मात्रा में माल", "किराना और खाने का सामान", "कपड़ा और गारमेंट", "हार्डवेयर और बिजली का सामान", "कच्चा माल"], `${PRODUCT_WORDS} kharidna purchase bulk thok`],
  learn_skill: [["Cooking & baking", "Tailoring & mehndi", "Computer & English", "Beautician course", "Driving", "Repair work"],
    ["खाना बनाना और बेकिंग", "सिलाई और मेहंदी", "कंप्यूटर और अंग्रेज़ी", "ब्यूटीशियन कोर्स", "ड्राइविंग", "रिपेयर का काम"], TEACH_WORDS],
  need_vehicle: [["Bike or scooter on rent", "Auto or e-rickshaw", "Tempo or pickup", "Car or van"],
    ["किराए पर बाइक या स्कूटर", "ऑटो या ई-रिक्शा", "टेम्पो या पिकअप", "कार या वैन"], VEHICLE_WORDS],
  need_other: [["Anything not in this list: choose this and write it in your own words"], ["इस सूची में जो नहीं है: इसे चुनें और अपने शब्दों में लिखें"], ""],
  // Offer -----------------------------------------------------------------------------------------------------------
  offer_service: [["Cooking, catering & tiffin", "Tailoring", "Repair (AC, mobile, electrical, plumbing)", "House cleaning", "Beauty & salon", "Photos & video", "Child care & patient care", "Tuition", "Construction & interiors"],
    ["खाना, कैटरिंग और टिफ़िन", "सिलाई", "रिपेयर (AC, मोबाइल, बिजली, प्लंबिंग)", "घर की सफ़ाई", "ब्यूटी और सैलून", "फ़ोटो और वीडियो", "बच्चों और मरीज़ की देखभाल", "ट्यूशन", "निर्माण और इंटीरियर"], `${SKILL_WORDS} seva service`, true],
  offer_collaboration: [["Joint offers with another business", "Promote each other", "Share customers", "Combined events"],
    ["दूसरे बिज़नेस के साथ मिलकर ऑफ़र", "एक-दूसरे का प्रचार", "ग्राहक साझा करना", "मिलकर इवेंट"], "tie-up tieup collab joint sath saath milkar"],
  offer_work: [["Job in a shop or office", "Daily-wage work", "Cook, driver, tailor, electrician…", "Helper or delivery", "House help & child care", "Part-time work"],
    ["दुकान या ऑफ़िस में नौकरी", "दिहाड़ी का काम", "रसोइया, ड्राइवर, दर्ज़ी, इलेक्ट्रीशियन…", "हेल्पर या डिलीवरी", "घर का काम और बच्चों की देखभाल", "पार्ट-टाइम काम"], `${SKILL_WORDS} job naukri rozgar kaam dihadi part time parttime fresher`, true],
  offer_space: [["Shop on rent", "Office space", "Godown", "Room or terrace", "Space inside your shop"],
    ["किराए पर दुकान", "ऑफ़िस की जगह", "गोदाम", "कमरा या छत", "दुकान के अंदर जगह"], `${ROOM_WORDS} warehouse terrace chhat khali`],
  offer_franchise: [["Let others open your brand", "Food or tea outlets", "Retail outlets", "Coaching or school branches"],
    ["दूसरों को अपना ब्रांड खोलने देना", "फ़ूड या चाय के आउटलेट", "रिटेल आउटलेट", "कोचिंग या स्कूल की ब्रांच"], "brand outlet dealership agency branch"],
  sell_product: [["Goods in bulk", "Your own products", "Food & grocery items", "Clothes", "Handmade items", "Extra stock"],
    ["थोक में माल", "आपके अपने प्रोडक्ट", "खाने और किराने का सामान", "कपड़े", "हाथ से बने सामान", "बचा हुआ स्टॉक"], `${PRODUCT_WORDS} bechna becho sale handmade thok wholesale`],
  sell_machine: [["New machine", "Used machine", "Sewing or food machine", "Printing machine", "Generator"],
    ["नई मशीन", "पुरानी मशीन", "सिलाई या फ़ूड मशीन", "प्रिंटिंग मशीन", "जनरेटर"], "machinery equipment mixer oven sewing silai generator atta chakki bechna second hand secondhand"],
  teach_skill: [["Cooking & baking", "Tailoring & mehndi", "Computer & English", "School tuition", "Music, dance & yoga", "Repair skills"],
    ["खाना बनाना और बेकिंग", "सिलाई और मेहंदी", "कंप्यूटर और अंग्रेज़ी", "स्कूल की ट्यूशन", "संगीत, डांस और योग", "रिपेयर का हुनर"], `${TEACH_WORDS} sikhana music dance maths science`],
  offer_influencer: [["Instagram or YouTube page", "Promote local shops", "Reviews & reels", "Food or fashion page"],
    ["इंस्टाग्राम या यूट्यूब पेज", "लोकल दुकानों का प्रचार", "रिव्यू और रील", "फ़ूड या फ़ैशन पेज"], "blogger vlogger reel reels youtuber creator instagram facebook"],
  offer_money: [["Lend to a business", "Invest in a business", "Become a money partner", "Fund a new shop"],
    ["बिज़नेस को उधार देना", "बिज़नेस में पैसा लगाना", "पैसे वाला पार्टनर बनना", "नई दुकान में पैसा लगाना"], MONEY_WORDS],
  offer_vehicle: [["Bike or scooter on rent", "Auto or e-rickshaw", "Tempo or truck", "Car or van"],
    ["किराए पर बाइक या स्कूटर", "ऑटो या ई-रिक्शा", "टेम्पो या ट्रक", "कार या वैन"], `${VEHICLE_WORDS} khali idle`],
  offer_sales_agent: [["Sell goods for commission", "Field sales", "Take orders from shops", "Sell to people you know"],
    ["कमीशन पर माल बेचना", "फ़ील्ड सेल्स", "दुकानों से ऑर्डर लेना", "जान-पहचान में बेचना"], "commission agent salesman selling broker dalal mr marketing"],
  offer_delivery: [["Deliver by cycle or bike", "Tempo delivery", "Parcels & courier", "Food & grocery delivery"],
    ["साइकिल या बाइक से डिलीवरी", "टेम्पो से डिलीवरी", "पार्सल और कूरियर", "खाने और किराने की डिलीवरी"], `${VEHICLE_WORDS} courier parcel transport shifting`],
  offer_marketing: [["Posters & pamphlets", "WhatsApp promotion", "Social media handling", "Ads for local shops"],
    ["पोस्टर और पर्चे", "व्हाट्सऐप प्रचार", "सोशल मीडिया संभालना", "लोकल दुकानों के विज्ञापन"], "ads advertisement vigyapan prachar flyer hoarding seo digital banner"],
  offer_professional: [["Accounts & GST", "Legal work", "Website & app", "Graphic design", "Consulting"],
    ["हिसाब और GST", "कानूनी काम", "वेबसाइट और ऐप", "ग्राफ़िक डिज़ाइन", "सलाह"], "ca accountant munim tally vakil advocate lawyer developer programmer designer logo tax itr consultant"],
  offer_mentoring: [["Business advice", "Help new shop owners", "Career guidance", "Share your experience"],
    ["बिज़नेस की सलाह", "नए दुकानदारों की मदद", "करियर की सलाह", "अपना अनुभव बताना"], "salah margdarshan advice mentor guide consultant"],
  offer_manufacturing: [["Make goods for other businesses", "Stitching unit", "Food products", "Packaging & boxes", "Job work"],
    ["दूसरे बिज़नेस के लिए माल बनाना", "सिलाई यूनिट", "खाने के प्रोडक्ट", "पैकिंग और डिब्बे", "जॉब वर्क"], `${PRODUCT_WORDS} factory karkhana maker oem jobwork`],
  offer_distribution: [["Take goods to shops in your area", "Distributor", "Wholesale supply", "Dealer or stockist"],
    ["आपके इलाके की दुकानों तक माल पहुँचाना", "डिस्ट्रीब्यूटर", "थोक सप्लाई", "डीलर या स्टॉकिस्ट"], `${PRODUCT_WORDS} dealer agency wholesaler stockist supply`],
  offer_other: [["Anything not in this list: choose this and write it in your own words"], ["इस सूची में जो नहीं है: इसे चुनें और अपने शब्दों में लिखें"], ""],
  // Announce --------------------------------------------------------------------------------------------------------
  announce_news: [["New product or service", "New timings", "Shop moved", "Award or milestone"],
    ["नया प्रोडक्ट या सेवा", "नया समय", "दुकान की नई जगह", "इनाम या उपलब्धि"], "khabar news update"],
  announce_opening: [["New shop or stall", "New branch", "Grand opening"],
    ["नई दुकान या स्टॉल", "नई ब्रांच", "ग्रैंड ओपनिंग"], "udghatan opening launch"],
  announce_offer: [["Discount", "Festival sale", "Buy one, get one", "Special price"],
    ["छूट", "त्योहार की सेल", "एक के साथ एक", "ख़ास दाम"], "discount chhoot sale offer"],
  announce_event: [["Mela or exhibition", "Workshop", "Health or skill camp", "Business meet"],
    ["मेला या प्रदर्शनी", "वर्कशॉप", "स्वास्थ्य या हुनर शिविर", "बिज़नेस मीट"], "mela camp shivir exhibition"],
};

/** Form lists that also say what a post type covers. Lists of more than 12 choices (trades, roles) are always included. */
const FORM_FIELDS = { offer_service: ["cuisine", "garment", "repair_type", "cleaning_type", "beauty_service", "shoot_type", "design_type", "subject", "digital_service", "accounts_service", "work_type"] };

function formWords(slug) {
  let form;
  try { form = JSON.parse(readFileSync(new URL(`../supabase/forms/post/${slug}.json`, import.meta.url), "utf8")); } catch { return []; }
  return (form.fields ?? [])
    .filter((f) => f.options && (f.options.length > 12 || FORM_FIELDS[slug]?.includes(f.key)))
    .flatMap((f) => f.options.filter((o) => o.value !== "other").flatMap((o) => [o.label_en, o.label_hi]));
}

const tradeWords = TRADES.filter((t) => t.value !== "other").map((t) => tradeSearchText(t.value));
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const arr = (a) => `array[${a.map(q).join(", ")}]::text[]`;
const tidy = (parts) => {
  const seen = new Set();
  return parts.join(" ").toLowerCase().split(/\s+/).filter((w) => w && !seen.has(w) && seen.add(w)).join(" ");
};

for (const [slug, [en, hi]] of Object.entries(TYPES)) {
  if (en.length !== hi.length) throw new Error(`${slug}: ${en.length} English vs ${hi.length} Hindi examples`);
}
const sql = `-- GENERATED by scripts/post-type-examples.mjs (pnpm post-types:build). Do not edit by hand. Idempotent.
-- What each post type covers (the ⓘ) and its search words (migration 20261107000004).

${Object.entries(TYPES).map(([slug, [en, hi, words, trades]]) =>
  `update public.post_types set examples_en = ${arr(en)},\n  examples_hi = ${arr(hi)},\n  keywords = ${q(tidy([words, ...formWords(slug), ...(trades ? tradeWords : [])]))}\n  where slug = ${q(slug)};`).join("\n")}
`;
writeFileSync(new URL("../supabase/seed/07_post_type_examples.sql", import.meta.url), sql);
console.log(`examples for ${Object.keys(TYPES).length} post types -> supabase/seed/07_post_type_examples.sql`);
