import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Database } from "@fmbp/shared/src/database.types";
import { secureSessionStorage } from "./secureSessionStorage";

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!envUrl || !anonKey) {
  console.warn("Supabase env missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * On a physical device "127.0.0.1" is the phone itself, not the dev machine.
 * When the configured URL points at localhost, rewrite the host to the machine
 * Metro is served from (Expo exposes it as `hostUri`, e.g. "192.168.0.4:8081").
 */
function resolveUrl(url: string): string {
  if (Platform.OS === "web") return url;
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") return url;
    parsed.hostname = hostUri.split(":")[0];
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export const supabaseUrl = resolveUrl(envUrl ?? "http://127.0.0.1:54321");

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * fetch has no timeout: if the server is unreachable (backend down, phone on another network) a request
 * can hang and leave loaders spinning forever. Abort after REQUEST_TIMEOUT_MS so callers get a network error.
 * Storage is excluded: image uploads on slow mobile data can legitimately take longer.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("/storage/v1/")) return fetch(input, init);

  const controller = new AbortController();
  const callerSignal = init?.signal;
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", () => controller.abort());

  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal })
    .catch((e: unknown) => {
      // Same message RN uses for offline, so existing "network" error mapping applies.
      if (timedOut) throw new TypeError("Network request timed out");
      throw e;
    })
    .finally(() => clearTimeout(timer));
};

export const supabase = createClient<Database>(supabaseUrl, anonKey ?? "anon", {
  global: { fetch: fetchWithTimeout },
  auth: {
    storage: secureSessionStorage, // the encrypted Keychain / Keystore (secureSessionStorage.ts)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
