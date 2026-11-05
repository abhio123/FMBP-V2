import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Screen, Text, Button, Card } from "@/components/ui";
import { cancelAccountDeletion, erasureDate } from "@/features/account/api";
import { signOut } from "@/features/auth/api";
import { loadMyBusiness } from "@/features/business/api";
import { useSession } from "@/store/session";
import { track } from "@/lib/analytics";

/** Signed in during the 30 days after "Delete account": restore everything, or log out again. */
export default function RestoreAccount() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session, deletionRequestedAt, setBusiness, setDeletionRequestedAt } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const restore = async () => {
    setBusy(true); setErr(null);
    try {
      await cancelAccountDeletion();
      track("account_restored");
      setBusiness(await loadMyBusiness(session?.user.id));
      setDeletionRequestedAt(null);
      router.replace("/(tabs)/feed");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  const date = deletionRequestedAt ? formatDate(erasureDate(deletionRequestedAt), i18n.language === "hi" ? "hi" : "en") : "";
  return (
    <Screen>
      <View className="flex-1 justify-center gap-4 py-8">
        <Text className="text-center text-5xl">↩️</Text>
        <Text variant="title" className="text-center">{t("account.restoreTitle")}</Text>
        <Card><Text>{t("account.restoreBody", { date })}</Text></Card>
        {err ? <Text variant="caption" className="text-danger">{err}</Text> : null}
        <Button title={t("account.restore")} onPress={restore} loading={busy} />
        <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} disabled={busy} />
      </View>
    </Screen>
  );
}
