/**
 * Trades an individual (not a business) can pick at sign-up: "Rohit · Bhatura maker · Noida". The values are the same
 * as the "Looking for work" form's job list (supabase/forms/post/offer_work.json) plus a few common ones, so a profile
 * and its posts speak the same words. `icon` is a line icon (Ionicons) name; `category` is the business category the
 * profile is filed under (feeds and search use it).
 */
export type Trade = { value: string; en: string; hi: string; icon: string; category: string };

export const TRADES: readonly Trade[] = [
  { value: "cook", en: "Cook", hi: "रसोइया", icon: "restaurant-outline", category: "food_restaurant" },
  { value: "chinese_cook", en: "Chinese / fast-food cook", hi: "चाइनीज़ / फास्ट-फूड कुक", icon: "fast-food-outline", category: "food_restaurant" },
  { value: "halwai", en: "Halwai (sweets)", hi: "हलवाई", icon: "cafe-outline", category: "food_restaurant" },
  { value: "tailor", en: "Tailor", hi: "दर्ज़ी", icon: "shirt-outline", category: "garments_fashion" },
  { value: "barber", en: "Barber", hi: "नाई", icon: "cut-outline", category: "beauty_salon" },
  { value: "beautician", en: "Beautician", hi: "ब्यूटीशियन", icon: "color-wand-outline", category: "beauty_salon" },
  { value: "mehndi", en: "Mehndi artist", hi: "मेहंदी आर्टिस्ट", icon: "brush-outline", category: "beauty_salon" },
  { value: "electrician", en: "Electrician", hi: "इलेक्ट्रीशियन", icon: "flash-outline", category: "construction" },
  { value: "plumber", en: "Plumber", hi: "प्लंबर", icon: "water-outline", category: "construction" },
  { value: "carpenter", en: "Carpenter", hi: "बढ़ई", icon: "hammer-outline", category: "construction" },
  { value: "painter", en: "Painter", hi: "पेंटर", icon: "color-fill-outline", category: "construction" },
  { value: "mason", en: "Mason (construction)", hi: "मिस्त्री", icon: "construct-outline", category: "construction" },
  { value: "welder", en: "Welder", hi: "वेल्डर", icon: "flame-outline", category: "construction" },
  { value: "driver", en: "Driver", hi: "ड्राइवर", icon: "car-outline", category: "logistics" },
  { value: "delivery", en: "Delivery person", hi: "डिलीवरी बॉय / गर्ल", icon: "bicycle-outline", category: "logistics" },
  { value: "mechanic", en: "Mechanic", hi: "मैकेनिक", icon: "build-outline", category: "automobile" },
  { value: "ac_repair", en: "AC / fridge mechanic", hi: "AC / फ्रिज मैकेनिक", icon: "snow-outline", category: "technology" },
  { value: "mobile_repair", en: "Mobile repair", hi: "मोबाइल रिपेयर", icon: "phone-portrait-outline", category: "technology" },
  { value: "computer", en: "Computer operator", hi: "कंप्यूटर ऑपरेटर", icon: "desktop-outline", category: "technology" },
  { value: "tutor", en: "Teacher / tutor", hi: "टीचर / ट्यूटर", icon: "school-outline", category: "education" },
  { value: "salesperson", en: "Salesperson", hi: "सेल्समैन / सेल्सगर्ल", icon: "pricetag-outline", category: "retail_shop" },
  { value: "cashier", en: "Cashier", hi: "कैशियर", icon: "calculator-outline", category: "retail_shop" },
  { value: "helper", en: "Helper", hi: "हेल्पर", icon: "hand-left-outline", category: "retail_shop" },
  { value: "security", en: "Security guard", hi: "सिक्योरिटी गार्ड", icon: "shield-outline", category: "other" },
  { value: "cleaner", en: "Cleaner / house help", hi: "सफ़ाई / घर का काम", icon: "sparkles-outline", category: "other" },
  { value: "other", en: "Other", hi: "कुछ और", icon: "ellipsis-horizontal-circle-outline", category: "freelance" },
];

export function findTrade(value: string | null | undefined): Trade | undefined {
  return value ? TRADES.find((t) => t.value === value) : undefined;
}

/** What an individual does, in their language: their own words for "Other", else the trade's name. */
export function tradeLabel(value: string | null | undefined, other: string | null | undefined, lang: "en" | "hi"): string | null {
  if (value === "other" && other?.trim()) return other.trim();
  const t = findTrade(value);
  return t ? t[lang] : null;
}
