import type { FormValues } from "@fmbp/shared";
import { TEXT_LIMITS } from "@fmbp/shared";

/**
 * Quick announcement: pick a starter, write one line, add a photo if you like. Each starter is a ready answer for an
 * existing announcement type, so the post looks and works like any other announcement (Edit, reports, expiry).
 */
export const STARTERS = ["new_stock", "offer_today", "festival", "price", "news"] as const;
export type Starter = (typeof STARTERS)[number];

export const STARTER_ICON: Record<Starter, string> = {
  new_stock: "cube-outline", offer_today: "pricetag-outline", festival: "sparkles-outline", price: "receipt-outline", news: "megaphone-outline",
};

/** The post type and the form answers for a starter and the line they wrote. */
export function quickAnnouncement(starter: Starter, line: string): { typeSlug: string; basic: FormValues } {
  const text = line.trim().slice(0, TEXT_LIMITS.formShort);
  switch (starter) {
    case "new_stock": return { typeSlug: "announce_new_stock", basic: { items: text } };
    case "offer_today": return { typeSlug: "announce_offer", basic: { offer: text, valid_till: "today" } };
    case "festival": return { typeSlug: "announce_offer", basic: { offer: text, valid_till: "week" } };
    case "price": return { typeSlug: "announce_price_list", basic: { items: text, change: "new_list", effective: "today" } };
    case "news": return { typeSlug: "announce_news", basic: { kind: "other", headline: text } };
  }
}

/** The title people see: the starter's name and their line ("New stock: Fresh mangoes from Ratnagiri"). */
export function quickTitle(starterLabel: string, line: string): string {
  return `${starterLabel}: ${line.trim()}`.slice(0, TEXT_LIMITS.postTitle);
}
