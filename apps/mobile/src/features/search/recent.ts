import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "fmbp.recentSearches";
const MAX = 6;

/** Last searches on this phone, newest first (shown as one-tap chips on the empty search screen). */
export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Remember a finished search (submitted or picked), not every half-typed word. */
export async function addRecentSearch(q: string): Promise<string[]> {
  const term = q.trim();
  if (term.length < 2) return getRecentSearches();
  const next = [term, ...(await getRecentSearches()).filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: no history */ }
  return next;
}

export async function clearRecentSearches() {
  try { await AsyncStorage.removeItem(KEY); } catch { /* best effort */ }
}
