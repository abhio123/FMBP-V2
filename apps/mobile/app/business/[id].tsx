import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, TrustRow, EmptyState, Button } from "@/components/ui";
import { useSession } from "@/store/session";
import { useFollowingIds, useFollowerCount } from "@/features/social/api";
import { FollowButton } from "@/features/social/FollowButton";
import { getBusinessPublic } from "@/features/business/api";
import { listPostsByBusiness } from "@/features/posts/api";
import { PostCard } from "@/features/posts/PostCard";
import { businessShareMessage } from "@/features/share/share";
import { ShareActions } from "@/features/share/ShareActions";

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const hi = i18n.language === "hi";
  const router = useRouter();
  const business = useSession((s) => s.business);
  const following = useFollowingIds();
  const followers = useFollowerCount(id);
  const biz = useQuery({ queryKey: ["business", id], queryFn: () => getBusinessPublic(id!) });
  const posts = useQuery({ queryKey: ["business_posts", id], queryFn: () => listPostsByBusiness(id!) });

  if (biz.isError) return <Screen><EmptyState icon="⚠️" title={t("common.error")} cta={t("common.retry")} onPress={() => biz.refetch()} /></Screen>;
  if (!biz.data) return <Screen><Text variant="caption" className="p-4">{t("common.loading")}</Text></Screen>;
  const b = biz.data;
  const isMe = !!business && business.id === b.id;
  const canFollow = !!business && !isMe;
  const category = hi ? b.category?.name_hi : b.category?.name_en;
  const services = [b.service_available && t("business.service"), b.delivery_available && t("business.delivery"), b.pickup_available && t("business.pickup")].filter(Boolean) as string[];
  return (
    <Screen>
      <View className="gap-4 py-4">
        <Card>
          {/* identity left, Follow right (same pattern as the business card on a post) */}
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <TrustRow name={b.name} verified={b.verification_status === "verified"} city={b.city}
                category={category} responseRate={b.response_rate} responseSample={b.response_sample}
                ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since} />
              {followers.data ? <Text variant="small" className="mt-0.5">{t("business.followers", { count: followers.data })}</Text> : null}
            </View>
            {canFollow ? <FollowButton businessId={b.id} /> : null}
          </View>
          {b.description ? <Text className="mt-3">{b.description}</Text> : null}
          {services.length ? <Text variant="caption" className="mt-2">{services.join(" · ")}</Text> : null}
          {canFollow && !following.data?.has(b.id) ? <Text variant="small" className="mt-2">{t("business.followHint")}</Text> : null}
          {/* round icon actions on their own row; the rectangular "My Business" button sits on the next row */}
          <View className="mt-3 flex-row flex-wrap gap-3">
            <ShareActions message={(whatsapp) => businessShareMessage(t, { id: b.id, name: b.name, description: b.description, category, city: b.city }, whatsapp)} />
          </View>
          {isMe ? (
            <View className="mt-3 flex-row items-center gap-3">
              <Text variant="caption" className="flex-1">{t("business.thisIsYou")}</Text>
              <Button title={t("profile.title")} variant="secondary" full={false} onPress={() => router.navigate("/(tabs)/profile")} />
            </View>
          ) : null}
        </Card>
        <Text variant="heading">{t("business.posts")}</Text>
        {posts.data?.length ? posts.data.map((p) => <PostCard key={p.id} post={p} />) : <Text variant="caption">{t("business.noPosts")}</Text>}
      </View>
    </Screen>
  );
}
