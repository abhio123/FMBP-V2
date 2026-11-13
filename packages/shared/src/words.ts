/**
 * Words people use (migration 20261107000001): the word as it is stored, or null when it must not be kept (too short or
 * long, a phone number, an e-mail address, a link, no letters at all). The server applies the same rules
 * (fmbp.clean_word); this copy means private text does not even leave the phone. Keep the two in step.
 */
export const WORD_MIN = 2; // the same as Search; short trade words matter (AC, TV, RO, DJ)
export const WORD_MAX = 40;

export function cleanWord(raw: string | null | undefined): string | null {
  const w = (raw ?? "").slice(0, 200).normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  if (w.length < WORD_MIN || w.length > WORD_MAX) return null;
  if (w.replace(/[^0-9०-९]/g, "").length >= 5) return null; // phone numbers, ids
  if (/@|https?:|www\./.test(w)) return null; // e-mail addresses, links
  if (/^[0-9०-९\s!-/:-@[-`{-~]+$/.test(w)) return null; // no letters at all
  return w;
}
