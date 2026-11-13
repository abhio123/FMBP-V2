import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, EmptyState } from "@/components/ui";
import { listMyPosts } from "@/features/posts/api";
import { PostCard } from "@/features/posts/PostCard";
import { useEditPost } from "@/features/posts/useEditPost";
import { useSession } from "@/store/session";
import { MY_POST_GROUPS, myPostGroup, type MyPostGroup } from "@/features/posts/myPostTabs";
import { COLORS } from "@/theme";

type Tab = "all" | MyPostGroup;
const TABS: Tab[] = ["all", ...MY_POST_GROUPS];
const EMPTY: Record<Tab, string> = { all: "profile.noPosts", live: "profile.noLive", expired: "profile.noExpired", completed: "profile.noCompleted" };

/** All of my posts, and the same split into Live (active + paused), Expired, and Completed (completed + archived). Opens on Live. */
export default function MyPosts() {
  const { t } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const [tab, setTab] = useState<Tab>("live");
  const editPost = useEditPost();
  const mine = useQuery({ queryKey: ["my_posts", business?.id], enabled: !!business, queryFn: () => listMyPosts(business!.id) });
  const all = mine.data ?? [];
  const inTab = (x: Tab) => (x === "all" ? all : all.filter((p) => myPostGroup(p.status) === x));
  const rows = inTab(tab);
  return (
    <Screen scroll={false} padded={false} muted>
      <Stack.Screen options={{ title: t("profile.myPosts") }} />
      {/* four tabs in one row, each as wide as its label (same chips as the Opportunities tabs); only when they do not
          fit does a tab narrow, and its label shrinks a little instead of wrapping to a second line */}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {TABS.map((x) => {
          const selected = tab === x;
          return (
            <Pressable key={x} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setTab(x)} style={[styles.tab, selected && styles.tabSelected]}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.tabText, selected && styles.tabTextSelected]}>
                {t(`profile.${x}`)} ({inTab(x).length})
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => <PostCard post={item} onEdit={() => editPost.edit(item.id)} editing={editPost.loadingId === item.id} />}
        ListEmptyComponent={mine.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : <EmptyState icon="document-text-outline" title={t(EMPTY[tab])}
              cta={tab === "live" || tab === "all" ? t("feed.emptyCta") : undefined} onPress={() => router.push("/create")} />}
      />
    </Screen>
  );
}

// colours = tailwind.config.js tokens (brand, line, ink, surface), as in the Chip used for the Opportunities tabs
const BRAND = COLORS.brand, LINE = COLORS.line, INK = COLORS.ink;

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  // content width; flexShrink lets a tab give up space only when the row is too narrow for all four
  tab: { flexShrink: 1, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: LINE, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  tabSelected: { borderColor: BRAND, backgroundColor: BRAND },
  tabText: { fontSize: 16, color: INK, textAlign: "center" },
  tabTextSelected: { fontWeight: "600", color: COLORS.white },
});
