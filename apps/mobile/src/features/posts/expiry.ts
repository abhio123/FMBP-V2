import type { TFunction } from "i18next";

/**
 * Countdown shown on cards and the post page, recomputed from expires_at so it drops by one each day.
 * Only live posts (active/paused) count down; completed/archived posts no longer expire, so they show nothing.
 */
export function expiryLabel(t: TFunction, status: string, days: number): string | null {
  if (status === "expired") return t("post.expired");
  if (status !== "active" && status !== "paused") return null;
  return days === 0 ? t("post.expiresToday") : t("post.expiresIn", { count: days });
}
