import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Unsent chat text, kept on this phone per conversation, so leaving the chat, closing the app or the phone switching
 * off does not lose it. Cleared when the message is sent, and all drafts are removed on log out (shared phones).
 */
const PREFIX = "fmbp.chatDraft:";
const key = (conversationId: string) => PREFIX + conversationId;

export async function loadDraft(conversationId: string): Promise<string> {
  try { return (await AsyncStorage.getItem(key(conversationId))) ?? ""; } catch { return ""; }
}

export async function saveDraft(conversationId: string, text: string) {
  try {
    if (text.trim()) await AsyncStorage.setItem(key(conversationId), text);
    else await AsyncStorage.removeItem(key(conversationId));
  } catch { /* storage unavailable: the draft just isn't kept */ }
}

export async function clearAllDrafts() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch { /* best effort */ }
}
