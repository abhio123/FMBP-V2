/**
 * Trades an individual (not a business) can pick at sign-up: "Rohit · Bhatura maker · Noida". The same values (and
 * icons) are the job / skill choices of the Looking for work and Need skilled person forms, so a profile and its posts
 * speak the same words. Common local trades; "Other" takes their own words. `icon` is a line icon (Ionicons) name; `category` is the business category the
 * profile is filed under (feeds and search use it).
 */
export type Trade = { value: string; en: string; hi: string; icon: string; category: string };

export const TRADES: readonly Trade[] = [
  { value: "cook", en: "Cook", hi: "रसोइया", icon: "restaurant-outline", category: "food_restaurant" },
  { value: "chinese_cook", en: "Chinese / fast-food cook", hi: "चाइनीज़ / फास्ट-फूड कुक", icon: "fast-food-outline", category: "food_restaurant" },
  { value: "tandoor_cook", en: "Tandoor / roti maker", hi: "तंदूर / रोटी वाला", icon: "flame-outline", category: "food_restaurant" },
  { value: "halwai", en: "Halwai (sweets)", hi: "हलवाई", icon: "cafe-outline", category: "food_restaurant" },
  { value: "baker", en: "Baker / cake maker", hi: "बेकर / केक बनाने वाला", icon: "cafe-outline", category: "food_restaurant" },
  { value: "chai_juice", en: "Tea / juice maker", hi: "चाय / जूस वाला", icon: "cafe-outline", category: "food_restaurant" },
  { value: "waiter", en: "Waiter / server", hi: "वेटर", icon: "restaurant-outline", category: "food_restaurant" },
  { value: "kitchen_helper", en: "Kitchen helper / dishwasher", hi: "किचन हेल्पर / बर्तन धोने वाला", icon: "water-outline", category: "food_restaurant" },
  { value: "caterer", en: "Caterer", hi: "कैटरर", icon: "fast-food-outline", category: "events" },
  { value: "tailor", en: "Tailor", hi: "दर्ज़ी", icon: "shirt-outline", category: "garments_fashion" },
  { value: "embroidery", en: "Embroidery / zari worker", hi: "कढ़ाई / ज़री कारीगर", icon: "brush-outline", category: "garments_fashion" },
  { value: "barber", en: "Barber", hi: "नाई", icon: "cut-outline", category: "beauty_salon" },
  { value: "beautician", en: "Beautician", hi: "ब्यूटीशियन", icon: "color-wand-outline", category: "beauty_salon" },
  { value: "makeup_artist", en: "Makeup artist", hi: "मेकअप आर्टिस्ट", icon: "sparkles-outline", category: "beauty_salon" },
  { value: "mehndi", en: "Mehndi artist", hi: "मेहंदी आर्टिस्ट", icon: "brush-outline", category: "beauty_salon" },
  { value: "massage", en: "Massage / spa therapist", hi: "मसाज / स्पा थेरेपिस्ट", icon: "body-outline", category: "beauty_salon" },
  { value: "electrician", en: "Electrician", hi: "इलेक्ट्रीशियन", icon: "flash-outline", category: "electrical_electronics" },
  { value: "inverter_solar", en: "Inverter / solar technician", hi: "इन्वर्टर / सोलर टेक्नीशियन", icon: "sunny-outline", category: "electrical_electronics" },
  { value: "plumber", en: "Plumber", hi: "प्लंबर", icon: "water-outline", category: "home_services" },
  { value: "carpenter", en: "Carpenter", hi: "बढ़ई", icon: "hammer-outline", category: "construction" },
  { value: "painter", en: "Painter", hi: "पेंटर", icon: "color-fill-outline", category: "construction" },
  { value: "mason", en: "Mason (construction)", hi: "मिस्त्री", icon: "construct-outline", category: "construction" },
  { value: "tile_fitter", en: "Tile / marble fitter", hi: "टाइल / मार्बल मिस्त्री", icon: "grid-outline", category: "construction" },
  { value: "pop_ceiling", en: "POP / false ceiling worker", hi: "POP / फ़ॉल्स सीलिंग कारीगर", icon: "albums-outline", category: "construction" },
  { value: "welder", en: "Welder", hi: "वेल्डर", icon: "flame-outline", category: "construction" },
  { value: "fabricator", en: "Fabricator (gates, grills)", hi: "फ़ैब्रिकेटर (गेट, ग्रिल)", icon: "construct-outline", category: "construction" },
  { value: "glass_aluminium", en: "Glass / aluminium fitter", hi: "शीशा / एल्युमिनियम फ़िटर", icon: "albums-outline", category: "construction" },
  { value: "sofa_polish", en: "Sofa maker / furniture polish", hi: "सोफ़ा / फ़र्नीचर पॉलिश", icon: "bed-outline", category: "construction" },
  { value: "labour", en: "Labour / construction helper", hi: "मज़दूर / बेलदार", icon: "people-outline", category: "construction" },
  { value: "driver", en: "Driver", hi: "ड्राइवर", icon: "car-outline", category: "logistics" },
  { value: "auto_driver", en: "Auto / e-rickshaw driver", hi: "ऑटो / ई-रिक्शा ड्राइवर", icon: "car-outline", category: "logistics" },
  { value: "truck_driver", en: "Truck / tempo driver", hi: "ट्रक / टेम्पो ड्राइवर", icon: "bus-outline", category: "logistics" },
  { value: "delivery", en: "Delivery person", hi: "डिलीवरी बॉय / गर्ल", icon: "bicycle-outline", category: "logistics" },
  { value: "loader", en: "Loader / packer", hi: "लोडर / पैकर", icon: "cube-outline", category: "logistics" },
  { value: "mechanic", en: "Mechanic", hi: "मैकेनिक", icon: "build-outline", category: "automobile" },
  { value: "ac_repair", en: "AC / fridge mechanic", hi: "AC / फ्रिज मैकेनिक", icon: "snow-outline", category: "home_services" },
  { value: "appliance_repair", en: "Washing machine / appliance repair", hi: "वॉशिंग मशीन / उपकरण रिपेयर", icon: "build-outline", category: "home_services" },
  { value: "ro_technician", en: "RO / water purifier technician", hi: "RO / वाटर प्यूरीफ़ायर टेक्नीशियन", icon: "water-outline", category: "home_services" },
  { value: "mobile_repair", en: "Mobile repair", hi: "मोबाइल रिपेयर", icon: "phone-portrait-outline", category: "technology" },
  { value: "computer_repair", en: "Computer / laptop repair", hi: "कंप्यूटर / लैपटॉप रिपेयर", icon: "laptop-outline", category: "technology" },
  { value: "cctv", en: "CCTV / camera technician", hi: "CCTV / कैमरा टेक्नीशियन", icon: "videocam-outline", category: "technology" },
  { value: "computer", en: "Computer operator", hi: "कंप्यूटर ऑपरेटर", icon: "desktop-outline", category: "technology" },
  { value: "data_entry", en: "Data entry operator", hi: "डेटा एंट्री ऑपरेटर", icon: "keypad-outline", category: "technology" },
  { value: "tutor", en: "Teacher / tutor", hi: "टीचर / ट्यूटर", icon: "school-outline", category: "education" },
  { value: "music_dance", en: "Music / dance teacher", hi: "संगीत / डांस टीचर", icon: "musical-notes-outline", category: "education" },
  { value: "yoga_gym", en: "Yoga / gym trainer", hi: "योग / जिम ट्रेनर", icon: "barbell-outline", category: "health_wellness" },
  { value: "nurse", en: "Nurse / ward boy", hi: "नर्स / वार्ड बॉय", icon: "medkit-outline", category: "health_wellness" },
  { value: "caretaker", en: "Elderly / patient caretaker", hi: "बुज़ुर्ग / मरीज़ की देखभाल", icon: "heart-outline", category: "health_wellness" },
  { value: "babysitter", en: "Babysitter / nanny", hi: "आया / बेबीसिटर", icon: "happy-outline", category: "home_services" },
  { value: "salesperson", en: "Salesperson", hi: "सेल्समैन / सेल्सगर्ल", icon: "pricetag-outline", category: "retail_shop" },
  { value: "cashier", en: "Cashier", hi: "कैशियर", icon: "calculator-outline", category: "retail_shop" },
  { value: "helper", en: "Helper", hi: "हेल्पर", icon: "hand-left-outline", category: "retail_shop" },
  { value: "store_keeper", en: "Store keeper", hi: "स्टोर कीपर", icon: "file-tray-stacked-outline", category: "retail_shop" },
  { value: "receptionist", en: "Receptionist", hi: "रिसेप्शनिस्ट", icon: "call-outline", category: "freelance" },
  { value: "telecaller", en: "Telecaller / customer care", hi: "टेलीकॉलर / कस्टमर केयर", icon: "headset-outline", category: "freelance" },
  { value: "accountant", en: "Accountant / munim", hi: "अकाउंटेंट / मुनीम", icon: "calculator-outline", category: "legal_accounting" },
  { value: "office_boy", en: "Office boy / peon", hi: "ऑफ़िस बॉय / चपरासी", icon: "briefcase-outline", category: "freelance" },
  { value: "security", en: "Security guard", hi: "सिक्योरिटी गार्ड", icon: "shield-outline", category: "other" },
  { value: "cleaner", en: "Cleaner / house help", hi: "सफ़ाई / घर का काम", icon: "sparkles-outline", category: "home_services" },
  { value: "gardener", en: "Gardener / mali", hi: "माली", icon: "flower-outline", category: "agriculture" },
  { value: "farm_worker", en: "Farm / dairy worker", hi: "खेत / डेयरी मज़दूर", icon: "leaf-outline", category: "agriculture" },
  { value: "photographer", en: "Photographer / videographer", hi: "फ़ोटोग्राफ़र / वीडियोग्राफ़र", icon: "camera-outline", category: "events" },
  { value: "decorator", en: "Tent / flower decorator", hi: "टेंट / फूल डेकोरेटर", icon: "flower-outline", category: "events" },
  { value: "dj_sound", en: "DJ / sound operator", hi: "DJ / साउंड ऑपरेटर", icon: "musical-notes-outline", category: "events" },
  { value: "pandit", en: "Pandit / priest", hi: "पंडित / पुजारी", icon: "book-outline", category: "other" },
  { value: "cobbler", en: "Cobbler / shoe repair", hi: "मोची", icon: "footsteps-outline", category: "home_services" },
  { value: "goldsmith", en: "Goldsmith / jewellery maker", hi: "सुनार / ज्वेलरी कारीगर", icon: "diamond-outline", category: "retail_shop" },
  { value: "other", en: "Other", hi: "कुछ और", icon: "ellipsis-horizontal-circle-outline", category: "freelance" },
];

