import { View, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";

const mark = require("../../../assets/brand-mark.png");

/** App identity: mark + name + tagline. `size` "lg" for the login screen, "sm" for page headers. */
export function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { t } = useTranslation();
  if (size === "lg") {
    return (
      <View className="items-center gap-3">
        <Image source={mark} accessibilityIgnoresInvertColors style={{ width: 88, height: 88, borderRadius: 20 }} />
        <Text className="text-3xl font-bold tracking-widest text-brand-dark">{t("app.name")}</Text>
        <Text variant="subtitle" className="text-center">{t("app.tagline")}</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-2">
      <Image source={mark} accessibilityIgnoresInvertColors style={{ width: 28, height: 28, borderRadius: 7 }} />
      <Text className="text-lg font-bold tracking-wider text-brand-dark">{t("app.name")}</Text>
      <Text variant="small" className="ml-1">{t("app.tagline")}</Text>
    </View>
  );
}
