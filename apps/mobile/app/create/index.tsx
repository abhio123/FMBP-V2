import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card } from "@/components/ui";
import { listIntentions } from "@/features/posts/api";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";

export default function CreateIntention() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const setIntention = useCreatePost((s) => s.setIntention);
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 });
  const { business, businessLoaded } = useSession();
  // Posting needs a business profile: send first-time users to the one-minute setup, then back here.
  if (businessLoaded && !business) return <Redirect href="/(onboarding)/business" />;
  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{t("create.title")}</Text>
        <Text variant="subtitle">{t("create.subtitle")}</Text>
      </View>
      <View className="flex-row flex-wrap justify-between">
        {(intentions.data ?? []).map((i) => (
          <Card key={i.id} className="mb-3 w-[48%] items-center py-6" onPress={() => { setIntention(i.id); router.push("/create/type"); }}>
            <Text className="mb-2 text-4xl">{i.icon}</Text>
            <Text variant="label" className="text-center">{hi ? i.name_hi : i.name_en}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
