import { Platform } from "react-native";
import * as Device from "expo-device";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { APP_NAME, COLORS } from "@/theme";

export type PushData = { kind: "message"; conversation_id: string } | { kind: "response"; post_id: string } | { kind: "followed_post"; post_id: string }
  | { kind: "deal_proposed" | "deal_confirmed"; deal_id: string }
  // from FMBP admins (ADMIN.md)
  | { kind: "verification_result"; approved: boolean } | { kind: "post_removed"; post_id: string }
  | { kind: "account_suspended" | "account_restored" | "broadcast" };
type NotificationsModule = typeof import("expo-notifications");

const native = Platform.OS === "ios" || Platform.OS === "android";
/**
 * Expo Go on Android (SDK 53+) has no working expo-notifications (e.g. setNotificationChannelAsync throws a native
 * NullPointerException): the module must never load there. Uses Expo's own check; on SDK 58 Expo Go,
 * Constants.executionEnvironment no longer reliably reports "storeClient".
 */
export const expoGoAndroid = Platform.OS === "android" && isRunningInExpoGo();

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

let registered: { userId: string; token: string } | null = null; // this phone's token, as saved for the signed-in user

/**
 * Before signing out: stop this phone receiving the user's notifications, so on a shared phone the next person does
 * not see their messages on the lock screen. Needs the session (RLS), so it runs before sign-out; never blocks it.
 */
export async function forgetPushToken() {
  const r = registered;
  registered = null;
  if (!r) return;
  try {
    await Promise.race([removePushToken(r.userId, r.token), new Promise((done) => setTimeout(done, 3000))]);
  } catch { /* offline: sign out anyway */ }
}

/**
 * Ask for permission and register the device for remote push. Returns the token, or null when remote push is not
 * possible here (web, simulator, Expo Go on Android, no EAS project id, permission denied). Local notifications
 * still work in those cases, so callers fall back to them for foreground events.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  const Notifications = notifications();
  if (!Notifications || !Device.isDevice) return null;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", { name: APP_NAME, importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: COLORS.brand });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return null;
  } catch (e) {
    // Native setup can fail on some devices/runtimes; the app keeps working without push.
    console.warn("push setup failed", (e as Error).message);
    return null;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId.startsWith("REPLACE")) {
    if (__DEV__) console.warn("push: run `eas init` so app.json has extra.eas.projectId; remote notifications are off until then");
    return null;
  }
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(userId, token, Platform.OS === "ios" ? "ios" : "android");
    registered = { userId, token };
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
export function routeForNotification(data: unknown): { pathname: "/chat/[id]" | "/post/[id]"; params: { id: string } }
  | { pathname: "/business/deals" | "/business/verify" | "/business/my-posts" | "/(tabs)/feed" } | null {
  const d = data as Partial<PushData & { conversation_id?: string; post_id?: string }> | null;
  if (!d) return null;
  if (d.kind === "message" && d.conversation_id) return { pathname: "/chat/[id]", params: { id: d.conversation_id } };
  if ((d.kind === "response" || d.kind === "followed_post") && d.post_id) return { pathname: "/post/[id]", params: { id: d.post_id } };
  // "Did you do a deal?" / "Deal confirmed": confirm or rate on My deals
  if (d.kind === "deal_proposed" || d.kind === "deal_confirmed") return { pathname: "/business/deals" };
  if (d.kind === "verification_result") return { pathname: "/business/verify" };
  if (d.kind === "post_removed") return { pathname: "/business/my-posts" };
  if (d.kind === "broadcast") return { pathname: "/(tabs)/feed" };
  // suspended / restored: the app itself shows the right screen once it is open
  return null;
}

/** Which profiles a notification is about (a login can have several): opening it switches to mine among them. */
export async function businessesOfNotification(data: unknown): Promise<string[]> {
  const d = (data ?? {}) as { business_id?: string; conversation_id?: string; deal_id?: string; post_id?: string };
  if (d.business_id) return [d.business_id];
  if (d.conversation_id) {
    const { data: c } = await supabase.from("conversations").select("business_a,business_b").eq("id", d.conversation_id).maybeSingle();
    return c ? [c.business_a, c.business_b] : [];
  }
  if (d.deal_id) {
    const { data: x } = await supabase.from("deals").select("business_a,business_b").eq("id", d.deal_id).maybeSingle();
    return x ? [x.business_a, x.business_b].filter((v): v is string => !!v) : [];
  }
  if (d.post_id) {
    const { data: p } = await supabase.from("opportunity_posts").select("business_id").eq("id", d.post_id).maybeSingle();
    return p ? [p.business_id] : [];
  }
  return [];
}

// The notifications list behind the bell on Home (migration 20261106000001). Every push the server sends is also a
// row here, so nothing is lost when the phone shows no push. Chat messages have their own tab and are left out.
export type InboxItem = { id: string; kind: string; title: string; body: string; data: Record<string, unknown>; read: boolean; created_at: string };
export const INBOX_PAGE = 30;
const NOT_IN_INBOX = "message";

/** Newest first, INBOX_PAGE at a time; `before` is the created_at of the last item already shown. */
export async function listInbox(before: string | null): Promise<InboxItem[]> {
  let q = supabase.from("notifications").select("id,kind,payload,read_at,created_at").neq("kind", NOT_IN_INBOX)
    .order("created_at", { ascending: false }).limit(INBOX_PAGE);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    return { id: r.id, kind: r.kind, title: String(p.title ?? ""), body: String(p.body ?? ""), data: p, read: !!r.read_at, created_at: r.created_at };
  });
}

/** How many are unread (the number on the bell). */
export async function unreadInboxCount(): Promise<number> {
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).neq("kind", NOT_IN_INBOX);
  if (error) throw error;
  return count ?? 0;
}

/** Opening the list marks everything in it as read (the bell number goes away). */
export async function markInboxRead(): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).neq("kind", NOT_IN_INBOX);
  if (error) throw error;
}

/** Line icon for each kind of notification (Ionicons names). */
export function inboxIcon(kind: string): string {
  switch (kind) {
    case "broadcast": return "megaphone-outline";
    case "response": return "hand-right-outline";
    case "followed_post": return "document-text-outline";
    case "deal_proposed": return "people-circle-outline";
    case "deal_confirmed": return "checkmark-done-outline";
    case "verification_result": return "shield-checkmark-outline";
    case "post_removed": return "flag-outline";
    case "account_suspended": case "account_restored": return "person-circle-outline";
    default: return "notifications-outline";
  }
}
