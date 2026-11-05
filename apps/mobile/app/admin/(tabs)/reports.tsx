import { useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Button, Card, Chip, EmptyState, Text, Icon } from "@/components/ui";
import { adminReports, resolveReport, type ReportGroup, type ReportStatus } from "@/features/admin/api";
import { ReasonDialog } from "@/features/admin/ReasonDialog";
import { useAdminAction } from "@/features/admin/useAdminAction";

const STATUSES: ReportStatus[] = ["open", "dismissed", "actioned"];
const ICON = { post: "pin-outline", business: "storefront-outline", message: "chatbubble-outline" } as const;

/**
 * Reports queue: one card per reported post, business or message, most reported first. A post reported by 3
 * businesses is already hidden for everyone; Dismiss shows it again, Remove deletes it (the owner is told why),
 * Suspend locks the business that posted / sent it.
 */
export default function AdminReports() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const [status, setStatus] = useState<ReportStatus>("open");
  const list = useQuery({ queryKey: ["admin", "reports", status], queryFn: () => adminReports(status) });
  const { run, withReason, ask, closeAsk } = useAdminAction();

  const dismiss = (r: ReportGroup) => Alert.alert(t("admin.reports.dismissTitle"), t("admin.reports.dismissBody"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("admin.reports.dismiss"), onPress: () => run("report_dismiss", () => resolveReport(r.target_type, r.target_id, "dismiss", null)) },
  ]);
  const remove = (r: ReportGroup) => withReason("report_remove_post",
    { title: t("admin.removePostTitle"), message: t("admin.removePostBody", { title: r.title }), confirm: t("admin.removePost"), destructive: true },
    (reason) => resolveReport(r.target_type, r.target_id, "remove_post", reason));
  const suspend = (r: ReportGroup) => withReason("report_suspend",
    { title: t("admin.suspendTitle", { name: r.business_name ?? "" }), message: t("admin.suspendBody"), confirm: t("admin.suspend"), destructive: true },
    (reason) => resolveReport(r.target_type, r.target_id, "suspend_business", reason));

  const item = ({ item: r }: { item: ReportGroup }) => (
    <Card raised className="mb-3 gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        <Icon name={ICON[r.target_type]} size={18} />
        <Text variant="small" className="font-semibold text-ink">{t(`admin.reports.type.${r.target_type}`)}</Text>
        <Text variant="small" className="rounded-full bg-danger/15 px-2 py-0.5 font-semibold text-danger">{t("admin.reports.count", { count: r.reports })}</Text>
        {r.hidden ? <Text variant="small" className="rounded-full bg-accent/20 px-2 py-0.5 text-ink">{t("admin.flags.hidden")}</Text> : null}
        {r.removed ? <Text variant="small" className="rounded-full bg-surface-muted px-2 py-0.5 text-ink">{t("admin.flags.removed")}</Text> : null}
        {r.suspended ? <Text variant="small" className="rounded-full bg-surface-muted px-2 py-0.5 text-ink">{t("admin.flags.suspended")}</Text> : null}
      </View>
      <Text variant="label" numberOfLines={2}>{r.title}</Text>
      {r.body ? <Text variant="caption" numberOfLines={4}>{r.body}</Text> : null}
      <Text variant="caption">{r.reasons.map((x) => t(`safety.reasons.${x}`, { defaultValue: x })).join(" · ")}</Text>
      {r.details.map((d, i) => <Text key={i} variant="small" className="italic">“{d}”</Text>)}
      <Text variant="small">{t("admin.reports.dates", { first: formatDate(r.first_at, lang), last: formatDate(r.last_at, lang) })}</Text>
      {r.business_id ? (
        <Button title={r.business_name ?? t("admin.business")} icon="storefront-outline" variant="ghost" full={false}
          onPress={() => router.push({ pathname: "/admin/business/[id]", params: { id: r.business_id! } })} />
      ) : null}
      {status === "open" ? (
        <View className="flex-row flex-wrap gap-2">
          <Button title={t("admin.reports.dismiss")} variant="secondary" full={false} onPress={() => dismiss(r)} />
          {r.target_type === "post" && !r.removed ? <Button title={t("admin.removePost")} variant="secondary" full={false} onPress={() => remove(r)} /> : null}
          {r.business_id && !r.suspended ? <Button title={t("admin.suspend")} variant="ghost" full={false} onPress={() => suspend(r)} /> : null}
        </View>
      ) : null}
    </Card>
  );

  return (
    <View className="flex-1 bg-surface-muted">
      <View className="flex-row gap-2 px-4 py-3">
        {STATUSES.map((s) => <Chip key={s} label={t(`admin.reports.status.${s}`)} selected={status === s} onPress={() => setStatus(s)} />)}
      </View>
      <FlatList data={list.data ?? []} keyExtractor={(r) => `${r.target_type}:${r.target_id}`} renderItem={item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); }} />}
        ListEmptyComponent={list.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
          : <EmptyState icon="checkmark-circle-outline" title={t("admin.reports.empty")} />} />
      <ReasonDialog request={ask} onClose={closeAsk} />
    </View>
  );
}
