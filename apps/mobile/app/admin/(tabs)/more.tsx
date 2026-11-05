import { Pressable, ScrollView, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Field, Select, Text, Icon, ICON_COLOR, type IconName } from "@/components/ui";
import { saveMode } from "@/features/admin/api";
import { signOut } from "@/features/auth/api";
import { setLocale, LOCALES, type Locale } from "@/i18n";
import { useSession } from "@/store/session";

/** Everything else: broadcast, settings, admins, the log, switching to the normal app, language, logout. */
export default function AdminMore() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session, setMode } = useSession();
  const toUser = () => { if (session) void saveMode(session.user.id, "user"); setMode("user"); }; // the root layout opens the normal app
  const row = (icon: IconName, label: string, hint: string, href: Href, last = false) => (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)} className={`min-h-[60px] flex-row items-center gap-3 py-2 ${last ? "" : "border-b border-line"}`}>
      <Icon name={icon} size={22} color={ICON_COLOR.ink} />
      <View className="flex-1">
        <Text variant="label">{label}</Text>
        <Text variant="small">{hint}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
    </Pressable>
  );
  return (
    <ScrollView className="flex-1 bg-surface-muted" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <Card raised className="py-1">
        {row("megaphone-outline", t("admin.broadcast"), t("admin.broadcastHint"), "/admin/broadcast")}
        {row("settings-outline", t("admin.settings"), t("admin.settingsHint"), "/admin/settings")}
        {row("shield-checkmark-outline", t("admin.admins"), t("admin.adminsHint"), "/admin/admins")}
        {row("receipt-outline", t("admin.log"), t("admin.logHint"), "/admin/log", true)}
      </Card>
      <Card raised>
        <Text variant="label">{t("admin.signedInAs", { phone: session?.user.phone ? `+${session.user.phone}` : "" })}</Text>
        <Text variant="small" className="mb-3">{t("admin.switchHint")}</Text>
        <Button title={t("role.switchToUser")} icon="storefront-outline" variant="secondary" onPress={toUser} />
      </Card>
      <Field label={t("common.language")} showOptional={false}>
        <Select placeholder={t("common.chooseLanguage")} value={i18n.language === "hi" ? "hi" : "en"} onChange={(l) => setLocale(l as Locale)} searchable={false}
          options={LOCALES.map((l) => ({ value: l, label: t(`common.languages.${l}`) }))} />
      </Field>
      <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
    </ScrollView>
  );
}
