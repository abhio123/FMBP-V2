import { FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "@fmbp/shared";
import { Card, EmptyState, Text } from "@/components/ui";
import { adminLog, type AdminLogRow } from "@/features/admin/api";

/** Every admin action, newest first: who, what, on what, why. Kept for good (accountability; ADMIN.md). */
export default function AdminLog() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const list = useQuery({ queryKey: ["admin", "log"], queryFn: () => adminLog(200) });
  const item = ({ item: a }: { item: AdminLogRow }) => {
    const toBusiness = a.target_type === "business" && a.target_id
      ? () => router.push({ pathname: "/admin/business/[id]", params: { id: a.target_id! } }) : undefined;
    const title = typeof a.data?.title === "string" ? a.data.title : null;
    return (
      <Card raised className="mb-3 gap-1" onPress={toBusiness}>
        <Text variant="label">{t(`admin.actions.${a.action}`, { defaultValue: a.action })}</Text>
        {title ? <Text variant="caption" numberOfLines={1}>{title}</Text> : null}
        {a.note ? <Text variant="caption">“{a.note}”</Text> : null}
        <Text variant="small">{formatDate(a.created_at, lang)} {formatTime(a.created_at)} · {a.admin_name ?? ""} +{a.admin_phone}</Text>
      </Card>
    );
  };
  return (
    <View className="flex-1 bg-surface-muted">
      <FlatList data={list.data ?? []} keyExtractor={(a) => String(a.id)} renderItem={item} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); }} />}
        ListEmptyComponent={list.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
          : <EmptyState icon="receipt-outline" title={t("admin.logEmpty")} />} />
    </View>
  );
}
