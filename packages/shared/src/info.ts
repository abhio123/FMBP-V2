/**
 * Information pages, shown in the app (Profile → About & help) and on the website (fmbp.app/<slug>, needed for the
 * store listings: privacy policy and account deletion URLs). One source, English and Hindi.
 *
 * DRAFT (2026-11-05): written for review. Before launch a lawyer must review Terms and Privacy, and the [to be filled]
 * items (legal entity, address, grievance officer) must be completed. `{{supportEmail}}` is filled in when rendered.
 * Body text: paragraphs separated by a blank line; lines starting with "• " are list items.
 */
export type Bilingual = { en: string; hi: string };
export type InfoSection = { heading: Bilingual; body: Bilingual };
export type InfoPage = { slug: InfoSlug; icon: string; title: Bilingual; sections: InfoSection[] };
export type InfoSlug = "about" | "safety" | "guidelines" | "help" | "terms" | "privacy";

export const INFO_UPDATED = "2026-11-05";
/** Shown as a note on every page until the texts are reviewed. */
export const INFO_IS_DRAFT = true;

const s = (headingEn: string, headingHi: string, en: string, hi: string): InfoSection => ({ heading: { en: headingEn, hi: headingHi }, body: { en, hi } });

export const INFO_PAGES: InfoPage[] = [
  {
    slug: "about", icon: "🏪", title: { en: "About FMBP", hi: "FMBP के बारे में" },
    sections: [
      s("What FMBP is", "FMBP क्या है",
        "FMBP (Find My Business Partner) helps small businesses, shops, home businesses and skilled workers find each other nearby: customers, suppliers, staff, space, money and partners.",
        "FMBP (Find My Business Partner) छोटे बिज़नेस, दुकानों, घर से चलने वाले काम और हुनरमंद लोगों को आसपास एक-दूसरे को खोजने में मदद करता है: ग्राहक, सप्लायर, स्टाफ, जगह, पैसा और पार्टनर।"),
      s("How it works", "यह कैसे काम करता है",
        "• Post what your business needs or offers, in a few taps.\n• Businesses near you see it and respond.\n• Talk in the app's chat and decide together how to work: paid, rent, partnership or exchange.",
        "• कुछ ही टैप में बताएँ कि आपके बिज़नेस को क्या चाहिए या आप क्या दे सकते हैं।\n• आसपास के बिज़नेस इसे देखकर जवाब देते हैं।\n• ऐप की चैट में बात करें और मिलकर तय करें कि कैसे काम करना है: पैसे से, किराये पर, पार्टनरशिप या अदला-बदली।"),
      s("Free to use", "मुफ़्त",
        "Posting, responding and chatting are free. FMBP does not take a share of your deals.",
        "पोस्ट करना, जवाब देना और चैट करना मुफ़्त है। FMBP आपके सौदों में कोई हिस्सा नहीं लेता।"),
      s("Who we are", "हम कौन हैं",
        "FMBP is run by [legal entity to be filled], [address to be filled]. Contact: {{supportEmail}}",
        "FMBP को [कंपनी का नाम भरना है], [पता भरना है] चलाती है। संपर्क: {{supportEmail}}"),
    ],
  },
  {
    slug: "safety", icon: "🛡️", title: { en: "Stay safe", hi: "सुरक्षित रहें" },
    sections: [
      s("Important", "ज़रूरी बात",
        "FMBP connects businesses; the deals are between you and the other business. FMBP does not check every business or post (only businesses with ✔ are verified) and is not a party to your deals, so it is not responsible for losses from them. Please follow the tips below.",
        "FMBP बिज़नेस को आपस में जोड़ता है; सौदा आपके और दूसरे बिज़नेस के बीच होता है। FMBP हर बिज़नेस या पोस्ट की जाँच नहीं करता (सिर्फ़ ✔ वाले बिज़नेस वेरिफ़ाइड हैं) और आपके सौदे में शामिल नहीं है, इसलिए उससे हुए नुकसान की ज़िम्मेदारी नहीं लेता। कृपया नीचे दी गई बातों का ध्यान रखें।"),
      s("Before you pay or sign", "पैसे देने या साइन करने से पहले",
        "• Never pay the full amount in advance to someone you have not met.\n• See the goods, shop, machine or vehicle yourself before paying.\n• Pay by UPI or bank transfer so there is a record; get a bill or receipt.\n• Put partnership, rent and loan terms in writing, and get legal advice for big amounts.",
        "• जिससे मिले नहीं हैं, उसे पूरी रकम पहले कभी न दें।\n• पैसे देने से पहले सामान, दुकान, मशीन या गाड़ी खुद देखें।\n• UPI या बैंक से भुगतान करें ताकि रिकॉर्ड रहे; बिल या रसीद लें।\n• पार्टनरशिप, किराये और उधार की शर्तें लिखित में रखें, और बड़ी रकम के लिए कानूनी सलाह लें।"),
      s("Protect yourself", "अपनी सुरक्षा",
        "• Never share an OTP, UPI PIN, bank password or card details. FMBP will never ask for them.\n• Meet in a public place or at the business's address, preferably by day.\n• Be careful with offers that look too good to be true or ask for a \"registration fee\".\n• Keep the conversation in FMBP chat until you trust the other side.",
        "• OTP, UPI PIN, बैंक पासवर्ड या कार्ड की जानकारी कभी न दें। FMBP कभी ये नहीं माँगेगा।\n• सार्वजनिक जगह या बिज़नेस के पते पर, हो सके तो दिन में मिलें।\n• बहुत अच्छे लगने वाले ऑफ़र या \"रजिस्ट्रेशन फ़ीस\" माँगने वालों से सावधान रहें।\n• जब तक भरोसा न हो, बात FMBP चैट में ही रखें।"),
      s("If something is wrong", "अगर कुछ गलत लगे",
        "Use \"Report\" on the post or business page, or \"⋯\" in a chat, and block the business if needed. In case of fraud, also call the cyber crime helpline 1930 or report at cybercrime.gov.in.",
        "पोस्ट या बिज़नेस पेज पर \"शिकायत करें\" या चैट में \"⋯\" दबाएँ, और ज़रूरत हो तो बिज़नेस को ब्लॉक करें। धोखाधड़ी होने पर साइबर क्राइम हेल्पलाइन 1930 पर भी कॉल करें या cybercrime.gov.in पर शिकायत करें।"),
    ],
  },
  {
    slug: "guidelines", icon: "📋", title: { en: "Community guidelines", hi: "कम्युनिटी नियम" },
    sections: [
      s("Post honestly", "सच्ची पोस्ट डालें",
        "• Post real needs and offers of your own business, with correct prices, places and photos.\n• One live post of each kind: edit or renew it instead of posting copies.\n• Close a post (Mark as completed) when it is done.",
        "• अपने बिज़नेस की असली ज़रूरत या ऑफ़र डालें, सही दाम, जगह और फोटो के साथ।\n• हर तरह की एक ही चालू पोस्ट: कॉपी डालने के बजाय उसे बदलें या फिर से चालू करें।\n• काम हो जाए तो पोस्ट बंद करें (पूरा हुआ चुनें)।"),
      s("Not allowed", "इनकी अनुमति नहीं है",
        "• Illegal goods or services, weapons, drugs, alcohol or tobacco sales without licence.\n• Adult content, hate, threats, abuse or harassment.\n• Fake businesses, scams, chain or \"double your money\" schemes, asking for advance fees.\n• Spam, repeated posts, or posts in the wrong category.\n• Other people's phone numbers, photos or personal details without permission.",
        "• गैरकानूनी सामान या सेवा, हथियार, नशा, बिना लाइसेंस शराब या तंबाकू की बिक्री।\n• अश्लील बातें, नफ़रत, धमकी, गाली-गलौज या परेशान करना।\n• नकली बिज़नेस, ठगी, चेन या \"पैसा डबल\" वाली स्कीम, पहले फ़ीस माँगना।\n• स्पैम, बार-बार एक ही पोस्ट, या गलत कैटेगरी में पोस्ट।\n• बिना इजाज़त दूसरों के फ़ोन नंबर, फोटो या निजी जानकारी।"),
      s("What happens", "नियम तोड़ने पर",
        "Reported posts are reviewed. A post reported by several businesses is hidden until it is checked. Posts that break these rules are removed, and businesses that break them repeatedly are suspended.",
        "शिकायत वाली पोस्ट की जाँच होती है। कई बिज़नेस की शिकायत वाली पोस्ट जाँच तक छिपा दी जाती है। नियम तोड़ने वाली पोस्ट हटा दी जाती है, और बार-बार नियम तोड़ने वाले बिज़नेस बंद कर दिए जाते हैं।"),
    ],
  },
  {
    slug: "help", icon: "💬", title: { en: "Help & support", hi: "मदद और सहायता" },
    sections: [
      s("How do I post?", "पोस्ट कैसे करें?",
        "Tap Post, choose Need / Offer / Announce, pick what fits, answer a few questions and check the preview before publishing.",
        "पोस्ट दबाएँ, ज़रूरत / ऑफ़र / घोषणा चुनें, सही विकल्प चुनें, कुछ सवालों के जवाब दें और छापने से पहले झलक देख लें।"),
      s("Why can't I post the same thing again?", "वही पोस्ट दोबारा क्यों नहीं डाल सकते?",
        "Each business can have one live post of each kind, so the feed stays clear. Open your existing post to edit or renew it, or mark it completed first.",
        "हर बिज़नेस की हर तरह की एक ही चालू पोस्ट हो सकती है, ताकि फ़ीड साफ़ रहे। अपनी पुरानी पोस्ट खोलकर उसे बदलें या फिर से चालू करें, या पहले उसे पूरा हुआ चुनें।"),
      s("Posts, renewals and photos", "पोस्ट, रिन्यू और फोटो",
        "Posts stay live for 30 days (announcements 7). Renew them from the post page. Change photos, logo and cover from Business → Edit.",
        "पोस्ट 30 दिन चालू रहती है (घोषणा 7 दिन)। पोस्ट पेज से फिर से चालू करें। फोटो, लोगो और कवर बिज़नेस → बदलें से बदलें।"),
      s("Deals, ratings and the Trusted badge", "सौदे, रेटिंग और भरोसेमंद बैज",
        "When you close a post, pick the business you did the deal with. Once they confirm, \"✔ deals done\" goes up on both profiles and you can rate each other. Ratings show after both have rated (or 14 days). 3 confirmed deals with no average below 4★ give the 🏅 Trusted badge and a better place in search.",
        "पोस्ट बंद करते समय वह बिज़नेस चुनें जिससे सौदा हुआ। उनकी पुष्टि के बाद दोनों की प्रोफ़ाइल पर \"✔ सौदे पूरे\" बढ़ता है और आप एक-दूसरे को रेटिंग दे सकते हैं। रेटिंग दोनों के देने के बाद (या 14 दिन बाद) दिखती है। 3 पुष्टि हुए सौदे और 4★ से कम औसत न होने पर 🏅 भरोसेमंद बैज और खोज में बेहतर जगह मिलती है।"),
      s("Report, block, delete", "शिकायत, ब्लॉक, अकाउंट हटाना",
        "Report or block from a post, business page or chat (⋯). Unblock from Business → Blocked businesses. Delete your account from Business → Delete account (you can restore it for 30 days).",
        "पोस्ट, बिज़नेस पेज या चैट (⋯) से शिकायत या ब्लॉक करें। बिज़नेस → ब्लॉक किए गए बिज़नेस से अनब्लॉक करें। बिज़नेस → अकाउंट हटाएँ से अकाउंट हटाएँ (30 दिन तक वापस ला सकते हैं)।"),
      s("Contact us", "हमसे संपर्क करें",
        "Email {{supportEmail}} with your registered phone number. We reply within 2 working days.",
        "अपने रजिस्टर्ड फ़ोन नंबर के साथ {{supportEmail}} पर ईमेल करें। हम 2 कामकाजी दिनों में जवाब देते हैं।"),
    ],
  },
  {
    slug: "terms", icon: "📄", title: { en: "Terms of use", hi: "उपयोग की शर्तें" },
    sections: [
      s("Agreement", "समझौता",
        "By using FMBP you agree to these terms, the Privacy policy and the Community guidelines. FMBP is provided by [legal entity to be filled] (\"we\").",
        "FMBP इस्तेमाल करके आप इन शर्तों, प्राइवेसी पॉलिसी और कम्युनिटी नियमों से सहमत होते हैं। FMBP [कंपनी का नाम भरना है] (\"हम\") द्वारा दिया जाता है।"),
      s("Your account", "आपका अकाउंट",
        "You must be 18 or older and use FMBP for a real business or work. One person per account, verified by your phone number. Keep your phone and OTPs to yourself; you are responsible for what is done from your account.",
        "आपकी उम्र 18 साल या ज़्यादा होनी चाहिए और FMBP का इस्तेमाल असली बिज़नेस या काम के लिए हो। एक व्यक्ति का एक अकाउंट, फ़ोन नंबर से वेरिफ़ाइड। अपना फ़ोन और OTP किसी को न दें; आपके अकाउंट से होने वाले काम की ज़िम्मेदारी आपकी है।"),
      s("Your content", "आपकी जानकारी",
        "You are responsible for your posts, photos and messages: they must be true, legal and yours to share. You allow us to show them in FMBP and in links you share. We may remove content or suspend accounts that break these terms or the guidelines.",
        "आपकी पोस्ट, फोटो और मैसेज की ज़िम्मेदारी आपकी है: वे सच्चे, कानूनी और आपके अपने होने चाहिए। आप हमें उन्हें FMBP में और आपके भेजे लिंक में दिखाने की अनुमति देते हैं। शर्तें या नियम तोड़ने वाली जानकारी हम हटा सकते हैं और अकाउंट बंद कर सकते हैं।"),
      s("Deals between businesses", "बिज़नेस के बीच सौदे",
        "FMBP is a platform to find each other. We are not a party to any deal, do not guarantee any business, payment, product or service, and are not liable for losses from dealings between users, to the extent the law allows.",
        "FMBP एक-दूसरे को खोजने का प्लेटफ़ॉर्म है। हम किसी सौदे में शामिल नहीं हैं, किसी बिज़नेस, भुगतान, सामान या सेवा की गारंटी नहीं देते, और कानून की सीमा तक उपयोगकर्ताओं के आपसी लेन-देन से हुए नुकसान के लिए ज़िम्मेदार नहीं हैं।"),
      s("Ending", "अकाउंट बंद करना",
        "You can delete your account at any time (Business → Delete account). We may suspend accounts that misuse FMBP.",
        "आप कभी भी अपना अकाउंट हटा सकते हैं (बिज़नेस → अकाउंट हटाएँ)। FMBP का गलत इस्तेमाल करने वाले अकाउंट हम बंद कर सकते हैं।"),
      s("Law and grievances", "कानून और शिकायत",
        "These terms follow the laws of India; courts at [city to be filled] have jurisdiction. Grievance officer: [name to be filled], {{supportEmail}}. We acknowledge complaints within 24 hours and resolve them within 15 days.",
        "ये शर्तें भारत के कानून के अनुसार हैं; [शहर भरना है] की अदालतों का अधिकार क्षेत्र होगा। शिकायत अधिकारी: [नाम भरना है], {{supportEmail}}। हम 24 घंटे में शिकायत की पुष्टि करते हैं और 15 दिन में हल करते हैं।"),
    ],
  },
  {
    slug: "privacy", icon: "🔒", title: { en: "Privacy policy", hi: "प्राइवेसी पॉलिसी" },
    sections: [
      s("What we collect", "हम क्या लेते हैं",
        "• Your phone number (to sign in) and name.\n• Your business: name, type, city, area and pincode, photos, description, and contact details you add.\n• Your posts, responses and chat messages.\n• If you ask for ✔ Verified: the business document you send (e.g. GST, Udyam). It is stored privately, seen only by the FMBP staff who check it, and never shown to other users.\n• Technical data: a notification token for your phone and basic usage events to improve the app.",
        "• आपका फ़ोन नंबर (लॉग इन के लिए) और नाम।\n• आपका बिज़नेस: नाम, प्रकार, शहर, इलाका और पिनकोड, फोटो, परिचय, और आपके जोड़े गए संपर्क।\n• आपकी पोस्ट, जवाब और चैट मैसेज।\n• अगर आप ✔ वेरिफ़ाइड के लिए भेजते हैं: आपका बिज़नेस दस्तावेज़ (जैसे GST, उद्यम)। यह निजी रखा जाता है, सिर्फ़ जाँच करने वाले FMBP कर्मचारी देखते हैं, और किसी और यूज़र को कभी नहीं दिखता।\n• तकनीकी जानकारी: नोटिफ़िकेशन के लिए फ़ोन का टोकन और ऐप सुधारने के लिए सामान्य उपयोग की जानकारी।"),
      s("What others see", "दूसरों को क्या दिखता है",
        "Other users see your business profile, posts, city and pincode. Your phone number, WhatsApp and email are never shown by FMBP; you decide what to share in chat. Messages are seen only by the two businesses in the chat.",
        "दूसरे उपयोगकर्ताओं को आपकी बिज़नेस प्रोफ़ाइल, पोस्ट, शहर और पिनकोड दिखते हैं। आपका फ़ोन नंबर, WhatsApp और ईमेल FMBP कभी नहीं दिखाता; चैट में क्या बताना है, आप तय करते हैं। मैसेज सिर्फ़ चैट के दोनों बिज़नेस देखते हैं।"),
      s("Who processes it", "जानकारी कौन संभालता है",
        "We use service providers only to run FMBP: database and storage hosting, SMS for OTPs, Apple/Google for notifications, and an AI service that writes the text of a post from your answers. We do not sell your data.",
        "FMBP चलाने के लिए ही हम सेवा देने वालों का इस्तेमाल करते हैं: डेटाबेस और स्टोरेज, OTP के लिए SMS, नोटिफ़िकेशन के लिए Apple/Google, और आपके जवाबों से पोस्ट का टेक्स्ट लिखने वाली AI सेवा। हम आपकी जानकारी बेचते नहीं हैं।"),
      s("How long we keep it", "कितने समय तक रखते हैं",
        "While your account exists. When you delete your account, your business and posts disappear at once and your personal data is erased after 30 days. Old messages stay visible to the other business as \"Deleted business\".",
        "जब तक आपका अकाउंट है। अकाउंट हटाने पर आपका बिज़नेस और पोस्ट तुरंत हट जाते हैं और 30 दिन बाद आपकी निजी जानकारी मिटा दी जाती है। पुराने मैसेज दूसरे बिज़नेस को \"हटाया गया बिज़नेस\" नाम से दिखते रहते हैं।"),
      s("Your rights", "आपके अधिकार",
        "Under the Digital Personal Data Protection Act 2023 you can access, correct and erase your data, withdraw consent, raise a grievance and nominate someone. Most of this is in the app (Edit, Delete account); for the rest write to {{supportEmail}}. Grievance officer: [name to be filled].",
        "डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट 2023 के तहत आप अपनी जानकारी देख, सुधार और मिटा सकते हैं, सहमति वापस ले सकते हैं, शिकायत कर सकते हैं और किसी को नामित कर सकते हैं। ज़्यादातर काम ऐप में है (बदलें, अकाउंट हटाएँ); बाकी के लिए {{supportEmail}} पर लिखें। शिकायत अधिकारी: [नाम भरना है]।"),
      s("Security and children", "सुरक्षा और बच्चे",
        "Data is sent encrypted and access is limited by strict rules in our database. FMBP is not meant for anyone under 18.",
        "जानकारी एन्क्रिप्ट होकर भेजी जाती है और हमारे डेटाबेस के सख्त नियम पहुँच सीमित रखते हैं। FMBP 18 साल से कम उम्र के लोगों के लिए नहीं है।"),
    ],
  },
];

export const infoPage = (slug: string): InfoPage | undefined => INFO_PAGES.find((p) => p.slug === slug);

/** Fill `{{supportEmail}}` and split a body into paragraphs and list items. */
export function infoBlocks(body: string, supportEmail: string): { kind: "p" | "li"; text: string }[] {
  return body.replace(/\{\{supportEmail\}\}/g, supportEmail || "support@fmbp.app")
    .split(/\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => (l.startsWith("• ") ? { kind: "li" as const, text: l.slice(2) } : { kind: "p" as const, text: l }));
}
