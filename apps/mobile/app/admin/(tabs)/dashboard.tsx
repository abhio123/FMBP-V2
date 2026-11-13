import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Icon, ICON_COLOR, Text, type IconName } from "@/components/ui";
import { adminStats, type AdminStats } from "@/features/admin/api";

/**
 * Today at a glance, and what needs an admin now (reports, documents to check). Every tile opens what is behind it
 * (e.g. Suspended → the suspended businesses, each with Lift suspension); messages are private, so that one is a number.
 */
export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminStats, refetchInterval: 60_000, refetchIntervalInBackground: false });
  const s = stats.data;
  const tile = (key: keyof AdminStats, icon: IconName, label: string, sub: string | undefined, onPress: (() => void) | null) => (
    <Card key={key} raised onPress={onPress ?? undefined} className="min-w-[46%] flex-1">
      <View className="flex-row items-center justify-between">
        <Icon name={icon} size={20} color={ICON_COLOR.muted} />
        {/* the chevron says "this opens"; the private one says why it does not */}
        <Icon name={onPress ? "chevron-forward" : "lock-closed-outline"} size={16} color={ICON_COLOR.faint} />
      </View>
      <Text className="mt-1 text-2xl font-bold text-ink">{s ? s[key] : "…"}</Text>
      <Text variant="label">{label}</Text>
      {sub ? <Text variant="small">{sub}</Text> : null}
    </Card>
  );
  const list = (kind: "businesses" | "posts" | "deals" | "responses", filter?: string) => () =>
    router.push({ pathname: "/admin/list", params: filter ? { kind, filter } : { kind } });
  return (
    <ScrollView className="flex-1 bg-surface-muted" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => { void stats.refetch(); }} />}>
      {stats.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => stats.refetch()} /> : null}
      <Text variant="heading">{t("admin.needsAttention")}</Text>
      <View className="flex-row flex-wrap gap-3">
        {tile("open_reports", "flag-outline", t("admin.stats.openReports"), s ? t("admin.stats.hiddenPosts", { count: s.hidden_posts }) : undefined, () => router.navigate("/admin/reports"))}
        {tile("pending_verifications", "shield-checkmark-outline", t("admin.stats.pendingVerifications"), undefined, () => router.navigate("/admin/verify"))}
      </View>
      <Text variant="heading">{t("admin.activity")}</Text>
      <View className="flex-row flex-wrap gap-3">
        {tile("businesses", "storefront-outline", t("admin.stats.businesses"), s ? t("admin.stats.newTodayWeek", { today: s.businesses_today, week: s.businesses_week }) : undefined, list("businesses", "all"))}
        {tile("posts_live", "document-text-outline", t("admin.stats.postsLive"), s ? t("admin.stats.newTodayWeek", { today: s.posts_today, week: s.posts_week }) : undefined, list("posts", "live"))}
        {tile("responses_week", "hand-right-outline", t("admin.stats.responsesWeek"), undefined, list("responses"))}
        {tile("messages_week", "chatbubbles-outline", t("admin.stats.messagesWeek"), t("admin.stats.messagesPrivate"), null)}
        {tile("deals_month", "checkmark-done-outline", t("admin.stats.dealsMonth"), undefined, list("deals"))}
        {tile("suspended", "ban-outline", t("admin.stats.suspended"), undefined, list("businesses", "suspended"))}
        {tile("deletions_pending", "trash-outline", t("admin.stats.deletionsPending"), undefined, list("businesses", "deleting"))}
        {tile("words_new", "text-outline", t("admin.words.title"), t("admin.stats.wordsNew"), () => router.push("/admin/words"))}
      </View>
    </ScrollView>
  );
}
