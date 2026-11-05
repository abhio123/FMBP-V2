import { useCallback } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, EmptyState, TrustRow, IconText } from "@/components/ui";
import { listConversations, otherParty, isConversationUnread } from "@/features/chat/api";
import { useSession } from "@/store/session";

export default function Chat() {
  const { t } = useTranslation();
  const router = useRouter();
  const { business, businessLoaded } = useSession();
  const convs = useQuery({ queryKey: ["conversations", business?.id], enabled: !!business, queryFn: () => listConversations(business!.id), refetchInterval: 10_000, refetchIntervalInBackground: false });
  useFocusEffect(useCallback(() => { if (business) void convs.refetch(); }, [business])); // eslint-disable-line react-hooks/exhaustive-deps
  if (!business) {
    return (
      <Screen>
        <Text variant="title" className="py-4">{t("chat.title")}</Text>
        {businessLoaded ? <EmptyState icon="chatbubbles-outline" title={t("chat.needBusiness")} cta={t("feed.setupCta")} onPress={() => router.push("/(onboarding)/business")} /> : null}
      </Screen>
    );
  }
  return (
    <Screen scroll={false} padded={false}>
      <Text variant="title" className="px-4 py-4">{t("chat.title")}</Text>
      <FlatList
        data={convs.data ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={convs.isRefetching} onRefresh={() => { void convs.refetch(); }} />}
        renderItem={({ item }) => {
          const other = otherParty(item, business.id);
          const last = item.messages[0];
          const unread = isConversationUnread(item, business.id);
          const count = item.unread_count ?? 0;
          // unread: brand-tinted card, bold preview, count badge. read: plain card, muted preview.
          return (
            <Card className={`mb-3 ${unread ? "border-brand bg-brand-light" : ""}`} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  {other ? <TrustRow avatar logoUrl={other.logo_url} name={other.name} city={other.city} verified={other.verification_status === "verified"} />
                    : <TrustRow avatar name={t("safety.deletedBusiness")} />}
                  {item.post ? <IconText icon="pin-outline" variant="small" className="mt-1" numberOfLines={1}>{item.post.title}</IconText> : null}
                  <Text numberOfLines={1} className={`mt-1 ${unread ? "font-semibold text-ink" : "text-sm text-ink-muted"}`}>
                    {last ? `${last.sender_business_id === business.id ? `${t("chat.you")}: ` : ""}${last.body ?? t("chat.attachment")}` : t("chat.noMessages")}
                  </Text>
                  {last ? <Text variant="small" className="mt-0.5">{unread ? t("chat.unreadCount", { count }) : last.sender_business_id === business.id ? (last.read_at ? t("chat.seen") : t("chat.sent")) : t("chat.read")}</Text> : null}
                </View>
                {unread ? (
                  <View className="min-w-[24px] items-center rounded-full bg-accent px-2 py-0.5"><Text className="text-xs font-bold text-ink">{count || "•"}</Text></View>
                ) : null}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={convs.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : convs.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => convs.refetch()} />
          : <EmptyState icon="chatbubbles-outline" title={t("chat.empty")} cta={t("chat.emptyCta")} onPress={() => router.push("/(tabs)/feed")} />}
      />
    </Screen>
  );
}
