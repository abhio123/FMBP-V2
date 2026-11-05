import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Unsent chat message, kept on this phone per conversation, so leaving the chat, closing the app or the phone switching
 * off does not lose it: the text, the message it replies to and the post it is about. Cleared when the message is
 * sent, and all drafts are removed on log out (shared phones).
 */
export type ChatDraft = { text: string; replyToId: string | null; aboutPostId: string | null };

const PREFIX = "fmbp.chatDraft:";
const key = (conversationId: string) => PREFIX + conversationId;
const EMPTY: ChatDraft = { text: "", replyToId: null, aboutPostId: null };
const idOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Stored as JSON; drafts saved by earlier versions are the plain text. */
function parse(raw: string): ChatDraft {
  try {
    const v: unknown = JSON.parse(raw);
    if (v && typeof v === "object" && typeof (v as ChatDraft).text === "string") {
      const d = v as Partial<ChatDraft>;
      return { text: d.text ?? "", replyToId: idOrNull(d.replyToId), aboutPostId: idOrNull(d.aboutPostId) };
    }
  } catch { /* plain text */ }
  return { ...EMPTY, text: raw };
}

export async function loadDraft(conversationId: string): Promise<ChatDraft> {
  try {
    const raw = await AsyncStorage.getItem(key(conversationId));
    return raw ? parse(raw) : EMPTY;
  } catch { return EMPTY; }
}

/** Kept while there is text or a chosen reply; otherwise removed. */
export async function saveDraft(conversationId: string, draft: ChatDraft) {
  try {
    if (draft.text.trim() || draft.replyToId) await AsyncStorage.setItem(key(conversationId), JSON.stringify(draft));
    else await AsyncStorage.removeItem(key(conversationId));
  } catch { /* storage unavailable: the draft just isn't kept */ }
}

export async function clearAllDrafts() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch { /* best effort */ }
}
