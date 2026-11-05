import { Linking, View } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { formatDate } from "@fmbp/shared";
import { Screen, Text, Button, Card, Icon, ICON_COLOR } from "@/components/ui";
import { signOut } from "@/features/auth/api";
import { useSession } from "@/store/session";

/**
 * The business was suspended by FMBP (Admin → Suspend): others no longer see it or its posts and it cannot post or
 * chat. Shows the reason and how to ask for a review. The root layout opens the app again once it is lifted.
 */
export default function Suspended() {
  const { t, i18n } = useTranslation();
  const business = useSession((s) => s.business);
  const email = String(Constants.expoConfig?.extra?.supportEmail ?? "");
  const since = business?.suspended_at ? formatDate(business.suspended_at, i18n.language === "hi" ? "hi" : "en") : "";
  return (
    <Screen>
      <View className="flex-1 justify-center gap-4 py-8">
        <View className="items-center"><Icon name="ban-outline" size={56} color={ICON_COLOR.danger} /></View>
        <Text variant="title" className="text-center">{t("account.suspendedTitle")}</Text>
        <Card className="gap-2">
          <Text>{t("account.suspendedBody", { name: business?.name ?? "", date: since })}</Text>
          {business?.suspension_reason ? <Text variant="label">{t("account.suspendedReason", { reason: business.suspension_reason })}</Text> : null}
          <Text variant="caption">{t("account.suspendedAppeal", { email })}</Text>
        </Card>
        {email ? <Button title={t("account.contactSupport")} variant="secondary"
          onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(`FMBP account review: ${business?.name ?? ""}`)}`)} /> : null}
        <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}
