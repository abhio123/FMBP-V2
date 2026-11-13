import { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatTime } from "@fmbp/shared";
import { useTranslation } from "react-i18next";
import { Button, Card, Field, IconText, Screen, Text } from "@/components/ui";
import { broadcast, listBroadcasts, type SentBroadcast } from "@/features/admin/api";
import { useAdminAction } from "@/features/admin/useAdminAction";

const TITLE_MAX = 65, BODY_MAX = 180; // what a lock screen shows without cutting (same limits on the server)
const input = "min-h-[48px] rounded-xl border border-line bg-surface px-4 text-[16px] text-ink";

/**
 * Below the form: broadcasts already sent. A push cannot be edited or recalled once phones received it (Apple /
 * Google), so a mistake is fixed with a new one: "Use as template" fills the form with the old text.
 *
 * One push notification to everyone, or to one city's businesses, in each person's language (Hindi falls back to
 * English when left empty). Confirmed twice; the server allows one broadcast per 10 minutes. Use rarely (ADMIN.md).
 */
export default function AdminBroadcast() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const router = useRouter();
  const sent = useQuery({ queryKey: ["admin", "broadcasts"], queryFn: listBroadcasts });
  const reuse = (b: SentBroadcast) => setM({ titleEn: b.title_en, bodyEn: b.body_en, titleHi: b.title_hi ?? "", bodyHi: b.body_hi ?? "", city: b.city && b.city !== "all" ? b.city : "" });
  const { message } = useAdminAction();
  const [m, setM] = useState({ titleEn: "", bodyEn: "", titleHi: "", bodyHi: "", city: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof m) => (v: string) => setM((x) => ({ ...x, [k]: v }));
  const ok = m.titleEn.trim().length >= 3 && m.bodyEn.trim().length >= 3;
  const send = async () => {
    setBusy(true);
    try {
      const n = await broadcast({ ...m, city: m.city || null });
      Alert.alert(t("admin.broadcastSent", { count: n }), undefined, [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) { Alert.alert(t("common.error"), message(e)); } finally { setBusy(false); }
  };
  const confirm = () => Alert.alert(t("admin.broadcastConfirmTitle"),
    m.city.trim() ? t("admin.broadcastConfirmCity", { city: m.city.trim() }) : t("admin.broadcastConfirmAll"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.broadcastSend"), style: "destructive", onPress: send },
    ]);
  return (
    <Screen>
      <View className="py-4">
        <Card className="mb-5 border-accent bg-accent/10"><Text variant="caption">{t("admin.broadcastWarning")}</Text></Card>
        <Field label={t("admin.broadcastTitleEn")} required help={`${m.titleEn.length}/${TITLE_MAX}`}>
          <TextInput value={m.titleEn} onChangeText={set("titleEn")} maxLength={TITLE_MAX} className={input} />
        </Field>
        <Field label={t("admin.broadcastBodyEn")} required help={`${t("admin.broadcastLinkHint")} · ${m.bodyEn.length}/${BODY_MAX}`}>
          <TextInput value={m.bodyEn} onChangeText={set("bodyEn")} maxLength={BODY_MAX} multiline className={`${input} min-h-[88px] py-3`} style={{ textAlignVertical: "top" }} />
        </Field>
        <Field label={t("admin.broadcastTitleHi")} help={`${m.titleHi.length}/${TITLE_MAX}`}>
          <TextInput value={m.titleHi} onChangeText={set("titleHi")} maxLength={TITLE_MAX} className={input} />
        </Field>
        <Field label={t("admin.broadcastBodyHi")} help={`${m.bodyHi.length}/${BODY_MAX}`}>
          <TextInput value={m.bodyHi} onChangeText={set("bodyHi")} maxLength={BODY_MAX} multiline className={`${input} min-h-[88px] py-3`} style={{ textAlignVertical: "top" }} />
        </Field>
        <Field label={t("admin.broadcastCity")} help={t("admin.broadcastCityHint")}>
          <TextInput value={m.city} onChangeText={set("city")} maxLength={60} placeholder="Greater Noida" className={input} />
        </Field>
        <Button title={t("admin.broadcastSend")} icon="megaphone-outline" onPress={confirm} disabled={!ok} loading={busy} />

        <Text variant="heading" className="mt-8">{t("admin.sentBroadcasts")}</Text>
        <IconText icon="information-circle-outline" variant="caption" className="mb-3 mt-1">{t("admin.sentBroadcastsHint")}</IconText>
        {sent.isLoading ? <Text variant="caption">{t("common.loading")}</Text> : null}
        {sent.data && !sent.data.length ? <Text variant="caption">{t("admin.noBroadcasts")}</Text> : null}
        {sent.data?.map((b) => (
          <Card key={b.id} raised className="mb-3 gap-1">
            <Text variant="label">{b.title_en}</Text>
            <Text variant="caption">{b.body_en}</Text>
            {b.title_hi || b.body_hi ? <Text variant="caption">{[b.title_hi, b.body_hi].filter(Boolean).join(" — ")}</Text> : null}
            <Text variant="small">
              {formatDate(b.created_at, lang)} {formatTime(b.created_at)} · {b.city && b.city !== "all" ? b.city : t("admin.everyone")} · {t("admin.broadcastSent", { count: b.recipients })} · {b.admin_name ?? `+${b.admin_phone}`}
            </Text>
            <Button title={t("admin.useAsTemplate")} icon="copy-outline" variant="ghost" full={false} onPress={() => reuse(b)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
