import { useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FeedTab, FeedFilters } from "@fmbp/shared";
import { Screen, Text, Chip, EmptyState } from "@/components/ui";
import { fetchFeedPage } from "@/features/feed/api";
import { PostCard } from "@/features/posts/PostCard";
import { useSession } from "@/store/session";

const TABS: FeedTab[] = ["latest", "nearby", "recommended", "trending", "following", "saved"];

export default function Feed() {
  const { t } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const [tab, setTab] = useState<FeedTab>("latest");
  const [filters] = useState<FeedFilters>({});
  const viewer = business ? { lat: business.lat, lng: business.lng } : null;
  const q = useInfiniteQuery({
    queryKey: ["feed", tab, filters, business?.id],
    queryFn: ({ pageParam }) => fetchFeedPage(tab, filters, pageParam as string | null, viewer, business?.id ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  });
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
  const emptyText = tab === "saved" ? t("feed.emptySaved") : tab === "following" ? t("feed.emptyFollowing") : tab === "nearby" ? t("feed.emptyNearby") : t("feed.empty");
  return (
    <Screen scroll={false} padded={false}>
      <View className="px-4 pt-2">
        <Text variant="title" className="py-2">{t("feed.title")}</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={TABS} keyExtractor={(x) => x}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          renderItem={({ item }) => <Chip label={t(`feed.tabs.${item}`)} selected={tab === item} onPress={() => setTab(item)} />} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => <PostCard post={item} />}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.7}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
        ListEmptyComponent={q.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : q.isError ? <EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => q.refetch()} />
          : <EmptyState title={emptyText} cta={tab === "latest" ? t("feed.emptyCta") : undefined} onPress={() => router.push("/create")} />}
      />
    </Screen>
  );
}
