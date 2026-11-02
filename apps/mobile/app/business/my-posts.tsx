import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Chip, EmptyState } from "@/components/ui";
import { listMyPosts } from "@/features/posts/api";
import { PostCard } from "@/features/posts/PostCard";
import { useSession } from "@/store/session";

type Tab = "live" | "expired" | "completed";
/** Which tab a post status belongs to. Expired posts stay renewable from the post page. */
const tabOf = (status: string): Tab => (status === "active" || status === "paused" ? "live" : status === "expired" ? "expired" : "completed");
const TABS: Tab[] = ["live", "expired", "completed"];
const EMPTY: Record<Tab, string> = { live: "profile.noLive", expired: "profile.noExpired", completed: "profile.noCompleted" };

/** All of my posts, split into Live (active + paused), Expired, and Completed (completed + archived). */
export default function MyPosts() {
  const { t } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const [tab, setTab] = useState<Tab>("live");
  const mine = useQuery({ queryKey: ["my_posts", business?.id], enabled: !!business, queryFn: () => listMyPosts(business!.id) });
  const all = mine.data ?? [];
  const rows = all.filter((p) => tabOf(p.status) === tab);
  return (
    <Screen scroll={false} padded={false}>
      <Stack.Screen options={{ title: t("profile.myPosts") }} />
      <View className="flex-row flex-wrap gap-2 px-4 py-3">
        {TABS.map((x) => (
          <Chip key={x} label={`${t(`profile.${x}`)} (${all.filter((p) => tabOf(p.status) === x).length})`} selected={tab === x} onPress={() => setTab(x)} />
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={mine.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : <EmptyState icon="📝" title={t(EMPTY[tab])}
              cta={tab === "live" ? t("feed.emptyCta") : undefined} onPress={() => router.push("/create")} />}
      />
    </Screen>
  );
}
