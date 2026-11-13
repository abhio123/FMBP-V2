import { cleanWord } from "@fmbp/shared";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";

export type WordSource = "search" | "category_list" | "trade_list" | "type_list" | "form_list";

const sent = new Set<string>(); // no need to ask the server twice in one sitting

/** On sign-out: the next person on this phone starts fresh. */
export function clearSentWords() { sent.clear(); }

/**
 * Counts a finished search for "Words people use" (admin area). Fire and forget: it must never slow down, block or show
 * an error to the person searching, and losing one on a bad network is fine. The server picks the city and state from
 * their own profile, and counts each word once per person per day in each flow. `section` says which list it was: the
 * Need or Offer page ("need"), or a form field ("offer_work.job").
 */
export function recordWord(word: string, source: WordSource, found: boolean, section?: string) {
  const clean = cleanWord(word);
  const { session, business } = useSession.getState();
  if (!clean || !session) return;
  const key = `${source}:${section ?? ""}:${clean}`;
  if (sent.has(key)) return;
  sent.add(key);
  const retryLater = () => { sent.delete(key); };
  void supabase.rpc("record_word", { p_word: clean, p_source: source, p_found: found, p_business_id: business?.id, p_section: section })
    .then(({ error }) => { if (error) retryLater(); }, retryLater);
}
