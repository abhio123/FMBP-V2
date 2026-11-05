import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text, Icon, ICON_COLOR } from "@/components/ui";

/** Partner badge: the poster chose "Partnership (share profit)" for how they want to work. */
export function PartnerBadge({ dealType }: { dealType: string | null | undefined }) {
  const { t } = useTranslation();
  if (dealType !== "partnership") return null;
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-brand px-2 py-0.5">
      <Icon name="people-circle-outline" size={13} color={ICON_COLOR.white} />
      <Text variant="small" className="font-semibold text-white">{t("post.partnerBadge")}</Text>
    </View>
  );
}
