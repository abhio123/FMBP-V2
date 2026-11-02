import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { IconAction } from "@/components/ui";
import { shareText, shareToWhatsApp } from "./share";

/**
 * WhatsApp (full message with bold title, straight into WhatsApp) and Share (phone's share menu, plain text; includes
 * Instagram DM, email, SMS) as round icon actions. `message(true)` builds the WhatsApp variant.
 * Rendered inside the caller's action row so Save etc. can sit beside them.
 */
export function ShareActions({ message }: { message: (whatsapp: boolean) => string }) {
  const { t } = useTranslation();
  // WhatsApp could not be opened: say so and let the user choose the share menu, instead of silently switching to it
  const unavailable = () => Alert.alert(t("common.whatsappUnavailableTitle"), t("common.whatsappUnavailableBody"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("common.share"), onPress: () => { void shareText(message(false)); } },
  ]);
  return (
    <>
      <IconAction icon="logo-whatsapp" tone="whatsapp" label={t("common.whatsapp")} onPress={() => shareToWhatsApp(message(true), unavailable)} />
      <IconAction icon="share-social-outline" label={t("common.share")} onPress={() => shareText(message(false))} />
    </>
  );
}
