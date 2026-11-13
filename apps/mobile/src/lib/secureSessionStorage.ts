import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Where the login (the Supabase session with its refresh token) is kept on the phone: the encrypted iOS Keychain /
 * Android Keystore, not plain app storage that backups copy and rooted phones can read. Only this device: the login
 * is not copied to a backup or a new phone.
 *
 * A secure entry should stay under about 2 KB and a session is larger, so it is saved in pieces ("key.0", "key.1"…)
 * with the number of pieces in "key.n". A login saved by an older app version in plain storage is moved once.
 * The web build (no Keychain) keeps using plain storage.
 */
const PIECE = 600; // characters; even all-Hindi text (3 bytes each) stays under 2 KB
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const WEB = Platform.OS === "web"; // read once: background token refreshes run outside any screen
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_"); // the only characters SecureStore accepts

async function pieceCount(key: string): Promise<number> {
  const n = Number(await SecureStore.getItemAsync(`${key}.n`, OPTIONS));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function readSecure(key: string): Promise<string | null> {
  const n = await pieceCount(key);
  if (!n) return null;
  const pieces = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`, OPTIONS)));
  return pieces.some((p) => p == null) ? null : pieces.join(""); // a missing piece: treat as signed out
}

async function removeSecure(key: string) {
  const n = await pieceCount(key);
  await SecureStore.deleteItemAsync(`${key}.n`, OPTIONS); // first, so a half-removed login is never read back
  await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS)));
}

async function writeSecure(key: string, value: string) {
  await removeSecure(key);
  const pieces = value.match(new RegExp(`[\\s\\S]{1,${PIECE}}`, "g")) ?? [""];
  await Promise.all(pieces.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p, OPTIONS)));
  await SecureStore.setItemAsync(`${key}.n`, String(pieces.length), OPTIONS); // last: only a complete login counts
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (WEB) return AsyncStorage.getItem(key);
    const value = await readSecure(safeKey(key));
    if (value != null) return value;
    const old = await AsyncStorage.getItem(key); // saved by an older app version
    if (old != null) {
      await writeSecure(safeKey(key), old);
      await AsyncStorage.removeItem(key);
    }
    return old;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (WEB) return AsyncStorage.setItem(key, value);
    await writeSecure(safeKey(key), value);
  },
  async removeItem(key: string): Promise<void> {
    if (!WEB) await removeSecure(safeKey(key));
    await AsyncStorage.removeItem(key);
  },
};