/** What each trade covers: the ⓘ next to it, and search words ("blouse" finds Tailor). */
export const TRADE_INCLUDES: Readonly<Record<string, { en: readonly string[]; hi: readonly string[] }>> = {
  cook: { en: ["Home-style / North Indian food","South Indian food","Hotel or dhaba cook","Cooking at homes","Party & wedding cook"], hi: ["घर जैसा / उत्तर भारतीय खाना","दक्षिण भारतीय खाना","होटल या ढाबे का रसोइया","घरों में खाना बनाना","पार्टी और शादी का रसोइया"] },
  chinese_cook: { en: ["Chowmein & fried rice","Momos & rolls","Burger, pizza & sandwich","Street-food stall cook"], hi: ["चाऊमीन और फ्राइड राइस","मोमोज़ और रोल","बर्गर, पिज़्ज़ा और सैंडविच","स्ट्रीट फ़ूड स्टॉल का कुक"] },
  tandoor_cook: { en: ["Tandoori roti & naan","Tandoori chicken & kebab","Bhatura & paratha","Chapati maker"], hi: ["तंदूरी रोटी और नान","तंदूरी चिकन और कबाब","भटूरा और पराठा","चपाती बनाने वाला"] },
  halwai: { en: ["Mithai & laddoo","Namkeen & snacks","Samosa & kachori","Jalebi","Wedding sweets"], hi: ["मिठाई और लड्डू","नमकीन और नाश्ता","समोसा और कचौरी","जलेबी","शादी की मिठाई"] },
  baker: { en: ["Cakes & pastries","Bread & buns","Biscuits & cookies","Home baker"], hi: ["केक और पेस्ट्री","ब्रेड और बन","बिस्किट और कुकीज़","घर पर बेकिंग"] },
  chai_juice: { en: ["Tea & coffee","Fruit juice & shakes","Sugarcane juice","Lassi & cold drinks"], hi: ["चाय और कॉफ़ी","फलों का जूस और शेक","गन्ने का रस","लस्सी और ठंडे पेय"] },
  waiter: { en: ["Restaurant & hotel waiter","Serving at parties & weddings","Table cleaning","Taking orders"], hi: ["रेस्टोरेंट और होटल का वेटर","पार्टी और शादी में परोसना","टेबल की सफ़ाई","ऑर्डर लेना"] },
  kitchen_helper: { en: ["Washing dishes","Cutting vegetables","Helping the cook","Kitchen cleaning"], hi: ["बर्तन धोना","सब्ज़ी काटना","रसोइये की मदद","रसोई की सफ़ाई"] },
  caterer: { en: ["Wedding & party food","Office lunch","Tiffin supply","Bulk cooking"], hi: ["शादी और पार्टी का खाना","ऑफ़िस का लंच","टिफ़िन सप्लाई","बड़ी मात्रा में खाना बनाना"] },
  tailor: { en: ["Gents tailor (shirt, pant, suit)","Ladies tailor (blouse, suit, lehenga)","Kids clothes","Alterations & repairs","Uniform stitching","Boutique & factory stitching"], hi: ["जेंट्स टेलर (शर्ट, पैंट, सूट)","लेडीज़ टेलर (ब्लाउज़, सूट, लहंगा)","बच्चों के कपड़े","कपड़ों की फिटिंग और मरम्मत","यूनिफ़ॉर्म की सिलाई","बुटीक और फ़ैक्ट्री की सिलाई"] },
  embroidery: { en: ["Hand embroidery","Zari & zardozi","Machine embroidery","Sequins & stone work"], hi: ["हाथ की कढ़ाई","ज़री और ज़रदोज़ी","मशीन की कढ़ाई","सितारे और स्टोन का काम"] },
  barber: { en: ["Hair cutting","Shaving & beard","Hair colour","Head massage","Salon or home service"], hi: ["बाल काटना","शेविंग और दाढ़ी","बालों में रंग","सिर की मालिश","सैलून या घर पर सर्विस"] },
  beautician: { en: ["Facial & clean-up","Threading & waxing","Haircut & hair colour","Manicure & pedicure","Parlour or home service"], hi: ["फ़ेशियल और क्लीन-अप","थ्रेडिंग और वैक्सिंग","बाल काटना और रंगना","मैनीक्योर और पेडीक्योर","पार्लर या घर पर सर्विस"] },
  makeup_artist: { en: ["Bridal makeup","Party makeup","Hair styling","Saree draping"], hi: ["दुल्हन का मेकअप","पार्टी मेकअप","हेयर स्टाइलिंग","साड़ी पहनाना"] },
  mehndi: { en: ["Bridal mehndi","Festival mehndi","Arabic designs","Party orders"], hi: ["दुल्हन की मेहंदी","त्योहार की मेहंदी","अरेबिक डिज़ाइन","पार्टी के ऑर्डर"] },
  massage: { en: ["Body massage","Spa therapy","Head & foot massage","Home service"], hi: ["बॉडी मसाज","स्पा थेरेपी","सिर और पैरों की मालिश","घर पर सर्विस"] },
  electrician: { en: ["House wiring","Fan, light & switch fitting","MCB & meter board","Motor connection","Shop & office electric work"], hi: ["घर की वायरिंग","पंखा, लाइट और स्विच लगाना","MCB और मीटर बोर्ड","मोटर का कनेक्शन","दुकान और ऑफ़िस का बिजली का काम"] },
  inverter_solar: { en: ["Inverter & battery fitting","Battery service","Solar panel fitting","UPS repair"], hi: ["इन्वर्टर और बैटरी लगाना","बैटरी की सर्विस","सोलर पैनल लगाना","UPS रिपेयर"] },
  plumber: { en: ["Pipe fitting","Taps & leakage","Toilet & bathroom fitting","Water tank & motor","Blocked drains"], hi: ["पाइप फ़िटिंग","नल और लीकेज","टॉयलेट और बाथरूम फ़िटिंग","पानी की टंकी और मोटर","बंद नाली"] },
  carpenter: { en: ["Doors & windows","Beds, almirah & tables","Modular kitchen","Furniture repair","Shop counters"], hi: ["दरवाज़े और खिड़कियाँ","बेड, अलमारी और टेबल","मॉड्यूलर किचन","फ़र्नीचर की मरम्मत","दुकान के काउंटर"] },
  painter: { en: ["House painting","Putty & whitewash","Wood polish paint","Texture & design walls","Shop & office painting"], hi: ["घर की पुताई","पुट्टी और सफ़ेदी","लकड़ी का पेंट","टेक्सचर और डिज़ाइन वाली दीवार","दुकान और ऑफ़िस की पुताई"] },
  mason: { en: ["Brick & plaster work","New house building","Repair & renovation","Concrete & lintel","Bathroom building"], hi: ["ईंट और प्लास्टर का काम","नया घर बनाना","मरम्मत और नवीनीकरण","कंक्रीट और लेंटर","बाथरूम बनाना"] },
  tile_fitter: { en: ["Floor tiles","Wall & bathroom tiles","Marble & granite","Kitchen counters"], hi: ["फ़र्श की टाइल","दीवार और बाथरूम की टाइल","मार्बल और ग्रेनाइट","किचन के काउंटर"] },
  pop_ceiling: { en: ["False ceiling","POP design","Gypsum board","Wall panels"], hi: ["फ़ॉल्स सीलिंग","POP डिज़ाइन","जिप्सम बोर्ड","वॉल पैनल"] },
  welder: { en: ["Arc & gas welding","Gate & grill repair","Vehicle body welding","Workshop welding"], hi: ["आर्क और गैस वेल्डिंग","गेट और ग्रिल की मरम्मत","गाड़ी की बॉडी की वेल्डिंग","वर्कशॉप की वेल्डिंग"] },
  fabricator: { en: ["Iron gates & grills","Shutters","Sheds & stairs","Steel railing"], hi: ["लोहे के गेट और ग्रिल","शटर","शेड और सीढ़ियाँ","स्टील की रेलिंग"] },
  glass_aluminium: { en: ["Aluminium windows & doors","Glass partitions","Shop front glass","Mirrors"], hi: ["एल्युमिनियम की खिड़की और दरवाज़े","शीशे के पार्टीशन","दुकान का शीशा","आईने"] },
  sofa_polish: { en: ["New sofa making","Sofa repair & cover","Furniture polish","Mattress & cushions"], hi: ["नया सोफ़ा बनाना","सोफ़ा की मरम्मत और कवर","फ़र्नीचर पॉलिश","गद्दे और कुशन"] },
  labour: { en: ["Construction helper","Loading & digging","Shifting goods","Daily wage work"], hi: ["निर्माण में मदद","लोडिंग और खुदाई","सामान ढोना","दिहाड़ी का काम"] },
  driver: { en: ["Car driver","Personal or family driver","Office or school van","Cab driver"], hi: ["कार ड्राइवर","निजी या परिवार का ड्राइवर","ऑफ़िस या स्कूल वैन","कैब ड्राइवर"] },
  auto_driver: { en: ["Auto rickshaw","E-rickshaw","Passenger route","School children pick-up"], hi: ["ऑटो रिक्शा","ई-रिक्शा","सवारी वाला रूट","स्कूल के बच्चों को लाना-ले जाना"] },
  truck_driver: { en: ["Truck","Tempo & pickup","Goods delivery","Long-distance driving"], hi: ["ट्रक","टेम्पो और पिकअप","सामान की डिलीवरी","लंबी दूरी की ड्राइविंग"] },
  delivery: { en: ["Food delivery","Parcel & courier","Grocery delivery","Shop goods delivery","Bike or cycle"], hi: ["खाने की डिलीवरी","पार्सल और कूरियर","किराने की डिलीवरी","दुकान के सामान की डिलीवरी","बाइक या साइकिल"] },
  loader: { en: ["Loading & unloading","Packing goods","Warehouse helper","House shifting"], hi: ["चढ़ाना-उतारना","सामान की पैकिंग","गोदाम का हेल्पर","घर का सामान शिफ़्ट करना"] },
  mechanic: { en: ["Car mechanic","Bike & scooter mechanic","Denting & painting","Tyre & puncture","Service & oil change"], hi: ["कार मैकेनिक","बाइक और स्कूटर मैकेनिक","डेंटिंग और पेंटिंग","टायर और पंक्चर","सर्विस और ऑयल बदलना"] },
  ac_repair: { en: ["AC fitting & service","AC gas filling","Fridge repair","Cooler repair","Deep freezer"], hi: ["AC लगाना और सर्विस","AC में गैस भरना","फ़्रिज रिपेयर","कूलर रिपेयर","डीप फ़्रीज़र"] },
  appliance_repair: { en: ["Washing machine","Microwave & oven","Mixer & iron","TV repair","Geyser"], hi: ["वॉशिंग मशीन","माइक्रोवेव और ओवन","मिक्सर और प्रेस","TV रिपेयर","गीज़र"] },
  ro_technician: { en: ["RO fitting","Filter change","RO service & repair","Water tank cleaning"], hi: ["RO लगाना","फ़िल्टर बदलना","RO की सर्विस और रिपेयर","पानी की टंकी की सफ़ाई"] },
  mobile_repair: { en: ["Screen & battery change","Charging problems","Software & unlocking","Speaker & mic repair"], hi: ["स्क्रीन और बैटरी बदलना","चार्जिंग की समस्या","सॉफ़्टवेयर और अनलॉक","स्पीकर और माइक रिपेयर"] },
  computer_repair: { en: ["Laptop & desktop repair","Windows & software install","Printer repair","Data recovery"], hi: ["लैपटॉप और डेस्कटॉप रिपेयर","विंडोज़ और सॉफ़्टवेयर डालना","प्रिंटर रिपेयर","डेटा रिकवरी"] },
  cctv: { en: ["CCTV camera fitting","DVR & mobile viewing setup","Camera repair","Wi-Fi & network wiring"], hi: ["CCTV कैमरा लगाना","DVR और मोबाइल पर देखने की सेटिंग","कैमरा रिपेयर","वाई-फ़ाई और नेटवर्क की वायरिंग"] },
  computer: { en: ["Typing & printouts","Excel & Word","Billing software","Online forms"], hi: ["टाइपिंग और प्रिंट","एक्सेल और वर्ड","बिलिंग सॉफ़्टवेयर","ऑनलाइन फ़ॉर्म"] },
  data_entry: { en: ["Data typing","Excel sheets","Online data work","Form filling"], hi: ["डेटा टाइपिंग","एक्सेल शीट","ऑनलाइन डेटा का काम","फ़ॉर्म भरना"] },
  tutor: { en: ["Home tuition","School subjects","Maths & science","Spoken English","Coaching classes","Online classes"], hi: ["घर पर ट्यूशन","स्कूल के विषय","गणित और विज्ञान","स्पोकन इंग्लिश","कोचिंग क्लास","ऑनलाइन क्लास"] },
  music_dance: { en: ["Singing","Guitar, harmonium & tabla","Dance classes","School & home teaching"], hi: ["गाना","गिटार, हारमोनियम और तबला","डांस क्लास","स्कूल और घर पर सिखाना"] },
  yoga_gym: { en: ["Yoga teacher","Gym trainer","Personal training","Zumba & aerobics"], hi: ["योग टीचर","जिम ट्रेनर","पर्सनल ट्रेनिंग","ज़ुम्बा और एरोबिक्स"] },
  nurse: { en: ["Hospital or clinic nurse","Ward boy / aya","Injection & dressing","Home nursing"], hi: ["अस्पताल या क्लिनिक की नर्स","वार्ड बॉय / आया","इंजेक्शन और पट्टी","घर पर नर्सिंग"] },
  caretaker: { en: ["Elderly care at home","Patient care","Day or night duty","Help with food & medicines"], hi: ["घर पर बुज़ुर्गों की देखभाल","मरीज़ की देखभाल","दिन या रात की ड्यूटी","खाने और दवाई में मदद"] },
  babysitter: { en: ["Baby care","Newborn care","Taking care of children at home","School pick-up"], hi: ["छोटे बच्चे की देखभाल","नवजात की देखभाल","घर पर बच्चों को संभालना","स्कूल से लाना"] },
  salesperson: { en: ["Shop salesman / salesgirl","Showroom sales","Field sales","Promoter in a market or mall"], hi: ["दुकान का सेल्समैन / सेल्सगर्ल","शोरूम की सेल्स","फ़ील्ड सेल्स","बाज़ार या मॉल में प्रमोटर"] },
  cashier: { en: ["Billing counter","Cash handling","Petrol pump or shop cashier","Restaurant counter"], hi: ["बिलिंग काउंटर","नकदी संभालना","पेट्रोल पंप या दुकान का कैशियर","रेस्टोरेंट का काउंटर"] },
  helper: { en: ["Shop helper","Workshop helper","Factory helper","General work"], hi: ["दुकान का हेल्पर","वर्कशॉप का हेल्पर","फ़ैक्ट्री का हेल्पर","सामान्य काम"] },
  store_keeper: { en: ["Stock keeping","Godown management","Issuing goods","Stock register"], hi: ["स्टॉक रखना","गोदाम संभालना","सामान देना","स्टॉक रजिस्टर"] },
  receptionist: { en: ["Front desk","Answering calls","Clinic or hotel reception","Appointments"], hi: ["फ़्रंट डेस्क","कॉल उठाना","क्लिनिक या होटल का रिसेप्शन","अपॉइंटमेंट"] },
  telecaller: { en: ["Calling customers","Customer care","Taking orders on phone","Follow-up calls"], hi: ["ग्राहकों को कॉल करना","कस्टमर केयर","फ़ोन पर ऑर्डर लेना","फ़ॉलो-अप कॉल"] },
  accountant: { en: ["Tally & billing","GST & returns","Cash book & ledger","Salary records"], hi: ["टैली और बिलिंग","GST और रिटर्न","कैश बुक और खाता","वेतन का हिसाब"] },
  office_boy: { en: ["Office cleaning","Tea & water","Files & bank work","Local errands"], hi: ["ऑफ़िस की सफ़ाई","चाय और पानी","फ़ाइल और बैंक का काम","स्थानीय काम"] },
  security: { en: ["Society guard","Shop or office guard","Factory guard","Day or night duty","Bouncer"], hi: ["सोसाइटी का गार्ड","दुकान या ऑफ़िस का गार्ड","फ़ैक्ट्री का गार्ड","दिन या रात की ड्यूटी","बाउंसर"] },
  cleaner: { en: ["House cleaning","Jhadu-pocha & dishes","Office & shop cleaning","Bathroom cleaning","Deep cleaning"], hi: ["घर की सफ़ाई","झाड़ू-पोछा और बर्तन","ऑफ़िस और दुकान की सफ़ाई","बाथरूम की सफ़ाई","गहरी सफ़ाई"] },
  gardener: { en: ["Home garden","Society & park","Lawn cutting","Plants & pots"], hi: ["घर का बगीचा","सोसाइटी और पार्क","घास काटना","पौधे और गमले"] },
  farm_worker: { en: ["Field work","Milking & cattle care","Harvesting","Poultry work"], hi: ["खेत का काम","दूध निकालना और पशु देखभाल","फ़सल कटाई","मुर्गी पालन का काम"] },
  photographer: { en: ["Wedding photos & video","Events & parties","Shop & product photos","Video editing"], hi: ["शादी की फ़ोटो और वीडियो","इवेंट और पार्टी","दुकान और प्रोडक्ट की फ़ोटो","वीडियो एडिटिंग"] },
  decorator: { en: ["Tent work","Flower decoration","Stage & mandap","Balloon & party decor"], hi: ["टेंट का काम","फूलों की सजावट","स्टेज और मंडप","गुब्बारे और पार्टी की सजावट"] },
  dj_sound: { en: ["DJ at parties","Sound system","Lights","Band & mic setup"], hi: ["पार्टी में DJ","साउंड सिस्टम","लाइट","बैंड और माइक की व्यवस्था"] },
  pandit: { en: ["Puja & havan","Wedding ceremonies","Katha","Astrology"], hi: ["पूजा और हवन","शादी की रस्में","कथा","ज्योतिष"] },
  cobbler: { en: ["Shoe repair","Bag & belt repair","Polish","Zip change"], hi: ["जूते की मरम्मत","बैग और बेल्ट की मरम्मत","पॉलिश","ज़िप बदलना"] },
  goldsmith: { en: ["Gold & silver work","Jewellery repair","Making new designs","Polish & cleaning"], hi: ["सोने और चाँदी का काम","ज्वेलरी की मरम्मत","नए डिज़ाइन बनाना","पॉलिश और सफ़ाई"] },
  other: { en: ["Any other work: choose this and write it in your own words"], hi: ["कोई और काम: इसे चुनें और अपने शब्दों में लिखें"] },
};

/** What a trade covers, in the app's language (empty for values that are not trades). */
export function tradeIncludes(value: string, lang: "en" | "hi"): readonly string[] {
  return TRADE_INCLUDES[value]?.[lang] ?? [];
}

/** Everything search should match for a trade, in both languages. */
export function tradeSearchText(value: string): string {
  const inc = TRADE_INCLUDES[value];
  const trade = TRADES.find((t) => t.value === value);
  return [trade?.en, trade?.hi, ...(inc?.en ?? []), ...(inc?.hi ?? [])].filter(Boolean).join(" ");
}

export function findTrade(value: string | null | undefined): Trade | undefined {
  return value ? TRADES.find((t) => t.value === value) : undefined;
}

/** What an individual does, in their language: their own words for "Other", else the trade's name. */
export function tradeLabel(value: string | null | undefined, other: string | null | undefined, lang: "en" | "hi"): string | null {
  if (value === "other" && other?.trim()) return other.trim();
  const t = findTrade(value);
  return t ? t[lang] : null;
}
