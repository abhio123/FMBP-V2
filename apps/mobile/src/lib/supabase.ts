import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Database } from "@fmbp/shared/src/database.types";

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

export const supabase = createClient<Database>(supabaseUrl, anonKey ?? "anon", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
