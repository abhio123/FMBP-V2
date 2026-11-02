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
