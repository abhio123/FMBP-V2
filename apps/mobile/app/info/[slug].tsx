import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { INFO_IS_DRAFT, INFO_UPDATED, formatDate, infoBlocks, infoPage } from "@fmbp/shared";
import { Screen, Text, EmptyState, DataIcon, ICON_COLOR } from "@/components/ui";

/** One information page (About, Stay safe, Guidelines, Help, Terms, Privacy) in the app's language. */
export default function InfoPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const page = infoPage(slug ?? "");
  const email = String(Constants.expoConfig?.extra?.supportEmail ?? "");
  if (!page) return <Screen><EmptyState icon="search-outline" title={t("common.error")} /></Screen>;
  return (
    <Screen>
      <Stack.Screen options={{ title: page.title[lang] }} />
      <View className="gap-5 py-4">
        <View className="gap-1">
          <View className="flex-row items-center gap-2"><DataIcon value={page.icon} size={26} color={ICON_COLOR.brand} /><Text variant="title" className="shrink">{page.title[lang]}</Text></View>
          <Text variant="small">{t("info.updated", { date: formatDate(INFO_UPDATED, lang) })}{INFO_IS_DRAFT ? ` · ${t("info.draft")}` : ""}</Text>
        </View>
        {page.sections.map((s) => (
          <View key={s.heading.en} className="gap-2">
            <Text variant="heading" accessibilityRole="header">{s.heading[lang]}</Text>
            {infoBlocks(s.body[lang], email).map((b, i) => (
              b.kind === "li"
                ? <View key={i} className="flex-row gap-2 pl-1"><Text>•</Text><Text className="flex-1">{b.text}</Text></View>
                : <Text key={i} selectable>{b.text}</Text>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
