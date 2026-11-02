export type Segment = { text: string; match: boolean };

/**
 * Spaces and punctuation separate the words of a query.
 * A plain character class on purpose: no Unicode property escapes, which not every JS engine on device supports.
 */
const SEP_CHARS = String.raw`\s,.;:!?()[\]{}"'/\\|·•–—-`;
const SEPARATORS = new RegExp(`[${SEP_CHARS}]+`);

/** Search terms worth highlighting: lower-cased words of the query, at least 2 characters (1 would light up everything). */
export function highlightTerms(query: string): string[] {
  return Array.from(new Set(query.toLowerCase().split(SEPARATORS).filter((w) => w.length >= 2)));
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split `text` into segments, marking only the letters that match a search term, wherever they occur (the search
 * itself matches inside words): "jale" → [Jale]bi, [jale]dar. Case-insensitive; the original text and casing are kept
 * (joining the segments gives it back exactly). Longer terms are tried first, so "jalebi" wins over "jale".
 */
export function highlightSegments(text: string, terms: string[]): Segment[] {
  if (!text || !terms.length) return [{ text, match: false }];
  // matching on the original string with the "i" flag keeps indexes aligned with the text (no lower-cased copy)
  const pattern = new RegExp([...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|"), "gi");
  const out: Segment[] = [];
  let at = 0;
  for (const m of text.matchAll(pattern)) {
    const start = m.index ?? 0;
    if (start > at) out.push({ text: text.slice(at, start), match: false });
    const last = out[out.length - 1];
    // adjacent matches ("jalejale") render as one highlighted piece
    if (last?.match && start === at) last.text += m[0]; else out.push({ text: m[0], match: true });
    at = start + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), match: false });
  return out.length ? out : [{ text, match: false }];
}
