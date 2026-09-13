import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, TrustRow, EmptyState } from "@/components/ui";
import { getBusinessPublic } from "@/features/business/api";
import { listPostsByBusiness } from "@/features/posts/api";
import { PostCard } from "@/features/posts/PostCard";

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const biz = useQuery({ queryKey: ["business", id], queryFn: () => getBusinessPublic(id!) });
  const posts = useQuery({ queryKey: ["business_posts", id], queryFn: () => listPostsByBusiness(id!) });

  if (biz.isError) return <Screen><EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => biz.refetch()} /></Screen>;
  if (!biz.data) return <Screen><Text variant="caption" className="p-4">{t("common.loading")}</Text></Screen>;
  const b = biz.data;
  const services = [b.service_available && t("business.service"), b.delivery_available && t("business.delivery"), b.pickup_available && t("business.pickup")].filter(Boolean) as string[];
  return (
    <Screen>
      <View className="gap-4 py-4">
        <Card>
          <TrustRow name={b.name} verified={b.verification_status === "verified"} city={b.city}
            category={hi ? b.category?.name_hi : b.category?.name_en} responseRate={b.response_rate}
            ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since} />
          {b.description ? <Text className="mt-3">{b.description}</Text> : null}
          {services.length ? <Text variant="caption" className="mt-2">{services.join(" · ")}</Text> : null}
        </Card>
        <Text variant="heading">{t("business.posts")}</Text>
        {posts.data?.length ? posts.data.map((p) => <PostCard key={p.id} post={p} />) : <Text variant="caption">{t("business.noPosts")}</Text>}
      </View>
    </Screen>
  );
}
