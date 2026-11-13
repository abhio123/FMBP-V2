/** "Need Something Else?" / "Offer Something Else?": search never hides them, so there is always a way forward. */
export const OTHER_TYPES = new Set(["need_other", "offer_other"]);

export type SearchableType = {
  slug: string;
  name_en: string; name_hi: string; plain_label_en: string; plain_label_hi: string;
  advanced_label_en: string | null; advanced_label_hi: string | null;
  examples_en?: string[] | null; examples_hi?: string[] | null; keywords?: string | null;
};

const words = (s: string) => s.normalize("NFC").toLowerCase().split(/[\s,/&()·.:;'"…?!-]+/).filter(Boolean);

/** Every searched word starts a word in the text: "tea" finds "teacher", but "ac" does not find "machine". */
const matches = (text: string, needles: string[]) => {
  const hay = words(text);
  return needles.every((n) => hay.some((w) => w.startsWith(n)));
};

/**
 * The post types for what was typed: those that name it first, then those that cover it (examples and search words),
 * and "Something else" last. `notInList` is true when only "Something else" is left.
 */
export function findTypes<T extends SearchableType>(types: T[], query: string): { list: T[]; notInList: boolean } {
  const needles = words(query);
  if (!needles.length) return { list: types, notInList: false };
  const named: T[] = [], covered: T[] = [], other: T[] = [];
  for (const t of types) {
    const label = [t.plain_label_en, t.plain_label_hi, t.name_en, t.name_hi, t.advanced_label_en ?? "", t.advanced_label_hi ?? ""].join(" ");
    if (OTHER_TYPES.has(t.slug)) other.push(t);
    else if (matches(label, needles)) named.push(t);
    else if (matches(`${label} ${(t.examples_en ?? []).join(" ")} ${(t.examples_hi ?? []).join(" ")} ${t.keywords ?? ""}`, needles)) covered.push(t);
  }
  return { list: [...named, ...covered, ...other], notInList: !named.length && !covered.length };
}

/** The first answers of "Something else", when they searched for a word the list did not have. */
export function otherAnswers(slug: string, word: string): Record<string, string> {
  const text = word.trim().slice(0, 80);
  if (!text) return {};
  if (slug === "need_other") return { what: "other", what_other: text };
  if (slug === "offer_other") return { what: text };
  return {};
}
