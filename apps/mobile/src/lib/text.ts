// Devanagari vowel signs, nasal marks and nukta: they belong to the letter before them and must not be cut off it.
const MARK = /[ऀ-ःऺ-ौॎॏ॑-ॗॢॣ]/;
const VIRAMA = "्"; // joins two letters into one (क्ष): never end on it

/**
 * The first `max` letters of a text and "…" when it is longer: "Offering Franchise in Noida" → "Offering Franchise i…".
 * Works on whole letters, so Hindi is never cut inside a letter (a vowel sign stays with its letter).
 */
export function shorten(text: string, max: number): string {
  const chars = Array.from(text.trim());
  if (chars.length <= max) return chars.join("");
  let end = max;
  while (end < chars.length && (MARK.test(chars[end]) || chars[end - 1] === VIRAMA)) end++;
  if (end >= chars.length) return chars.join("");
  return `${chars.slice(0, end).join("").trimEnd()}…`;
}
