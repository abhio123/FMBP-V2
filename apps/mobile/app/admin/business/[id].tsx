import { Alert, Linking, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate, tradeLabel } from "@fmbp/shared";
import { Avatar, Button, Card, EmptyState, Text, IconText, DataIcon, ICON_COLOR } from "@/components/ui";
import { adminBusiness, adminBusinessPosts, removePost, restorePost, revokeVerification, suspendBusiness, unsuspendBusiness, type AdminPost } from "@/features/admin/api";
import { ReasonDialog } from "@/features/admin/ReasonDialog";
import { useAdminAction } from "@/features/admin/useAdminAction";
import { useDocViewer } from "@/features/admin/useDocViewer";

/**
 * One business as an admin sees it: login number, status, numbers, documents, every post (also hidden or removed)
 * and what admins did to it. Suspend / lift, take back the badge, remove / restore posts; every action needs a reason
 * where the business is affected, and lands in the admin log.
 */
export default function AdminBusinessScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const biz = useQuery({ queryKey: ["admin", "business", id], enabled: !!id, queryFn: () => adminBusiness(id) });
  const posts = useQuery({ queryKey: ["admin", "business_posts", id], enabled: !!id, queryFn: () => adminBusinessPosts(id) });
  const { run, withReason, ask, closeAsk } = useAdminAction();
  const doc = useDocViewer();
  const date = (d: string | null) => (d ? formatDate(d, lang) : "");

  if (biz.isError) return <View className="flex-1 bg-surface-muted p-4"><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => biz.refetch()} /></View>;
  const b = biz.data;
  if (!b) return <View className="flex-1 bg-surface-muted p-4"><Text variant="caption">{t("common.loading")}</Text></View>;

  const suspend = () => withReason("suspend", { title: t("admin.suspendTitle", { name: b.name }), message: t("admin.suspendBody"), confirm: t("admin.suspend"), destructive: true },
    (reason) => suspendBusiness(b.id, reason));
  const lift = () => withReason("unsuspend", { title: t("admin.unsuspendTitle", { name: b.name }), message: t("admin.unsuspendBody"), confirm: t("admin.unsuspend"), optional: true },
    (note) => unsuspendBusiness(b.id, note || null));
  const revoke = () => withReason("revoke_verification", { title: t("admin.revokeTitle"), message: t("admin.revokeBody"), confirm: t("admin.revoke"), destructive: true },
    (reason) => revokeVerification(b.id, reason));
  const remove = (p: AdminPost) => withReason("remove_post", { title: t("admin.removePostTitle"), message: t("admin.removePostBody", { title: p.title }), confirm: t("admin.removePost"), destructive: true },
    (reason) => removePost(p.id, reason));
  const restore = (p: AdminPost) => Alert.alert(t("admin.restorePostTitle"), p.title, [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("admin.restorePost"), onPress: () => run("restore_post", () => restorePost(p.id, null)) },
  ]);
  const status = b.deleted_at ? t("admin.flags.deleted") : b.suspended_at ? t("admin.flags.suspended") : t("admin.flags.active");

  return (
    <ScrollView className="flex-1 bg-surface-muted" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        // iOS: the navigation header is see-through and the page starts under it; inset the list below it (as Screen does)
        contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={biz.isRefetching} onRefresh={() => { void biz.refetch(); void posts.refetch(); }} />}>
      <Card raised className="gap-2">
        <View className="flex-row items-center gap-3">
          <Avatar name={b.name} uri={b.logo_url} size={56} />
          <View className="flex-1">
            <Text variant="heading">{b.name}</Text>
            <Text variant="caption">{[b.kind === "individual" ? `${t("individual.badge")}: ${tradeLabel(b.trade, b.trade_other, lang) ?? ""}` : b.category, b.city, b.pincode].filter(Boolean).join(" · ")}</Text>
            <Text variant="small">{t("admin.joined", { date: date(b.created_at) })} · {status}</Text>
          </View>
        </View>
        {b.suspended_at ? (
          <View className="rounded-xl bg-danger/10 p-3">
            <IconText icon="ban-outline" variant="label" color={ICON_COLOR.danger} textClassName="text-danger">{t("admin.suspendedSince", { date: date(b.suspended_at) })}</IconText>
            {b.suspension_reason ? <Text variant="caption">{b.suspension_reason}</Text> : null}
          </View>
        ) : null}
        {b.description ? <Text variant="caption" numberOfLines={4}>{b.description}</Text> : null}
        <Text variant="caption">{t("admin.owner")}: {b.owner_name || "—"}{b.owner_phone ? ` · +${b.owner_phone}` : ""}</Text>
        {b.phone ? <Text variant="caption">{t("admin.businessPhone")}: {b.phone}</Text> : null}
        {/* the same person's other profiles: a suspension covers one profile, so check these too */}
        {b.other_profiles.length ? <Text variant="label" className="mt-1">{t("admin.otherProfiles")}</Text> : null}
        {b.other_profiles.map((o) => (
          <Button key={o.id} title={`${o.name}${o.suspended_at ? ` · ${t("admin.flags.suspended")}` : ""}`} icon={o.kind === "individual" ? "person-outline" : "storefront-outline"}
            variant="ghost" full={false} onPress={() => router.push({ pathname: "/admin/business/[id]", params: { id: o.id } })} />
        ))}
        <View className="flex-row flex-wrap gap-2">
          {b.owner_phone ? <Button title={t("admin.call")} icon="call-outline" variant="secondary" full={false} onPress={() => Linking.openURL(`tel:+${b.owner_phone}`)} /> : null}
          {!b.deleted_at ? (b.suspended_at
            ? <Button title={t("admin.unsuspend")} full={false} onPress={lift} />
            : <Button title={t("admin.suspend")} variant="ghost" full={false} onPress={suspend} />) : null}
        </View>
      </Card>

      <Card raised className="gap-1">
        <Text variant="label">{t("admin.numbers")}</Text>
        <Text variant="caption">{t("admin.postsCount", { live: b.posts_live, total: b.posts_total })}</Text>
        <Text variant="caption">{t("admin.reportsCount", { against: b.reports_against, made: b.reports_made })}</Text>
        <Text variant="caption">{t("common.deals", { count: b.completed_deals })} · {t("admin.rating", { avg: Number(b.rating_avg).toFixed(1), count: b.rating_count })} · {t("admin.referrals", { count: b.referral_count })}</Text>
      </Card>

      <Card raised className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="label">{t("admin.verification")}: {t(`admin.verify.state.${b.verification_status}`, { defaultValue: b.verification_status })}</Text>
          {b.verification_status === "verified" ? <Button title={t("admin.revoke")} variant="ghost" full={false} onPress={revoke} /> : null}
        </View>
        {b.verifications.length ? b.verifications.map((v) => (
          <View key={v.id} className="flex-row items-center gap-2 border-t border-line pt-2">
            <View className="flex-1">
              <Text variant="caption">{t(`verify.docTypes.${v.doc_type}`, { defaultValue: v.doc_type })}{v.doc_number ? ` · ${v.doc_number}` : ""} · {t(`admin.verify.status.${v.status}`)}</Text>
              <Text variant="small">{date(v.created_at)}{v.note ? ` · “${v.note}”` : ""}</Text>
            </View>
            {v.file_path ? <Button title={t("admin.verify.viewDoc")} icon="document-text-outline" variant="ghost" full={false} onPress={() => doc.open(v.file_path)} /> : null}
          </View>
        )) : <Text variant="small">{t("admin.noDocuments")}</Text>}
      </Card>

      <Card raised className="gap-2">
        <Text variant="label">{t("admin.posts")} ({posts.data?.length ?? 0})</Text>
        {posts.data?.length ? posts.data.map((p) => (
          <View key={p.id} className="flex-row items-center gap-2 border-t border-line pt-2">
            <DataIcon value={p.icon} fallback="pin-outline" size={18} />
            <View className="flex-1">
              <Text variant="caption" numberOfLines={2} className={p.removed ? "line-through" : ""}>{p.title}</Text>
              <Text variant="small">{date(p.created_at)} · {t(`post.status.${p.status}`, { defaultValue: p.status })}{p.hidden ? ` · ${t("admin.flags.hidden")}` : ""}{p.removed ? ` · ${t("admin.flags.removed")}` : ""}</Text>
            </View>
            {p.removed
              ? <Button title={t("admin.restorePost")} variant="ghost" full={false} onPress={() => restore(p)} />
              : <Button title={t("admin.removePost")} variant="ghost" full={false} onPress={() => remove(p)} />}
          </View>
        )) : <Text variant="small">{posts.isLoading ? t("common.loading") : t("business.noPosts")}</Text>}
      </Card>

      <Card raised className="gap-2">
        <Text variant="label">{t("admin.history")}</Text>
        {b.actions.length ? b.actions.map((a, i) => (
          <Text key={i} variant="small">{date(a.at)} · {t(`admin.actions.${a.action}`, { defaultValue: a.action })}{a.note ? ` · “${a.note}”` : ""} · +{a.admin}</Text>
        )) : <Text variant="small">{t("admin.noHistory")}</Text>}
      </Card>
      <ReasonDialog request={ask} onClose={closeAsk} />
      {doc.viewer}
    </ScrollView>
  );
}
