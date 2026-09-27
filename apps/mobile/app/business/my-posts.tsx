import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Chip, EmptyState } from "@/components/ui";
import { listMyPosts } from "@/features/posts/api";
import { PostCard } from "@/features/posts/PostCard";
import { useSession } from "@/store/session";

const LIVE = new Set(["active", "paused"]);

/** All of my posts, split into Live (active + paused) and Completed (completed, expired, archived). */
export default function MyPosts() {
  const { t } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const [tab, setTab] = useState<"live" | "completed">("live");
  const mine = useQuery({ queryKey: ["my_posts", business?.id], enabled: !!business, queryFn: () => listMyPosts(business!.id) });
  const rows = (mine.data ?? []).filter((p) => (tab === "live" ? LIVE.has(p.status) : !LIVE.has(p.status)));
  return (
    <Screen scroll={false} padded={false}>
      <Stack.Screen options={{ title: t("profile.myPosts") }} />
      <View className="flex-row gap-2 px-4 py-3">
        <Chip label={`${t("profile.live")} (${(mine.data ?? []).filter((p) => LIVE.has(p.status)).length})`} selected={tab === "live"} onPress={() => setTab("live")} />
        <Chip label={`${t("profile.completed")} (${(mine.data ?? []).filter((p) => !LIVE.has(p.status)).length})`} selected={tab === "completed"} onPress={() => setTab("completed")} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={mine.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : <EmptyState icon="📝" title={tab === "live" ? t("profile.noLive") : t("profile.noCompleted")}
              cta={tab === "live" ? t("feed.emptyCta") : undefined} onPress={() => router.push("/create")} />}
      />
    </Screen>
  );
}
