import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Icon, ICON_COLOR, Text } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { unreadInboxCount } from "./api";

export const INBOX_KEYS = { unread: ["notifications", "unread"], list: ["notifications", "list"] } as const;

/**
 * The number on the bell. Live: a new notification row arrives over realtime (works in Expo Go on Android too, where
 * pushes cannot be shown); also refreshed every 2 minutes and when the app comes back, in case the connection dropped.
 */
export function useUnreadNotifications() {
  const userId = useSession((s) => s.session?.user.id);
  const qc = useQueryClient();
  const unread = useQuery({ queryKey: INBOX_KEYS.unread, enabled: !!userId, queryFn: unreadInboxCount, refetchInterval: 120_000, refetchIntervalInBackground: false });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications:${userId}:${Date.now().toString(36)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, qc]);
  return unread.data ?? 0;
}

/**
 * Bell at the top right of Home (where people expect it, as in most apps): opens the notifications list. An orange
 * number shows how many are unread (same colour as the Chats badge); 99+ above that.
 */
export function Bell() {
  const { t } = useTranslation();
  const router = useRouter();
  const n = useUnreadNotifications();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={n ? t("inbox.bellUnread", { count: n }) : t("inbox.title")}
      onPress={() => router.push("/notifications")} hitSlop={8} className="h-11 w-11 items-center justify-center rounded-full">
      <Icon name={n ? "notifications" : "notifications-outline"} size={26} color={ICON_COLOR.ink} />
      {n ? (
        <View className="absolute right-0.5 top-0.5 min-w-[18px] items-center justify-center rounded-full border-2 border-surface-muted bg-accent px-1">
          <Text className="text-[11px] font-bold leading-4 text-ink">{n > 99 ? "99+" : n}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
