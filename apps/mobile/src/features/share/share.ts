import { Linking, Platform, Share } from "react-native";
import Constants from "expo-constants";
import type { TFunction } from "i18next";

/**
 * Public web origin for shared links (app.json → expo.extra.shareBaseUrl). Links are https so every messenger makes
 * them tappable; the same URL opens the app when installed (iOS Universal Links / Android App Links, see app.json)
 * and otherwise the share page (apps/share-web), which carries the link preview and the store buttons.
 */
const base = String(Constants.expoConfig?.extra?.shareBaseUrl ?? "https://fmbp.app").replace(/\/+$/, "");

/** Paths match the app's routes, so the router opens them without any mapping. */
export const postShareUrl = (id: string) => `${base}/post/${id}`;
export const businessShareUrl = (id: string) => `${base}/business/${id}`;

/** One-line summary for share text: messengers show the rest in the link preview. */
export const shareSummary = (text: string | null | undefined, max = 140) => {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/** An empty description would leave a gap of blank lines. */
const tidy = (s: string) => s.replace(/\n{3,}/g, "\n\n");

/** WhatsApp renders *text* as bold; other apps would show the asterisks, so only the WhatsApp message uses it. */
const bold = (s: string, on: boolean) => (on ? `*${s.replace(/\*/g, "")}*` : s);

export function postShareMessage(t: TFunction, p: { id: string; title: string; description?: string | null }, whatsapp = false) {
  return tidy(t("post.shareText", { title: bold(p.title, whatsapp), description: shareSummary(p.description), url: postShareUrl(p.id) }));
}

/** Business: name, one-line about (description, else category · city) and its link. */
export function businessShareMessage(t: TFunction, b: { id: string; name: string; description?: string | null; category?: string | null; city?: string | null }, whatsapp = false) {
  const about = shareSummary(b.description) || [b.category, b.city].filter(Boolean).join(" · ");
  return tidy(t("business.shareText", { name: bold(b.name, whatsapp), about, url: businessShareUrl(b.id) }));
}

/**
 * System share sheet, text with the link inside it (Android WhatsApp, Telegram, Messages, Mail keep all of it).
 * The photo comes from the link preview, not an attachment.
 */
export async function shareText(message: string) {
  try {
    await Share.share({ message });
  } catch {
    // user dismissed the sheet or no share target: nothing to do
  }
}

/** encodeURIComponent leaves ! ' ( ) * as-is; iOS rejects some URLs with them (WhatsApp bold uses *), so encode all. */
const encodeStrict = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * Straight into WhatsApp's chat picker with the full message. Needed because WhatsApp's iOS share extension keeps only
 * the link when shared text contains a web link.
 * iOS: WhatsApp's own URL scheme (whatsapp://send?text=, its documented way to prefill a message); the https wa.me
 * route goes through a universal link / web page and, on iPhone, arrived with only the link. Android: wa.me (works).
 * iOS falls back to wa.me (also covers WhatsApp not installed). If no route opens, `onUnavailable` runs: never fall back
 * silently to the share sheet here, because on iPhone that is exactly the path where WhatsApp keeps only the link.
 */
export async function shareToWhatsApp(message: string, onUnavailable: () => void) {
  const text = encodeStrict(message);
  const routes = Platform.OS === "ios" ? [`whatsapp://send?text=${text}`, `https://wa.me/?text=${text}`] : [`https://wa.me/?text=${text}`];
  for (const url of routes) {
    try {
      await Linking.openURL(url);
      return;
    } catch (e) {
      if (__DEV__) console.warn("share: WhatsApp route failed", url.split("?")[0], (e as Error).message);
    }
  }
  onUnavailable();
}
