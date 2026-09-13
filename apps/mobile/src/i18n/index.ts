import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./en.json";
import hi from "./hi.json";

const device = getLocales()[0]?.languageCode ?? "en";
const lng = device === "hi" ? "hi" : "en";

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
export type Locale = "en" | "hi";
// eslint-disable-next-line import/no-named-as-default-member
export const setLocale = (l: Locale) => i18n.changeLanguage(l);
