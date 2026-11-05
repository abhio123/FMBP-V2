import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, Button, Icon, ICON_COLOR } from "@/components/ui";
import { saveMode } from "@/features/admin/api";
import { signOut } from "@/features/auth/api";
import { useSession, type AppMode } from "@/store/session";
import { track } from "@/lib/analytics";

/**
 * After login on an admin number: use FMBP as a normal user (own business, posts, chats) or open the admin area.
 * Remembered on this phone until logout; switch any time (Business tab / Admin → More). The root layout routes.
 */
export default function ChooseRole() {
  const { t } = useTranslation();
  const { session, setMode } = useSession();
  const pick = (mode: AppMode) => {
    if (session) void saveMode(session.user.id, mode);
    track("admin_mode_chosen", { mode });
    setMode(mode);
  };
  return (
    <Screen>
      <View className="flex-1 justify-center gap-4 py-8">
        <Text variant="title" className="text-center">{t("role.title")}</Text>
        <Text variant="caption" className="text-center">{t("role.hint")}</Text>
        <Card onPress={() => pick("user")}>
          <View className="flex-row items-center gap-4">
            <Icon name="storefront-outline" size={36} color={ICON_COLOR.brand} />
            <View className="flex-1">
              <Text variant="heading">{t("role.user")}</Text>
              <Text variant="caption">{t("role.userHint")}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
          </View>
        </Card>
        <Card onPress={() => pick("admin")} className="border-ink">
          <View className="flex-row items-center gap-4">
            <Icon name="shield-checkmark-outline" size={36} color={ICON_COLOR.ink} />
            <View className="flex-1">
              <Text variant="heading">{t("role.admin")}</Text>
              <Text variant="caption">{t("role.adminHint")}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
          </View>
        </Card>
        <Button title={t("profile.logout")} variant="ghost" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}
