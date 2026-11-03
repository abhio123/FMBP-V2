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
  const all = intentions.data ?? [];
  const main = all.filter((i) => i.slug === "need" || i.slug === "offer");
  const rest = all.filter((i) => i.slug !== "need" && i.slug !== "offer");
  const pick = (id: string) => { setIntention(id); router.push("/create/type"); };
  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{t("create.title")}</Text>
        <Text variant="subtitle">{t("create.subtitle")}</Text>
      </View>
      {/* the two main choices big, side by side; anything else (Announce) as a smaller row underneath */}
      <View className="flex-row justify-between">
        {main.map((i) => (
          <Card key={i.id} className="mb-3 w-[48%] items-center py-6" onPress={() => pick(i.id)}>
            <Text className="mb-2 text-4xl">{i.icon}</Text>
            <Text variant="label" className="text-center">{hi ? i.name_hi : i.name_en}</Text>
          </Card>
        ))}
      </View>
      {rest.map((i) => (
        <Card key={i.id} className="mb-3 flex-row items-center gap-3 py-3" onPress={() => pick(i.id)}>
          <Text className="text-2xl">{i.icon}</Text>
          <Text variant="label" className="flex-1">{hi ? i.name_hi : i.name_en}</Text>
          <Text className="text-ink-faint">›</Text>
        </Card>
      ))}
      {/* partnership is an answer on every post, so say where to find it */}
      <Card className="mt-2 border-brand bg-brand-light">
        <Text variant="label" className="text-brand-dark">🤝 {t("create.partnerTipTitle")}</Text>
        <Text variant="caption" className="mt-1">{t("create.partnerTipBody")}</Text>
      </Card>
    </Screen>
  );
}
