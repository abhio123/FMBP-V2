import { useState } from "react";
import { Alert, View } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button, Card, IconText } from "@/components/ui";
import { requestAccountDeletion } from "@/features/account/api";
import { signOut } from "@/features/auth/api";
import { track } from "@/lib/analytics";

/**
 * Delete account (Profile → Delete account). Says plainly what happens and that it can be undone for 30 days, asks
 * once more, then hides everything at once and logs out (migration 20261105000005).
 */
export default function DeleteAccount() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const remove = async () => {
    setBusy(true); setErr(null);
    try {
      await requestAccountDeletion();
      track("account_deletion_requested");
      await signOut(); // clears drafts, recent searches and cached data (root layout)
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  const confirm = () => Alert.alert(t("account.deleteTitle"), t("account.deleteFinal"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("account.deleteConfirm"), style: "destructive", onPress: () => { void remove(); } },
  ]);
  return (
    <Screen>
      <Stack.Screen options={{ title: t("account.delete") }} />
      <View className="gap-4 py-4">
        <Text variant="title">{t("account.deleteTitle")}</Text>
        <Card className="gap-3">
          <IconText icon="trash-outline">{t("account.deleteBody1")}</IconText>
          <Text>↩️ {t("account.deleteBody2")}</Text>
          <IconText icon="lock-closed-outline">{t("account.deleteBody3")}</IconText>
        </Card>
        {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
        <Button title={t("account.deleteConfirm")} variant="danger" onPress={confirm} loading={busy} />
      </View>
    </Screen>
  );
}
