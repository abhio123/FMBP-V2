import { useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Button, Card, Chip, EmptyState, Text } from "@/components/ui";
import { adminVerifications, reviewVerification, type VerificationRow, type VerificationStatus } from "@/features/admin/api";
import { ReasonDialog } from "@/features/admin/ReasonDialog";
import { useAdminAction } from "@/features/admin/useAdminAction";
import { useDocViewer } from "@/features/admin/useDocViewer";

const STATUSES: VerificationStatus[] = ["pending", "verified", "rejected"];

/**
 * Documents sent for the ✔ Verified badge, oldest first. Check that the name, city and number on the document match
 * the business (ADMIN.md has the checklist), then Approve, or Reject with the reason the business will see.
 */
export default function AdminVerify() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const list = useQuery({ queryKey: ["admin", "verifications", status], queryFn: () => adminVerifications(status) });
  const { run, withReason, ask, closeAsk } = useAdminAction();
  const doc = useDocViewer();

  const approve = (v: VerificationRow) => Alert.alert(t("admin.verify.approveTitle", { name: v.business_name }), t("admin.verify.approveBody"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("admin.verify.approve"), onPress: () => run("verify", () => reviewVerification(v.id, true, null)) },
  ]);
  const reject = (v: VerificationRow) => withReason("reject_verification",
    { title: t("admin.verify.rejectTitle", { name: v.business_name }), message: t("admin.verify.rejectBody"), confirm: t("admin.verify.reject"), destructive: true },
    (reason) => reviewVerification(v.id, false, reason));

  const item = ({ item: v }: { item: VerificationRow }) => (
    <Card raised className="mb-3 gap-2">
      <Text variant="label">{v.business_name}</Text>
      <Text variant="caption">{v.city} · {t(`verify.docTypes.${v.doc_type}`, { defaultValue: v.doc_type })}{v.doc_number ? ` · ${v.doc_number}` : ""}</Text>
      <Text variant="small">{t("admin.verify.sent", { date: formatDate(v.created_at, lang) })}{v.reviewed_at ? ` · ${t("admin.verify.reviewed", { date: formatDate(v.reviewed_at, lang) })}` : ""}</Text>
      {v.note ? <Text variant="caption" className="italic">“{v.note}”</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        <Button title={t("admin.verify.viewDoc")} icon="document-text-outline" variant="secondary" full={false} disabled={!v.file_path} onPress={() => doc.open(v.file_path)} />
        <Button title={t("admin.openBusiness")} icon="storefront-outline" variant="ghost" full={false} onPress={() => router.push({ pathname: "/admin/business/[id]", params: { id: v.business_id } })} />
      </View>
      {status === "pending" ? (
        <View className="flex-row flex-wrap gap-2">
          <Button title={t("admin.verify.approve")} icon="checkmark" full={false} onPress={() => approve(v)} />
          <Button title={t("admin.verify.reject")} variant="ghost" full={false} onPress={() => reject(v)} />
        </View>
      ) : null}
    </Card>
  );

  return (
    <View className="flex-1 bg-surface-muted">
      <View className="flex-row gap-2 px-4 py-3">
        {STATUSES.map((s) => <Chip key={s} label={t(`admin.verify.status.${s}`)} selected={status === s} onPress={() => setStatus(s)} />)}
      </View>
      <FlatList data={list.data ?? []} keyExtractor={(v) => v.id} renderItem={item} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); }} />}
        ListEmptyComponent={list.isLoading ? <Text variant="caption">{t("common.loading")}</Text>
          : list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} />
          : <EmptyState icon="checkmark-circle-outline" title={t("admin.verify.empty")} />} />
      <ReasonDialog request={ask} onClose={closeAsk} />
      {doc.viewer}
    </View>
  );
}
