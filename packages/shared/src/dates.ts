const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: ["जन॰", "फ़र॰", "मार्च", "अप्रैल", "मई", "जून", "जुल॰", "अग॰", "सित॰", "अक्तू॰", "नव॰", "दिस॰"],
} as const;

/**
 * Calendar date in the device's time zone: "1 Dec 2026" / "1 दिस॰ 2026".
 * Hand-rolled rather than Intl so iOS and Android (different Intl backends) render it identically.
 */
export function formatDate(value: string | Date, locale: "en" | "hi" = "en"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`;
}

/** Whole days left until `expiresAt` (rounded up, never negative). 0 means it ends today or has passed. */
export function daysUntil(expiresAt: string | Date, now: number = Date.now()): number {
  const t = (typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt).getTime();
  return Math.max(0, Math.ceil((t - now) / 86_400_000));
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Clock time in the device's time zone, 12-hour as used in India: "9:05 am", "4:30 pm" (same on iOS and Android). */
export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

/** Day heading in a chat: "Today" / "Yesterday" / "3 Nov 2026" (Hindi: "आज" / "कल" / "3 नव॰ 2026"). */
export function dayLabel(value: string | Date, locale: "en" | "hi" = "en", now: Date = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  if (sameDay(d, now)) return locale === "hi" ? "आज" : "Today";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, yesterday)) return locale === "hi" ? "कल" : "Yesterday";
  return formatDate(d, locale);
}

/** True when two timestamps fall on different calendar days (device time zone): a day heading goes between them. */
export function isNewDay(previous: string | Date | null | undefined, current: string | Date): boolean {
  if (!previous) return true;
  return !sameDay(new Date(previous), new Date(current));
}
