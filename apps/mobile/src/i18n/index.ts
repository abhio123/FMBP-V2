import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en.json";
import hi from "./hi.json";

export type Locale = "en" | "hi";
export const LOCALES: Locale[] = ["en", "hi"];
const STORAGE_KEY = "fmbp.locale";

const device = getLocales()[0]?.languageCode ?? "en";
const lng: Locale = device === "hi" ? "hi" : "en";

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// A language picked in the app wins over the device language on the next launch.
AsyncStorage.getItem(STORAGE_KEY)
  // eslint-disable-next-line import/no-named-as-default-member
  .then((saved) => { if (saved === "en" || saved === "hi") return i18n.changeLanguage(saved); })
  .catch(() => { /* storage unavailable: keep the device language */ });

export default i18n;
export async function setLocale(l: Locale) {
  // eslint-disable-next-line import/no-named-as-default-member
  await i18n.changeLanguage(l);
  try { await AsyncStorage.setItem(STORAGE_KEY, l); } catch { /* best effort */ }
}
