import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, Icon, ICON_COLOR, Select, Text } from "@/components/ui";
import { listCategories } from "@/features/business/api";
import { categoryOptions } from "@/features/business/CategoryPicker";
import { PostCard } from "@/features/posts/PostCard";
import { useSession } from "@/store/session";
import { ANNOUNCE_PAGE, fetchAnnouncements } from "./api";

/**
 * Home → Announcements: what businesses have to say (new stock, offers, price updates, openings, events, news),
 * businesses I follow first, then the newest. A business can announce from here in under a minute. No location.
 */
export function Announcements() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const business = useSession((s) => s.business);
  const [typed, setTyped] = useState("");
  const [q, setQ] = useState(""); // what was typed, once the typing stops
  const [categoryId, setCategoryId] = useState<string | null>(null);
  useEffect(() => { const h = setTimeout(() => setQ(typed.trim()), 400); return () => clearTimeout(h); }, [typed]);

  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories, staleTime: 10 * 60_000 });
  const catOptions = useMemo(() => [
    { value: "all", label: t("announcements.allCategories") },
    ...categoryOptions(cats.data ?? [], hi, t("businessType.includes")),
  ], [cats.data, hi, t]);
  const list = useInfiniteQuery({
    queryKey: ["announcements", q, categoryId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchAnnouncements({ q, categoryId }, pageParam),
    getNextPageParam: (last, all) => (last.length < ANNOUNCE_PAGE ? undefined : all.length * ANNOUNCE_PAGE),
  });
  const rows = list.data?.pages.flat() ?? [];
  const canAnnounce = business?.kind === "business"; // a person tells about their work in posts

  const header = (
    <View className="gap-3 pb-3">
      {canAnnounce ? <Button title={t("announcements.announce")} icon="megaphone-outline" onPress={() => router.push("/create/announce")} /> : null}
      <View className="min-h-[48px] flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3">
        <Icon name="search" size={20} color={ICON_COLOR.muted} />
        <TextInput value={typed} onChangeText={setTyped} placeholder={t("announcements.searchPlaceholder")} placeholderTextColor={ICON_COLOR.faint}
          autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel={t("announcements.searchPlaceholder")}
          className="min-h-[46px] flex-1 text-[16px] text-ink" />
      </View>
      <Select placeholder={t("announcements.category")} value={categoryId ?? "all"} options={catOptions}
        onChange={(v) => setCategoryId(v === "all" ? null : v)} intro={t("businessType.pickHint")} />
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); }} />}
      ListFooterComponent={list.isFetchingNextPage ? <Text variant="caption" className="py-3 text-center">{t("common.loading")}</Text> : undefined}
      ListEmptyComponent={list.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
        : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
        : <EmptyState icon="megaphone-outline" title={q || categoryId ? t("announcements.emptyFiltered") : t("announcements.empty")} />}
    />
  );
}
