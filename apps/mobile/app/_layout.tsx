import "../global.css";
import "@/i18n";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { useCreatePost } from "@/store/createPost";
import { loadMyBusiness } from "@/features/business/api";
import { validateSession } from "@/features/auth/api";

function AuthGate() {
  const { session, business, hydrated, setSession, setBusiness, setHydrated } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const hydrate = async (s: Session | null) => {
      setSession(s);
      let b = null;
      try { b = s ? await loadMyBusiness(s.user.id) : null; } catch (e) { console.warn("loadMyBusiness failed", e); }
      if (alive) setBusiness(b);
    };
    supabase.auth.getSession().then(async ({ data }) => {
      const ok = data.session ? await validateSession() : true;
      await hydrate(ok ? data.session : null);
      if (alive) setHydrated(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION") return; // handled by getSession above
      // Never await Supabase calls inside this callback: it runs under the auth lock and would deadlock.
      setTimeout(() => {
        if (!alive) return;
        if (event === "SIGNED_OUT") {
          setSession(null); setBusiness(null);
          queryClient.clear();
          useCreatePost.getState().reset();
        } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          void hydrate(s);
        } else {
          setSession(s); // TOKEN_REFRESHED etc.: keep the business, just refresh the session
        }
      }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";
    if (!session && !inAuth) router.replace("/(auth)/login");
    else if (session && !business && !inOnboarding) router.replace("/(onboarding)/business");
    else if (session && business && (inAuth || inOnboarding)) router.replace("/(tabs)/feed");
  }, [hydrated, session, business, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="post/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="business/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="business/edit" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="create" options={{ presentation: "modal" }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
