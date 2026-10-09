import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { supabase } from "@/lib/supabase";

export type PushData = { kind: "message"; conversation_id: string } | { kind: "response"; post_id: string };
type NotificationsModule = typeof import("expo-notifications");

const native = Platform.OS === "ios" || Platform.OS === "android";
/** Expo Go on Android (SDK 53+) throws as soon as expo-notifications is imported: the module must never load there. */
export const expoGoAndroid = Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let loaded: NotificationsModule | null | undefined;
/** expo-notifications, loaded on first use; null where it cannot run (web, Expo Go on Android, load failure). */
export function notifications(): NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  if (!native || expoGoAndroid) return (loaded = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications") as NotificationsModule;
    // Show notifications even while the app is open (the chat screen itself suppresses its own conversation).
    mod.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    loaded = mod;
  } catch (e) {
    console.warn("expo-notifications unavailable:", (e as Error).message);
    loaded = null;
  }
  return loaded;
}

/** Store this device's Expo push token for the signed-in user (RLS: self only). */
export async function savePushToken(userId: string, token: string, platform: "ios" | "android") {
  const { error } = await supabase.from("push_tokens").upsert({ user_id: userId, expo_token: token, platform, updated_at: new Date().toISOString() }, { onConflict: "user_id,expo_token" });
  if (error) throw error;
}

export async function removePushToken(userId: string, token: string) {
  await supabase.from("push_tokens").delete().eq("user_id", userId).eq("expo_token", token);
}

/**
 * Ask for permission and register the device for remote push. Returns the token, or null when remote push is not
 * possible here (web, simulator, Expo Go on Android, no EAS project id, permission denied). Local notifications
 * still work in those cases, so callers fall back to them for foreground events.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  const Notifications = notifications();
  if (!Notifications || !Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "FMBP", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: "#1F6F5F" });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId.startsWith("REPLACE")) {
    if (__DEV__) console.warn("push: run `eas init` so app.json has extra.eas.projectId; remote notifications are off until then");
    return null;
  }
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(userId, token, Platform.OS === "ios" ? "ios" : "android");
    return token;
  } catch (e) {
    console.warn("push token failed", (e as Error).message);
    return null;
  }
}

/** Immediate local notification (works in Expo Go too). */
export async function showLocalNotification(title: string, body: string, data: PushData) {
  const Notifications = notifications();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, data, sound: "default" }, trigger: null });
}

/** Where a tapped notification should take the user. */
export function routeForNotification(data: unknown): { pathname: "/chat/[id]" | "/post/[id]"; params: { id: string } } | null {
  const d = data as Partial<PushData & { conversation_id?: string; post_id?: string }> | null;
  if (!d) return null;
  if (d.kind === "message" && d.conversation_id) return { pathname: "/chat/[id]", params: { id: d.conversation_id } };
  if (d.kind === "response" && d.post_id) return { pathname: "/post/[id]", params: { id: d.post_id } };
  return null;
}

export async function markNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
