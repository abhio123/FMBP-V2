import { Alert, Pressable, View } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Screen, Text, Card, TrustRow, EmptyState, Button, IconText } from "@/components/ui";
import { useSession } from "@/store/session";
import { useFollowingIds, useFollowerCount } from "@/features/social/api";
import { FollowButton } from "@/features/social/FollowButton";
import { getBusinessPublic } from "@/features/business/api";
import { listPostsByBusiness } from "@/features/posts/api";
import { PostCard } from "@/features/posts/PostCard";
import { businessShareMessage } from "@/features/share/share";
import { ShareActions } from "@/features/share/ShareActions";
import { BusinessCover, PlaceLine } from "@/features/business/BusinessCover";
import { ReportDialog } from "@/features/safety/ReportDialog";
import { report } from "@/features/safety/api";
import { useBlockActions, useMyBlocks } from "@/features/safety/useBlocks";
import { track } from "@/lib/analytics";
import { listBusinessDeals } from "@/features/deals/api";
import { formatDate } from "@fmbp/shared";

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
  const deals = useQuery({ queryKey: ["business_deals", id], queryFn: () => listBusinessDeals(id!) });
  const blocks = useMyBlocks();
  const blockActions = useBlockActions();
  const [reportOpen, setReportOpen] = useState(false);

  if (biz.isError) return <Screen muted><EmptyState icon="alert-circle-outline" title={t("common.error")} cta={t("common.retry")} onPress={() => biz.refetch()} /></Screen>;
  if (!biz.data) return <Screen muted><Text variant="caption" className="p-4">{t("common.loading")}</Text></Screen>;
  const b = biz.data;
  const isMe = !!business && business.id === b.id;
  const canFollow = !!business && !isMe;
  const blocked = blocks.ids.has(b.id);
  const category = hi ? b.category?.name_hi : b.category?.name_en;
  const services = [b.service_available && t("business.service"), b.delivery_available && t("business.delivery"), b.pickup_available && t("business.pickup")].filter(Boolean) as string[];
  return (
    <Screen muted>
      <View className="gap-4 py-4">
        <BusinessCover name={b.name} coverUrl={b.cover_url} logoUrl={b.logo_url} />
        <Card raised>
          {/* identity left, Follow right (same pattern as the business card on a post) */}
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <TrustRow large name={b.name} verified={b.verification_status === "verified"}
                category={category} responseRate={b.response_rate} responseSample={b.response_sample}
                ratingAvg={b.rating_avg} ratingCount={b.rating_count} completedDeals={b.completed_deals} memberSince={b.member_since}
                referralCount={b.referral_count} kind={b.kind} trade={b.trade} tradeOther={b.trade_other} />
              <PlaceLine city={b.city} pincode={b.pincode} />
              {followers.data ? <Text variant="small" className="mt-0.5">{t("business.followers", { count: followers.data })}</Text> : null}
            </View>
            {canFollow ? <FollowButton businessId={b.id} /> : null}
          </View>
          {b.description ? <Text className="mt-2">{b.description}</Text> : null}
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
        {/* confirmed deals: what and when (the other business is not named) */}
        {deals.data?.length ? (
          <Card raised>
            <Text variant="label" className="mb-2">{t("deals.businessDeals", { count: deals.data.length })}</Text>
            {deals.data.slice(0, 5).map((d, i) => (
              <Text key={i} variant="caption" numberOfLines={1} className="mb-1">
                {d.post_title || t("deals.done")} · {formatDate(d.completed_at, hi ? "hi" : "en")}
              </Text>
            ))}
          </Card>
        ) : null}
        <Text variant="heading">{t("business.posts")}</Text>
        {blocked ? <Text variant="caption">{t("safety.youBlocked")}</Text>
          : posts.data?.length ? posts.data.map((p) => <PostCard key={p.id} post={p} />) : <Text variant="caption">{t("business.noPosts")}</Text>}
        {/* report / block: quiet, at the end, only for other businesses */}
        {canFollow ? (
          <View className="mt-4 flex-row justify-center gap-6">
            <Pressable accessibilityRole="button" onPress={() => setReportOpen(true)} className="min-h-[44px] justify-center px-2">
              <IconText icon="flag-outline" variant="caption">{t("safety.report")}</IconText>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={blockActions.busy} className="min-h-[44px] justify-center px-2"
              onPress={() => (blocked ? blockActions.unblock(b.id) : blockActions.confirmBlock(b.id, b.name, () => track("business_blocked")))}>
              <IconText icon="ban-outline" variant="caption">{blocked ? t("safety.unblock") : t("safety.block")}</IconText>
            </Pressable>
          </View>
        ) : null}
      </View>
      <ReportDialog visible={reportOpen} title={t("safety.reportBusiness")} onClose={() => setReportOpen(false)}
        onSubmit={async (reason, note) => {
          await report(business!.id, "business", b.id, reason, note);
          setReportOpen(false);
          track("business_reported", { reason });
          Alert.alert(t("safety.report"), t("safety.reportedBusiness"));
        }} />
    </Screen>
  );
}
