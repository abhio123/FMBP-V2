import { useState } from "react";
import { TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Screen, Text, Button, Card, Chip, Field, ImagePicker, EmptyState, IconText, ICON_COLOR } from "@/components/ui";
import { DOC_TYPES, getMyVerification, requestVerification, verificationError, type DocType } from "@/features/verification/api";
import { loadMyBusiness } from "@/features/business/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

/**
 * Business → Get verified: send one business document (photo); FMBP checks it and the ✔ Verified badge appears on
 * the profile and posts. The photo is stored privately (only this business and FMBP admins can open it).
 */
export default function Verify() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const qc = useQueryClient();
  const { business, session, setBusiness } = useSession();
  const latest = useQuery({ queryKey: ["my_verification", business?.id], enabled: !!business, queryFn: () => getMyVerification(business!.id) });
  const [docType, setDocType] = useState<DocType | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!business) return null;
  if (latest.isError) return <Screen><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => latest.refetch()} /></Screen>;
  const status = business.verification_status;
  const submit = async () => {
    if (!docType || !photos[0]) return;
    setBusy(true); setErr(null);
    try {
      await requestVerification(business.id, docType, docNumber, photos[0]);
      track("verification_requested", { doc_type: docType });
      setBusiness(await loadMyBusiness(session?.user.id));
      await qc.invalidateQueries({ queryKey: ["my_verification"] });
      setPhotos([]); setDocNumber(""); setDocType(null);
    } catch (e) {
      const code = verificationError(e);
      setErr(code ? t(`verify.errors.${code}`) : (e as Error).message);
    } finally { setBusy(false); }
  };
  const canSend = status !== "verified" && status !== "pending";
  return (
    <Screen>
      <Stack.Screen options={{ title: t("verify.title") }} />
      <View className="gap-4 py-4">
        {status === "verified" ? (
          <Card className="border-success bg-success/10">
            <IconText icon="shield-checkmark" variant="label" color={ICON_COLOR.success}>{t("verify.verified")}</IconText>
            <Text variant="caption">{t("verify.verifiedHint")}</Text>
          </Card>
        ) : status === "pending" ? (
          <Card className="border-accent bg-accent/10">
            <IconText icon="time-outline" variant="label">{t("verify.pending")}</IconText>
            <Text variant="caption">{t("verify.pendingHint", { date: latest.data ? formatDate(latest.data.created_at, lang) : "" })}</Text>
          </Card>
        ) : (
          <Card>
            <Text variant="label">{t("verify.why")}</Text>
            <Text variant="caption" className="mt-1">{t("verify.whyHint")}</Text>
          </Card>
        )}
        {status === "rejected" && latest.data?.note ? (
          <Card className="border-danger">
            <Text variant="label">{t("verify.rejected")}</Text>
            <Text variant="caption">{latest.data.note}</Text>
          </Card>
        ) : null}
        {canSend ? (
          <View>
            <Field label={t("verify.docType")} required>
              <View className="flex-row flex-wrap gap-2">
                {DOC_TYPES.map((d) => <Chip key={d} label={t(`verify.docTypes.${d}`)} selected={docType === d} onPress={() => setDocType(d)} />)}
              </View>
            </Field>
            <Field label={t("verify.docNumber")}>
              <TextInput value={docNumber} onChangeText={setDocNumber} maxLength={40} autoCapitalize="characters" placeholder={t("verify.docNumberHint")}
                className="min-h-[48px] rounded-xl border border-line px-4 text-base text-ink" />
            </Field>
            <Field label={t("verify.photo")} help={t("verify.photoHint")} required>
              <ImagePicker value={photos} onChange={setPhotos} max={1} />
            </Field>
            {err ? <Text variant="caption" className="mb-3 text-danger">{err}</Text> : null}
            <Button title={t("verify.send")} onPress={submit} loading={busy} disabled={!docType || !photos[0]} />
            <IconText icon="lock-closed-outline" variant="small" className="mt-2 justify-center">{t("verify.privacy")}</IconText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
