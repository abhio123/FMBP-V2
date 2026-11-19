import "../global.css";
import { clearSentWords } from "@/features/search/wordLog";
import "@/i18n";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import type { Session } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { useCreatePost } from "@/store/createPost";
import { clearActiveProfiles, loadMyBusiness } from "@/features/business/api";
import { getDeletionRequest } from "@/features/account/api";
import { validateSession } from "@/features/auth/api";
import { PushNotifications } from "@/features/notifications/PushNotifications";
import { clearAllDrafts } from "@/features/chat/drafts";
import { clearRecentSearches } from "@/features/search/recent";
import { amIAdmin, clearModes, loadMode } from "@/features/admin/api";

/**
 * Routing rules: signed out → login. An admin number → "Continue as" (role) until it picks the admin area or the normal
 * app. Normal app: a deleted account → Restore; a suspended business → the reason only; otherwise the app, business or
 * not (the feed shows a set-up card until a business exists; posting/responding/chat ask for it when needed).
 */
/** A shared link (https://findmybusinesspartner.net/post/<id>, /business/<id>) opened while signed out: return to it after login. */
const SHARED_PATH = /^\/(post|business)\/[0-9a-f-]{36}$/i;

function AuthGate() {
  const { session, hydrated, deletionRequestedAt, business, isAdmin, mode, setSession, setBusiness, setHydrated, setDeletionRequestedAt, setAdmin } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const pendingPath = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const hydrate = async (s: Session | null) => {
      setSession(s);
      let b = null;
      let deletion: string | null = null;
      let admin = false;
      try { b = s ? await loadMyBusiness(s.user.id) : null; } catch (e) { console.warn("loadMyBusiness failed", e); }
      try { deletion = s ? await getDeletionRequest(s.user.id) : null; } catch (e) { console.warn("getDeletionRequest failed", e); }
      // the server decides who is an admin; the app only remembers which area an admin picked on this phone
      try { admin = s ? await amIAdmin() : false; } catch (e) { console.warn("amIAdmin failed", e); }
      const picked = s && admin ? await loadMode(s.user.id) : null;
      if (alive) { setDeletionRequestedAt(deletion); setAdmin(s ? admin : null, s ? (admin ? picked : "user") : null); setBusiness(b); }
    };
    supabase.auth.getSession().then(async ({ data }) => {
      const ok = data.session ? await validateSession() : true;
      await hydrate(ok ? data.session : null);
      if (alive) setHydrated(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION") return;
      // Never await Supabase calls inside this callback: it runs under the auth lock and would deadlock.
      setTimeout(() => {
        if (!alive) return;
        if (event === "SIGNED_OUT") {
          setSession(null); setBusiness(null); setDeletionRequestedAt(null);
          queryClient.clear();
          useCreatePost.getState().reset();
          // on a shared phone the next person must not see unsent messages or what was searched
          void clearAllDrafts(); void clearRecentSearches(); void clearModes(); void clearActiveProfiles(); clearSentWords();
        } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          void hydrate(s);
        } else {
          setSession(s);
        }
      }, 0);
    });
    // back in the app: pick up a suspension, a lifted suspension or a removed admin right without a restart
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const { session: cur, mode: m, setBusiness: setB, setAdmin: setA } = useSession.getState();
      if (!cur) return;
      loadMyBusiness(cur.user.id).then(setB).catch(() => {});
      amIAdmin().then((a) => { if (!a && useSession.getState().isAdmin) setA(false, "user"); else if (a && !useSession.getState().isAdmin) setA(true, m === "user" ? "user" : null); }).catch(() => {});
    });
    return () => { alive = false; sub.subscription.unsubscribe(); appState.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === "(auth)";
    const inAdmin = segments[0] === "admin";
    const onRole = segments[0] === "role";
    if (!session) {
      if (inAuth) return;
      if (SHARED_PATH.test(pathname)) pendingPath.current = pathname;
      router.replace("/(auth)/login");
      return;
    }
    if (isAdmin === null) return; // still checking whether this number is an admin
    if (isAdmin && !mode) { if (!onRole) router.replace("/role"); return; }
    if (mode === "admin") { if (!inAdmin) router.replace("/admin/dashboard"); return; }
    // the normal app from here on: the admin area is closed
    if (inAdmin || onRole) { router.replace("/(tabs)/feed"); return; }
    if (deletionRequestedAt) {
      // account in its deletion grace period: offer "Restore my account" before anything else
      if (pathname !== "/account/restore") router.replace("/account/restore");
    } else if (business?.suspended_at) {
      // suspended by FMBP: only the reason and how to reach support
      if (pathname !== "/account/suspended") router.replace("/account/suspended");
    } else if (pathname === "/account/suspended") {
      router.replace("/(tabs)/feed"); // suspension lifted
    } else if (inAuth) {
      const target = pendingPath.current;
      pendingPath.current = null;
      router.replace("/(tabs)/feed");
      // keep the feed underneath so Back from the shared post/business lands in the app, not on login
      const [, kind, id] = target?.split("/") ?? [];
      if (kind === "post" && id) router.push({ pathname: "/post/[id]", params: { id } });
      else if (kind === "business" && id) router.push({ pathname: "/business/[id]", params: { id } });
    }
  }, [hydrated, session, deletionRequestedAt, business?.suspended_at, isAdmin, mode, segments, pathname, router]);

  return null;
}

// The app is drawn edge-to-edge on every Android version (Expo), and the native header and safe areas add the status bar
// space themselves. Android 14 and older report "not edge-to-edge" to react-native-keyboard-controller, which then also
// pads the whole app by the status bar height: a second, empty status-bar-sized gap above every back-arrow header.
// Telling it the status bar is translucent removes that padding. Android 15+ is detected already (passing it there only
// logs a warning), and iOS ignores it.
const STATUS_BAR_TRANSLUCENT = Platform.OS === "android" && Platform.Version < 35;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider statusBarTranslucent={STATUS_BAR_TRANSLUCENT || undefined}>
        <QueryClientProvider client={queryClient}>
          <AuthGate />
          <PushNotifications />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: "minimal", headerBackTitle: "" }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="post/[id]" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="business/[id]" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="business/edit" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="business/my-posts" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="business/blocked" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="business/invite" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="business/deals" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="account/delete" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="account/restore" options={{ gestureEnabled: false }} />
            <Stack.Screen name="account/suspended" options={{ gestureEnabled: false }} />
            <Stack.Screen name="business/verify" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="role" options={{ gestureEnabled: false }} />
            {/* admin area: its own stack and tabs (app/admin), opened only in admin mode */}
            <Stack.Screen name="admin" options={{ gestureEnabled: false }} />
            <Stack.Screen name="help" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="notifications" options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="info/[slug]" options={{ headerShown: true, title: "" }} />
            {/* Post flow opens as a sheet from the bottom on both platforms (Android's default would slide from the right);
                every step has a ✕ (create/_layout) because swipe-down / Back are not obvious to everyone */}
            <Stack.Screen name="create" options={{ presentation: "modal", animation: Platform.OS === "android" ? "slide_from_bottom" : "default" }} />
          </Stack>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
