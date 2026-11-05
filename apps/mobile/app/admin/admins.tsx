import { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Button, Card, EmptyState, Field, Screen, Text } from "@/components/ui";
import { addAdmin, disableAdmin, listAdmins } from "@/features/admin/api";
import { useAdminAction } from "@/features/admin/useAdminAction";

const input = "min-h-[48px] rounded-xl border border-line px-4 text-base text-ink";

/**
 * Who can open the admin area. One level: every admin can do everything (agreed), so add only people you trust.
 * An added number signs in with its OTP and is asked "Continue as admin / normal user". Removing is immediate.
 */
export default function AdminAdmins() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const list = useQuery({ queryKey: ["admin", "admins"], queryFn: listAdmins });
  const { run } = useAdminAction();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const add = () => Alert.alert(t("admin.addAdminTitle"), t("admin.addAdminBody", { phone: `+91 ${phone}`, name: name.trim() }), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("admin.addAdmin"), onPress: () => run("add_admin", async () => { await addAdmin(phone, name.trim()); setPhone(""); setName(""); }) },
  ]);
  const remove = (p: string, n: string) => Alert.alert(t("admin.removeAdminTitle", { name: n }), t("admin.removeAdminBody"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("admin.removeAdmin"), style: "destructive", onPress: () => run("disable_admin", () => disableAdmin(p)) },
  ]);
  return (
    <Screen>
      <View className="gap-4 py-4">
        <Card className="border-accent bg-accent/10"><Text variant="caption">{t("admin.adminsWarning")}</Text></Card>
        {list.isError ? <EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => list.refetch()} /> : null}
        {list.data?.map((a) => (
          <Card key={a.phone} raised className={a.disabled_at ? "opacity-60" : ""}>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text variant="label">{a.name}{a.is_me ? ` (${t("admin.you")})` : ""}</Text>
                <Text variant="caption">+{a.phone}</Text>
                <Text variant="small">{a.disabled_at ? t("admin.removedOn", { date: formatDate(a.disabled_at, lang) }) : t("admin.addedOn", { date: formatDate(a.created_at, lang) })}</Text>
              </View>
              {!a.is_me && !a.disabled_at ? <Button title={t("admin.removeAdmin")} variant="ghost" full={false} onPress={() => remove(a.phone, a.name)} /> : null}
            </View>
          </Card>
        ))}
        <Card raised>
          <Text variant="label" className="mb-3">{t("admin.addAdmin")}</Text>
          <Field label={t("admin.adminPhone")} required error={phone && !phoneOk ? t("auth.invalidPhone") : undefined}>
            <TextInput value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(-10))} keyboardType="phone-pad" maxLength={10} placeholder="98XXXXXXXX" className={input} />
          </Field>
          <Field label={t("admin.adminName")} required>
            <TextInput value={name} onChangeText={setName} maxLength={60} className={input} />
          </Field>
          <Button title={t("admin.addAdmin")} disabled={!phoneOk || name.trim().length < 2} onPress={add} />
        </Card>
      </View>
    </Screen>
  );
}
