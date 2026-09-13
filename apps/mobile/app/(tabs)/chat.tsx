import { FlatList, View, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, EmptyState, TrustRow } from "@/components/ui";
import { listConversations, otherParty } from "@/features/chat/api";
import { useSession } from "@/store/session";

export default function Chat() {
  const { t } = useTranslation();
  const router = useRouter();
  const business = useSession((s) => s.business);
  const convs = useQuery({ queryKey: ["conversations", business?.id], enabled: !!business, queryFn: () => listConversations(business!.id), refetchInterval: 15_000 });
  if (!business) return null;
  return (
    <Screen scroll={false} padded={false}>
      <Text variant="title" className="px-4 py-4">{t("chat.title")}</Text>
      <FlatList
        data={convs.data ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={convs.isRefetching} onRefresh={() => convs.refetch()} />}
        renderItem={({ item }) => {
          const other = otherParty(item, business.id);
          const last = item.messages[0];
          const unread = !!last && last.sender_business_id !== business.id && !last.read_at;
          return (
            <Card className="mb-3" onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  {other ? <TrustRow name={other.name} city={other.city} verified={other.verification_status === "verified"} /> : null}
                  {item.post ? <Text variant="small" className="mt-1" numberOfLines={1}>📌 {item.post.title}</Text> : null}
                  <Text variant={unread ? "label" : "caption"} numberOfLines={1} className="mt-1">
                    {last ? `${last.sender_business_id === business.id ? `${t("chat.you")}: ` : ""}${last.body ?? "📎"}` : t("chat.noMessages")}
                  </Text>
                </View>
                {unread ? <View className="mt-1 h-3 w-3 rounded-full bg-brand" /> : null}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={convs.isLoading ? <Text variant="caption" className="p-4">{t("common.loading")}</Text>
          : convs.isError ? <EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => convs.refetch()} />
          : <EmptyState icon="💬" title={t("chat.empty")} cta={t("chat.emptyCta")} onPress={() => router.push("/(tabs)/feed")} />}
      />
    </Screen>
  );
}
