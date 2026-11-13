import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, DataIcon, Icon, IconText, ICON_COLOR } from "@/components/ui";
import { intentionIdsForIndividuals, listIntentions } from "@/features/posts/api";
import { useCreatePost } from "@/store/createPost";
import { useSession } from "@/store/session";
import { ProfileSwitcher } from "@/features/business/ProfileSwitcher";
import { PartnerBadge } from "@/features/posts/PartnerBadge";

export default function CreateIntention() {
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const setIntention = useCreatePost((s) => s.setIntention);
  const intentions = useQuery({ queryKey: ["intentions"], queryFn: listIntentions, staleTime: 10 * 60_000 });
  const { business, businessLoaded } = useSession();
  // an individual sees only Need / Offer choices that have post types for people (no Announce)
  const individual = business?.kind === "individual";
  const forPeople = useQuery({ queryKey: ["intentions_for_individuals"], enabled: individual, queryFn: intentionIdsForIndividuals, staleTime: 10 * 60_000 });
  // Posting needs a business profile: send first-time users to the one-minute setup, then back here.
  if (businessLoaded && !business) return <Redirect href="/(onboarding)/business" />;
  const all = (intentions.data ?? []).filter((i) => !individual || forPeople.data?.has(i.id));
  const main = all.filter((i) => i.slug === "need" || i.slug === "offer");
  const rest = all.filter((i) => i.slug !== "need" && i.slug !== "offer");
  const pick = (id: string) => { setIntention(id); router.push("/create/type"); };
  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text variant="title">{t("create.title")}</Text>
        <Text variant="subtitle">{t("create.subtitle")}</Text>
        {/* several profiles: which one this post is for (salesman for the clothes shop, cook for the tea stall) */}
        <View className="mt-2"><ProfileSwitcher label={t("profiles.postingAs")} /></View>
      </View>
      {/* the two main choices big, side by side; anything else (Announce) as a smaller row underneath */}
      <View className="flex-row justify-between">
        {main.map((i) => (
          <Card key={i.id} className="mb-3 w-[48%] items-center py-6" onPress={() => pick(i.id)}>
            <View className="mb-2"><DataIcon value={i.icon} size={36} color={ICON_COLOR.brand} /></View>
            <Text variant="label" className="text-center">{hi ? i.name_hi : i.name_en}</Text>
          </Card>
        ))}
      </View>
      {rest.map((i) => (
        <Card key={i.id} className="mb-3 flex-row items-center gap-3 py-3" onPress={() => pick(i.id)}>
          <DataIcon value={i.icon} size={24} color={ICON_COLOR.brand} />
          <Text variant="label" className="flex-1">{hi ? i.name_hi : i.name_en}</Text>
          <Icon name="chevron-forward" size={20} color={ICON_COLOR.faint} />
        </Card>
      ))}
      {/* partnership is an answer on every post, so say where to find it */}
      <Card className="mt-2 border-brand bg-brand-light">
        <IconText icon="people-circle-outline" variant="label" color={ICON_COLOR.brandDark} textClassName="text-brand-dark">{t("create.partnerTipTitle")}</IconText>
        <Text variant="caption" className="mt-1">{t("create.partnerTipBody")}</Text>
        <View className="mt-2 self-start"><PartnerBadge dealType="partnership" /></View>
      </Card>
    </Screen>
  );
}
