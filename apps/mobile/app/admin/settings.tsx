import { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Button, Card, EmptyState, Field, Screen, Text } from "@/components/ui";
import { adminSettings, updateSetting, type AdminSetting } from "@/features/admin/api";
import { useAdminAction } from "@/features/admin/useAdminAction";

/**
 * App settings that change without an app release. Today: the minimums for the line at the top of Opportunities
 * ("✔ 12 deals done…", "🔥 42 new opportunities…"): a number below its minimum is never shown.
 */
export default function AdminSettings() {
  const { t, i18n } = useTranslation();
  const list = useQuery({ queryKey: ["admin", "settings"], queryFn: adminSettings });
  if (list.isError) return <Screen><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} /></Screen>;
  return (
    <Screen>
      <View className="gap-4 py-4">
        {list.isLoading ? <Text variant="caption">{t("common.loading")}</Text> : null}
        {/* keyed by the save time: after a save the card starts again from the stored numbers */}
        {list.data?.map((s) => <SettingCard key={`${s.key}:${s.updated_at}`} setting={s} lang={i18n.language === "hi" ? "hi" : "en"} />)}
      </View>
    </Screen>
  );
}

function SettingCard({ setting, lang }: { setting: AdminSetting; lang: "en" | "hi" }) {
  const { t } = useTranslation();
  const { run } = useAdminAction();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(setting.value).map(([k, v]) => [k, String(v)])));
  const valid = Object.values(draft).every((v) => /^\d{1,6}$/.test(v) && Number(v) <= 100000);
  const changed = Object.entries(draft).some(([k, v]) => Number(v) !== setting.value[k]);
  const save = () => run("update_setting", () => updateSetting(setting.key, Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)]))), t("admin.saved"));
  return (
    <Card raised>
      <Text variant="label">{t(`admin.settingNames.${setting.key}`, { defaultValue: setting.key })}</Text>
      {setting.note ? <Text variant="small" className="mb-3">{setting.note}</Text> : null}
      {Object.keys(setting.value).map((k) => (
        <Field key={k} label={t(`admin.settingKeys.${k}`, { defaultValue: k })} showOptional={false}>
          <TextInput value={draft[k] ?? ""} onChangeText={(v) => setDraft((d) => ({ ...d, [k]: v.replace(/\D/g, "") }))} keyboardType="number-pad" maxLength={6}
            className="min-h-[48px] rounded-xl border border-line px-4 text-[16px] text-ink" />
        </Field>
      ))}
      <Text variant="small" className="mb-3">{t("admin.updatedOn", { date: formatDate(setting.updated_at, lang) })}</Text>
      <Button title={t("common.save")} disabled={!valid || !changed} onPress={() => Alert.alert(t("admin.saveSettingTitle"), t("admin.saveSettingBody"), [
        { text: t("common.cancel"), style: "cancel" }, { text: t("common.save"), onPress: save },
      ])} />
    </Card>
  );
}
