/**
 * Longest text people can write in each place. The app stops typing at these lengths and the database refuses longer
 * text (migration 20261113000002), so one place cannot be used to store a book or flood other people's screens.
 * Keep the two in step.
 */
export const TEXT_LIMITS = {
  postTitle: 150,
  postDescription: 2000,
  message: 2000,
  responseMessage: 500,
  businessName: 80,
  businessDescription: 1000,
  reviewText: 300,
  reportDetails: 500,
  /** a short answer in a post form (one line) */
  formShort: 100,
  /** a long answer in a post form ("Any details") */
  formLong: 1000,
  /** words written next to "Other" in a post form */
  formOther: 80,
  /** words written next to "Other" for a profile's work or business type (server: trade_other, category_other) */
  profileOther: 40,
} as const;

/**
 * Saved places are rounded to a grid of 0.01 degrees (about 1 km), on the phone before saving and again on the
 * server: nearby search keeps working, but nobody can find a home or a shop's exact spot from the app.
 */
export const LOCATION_GRID_DEGREES = 0.01;

export function coarseCoordinate(value: number): number {
  const snapped = Number((Math.round(value / LOCATION_GRID_DEGREES) * LOCATION_GRID_DEGREES).toFixed(2));
  return snapped + 0; // never -0
}
