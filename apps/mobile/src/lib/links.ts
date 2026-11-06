/**
 * Split text into plain parts and web links, so links can be drawn as tappable text. Only http(s) and "www." links
 * are recognised (never javascript:, tel: or app links), and punctuation that ends a sentence is not part of the link.
 * Use only for text written by FMBP admins (broadcasts): links in text typed by other users are a phishing risk.
 */
export type TextPart = { text: string; url?: string };

const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING = /[.,;:!?)\]}'"…]+$/;

export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const start = m.index ?? 0;
    const raw = m[0];
    const shown = raw.replace(TRAILING, "");
    if (!shown || /^(https?:\/\/|www\.)$/i.test(shown)) continue;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: shown, url: /^www\./i.test(shown) ? `https://${shown}` : shown });
    last = start + shown.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** True when the text holds at least one link splitLinks would make tappable. */
export const hasLink = (text: string) => splitLinks(text).some((p) => p.url);
