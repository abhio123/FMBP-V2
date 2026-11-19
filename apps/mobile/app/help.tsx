import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { INFO_PAGES } from "@fmbp/shared";
import { Screen, Card, Text, DataIcon, Icon, ICON_COLOR } from "@/components/ui";

/** About & help: the information pages (same texts as findmybusinesspartner.net/<page>). */
export default function InfoIndex() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  return (
    <Screen>
      <Stack.Screen options={{ title: t("info.title") }} />
      <View className="gap-3 py-4">
        {INFO_PAGES.map((p) => (
          <Card key={p.slug} onPress={() => router.push({ pathname: "/info/[slug]", params: { slug: p.slug } })}>
            <View className="flex-row items-center gap-3">
              <DataIcon value={p.icon} size={24} color={ICON_COLOR.brand} />
              <Text variant="label" className="flex-1">{hi ? p.title.hi : p.title.en}</Text>
              <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
