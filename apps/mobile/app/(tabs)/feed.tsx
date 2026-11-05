import { useEffect, useRef, useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FeedTab, FeedFilters } from "@fmbp/shared";
import { Screen, Text, Chip, EmptyState, Card, Button, Brand, IconText, ICON_COLOR, type IconName } from "@/components/ui";
import { fetchFeedPage, fetchBoosted, fetchSocialProof, type SocialProof } from "@/features/feed/api";
import { PostCard } from "@/features/posts/PostCard";
import { useSession } from "@/store/session";

const PROOF_ICON: Record<SocialProof["kind"], IconName> = { deals: "checkmark-done-outline", posts_week: "flame-outline", replies_week: "chatbubbles-outline", businesses: "storefront-outline" };

const TABS: FeedTab[] = ["latest", "partnership", "nearby", "recommended", "trending", "following", "saved"];

export default function Feed() {
  const { t } = useTranslation();
  const router = useRouter();
  const { business, businessLoaded } = useSession();
  const [tab, setTab] = useState<FeedTab>("latest");
  const [filters] = useState<FeedFilters>({});
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  // the tab row follows the selected tab, also when it changes from a button (e.g. "Explore" on an empty Saved tab)
  const tabsRef = useRef<FlatList<FeedTab>>(null);
  useEffect(() => { tabsRef.current?.scrollToIndex({ index: TABS.indexOf(tab), viewPosition: 0.5, animated: true }); }, [tab]);
  const viewer = business ? { lat: business.lat, lng: business.lng } : null;
  const q = useInfiniteQuery({
    queryKey: ["feed", tab, filters, business?.id],
    queryFn: ({ pageParam }) => fetchFeedPage(tab, filters, pageParam as string | null, viewer, business?.id ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  });
  // referral rewards: up to 3 boosted posts above Latest (each shown once: not repeated in the list below)
  const boosted = useQuery({ queryKey: ["feed", "boosted"], enabled: tab === "latest", queryFn: () => fetchBoosted(), staleTime: 60_000 });
  const boostedRows = tab === "latest" ? boosted.data ?? [] : [];
  const boostedIds = new Set(boostedRows.map((p) => p.id));
  // social proof (deals, else activity); the server shows nothing while the numbers are too small to help
  const proof = useQuery({
    queryKey: ["feed", "social_proof", business?.city ?? null], staleTime: 10 * 60_000,
    queryFn: () => fetchSocialProof(business?.city ?? null),
  });
  const rows = (q.data?.pages.flatMap((p) => p.rows) ?? []).filter((p) => !boostedIds.has(p.id));
  const needsBusiness = businessLoaded && !business;
  const emptyText = needsBusiness && tab !== "latest" && tab !== "trending" ? t("feed.setupBody")
    : tab === "saved" ? t("feed.emptySaved") : tab === "partnership" ? t("feed.emptyPartnership") : tab === "following" ? t("feed.emptyFollowing") : tab === "nearby" ? t("feed.emptyNearby") : t("feed.empty");
  return (
    <Screen scroll={false} padded={false} muted>
      <View className="px-4 pt-2">
        {/* Brand and title on separate rows: side by side they collided on narrower iPhones / larger text sizes. */}
        <View className="gap-1 py-2">
          <Brand />
          <Text className="text-base font-semibold text-ink">{t("feed.title")}</Text>
          {proof.data ? (
            <IconText icon={PROOF_ICON[proof.data.kind]} variant="caption" color={ICON_COLOR.success} textClassName="font-semibold text-success">
              {t(`feed.proof.${proof.data.kind}${proof.data.city ? "" : "_all"}`, { count: proof.data.count, city: proof.data.city })}
            </IconText>
          ) : null}
        </View>
        {needsBusiness && !welcomeDismissed ? (
          <Card className="mb-3">
            <Text variant="label">{t("feed.welcomeTitle")}</Text>
            <Text variant="caption" className="mt-1">1. {t("feed.welcomeSteps.one")}</Text>
            <Text variant="caption">2. {t("feed.welcomeSteps.two")}</Text>
            <Text variant="caption">3. {t("feed.welcomeSteps.three")}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Button title={t("feed.welcomeCta")} full={false} onPress={() => router.push("/create")} />
              <Button title={t("feed.welcomeDismiss")} variant="ghost" full={false} onPress={() => setWelcomeDismissed(true)} />
            </View>
          </Card>
        ) : null}
        {needsBusiness ? (
          <Card className="mb-3 bg-brand-light">
            <IconText icon="storefront-outline" variant="label" color={ICON_COLOR.brandDark} textClassName="text-brand-dark">{t("feed.setupTitle")}</IconText>
            <Text variant="caption" className="mb-3 mt-1">{t("feed.setupBody")}</Text>
            <View className="flex-row"><Button title={t("feed.setupCta")} full={false} onPress={() => router.push("/(onboarding)/business")} /></View>
          </Card>
        ) : null}
        <FlatList ref={tabsRef} horizontal showsHorizontalScrollIndicator={false} data={TABS} keyExtractor={(x) => x}
          onScrollToIndexFailed={() => tabsRef.current?.scrollToOffset({ offset: 0, animated: true })}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          renderItem={({ item }) => <Chip label={t(`feed.tabs.${item}`)} selected={tab === item} onPress={() => setTab(item)} />} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={boostedRows.length ? (
          <View className="mb-2">
            <IconText icon="flash-outline" variant="label" className="mb-2">{t("referral.boostedRow")}</IconText>
            {boostedRows.map((p) => <PostCard key={p.id} post={p} />)}
          </View>
        ) : undefined}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.7}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { void q.refetch(); if (tab === "latest") void boosted.refetch(); }} />}
        ListEmptyComponent={q.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : q.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => q.refetch()} />
          : tab === "latest" ? <EmptyState title={emptyText} cta={t("feed.emptyCta")} onPress={() => router.push("/create")} />
          : <EmptyState icon={tab === "saved" ? "bookmark-outline" : tab === "following" ? "people-outline" : "location-outline"} title={emptyText} cta={t("feed.explore")} onPress={() => setTab("latest")} />}
      />
    </Screen>
  );
}
