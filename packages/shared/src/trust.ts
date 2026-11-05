/** Counted (both sides confirmed) deals needed for the Trusted badge; same rule as fmbp.trust_bonus (migration 20261105000009). */
export const TRUSTED_MIN_DEALS = 3;
/** Lowest average rating that keeps the badge (no ratings yet also keeps it). */
export const TRUSTED_MIN_RATING = 4;

/** Trusted = 3+ confirmed deals and no average below 4★. */
export function isTrusted(b: { completed_deals?: number | null; rating_avg?: number | null; rating_count?: number | null }): boolean {
  return (b.completed_deals ?? 0) >= TRUSTED_MIN_DEALS && ((b.rating_count ?? 0) === 0 || Number(b.rating_avg ?? 0) >= TRUSTED_MIN_RATING);
}
