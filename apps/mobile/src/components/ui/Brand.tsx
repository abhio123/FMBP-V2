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
  // Page-header identity: the full app name, larger than the page title under it (brand first, then where you are),
  // with the slogan below. App-name size (18 px, the usual 17–20 for an app header), so it reads as a name and doesn't
  // fill the width; the two text lines together are as tall as the logo (24 + 16 = 40). Very narrow screens shrink
  // it slightly rather than wrap.
  return (
    <View className="flex-row items-center gap-3">
      <Image source={mark} accessibilityIgnoresInvertColors style={{ width: 40, height: 40, borderRadius: 10 }} />
      <View className="flex-1">
        <Text className="text-lg font-bold leading-6 text-brand-dark" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {t("app.fullName")}
        </Text>
        <Text className="text-xs leading-4 text-ink-muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t("app.slogan")}</Text>
      </View>
    </View>
  );
}
